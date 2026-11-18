"""
Live Stream Radar Engine (Vakiogiri AI)
Provides real-time, non-destructive clipping from ongoing YouTube and Twitch live streams.
Zero full-stream download: uses DVR manifest slicing directly into high-res MP4 and
seamlessly renders into Vakiogiri vertical split layouts with kinetic captions.
"""

import os
import re
import json
import time
import uuid
import subprocess
from typing import Dict, Any, Optional, List, Callable
import yt_dlp

from vakiogiri_layout import VakiogiriLayoutEngine
from moment_detector import transcribe_video_audio
from storage import upload_file_to_supabase, is_storage_configured

COOKIE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")

def extract_video_id(url: str) -> Optional[str]:
    """Extract YouTube 11-char video ID from any URL format."""
    patterns = [
        r"(?:v=|\/|youtu\.be\/|embed\/|live\/)([0-9A-Za-z_-]{11})",
        r"^([0-9A-Za-z_-]{11})$"
    ]
    for p in patterns:
        m = re.search(p, url.strip())
        if m:
            return m.group(1)
    return None

def probe_live_stream_info(url: str) -> Dict[str, Any]:
    """
    Fast pre-flight check of an ongoing live stream.
    Returns title, live_status, is_live, thumbnail, concurrent viewers, and uploader.
    """
    clean_url = url.strip()
    video_id = extract_video_id(clean_url)
    
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'no_color': True,
        'extract_flat': False,
    }
    if os.path.exists(COOKIE_PATH):
        ydl_opts['cookiefile'] = COOKIE_PATH

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            if not info:
                return {
                    "is_live": False,
                    "live_status": "unknown",
                    "title": "Stream Not Found",
                    "video_id": video_id or "",
                    "error": "Could not retrieve stream details"
                }

            live_status = str(info.get("live_status") or ("is_live" if info.get("is_live") else "not_live"))
            is_live = bool(info.get("is_live") or live_status == "is_live")
            was_live = bool(info.get("was_live") or live_status in ["post_live", "was_live"])
            
            vid = info.get("id") or video_id or ""
            title = info.get("title") or "Live Stream"
            uploader = info.get("uploader") or info.get("channel") or "Unknown Streamer"
            thumbnail = info.get("thumbnail") or (f"https://img.youtube.com/vi/{vid}/maxresdefault.jpg" if vid else "")
            viewers = info.get("concurrent_view_count")

            return {
                "is_live": is_live,
                "was_live": was_live,
                "live_status": live_status,
                "title": title,
                "uploader": uploader,
                "video_id": vid,
                "thumbnail": thumbnail,
                "concurrent_view_count": viewers,
                "channel_url": info.get("channel_url") or "",
                "duration": float(info.get("duration") or 0.0),
                "is_dvr_available": bool(is_live or was_live),
            }
    except Exception as e:
        # Fallback to oEmbed if yt-dlp fails
        err_msg = str(e)
        title = "Live Stream"
        uploader = "Streamer"
        thumb = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg" if video_id else ""
        try:
            import urllib.request
            oe_url = f"https://www.youtube.com/oembed?url={clean_url}&format=json"
            req = urllib.request.Request(oe_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=4) as r:
                d = json.loads(r.read().decode("utf-8"))
                title = d.get("title") or title
                uploader = d.get("author_name") or uploader
                thumb = d.get("thumbnail_url") or thumb
        except Exception:
            pass

        return {
            "is_live": True, # Assume potentially live if oEmbed worked or user provided live link
            "was_live": False,
            "live_status": "is_live",
            "title": title,
            "uploader": uploader,
            "video_id": video_id or "",
            "thumbnail": thumb,
            "concurrent_view_count": None,
            "notice": err_msg,
        }

