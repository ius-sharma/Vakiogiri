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
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

from pipeline import (
    run_pipeline,
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
    delete_user_job
)
from auth import get_current_user, get_current_user_optional
from storage import upload_clips_and_cleanup, delete_job_files_from_supabase

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

# In-memory dictionary to track live job state
# Schema: { job_id: {"status": str, "step": str, "progress": int, "message": str, "clips": [...], "error": str | None} }
jobs: Dict[str, Dict[str, Any]] = {}


class ProbeRequest(BaseModel):
    youtube_url: str


class ProcessRequest(BaseModel):
    youtube_url: str
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
    stream_end_min: Optional[float] = None
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
            progress_callback=progress_callback
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
    return meta


@app.post("/process")
def process_video(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Accept a YouTube URL, verify & deduct daily credit, and run clipping pipeline in background."""
    raw_url = request.youtube_url.strip() if request.youtube_url else ""
    if not raw_url:
        raise HTTPException(status_code=400, detail="YouTube URL must be provided.")
        
    if not is_valid_youtube_url(raw_url):
        raise HTTPException(
            status_code=400,
            detail=f"'{raw_url}' is not a valid YouTube video URL. Please paste a link like https://www.youtube.com/watch?v=... or https://youtu.be/..."
        )
        
    user_id = user["id"]
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

    # Pre-Flight Fast Metadata Inspection & 5-Hour Duration Cap (Runs before any download)
    meta = probe_stream_metadata(raw_url)
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

    stream_dur = meta.get("duration", 0.0)
    if stream_dur > MAX_STREAM_DURATION_SECONDS:
        dur_str = format_duration(stream_dur)
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
    ratio_label = "16:9 Widescreen" if aspect_ratio == "16:9" else "9:16 Vertical"
    
    jobs[job_id] = {
        "status": "processing",
        "step": "initializing",
        "progress": 5,
        "message": f"Initializing {mode_label} for {type_label} ({quality}, {ratio_label})...",
        "segment_duration": segment_duration,
        "max_clips": max_clips,
        "mode": mode,
        "aspect_ratio": aspect_ratio,
        "content_type": content_type,
        "stream_output_mode": stream_output_mode,
        "quality": quality,
        "stream_start_min": float(request.stream_start_min or 0.0),
        "stream_end_min": float(request.stream_end_min) if request.stream_end_min else None,
        "stream_title": meta.get("title", ""),
        "stream_duration": stream_dur,
        "clips": [],
        "error": None
    }
    
    # Record job in database
    record_job(job_id, user_id, request.youtube_url.strip(), segment_duration)
    
    synth = request.synthesize_stories if request.synthesize_stories is not None else (mode == "ai_enhanced")
    background_tasks.add_task(
        process_video_task,
        job_id,
        user_id,
        request.youtube_url.strip(),
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
        float(request.stream_end_min) if request.stream_end_min else None
    )
    
    current_credits = (user["credits_remaining"] - 1) if credit_deducted else user["credits_remaining"]
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 5,
        "mode": mode,
        "aspect_ratio": aspect_ratio,
        "content_type": content_type,
        "stream_title": meta.get("title", ""),
        "stream_duration": stream_dur,
        "message": f"Initializing {mode_label} for {type_label} ({ratio_label})...",
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


@app.get("/clips/{job_id}/{filename}")
def serve_clip(job_id: str, filename: str):
    """Serve a specific generated video clip file locally if not on cloud."""
    clip_path = os.path.join("clips", job_id, filename)
    
    if not os.path.exists(clip_path):
        raise HTTPException(status_code=404, detail="Clip file not found")
        
    return FileResponse(
        path=clip_path,
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


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
