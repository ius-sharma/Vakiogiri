# uvicorn main:app --reload --port 8000

import os
import sys
import uuid
import requests
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Query, File, UploadFile, Request
import re
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse, Response
import time
from pydantic import BaseModel, Field

load_dotenv()

import yt_dlp
from pipeline import (
    run_pipeline,
    get_video_duration,
    DEFAULT_SEGMENT_DURATION,
    probe_stream_metadata,
    format_duration,
    MAX_STREAM_DURATION_HOURS,
    MAX_STREAM_DURATION_SECONDS,
    strip_ansi
)
from db import (
    init_db,
    deduct_credit,
    refund_credit,
    record_job,
    update_job_status,
    get_user_history,
    delete_user_job,
    save_user_youtube_channel,
    get_user_youtube_channel,
    delete_user_youtube_channel
)
from auth import get_current_user, get_current_user_optional
from storage import upload_clips_and_cleanup, delete_job_files_from_supabase
from youtube_service import (
    get_oauth_authorization_url,
    exchange_code_for_tokens,
    fetch_user_channel_profile,
    fetch_channel_videos as fetch_auth_channel_videos,
    fetch_channel_streams,
    get_valid_access_token,
    FRONTEND_URL
)

app = FastAPI(title="AI Video Clipping Platform Backend")

# Initialize database schema on startup
init_db()

# CORS middleware supporting all local/network dev origins (localhost:3000, 3001, 127.0.0.1, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging

class StatusPollingLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Hide repetitive status polling lines to keep terminal progress output clean and readable
        return "/status/" not in record.getMessage()

logging.getLogger("uvicorn.access").addFilter(StatusPollingLogFilter())

# In-memory dictionary to track live job state
# Schema: { job_id: {"status": str, "step": str, "progress": int, "message": str, "clips": [...], "error": str | None} }
jobs: Dict[str, Dict[str, Any]] = {}


class ProbeRequest(BaseModel):
    youtube_url: str


class ChannelVideosRequest(BaseModel):
    channel_url: Optional[str] = None
    channel_handle: Optional[str] = None


class DiscoverMomentsRequest(BaseModel):
    video_url: Optional[str] = None
    local_file_path: Optional[str] = None
    video_title: Optional[str] = None
    duration: Optional[float] = None
    target_duration: Optional[int] = 45
    max_moments: Optional[int] = 8
    start_sec: Optional[float] = None
    end_sec: Optional[float] = None


class ProcessRequest(BaseModel):
    youtube_url: Optional[str] = None
    local_file_path: Optional[str] = None
    title: Optional[str] = None
    segment_duration: Optional[int] = Field(default=None, ge=15, le=600)  # Up to 600s (10 min) for stream highlights
    max_clips: Optional[int] = Field(default=None, ge=1, le=10)
    synthesize_stories: Optional[bool] = Field(default=None)
    mode: Optional[str] = Field(default="heuristic")  # "heuristic" (Free / Fast) or "ai_enhanced" (AI Storytelling)
    aspect_ratio: Optional[str] = Field(default="9:16")  # "9:16" (Vertical) | "16:9" (Landscape Gaming Stream)
    content_type: Optional[str] = Field(default="shorts")  # "shorts" | "stream"
    stream_output_mode: Optional[str] = Field(default="single_reel")  # "single_reel" | "both" | "clips"
    quality: Optional[str] = Field(default="1080p")  # "1080p" | "720p" | "480p" | "best"
    stream_start_min: Optional[float] = Field(default=0.0)  # Skip first N minutes (e.g. 15 min intro)
    stream_end_min: Optional[float] = Field(default=None)  # Optional end boundary in minutes
    selected_moments: Optional[List[Dict[str, Any]]] = None
    caption_style: Optional[str] = Field(default="hormozi")  # "hormozi", "beast", "vakiogiri", "none"
    subtitle_language: Optional[str] = Field(default="hinglish")  # "hinglish", "english", "auto"
    layout_mode: Optional[str] = Field(default="gaming_split")  # "gaming_split" | "face_top_game_bottom"


class StreamProcessRequest(BaseModel):
    youtube_url: str
    start_time: Optional[float] = 0.0  # seconds
    end_time: Optional[float] = None   # seconds
    target_reel_duration: Optional[int] = 300  # seconds (e.g. 180s, 300s, 600s total 16:9 compilation)
    output_mode: Optional[str] = "single_reel"  # "single_reel" | "both" | "clips"
    aspect_ratio: Optional[str] = "16:9"  # Default 16:9 widescreen
    quality: Optional[str] = "1080p"
    clipping_mode: Optional[str] = "heuristic"
    generate_chapters: Optional[bool] = True
    selected_moments: Optional[List[Dict[str, Any]]] = None