def slice_ongoing_stream_segment(
    url: str,
    start_sec: float,
    end_sec: float,
    output_path: str,
    quality: str = "1080p",
    progress_cb: Optional[Callable[[str, int, str], None]] = None
) -> str:
    """
    Extracts a time segment directly from an ongoing stream using yt-dlp DVR section slicing.
    Never downloads the whole stream!
    """
    if progress_cb:
        progress_cb("downloading", 20, f"Connecting to live DVR buffer ({round(start_sec, 1)}s -> {round(end_sec, 1)}s)...")

    duration = max(1.0, end_sec - start_sec)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Format selector
    if quality == "720p":
        fmt = "bestvideo[height<=720]+bestaudio/best[height<=720]"
    elif quality == "480p":
        fmt = "bestvideo[height<=480]+bestaudio/best[height<=480]"
    else:
        fmt = "bestvideo[height<=1080]+bestaudio/best[height<=1080]"

    section_spec = f"*{start_sec}-{end_sec}"
    
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--nocheckcertificate",
        "-f", fmt,
        "--download-sections", section_spec,
        "--force-keyframes-at-cuts",
        "-o", output_path,
        url
    ]
    if os.path.exists(COOKIE_PATH):
        cmd.extend(["--cookies", COOKIE_PATH])

    print(f"[Live Radar] Executing DVR slice: {' '.join(cmd)}")
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if p.returncode != 0 and not os.path.exists(output_path):
        err = p.stderr or p.stdout
        print(f"[Live Radar Error] yt-dlp slice failed: {err[-400:]}")
        raise RuntimeError(f"Failed to slice live stream DVR: {err[-300:]}")

    if not os.path.exists(output_path):
        # In case yt-dlp appended extension or parts
        base, _ = os.path.splitext(output_path)
        candidates = [output_path + ".mp4", output_path + ".mkv", base + ".mp4", base + ".mkv"]
        for c in candidates:
            if os.path.exists(c):
                os.rename(c, output_path)
                break

    if not os.path.exists(output_path):
        raise FileNotFoundError(f"Sliced video output file was not created: {output_path}")

    if progress_cb:
        progress_cb("slicing_complete", 50, "Live stream segment captured successfully.")

    return output_path