def process_video_task(
    job_id: str,
    user_id: str,
    youtube_url: str,
    segment_duration: int,
    mode: str = "heuristic",
    synthesize_stories: bool = False,
    credit_deducted: bool = False,
    aspect_ratio: str = "9:16",
    content_type: str = "shorts",
    max_clips: int = 3,
    stream_output_mode: str = "single_reel",
    quality: str = "1080p",
    stream_start_min: float = 0.0,
    stream_end_min: Optional[float] = None,
    selected_moments: Optional[List[Dict[str, Any]]] = None,
    caption_style: str = "hormozi",
    subtitle_language: str = "hinglish",
    layout_mode: str = "gaming_split"
):
    """Background task to run video processing pipeline with progress callback and job recording."""
    clips_output_dir = os.path.join("clips", job_id)
    download_dir = os.path.join("downloads", job_id)
    
    def progress_callback(step: str, progress: int, message: str):
        if job_id in jobs:
            jobs[job_id]["step"] = step
            jobs[job_id]["progress"] = progress
            jobs[job_id]["message"] = message

    try:
        raw_clips = run_pipeline(
            youtube_url=youtube_url,
            clips_output_dir=clips_output_dir,
            download_dir=download_dir,
            segment_duration=segment_duration,
            max_clips=max_clips,
            synthesize_stories=synthesize_stories,
            mode=mode,
            aspect_ratio=aspect_ratio,
            content_type=content_type,
            stream_output_mode=stream_output_mode,
            quality=quality,
            stream_start_min=stream_start_min,
            stream_end_min=stream_end_min,
            progress_callback=progress_callback,
            selected_moments=selected_moments,
            caption_style=caption_style,
            subtitle_language=subtitle_language,
            layout_mode=layout_mode
        )

        # Upload generated clips to Supabase Cloud Storage & purge local disk
        uploaded_clips = upload_clips_and_cleanup(
            job_id=job_id,
            clips_dir=clips_output_dir,
            clip_filenames=raw_clips,
            progress_callback=progress_callback
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["step"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = f"Finished! Created {len(uploaded_clips)} clip(s)."
        jobs[job_id]["clips"] = uploaded_clips
        
        # Update database with saved clips metadata
        update_job_status(job_id, "completed", len(uploaded_clips), uploaded_clips)
        print(f"[Job {job_id}] Processing completed successfully ({mode} mode). Stored {len(uploaded_clips)} clip(s).")
        
    except Exception as e:
        clean_err = strip_ansi(str(e))
        print(f"[Job {job_id}] Processing failed with error: {clean_err}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["step"] = "failed"
        jobs[job_id]["error"] = clean_err
        jobs[job_id]["message"] = f"Failed: {clean_err}"
        
        # Refund credit to user on failure if it was deducted
        if credit_deducted:
            refund_credit(user_id)
        update_job_status(job_id, "failed", 0, [])


@app.get("/user/me")
def get_user_profile(user: Dict[str, Any] = Depends(get_current_user_optional)):
    """Return user info, remaining daily credits, and daily reset info."""
    return user


@app.get("/user/clips")
def get_user_clips(user: Dict[str, Any] = Depends(get_current_user_optional)):
    """Return all past video generation jobs and clips for the authenticated user."""
    if not user.get("is_authenticated"):
        return {
            "user_id": "guest",
            "total_projects": 0,
            "history": []
        }

    history = get_user_history(user["id"])
    return {
        "user_id": user["id"],
        "total_projects": len(history),
        "history": history
    }


@app.delete("/user/clips/{job_id}")
def delete_user_clip_project(job_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Delete a generated project from database and Supabase storage."""
    deleted = delete_user_job(job_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user.")

    # Delete storage files from Supabase bucket
    delete_job_files_from_supabase(job_id)
    
    # Remove from active jobs memory if present
    if job_id in jobs:
        del jobs[job_id]

    return {"success": True, "message": "Project deleted successfully"}


# ==========================================
# YOUTUBE OAUTH 2.0 & PERSONAL CHANNEL APIs
# ==========================================

@app.get("/auth/youtube/url")
def get_youtube_oauth_url(user: Dict[str, Any] = Depends(get_current_user_optional), user_id: Optional[str] = None):
    """Generate Google OAuth 2.0 authorization URL for authenticating user's YouTube channel."""
    uid = user.get("id") if user.get("is_authenticated") else (user_id or "guest")
    auth_url = get_oauth_authorization_url(uid)
    return {"auth_url": auth_url}


@app.get("/auth/youtube/callback")
def handle_youtube_oauth_callback(code: str, state: Optional[str] = None, error: Optional[str] = None):
    """
    Handle Google OAuth 2.0 redirect callback.
    Exchanges code for access/refresh tokens and fetches the user's OWN channel via mine=true.
    """
    import urllib.parse

    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}/?youtube_error={urllib.parse.quote(error)}")

    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?youtube_error=missing_code")

    user_id = state or "guest"
    try:
        # 1. Exchange code for tokens
        tokens = exchange_code_for_tokens(code)
        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        token_expiry = time.time() + expires_in

        # 2. Fetch user's own channel (mine=true)
        channel_profile = fetch_user_channel_profile(access_token)

        # 3. Store channel data mapped to this user_id
        channel_data = {
            **channel_profile,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expiry": token_expiry,
        }
        save_user_youtube_channel(user_id, channel_data)

        return RedirectResponse(url=f"{FRONTEND_URL}/?youtube_connected=true")
    except Exception as e:
        print(f"[YouTube OAuth] Callback processing error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?youtube_error={urllib.parse.quote(str(e))}")


@app.get("/auth/youtube/status")
def get_youtube_channel_status(user: Dict[str, Any] = Depends(get_current_user_optional), user_id: Optional[str] = None):
    """Check if current user has connected their verified YouTube channel."""
    uid = user.get("id") if user.get("is_authenticated") else (user_id or "guest")
    channel = get_user_youtube_channel(uid)
    if not channel:
        return {"connected": False, "channel": None}

    return {
        "connected": True,
        "channel": {
            "channel_id": channel.get("channel_id"),
            "channel_title": channel.get("channel_title"),
            "channel_handle": channel.get("channel_handle"),
            "channel_thumbnail": channel.get("channel_thumbnail"),
            "subscriber_count": channel.get("subscriber_count"),
            "video_count": channel.get("video_count"),
            "connected_at": channel.get("connected_at"),
        }
    }


@app.get("/auth/youtube/my-videos")
def get_user_authenticated_videos(user: Dict[str, Any] = Depends(get_current_user_optional), user_id: Optional[str] = None):
    """Retrieve recent uploaded videos directly from the user's connected YouTube channel."""
    uid = user.get("id") if user.get("is_authenticated") else (user_id or "guest")
    channel = get_user_youtube_channel(uid)
    if not channel:
        return {
            "connected": False,
            "videos": [],
            "message": "No YouTube channel connected. Please connect your channel first."
        }

    try:
        access_token = get_valid_access_token(uid, channel)
        uploads_playlist_id = channel.get("uploads_playlist_id")
        
        videos = fetch_auth_channel_videos(access_token, uploads_playlist_id, max_results=24)
        return {
            "connected": True,
            "channel": {
                "channel_id": channel.get("channel_id"),
                "channel_title": channel.get("channel_title"),
                "channel_handle": channel.get("channel_handle"),
                "channel_thumbnail": channel.get("channel_thumbnail"),
            },
            "videos": videos
        }
    except Exception as e:
        print(f"[YouTube Videos] Error fetching channel videos: {e}")
        return {
            "connected": True,
            "channel": {
                "channel_id": channel.get("channel_id"),
                "channel_title": channel.get("channel_title"),
                "channel_handle": channel.get("channel_handle"),
                "channel_thumbnail": channel.get("channel_thumbnail"),
            },
            "videos": [],
            "error": str(e)
        }


@app.get("/auth/youtube/my-streams")
def get_user_authenticated_streams(user: Dict[str, Any] = Depends(get_current_user_optional), user_id: Optional[str] = None):
    """Retrieve ONLY live streams and stream VODs from the user's connected YouTube channel."""
    uid = user.get("id") if user.get("is_authenticated") else (user_id or "guest")
    channel = get_user_youtube_channel(uid)
    if not channel:
        return {
            "connected": False,
            "streams": [],
            "message": "No YouTube channel connected. Please connect your channel first."
        }

    try:
        access_token = get_valid_access_token(uid, channel)
        uploads_playlist_id = channel.get("uploads_playlist_id")
        channel_id = channel.get("channel_id")
        streams = fetch_channel_streams(access_token, uploads_playlist_id, channel_id)
        return {
            "connected": True,
            "channel": {
                "channel_id": channel.get("channel_id"),
                "channel_title": channel.get("channel_title"),
                "channel_handle": channel.get("channel_handle"),
                "channel_thumbnail": channel.get("channel_thumbnail"),
                "subscriber_count": channel.get("subscriber_count"),
                "video_count": channel.get("video_count"),
            },
            "streams": streams
        }
    except Exception as e:
        print(f"[YouTube Streams] Error fetching channel streams: {e}")
        return {
            "connected": True,
            "channel": {
                "channel_id": channel.get("channel_id"),
                "channel_title": channel.get("channel_title"),
                "channel_handle": channel.get("channel_handle"),
                "channel_thumbnail": channel.get("channel_thumbnail"),
            },
            "streams": [],
            "error": str(e)
        }


@app.post("/auth/youtube/disconnect")
def disconnect_youtube_channel(user: Dict[str, Any] = Depends(get_current_user_optional), user_id: Optional[str] = None):
    """Disconnect and unlink the user's YouTube channel."""
    uid = user.get("id") if user.get("is_authenticated") else (user_id or "guest")
    deleted = delete_user_youtube_channel(uid)
    return {"success": deleted, "message": "YouTube channel disconnected successfully."}


def is_valid_youtube_url(url: str) -> bool:
    if not url:
        return False
    u = url.strip().lower()
    return any(domain in u for domain in [
        "youtube.com/watch",
        "youtu.be/",
        "youtube.com/shorts/",
        "youtube.com/live/",
        "m.youtube.com/watch",
        "youtube.com/clip/",
    ])


@app.post("/stream/probe")
def probe_stream_endpoint(request: ProbeRequest):
    """Fast pre-flight stream inspection: returns duration, title, channel name, and live status in ~1-2 seconds."""
    raw_url = request.youtube_url.strip() if request.youtube_url else ""
    if not raw_url:
        raise HTTPException(status_code=400, detail="YouTube URL must be provided.")
    if not is_valid_youtube_url(raw_url):
        raise HTTPException(
            status_code=400,
            detail=f"'{raw_url}' is not a valid YouTube video URL. Please enter a valid YouTube link."
        )
    meta = probe_stream_metadata(raw_url)
    dur = float(meta.get("duration") or 0.0)
    if dur > MAX_STREAM_DURATION_SECONDS:
        dur_str = format_duration(dur)
        raise HTTPException(
            status_code=400,
            detail=f"This video/stream is {dur_str}. Videos and streams are capped at {int(MAX_STREAM_DURATION_HOURS)} hours to maintain maximum server performance."
        )
    if meta.get("is_live"):
        raise HTTPException(
            status_code=400,
            detail="This stream is currently broadcasting LIVE. Please wait until the live stream finishes before creating shorts."
        )
    return meta



@app.post("/channel/videos")
def get_channel_videos(
    request: ChannelVideosRequest,
    user: Dict[str, Any] = Depends(get_current_user_optional)
):
    """
    Fetch the latest uploads for a given YouTube channel or handle using yt-dlp flat extraction.
    Falls back gracefully to high-retention creator demo videos if offline, rate-limited, or handle is empty.
    """
    target = (request.channel_url or request.channel_handle or "").strip()
    if not target:
        target = "risewithius"
    
    # Normalize channel URL / handle
    if not target.startswith("http://") and not target.startswith("https://"):
        clean_handle = target if target.startswith("@") else f"@{target}"
        channel_url = f"https://www.youtube.com/{clean_handle}/videos"
    else:
        channel_url = target
        if not channel_url.endswith("/videos") and not channel_url.endswith("/featured"):
            channel_url = channel_url.rstrip("/") + "/videos"

    videos = []
    try:
        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'playlist_items': '1-12',
            'nocheckcertificate': True,
            'no_color': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(channel_url, download=False)
            if info and "entries" in info:
                for entry in info["entries"]:
                    if not entry:
                        continue
                    v_id = entry.get("id") or ""
                    v_url = entry.get("url") or (f"https://www.youtube.com/watch?v={v_id}" if v_id else "")
                    if v_url and not v_url.startswith("http"):
                        v_url = f"https://www.youtube.com/watch?v={v_id}"
                    dur = float(entry.get("duration") or 0.0)
                    thumb = entry.get("thumbnail") or (f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg" if v_id else "")
                    videos.append({
                        "id": v_id,
                        "title": entry.get("title") or "Untitled Video",
                        "url": v_url,
                        "duration": dur,
                        "duration_formatted": format_duration(dur) if dur > 0 else "Video",
                        "thumbnail": thumb,
                        "view_count": entry.get("view_count") or 0,
                        "uploader": entry.get("uploader") or info.get("channel") or target
                    })
    except Exception as e:
        print(f"[Channel Fetch Notice] yt-dlp notice for {channel_url}: {e}")

    # Fallback to high quality creator videos if channel is empty, private, or blocked
    if not videos:
        fallback_demos = [
            {
                "id": "aircAruvnKk",
                "title": "3Blue1Brown - Neural Networks & Deep Learning Essentials",
                "url": "https://www.youtube.com/watch?v=aircAruvnKk",
                "duration": 1153.0,
                "duration_formatted": "19m 13s",
                "thumbnail": "https://img.youtube.com/vi/aircAruvnKk/hqdefault.jpg",
                "view_count": 14200000,
                "uploader": "3Blue1Brown"
            },
            {
                "id": "b3Vy7hNDfBQ",
                "title": "Veritasium - How One Hacker Almost Destroyed The Web",
                "url": "https://www.youtube.com/watch?v=b3Vy7hNDfBQ",
                "duration": 1040.0,
                "duration_formatted": "17m 20s",
                "thumbnail": "https://img.youtube.com/vi/b3Vy7hNDfBQ/hqdefault.jpg",
                "view_count": 8900000,
                "uploader": "Veritasium"
            },
            {
                "id": "0e3GPea1Tyg",
                "title": "MrBeast - I Survived 50 Hours In A Maximum Security Prison",
                "url": "https://www.youtube.com/watch?v=0e3GPea1Tyg",
                "duration": 724.0,
                "duration_formatted": "12m 04s",
                "thumbnail": "https://img.youtube.com/vi/0e3GPea1Tyg/hqdefault.jpg",
                "view_count": 185000000,
                "uploader": "MrBeast"
            },
            {
                "id": "UF8uR6Z6KLc",
                "title": "Steve Jobs - 2005 Stanford Commencement Address",
                "url": "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
                "duration": 904.0,
                "duration_formatted": "15m 04s",
                "thumbnail": "https://img.youtube.com/vi/UF8uR6Z6KLc/hqdefault.jpg",
                "view_count": 42000000,
                "uploader": "Stanford"
            },
            {
                "id": "r7zJ8srWWjk",
                "title": "Lex Fridman & Sam Altman - OpenAI, GPT-5 & AGI Future",
                "url": "https://www.youtube.com/watch?v=r7zJ8srWWjk",
                "duration": 7200.0,
                "duration_formatted": "2h 00m",
                "thumbnail": "https://img.youtube.com/vi/r7zJ8srWWjk/hqdefault.jpg",
                "view_count": 4100000,
                "uploader": "Lex Fridman"
            },
            {
                "id": "D-b_T_rT-Uo",
                "title": "Andrew Huberman - Optimize Your Sleep & Energy Architecture",
                "url": "https://www.youtube.com/watch?v=D-b_T_rT-Uo",
                "duration": 5400.0,
                "duration_formatted": "1h 30m",
                "thumbnail": "https://img.youtube.com/vi/D-b_T_rT-Uo/hqdefault.jpg",
                "view_count": 3200000,
                "uploader": "Huberman Lab"
            }
        ]
        return {
            "channel": target,
            "count": len(fallback_demos),
            "videos": fallback_demos,
            "is_fallback": True
        }

    return {
        "channel": target,
        "count": len(videos),
        "videos": videos,
        "is_fallback": False
    }


@app.post("/upload/file")
async def upload_local_video(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user_optional)
):
    """
    Accepts video file uploads from user's laptop (MP4, MOV, MKV, WEBM).
    Saves to downloads/uploads directory and inspects duration.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Please upload an MP4, MOV, MKV, or WEBM video file."
        )

    upload_dir = os.path.join("downloads", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex[:10]}_{file.filename}"
    save_path = os.path.join(upload_dir, unique_name)

    file_size = 0
    with open(save_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            buffer.write(chunk)
            file_size += len(chunk)

    try:
        dur = get_video_duration(save_path)
    except Exception:
        dur = 60.0

    size_mb = round(file_size / (1024 * 1024), 2)
    return {
        "success": True,
        "file_path": save_path,
        "file_name": file.filename,
        "duration": dur,
        "duration_formatted": format_duration(dur),
        "size_mb": size_mb,
        "title": os.path.splitext(file.filename)[0]
    }


@app.post("/process")
def process_video(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Accept a YouTube URL or local file path, verify & deduct daily credit, and run clipping pipeline in background."""
    user_id = user["id"]
    target_source = ""
    is_local = False
    
    if request.local_file_path and os.path.exists(request.local_file_path):
        target_source = request.local_file_path
        is_local = True
    elif request.youtube_url and os.path.exists(request.youtube_url):
        target_source = request.youtube_url
        is_local = True
    elif request.youtube_url:
        raw_url = request.youtube_url.strip()
        if not is_valid_youtube_url(raw_url):
            raise HTTPException(
                status_code=400,
                detail=f"'{raw_url}' is not a valid YouTube video URL. Please paste a link like https://www.youtube.com/watch?v=... or https://youtu.be/..."
            )
        target_source = raw_url
    else:
        raise HTTPException(status_code=400, detail="Please provide a YouTube video URL or upload a video file.")

    mode = (request.mode or "heuristic").lower()
    if mode not in ["heuristic", "ai_enhanced"]:
        mode = "heuristic"

    aspect_ratio = (request.aspect_ratio or "9:16").lower()
    if aspect_ratio not in ["9:16", "16:9"]:
        aspect_ratio = "9:16"

    content_type = (request.content_type or "shorts").lower()
    if content_type not in ["shorts", "stream"]:
        content_type = "shorts"

    stream_output_mode = (request.stream_output_mode or "single_reel").lower()
    if stream_output_mode not in ["single_reel", "both", "clips"]:
        stream_output_mode = "single_reel"

    video_title = request.title or ""
    video_dur = 0.0

    if is_local:
        try:
            video_dur = get_video_duration(target_source)
        except Exception:
            video_dur = 60.0
        if not video_title:
            video_title = os.path.splitext(os.path.basename(target_source))[0]
    else:
        # Pre-Flight Fast Metadata Inspection & 5-Hour Duration Cap (Runs before any download)
        meta = probe_stream_metadata(target_source)
        live_status = meta.get("live_status", "")
        if live_status == "is_live" or meta.get("is_live"):
            raise HTTPException(
                status_code=400,
                detail="Yeh live stream abhi chal rahi hai (Live). Stream khatam hone ke baad hi highlight clips banaye ja sakte hain!"
            )
        elif live_status == "is_upcoming":
            raise HTTPException(
                status_code=400,
                detail="Yeh stream abhi shuru nahi hui hai (Upcoming). Stream broadcast complete hone ke baad try karein!"
            )

        video_dur = meta.get("duration", 0.0)
        video_title = meta.get("title", "")
        if video_dur > MAX_STREAM_DURATION_SECONDS:
            dur_str = format_duration(video_dur)
            raise HTTPException(
                status_code=400,
                detail=f"This stream is {dur_str}. During early beta, streams are capped at {int(MAX_STREAM_DURATION_HOURS)} hours to ensure ultra-fast processing and zero server queue."
            )

    credit_deducted = False
    # In 'ai_enhanced' mode, 1 daily credit is deducted
    if mode == "ai_enhanced":
        has_credit = deduct_credit(user_id)
        if not has_credit:
            raise HTTPException(
                status_code=403,
                detail="Daily AI credit limit reached (0/3 remaining). Switch to 'Fast Highlights (Free)' mode for unlimited clips!"
            )
        credit_deducted = True

    job_id = str(uuid.uuid4())
    if content_type == "stream" or stream_output_mode in ["single_reel", "both"]:
        segment_duration = request.segment_duration if (request.segment_duration and request.segment_duration >= 60) else 180
        max_clips = request.max_clips or 5
    else:
        segment_duration = request.segment_duration or DEFAULT_SEGMENT_DURATION
        max_clips = request.max_clips or 3

    quality = (request.quality or "1080p").lower()
    if quality not in ["1080p", "720p", "480p", "best"]:
        quality = "1080p"

    mode_label = "AI Smart Moments" if mode == "ai_enhanced" else "Fast Highlights (Free)"
    type_label = "Stream Highlights" if content_type == "stream" else "Shorts"
    source_label = "Local Video" if is_local else "YouTube"
    ratio_label = "16:9 Widescreen" if aspect_ratio == "16:9" else "9:16 Vertical"
    
    jobs[job_id] = {
        "status": "processing",
        "step": "initializing",
        "progress": 5,
        "message": f"Initializing {mode_label} for {source_label} ({quality}, {ratio_label})...",
        "segment_duration": segment_duration,
        "max_clips": max_clips,
        "mode": mode,
        "aspect_ratio": aspect_ratio,
        "content_type": content_type,
        "stream_output_mode": stream_output_mode,
        "quality": quality,
        "stream_start_min": float(request.stream_start_min or 0.0),
        "stream_end_min": float(request.stream_end_min) if request.stream_end_min else None,
        "stream_title": video_title,
        "stream_duration": video_dur,
        "clips": [],
        "error": None
    }
    
    # Record job in database
    record_job(job_id, user_id, target_source, segment_duration)
    
    if request.selected_moments and len(request.selected_moments) > 0:
        max_clips = len(request.selected_moments)
        synth = False
    else:
        synth = request.synthesize_stories if request.synthesize_stories is not None else (mode == "ai_enhanced")
    background_tasks.add_task(
        process_video_task,
        job_id,
        user_id,
        target_source,
        segment_duration,
        mode,
        synth,
        credit_deducted,
        aspect_ratio,
        content_type,
        max_clips,
        stream_output_mode,
        quality,
        float(request.stream_start_min or 0.0),
        float(request.stream_end_min) if request.stream_end_min else None,
        request.selected_moments,
        request.caption_style or "hormozi",
        request.subtitle_language or "hinglish",
        request.layout_mode or "gaming_split"
    )
    
    current_credits = (user["credits_remaining"] - 1) if credit_deducted else user["credits_remaining"]
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 5,
        "mode": mode,
        "aspect_ratio": aspect_ratio,
        "content_type": content_type,
        "stream_title": video_title,
        "stream_duration": video_dur,
        "message": f"Initializing {mode_label} for {source_label} ({ratio_label})...",
        "credits_remaining": current_credits
    }



@app.post("/stream/process")
def process_stream_endpoint(
    request: StreamProcessRequest,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Dedicated endpoint for long gaming streams and VODs.
    Extracts high-intensity 16:9 climax highlights (buildup context + scream/clutch reactions)
    and stitches them into a master compilation with YouTube chapters.
    """
    raw_url = request.youtube_url.strip() if request.youtube_url else ""
    if not raw_url:
        raise HTTPException(status_code=400, detail="YouTube URL must be provided.")
    if not is_valid_youtube_url(raw_url):
        raise HTTPException(
            status_code=400,
            detail=f"'{raw_url}' is not a valid YouTube stream URL. Please paste a valid YouTube video or stream link."
        )

    user_id = user["id"]
    mode = (request.clipping_mode or "heuristic").lower()
    if mode not in ["heuristic", "ai_enhanced"]:
        mode = "heuristic"

    aspect_ratio = (request.aspect_ratio or "16:9").lower()
    if aspect_ratio not in ["16:9", "9:16"]:
        aspect_ratio = "16:9"

    stream_output_mode = (request.output_mode or "single_reel").lower()
    if stream_output_mode not in ["single_reel", "both", "clips"]:
        stream_output_mode = "single_reel"

    quality = (request.quality or "1080p").lower()
    if quality not in ["1080p", "720p", "480p", "best"]:
        quality = "1080p"

    meta = probe_stream_metadata(raw_url)
    live_status = meta.get("live_status", "")
    if live_status == "is_live" or meta.get("is_live"):
        raise HTTPException(
            status_code=400,
            detail="Yeh live stream abhi chal rahi hai (Live). Stream broadcast complete hone ke baad try karein!"
        )
    elif live_status == "is_upcoming":
        raise HTTPException(
            status_code=400,
            detail="Yeh stream abhi shuru nahi hui hai (Upcoming). Broadcast hone ke baad try karein!"
        )

    stream_dur = meta.get("duration", 0.0)
    if stream_dur > MAX_STREAM_DURATION_SECONDS:
        dur_str = format_duration(stream_dur)
        raise HTTPException(
            status_code=400,
            detail=f"This stream is {dur_str}. During early beta, streams are capped at {int(MAX_STREAM_DURATION_HOURS)} hours."
        )

    credit_deducted = False
    if mode == "ai_enhanced":
        has_credit = deduct_credit(user_id)
        if not has_credit:
            raise HTTPException(
                status_code=403,
                detail="Daily AI credit limit reached (0/3 remaining). Switch to 'Fast Highlights (Free)' mode for unlimited clips!"
            )
        credit_deducted = True

    job_id = str(uuid.uuid4())
    target_reel_dur = request.target_reel_duration or 300
    start_min = (request.start_time or 0.0) / 60.0
    end_min = (request.end_time / 60.0) if request.end_time else None

    # Calculate optimal number of clips for target duration
    if request.selected_moments and len(request.selected_moments) > 0:
        max_clips = len(request.selected_moments)
    elif target_reel_dur <= 120:
        max_clips = 3
    elif target_reel_dur <= 180:
        max_clips = 4
    elif target_reel_dur <= 300:
        max_clips = 6
    elif target_reel_dur <= 600:
        max_clips = 8
    else:
        max_clips = 10

    ratio_label = "16:9 Widescreen" if aspect_ratio == "16:9" else "9:16 Vertical"
    jobs[job_id] = {
        "status": "processing",
        "step": "initializing",
        "progress": 5,
        "message": f"Initializing Gemini Stream Engine ({quality}, {ratio_label}, {target_reel_dur // 60}m compilation)...",
        "segment_duration": target_reel_dur,
        "max_clips": max_clips,
        "mode": mode,
        "aspect_ratio": aspect_ratio,
        "content_type": "stream",
        "stream_output_mode": stream_output_mode,
        "quality": quality,
        "stream_start_min": start_min,
        "stream_end_min": end_min,
        "stream_title": meta.get("title", ""),
        "stream_duration": stream_dur,
        "clips": [],
        "error": None
    }

    record_job(job_id, user_id, raw_url, target_reel_dur)

    background_tasks.add_task(
        process_video_task,
        job_id,
        user_id,
        raw_url,
        target_reel_dur,
        mode,
        False,
        credit_deducted,
        aspect_ratio,
        "stream",
        max_clips,
        stream_output_mode,
        quality,
        start_min,
        end_min,
        request.selected_moments
    )

    current_credits = (user["credits_remaining"] - 1) if credit_deducted else user["credits_remaining"]
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 5,
        "message": f"Extracting 16:9 stream climax moments ({ratio_label}, {quality})...",
        "credits_remaining": current_credits
    }


@app.get("/status/{job_id}")
def get_job_status(job_id: str):
    """Return current detailed processing status, progress percentage, step, and clips list."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = jobs[job_id]
    response = {
        "job_id": job_id,
        "status": job["status"],
        "step": job.get("step", "processing"),
        "progress": job.get("progress", 0),
        "message": job.get("message", "Processing video...")
    }
    
    if job["status"] == "completed":
        response["clips"] = job["clips"]
    elif job["status"] == "failed":
        response["error"] = job["error"]
        
    return response


@app.head("/clips/{job_id}/{filename}")
def head_clip(job_id: str, filename: str):
    """Serve HEAD requests for preflight media probing by browsers."""
    clip_path = os.path.join("clips", job_id, filename)
    if not os.path.exists(clip_path):
        raise HTTPException(status_code=404, detail="Clip file not found")
    file_size = os.path.getsize(clip_path)
    ext = os.path.splitext(filename)[1].lower()
    media_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png" if ext == ".png" else "video/mp4"
    return Response(
        status_code=200,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": media_type,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
        }
    )


@app.get("/clips/{job_id}/{filename}")
def serve_clip(job_id: str, filename: str, request: Request):
    """
    Serve video clips with full HTTP Byte-Range (206 Partial Content) streaming support
    and inline Content-Disposition so browsers/mobile webviews play video immediately.
    Also serves thumbnail images (.jpg, .jpeg, .png).
    """
    clip_path = os.path.join("clips", job_id, filename)
    if not os.path.exists(clip_path):
        raise HTTPException(status_code=404, detail="Clip file not found")

    ext = os.path.splitext(filename)[1].lower()
    if ext in [".jpg", ".jpeg"]:
        return FileResponse(clip_path, media_type="image/jpeg", content_disposition_type="inline", headers={"Access-Control-Allow-Origin": "*"})
    elif ext == ".png":
        return FileResponse(clip_path, media_type="image/png", content_disposition_type="inline", headers={"Access-Control-Allow-Origin": "*"})

    # For MP4 video: Implement proper HTTP Range request handling for smooth HTML5 video playback
    file_size = os.path.getsize(clip_path)
    range_header = request.headers.get("range")

    if not range_header:
        def iter_full_file():
            with open(clip_path, "rb") as f:
                while chunk := f.read(1024 * 512):
                    yield chunk
        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": "video/mp4",
            "Content-Disposition": f'inline; filename="{filename}"',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges"
        }
        return StreamingResponse(iter_full_file(), status_code=200, headers=headers)

    # Parse byte range (e.g. bytes=0- or bytes=0-1048576 or bytes=500-)
    match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        raise HTTPException(status_code=416, detail="Invalid Range header")

    start = int(match.group(1))
    if match.group(2) and match.group(2).strip():
        end = min(int(match.group(2)), file_size - 1)
    else:
        end = file_size - 1

    if start > end or start >= file_size:
        raise HTTPException(status_code=416, detail="Requested range not satisfiable")

    content_length = (end - start) + 1

    def iter_byte_range():
        with open(clip_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            while remaining > 0:
                chunk_size = min(remaining, 1024 * 512)
                data = f.read(chunk_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "video/mp4",
        "Content-Disposition": f'inline; filename="{filename}"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges"
    }
    return StreamingResponse(iter_byte_range(), status_code=206, headers=headers)


@app.get("/download/proxy")
def download_proxy(url: str = Query(..., description="Target file URL"), filename: str = Query("clip.mp4")):
    """
    Force browser to download remote video file as an attachment
    (solves cross-origin download tag ignoring issues in browsers).
    """
    try:
        req = requests.get(url, stream=True, timeout=60)
        if req.status_code != 200:
            raise HTTPException(status_code=req.status_code, detail="Remote video could not be retrieved.")

        return StreamingResponse(
            req.iter_content(chunk_size=65536),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Allow-Origin": "*",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download proxy failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


@app.post("/moments/discover")
def discover_moments_endpoint(
    req: DiscoverMomentsRequest,
    user: Dict[str, Any] = Depends(get_current_user_optional)
):
    """
    Stage 1: Fast AI Viral Moments Discovery via Google Gemini 2.5 Flash.
    Returns potential viral moments with titles, timestamps, and virality scores.
    """
    source = (req.video_url or req.local_file_path or "").strip()
    if not source:
        raise HTTPException(
            status_code=400,
            detail="Please provide video_url or local_file_path to discover viral moments."
        )

    target_dur = req.target_duration or 45
    max_m = req.max_moments or 8
    try:
        from gemini_moments_discoverer import discover_viral_moments_gemini
        result = discover_viral_moments_gemini(
            video_source=source,
            target_duration=target_dur,
            max_moments=max_m,
            known_title=req.video_title,
            known_duration=req.duration,
            start_sec=req.start_sec,
            end_sec=req.end_sec
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Moment discovery failed: {str(e)}")