def process_live_clip_job(
    url: str,
    start_sec: float,
    end_sec: float,
    job_id: str,
    layout_mode: str = "gaming_split",
    aspect_ratio: str = "9:16",
    caption_preset: str = "hormozi",
    subtitle_language: str = "hinglish",
    quality: str = "1080p",
    title: Optional[str] = None,
    progress_cb: Optional[Callable[[str, int, str], None]] = None
) -> Dict[str, Any]:
    """
    Complete end-to-end processing for a live stream clip:
    1. Slice raw DVR window from live stream
    2. Analyze facecam (if vertical gaming layout selected)
    3. Transcribe audio & generate styled kinetic captions
    4. Render vertical 9:16 or horizontal 16:9 MP4
    5. Upload to cloud / save to disk
    """
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    clips_dir = os.path.join(workspace_dir, "clips", job_id)
    raw_sources_dir = os.path.join(workspace_dir, "raw_sources")
    os.makedirs(clips_dir, exist_ok=True)
    os.makedirs(raw_sources_dir, exist_ok=True)

    raw_segment_path = os.path.join(raw_sources_dir, f"live_{job_id}_raw.mp4")
    final_clip_filename = f"live_clip_{job_id}.mp4"
    final_clip_path = os.path.join(clips_dir, final_clip_filename)

    try:
        # Step 1: Slicing live stream
        slice_ongoing_stream_segment(
            url=url,
            start_sec=start_sec,
            end_sec=end_sec,
            output_path=raw_segment_path,
            quality=quality,
            progress_cb=progress_cb
        )

        # Step 2: Handle Aspect Ratio & Layout
        if aspect_ratio == "16:9" or layout_mode == "original":
            if progress_cb:
                progress_cb("rendering", 70, "Exporting 16:9 high-definition landscape clip...")
            
            # Simple remux/re-encode to clean PTS
            cmd = [
                "ffmpeg", "-y",
                "-i", raw_segment_path,
                "-vf", "setpts=PTS-STARTPTS",
                "-af", "asetpts=PTS-STARTPTS",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
                "-c:a", "aac", "-b:a", "192k",
                final_clip_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
        else:
            # 9:16 Vertical Short Layout via VakiogiriLayoutEngine
            if progress_cb:
                progress_cb("layout_analysis", 60, "Detecting facecam & computing dynamic layout split...")

            layout_engine = VakiogiriLayoutEngine()
            
            # Facecam detection
            facecam_box = layout_engine.detect_facecam_box(raw_segment_path)
            
            # Transcribe for kinetic captions
            ass_subtitle_path = None
            if caption_preset and caption_preset != "none":
                if progress_cb:
                    progress_cb("transcribing", 75, f"Generating {caption_preset.upper()} dynamic kinetic captions...")
                
                try:
                    slice_wav = os.path.join(clips_dir, f"temp_{job_id}.wav")
                    subprocess.run([
                        "ffmpeg", "-y", "-i", raw_segment_path,
                        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                        slice_wav
                    ], check=True, capture_output=True)

                    if os.path.exists(slice_wav):
                        try:
                            speech_segments = transcribe_video_audio(slice_wav, subtitle_language=subtitle_language)
                            if speech_segments:
                                ass_subtitle_path = os.path.join(clips_dir, f"live_{job_id}.ass")
                                layout_engine.generate_center_ass_subtitles(
                                    speech_segments=speech_segments,
                                    output_path=ass_subtitle_path,
                                    video_w=1080,
                                    video_h=1920,
                                    caption_style=caption_preset,
                                    layout_mode=layout_mode,
                                    subtitle_language=subtitle_language
                                )
                        finally:
                            if os.path.exists(slice_wav):
                                try:
                                    os.remove(slice_wav)
                                except Exception:
                                    pass
                except Exception as tr_err:
                    print(f"[Live Radar Warning] Transcription error: {tr_err}")

            if progress_cb:
                progress_cb("rendering", 85, "Synthesizing vertical 9:16 layout with zero-drift PTS...")

            filtergraph = layout_engine.build_ffmpeg_filter(
                target_w=1080,
                target_h=1920,
                facecam_box=facecam_box,
                ass_subtitle_path=ass_subtitle_path,
                layout_mode=layout_mode
            )

            render_cmd = [
                "ffmpeg", "-y",
                "-i", raw_segment_path,
                "-filter_complex", filtergraph,
                "-map", "[outv]",
                "-map", "0:a?",
                "-af", "asetpts=PTS-STARTPTS",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "19",
                "-c:a", "aac",
                "-b:a", "192k",
                final_clip_path
            ]
            r = subprocess.run(render_cmd, capture_output=True, text=True)
            if r.returncode != 0:
                print(f"[Live Radar Render Error] FFmpeg failed: {r.stderr[-500:]}")
                raise RuntimeError(f"FFmpeg vertical render failed: {r.stderr[-300:]}")

        # Step 3: Cloud Upload if configured
        clip_url = f"/clips/{job_id}/{final_clip_filename}"
        is_cloud = False
        if is_storage_configured():
            try:
                public_url = upload_file_to_supabase(
                    local_file_path=final_clip_path,
                    job_id=job_id,
                    filename=final_clip_filename,
                    content_type="video/mp4"
                )
                if public_url:
                    clip_url = public_url
                    is_cloud = True
            except Exception as up_err:
                print(f"[Live Radar Notice] Cloud upload notice: {up_err}")

        # Compute duration
        clip_duration = max(1.0, round(end_sec - start_sec, 2))

        result_data = {
            "job_id": job_id,
            "filename": final_clip_filename,
            "url": clip_url,
            "is_cloud": is_cloud,
            "title": title or f"Live Highlight ({round(start_sec, 0)}s - {round(end_sec, 0)}s)",
            "start": start_sec,
            "end": end_sec,
            "duration": clip_duration,
            "aspect_ratio": aspect_ratio,
            "layout_mode": layout_mode,
            "caption_preset": caption_preset,
            "quality": quality,
            "created_at": time.time(),
        }

        if progress_cb:
            progress_cb("completed", 100, "Live clip rendered and ready to watch!")

        return result_data

    finally:
        # Clean up temporary raw source
        if os.path.exists(raw_segment_path):
            try:
                os.remove(raw_segment_path)
            except Exception:
                pass
