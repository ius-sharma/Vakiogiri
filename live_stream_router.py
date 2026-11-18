"""
Live Stream Router (FastAPI)
Provides dedicated endpoints for Live Stream Radar:
- Probe live stream status & metadata
- Submit real-time DVR clip extraction jobs
- Poll job progress and retrieve completed clips
Completely independent from other studio endpoints.
"""

import time
import uuid
import threading
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends

from live_stream_engine import probe_live_stream_info, process_live_clip_job
from auth import get_current_user_optional
from db import record_job, update_job_status, deduct_credit

router = APIRouter(prefix="/live-stream", tags=["Live Stream Radar"])

# In-memory status tracker for real-time live jobs
LIVE_JOBS: Dict[str, Dict[str, Any]] = {}
MAX_LIVE_JOBS_STORED = 100

class LiveStreamProbeRequest(BaseModel):
    url: str

class LiveStreamClipRequest(BaseModel):
    url: str
    start_sec: float = Field(..., ge=0.0, description="Start timestamp in seconds from beginning of stream")
    end_sec: float = Field(..., gt=0.0, description="End timestamp in seconds")
    layout_mode: str = Field(default="gaming_split", description="gaming_split | face_top_game_bottom | original")
    aspect_ratio: str = Field(default="9:16", description="9:16 | 16:9")
    caption_preset: str = Field(default="hormozi", description="hormozi | beast | karaoke | minimal | none")
    subtitle_language: str = Field(default="hinglish", description="hinglish | english | auto")
    quality: str = Field(default="1080p", description="1080p | 720p | 480p")
    title: Optional[str] = None

def _run_live_clip_worker(job_id: str, req: LiveStreamClipRequest, user_id: str):
    """Background worker for live stream clipping"""
    def progress_callback(step: str, progress: int, message: str):
        if job_id in LIVE_JOBS:
            LIVE_JOBS[job_id]["step"] = step
            LIVE_JOBS[job_id]["progress"] = progress
            LIVE_JOBS[job_id]["message"] = message

    try:
        progress_callback("starting", 10, "Initializing live stream radar connection...")
        
        result_data = process_live_clip_job(
            url=req.url,
            start_sec=req.start_sec,
            end_sec=req.end_sec,
            job_id=job_id,
            layout_mode=req.layout_mode,
            aspect_ratio=req.aspect_ratio,
            caption_preset=req.caption_preset,
            subtitle_language=req.subtitle_language,
            quality=req.quality,
            title=req.title,
            progress_cb=progress_callback
        )

        LIVE_JOBS[job_id]["status"] = "completed"
        LIVE_JOBS[job_id]["progress"] = 100
        LIVE_JOBS[job_id]["step"] = "done"
        LIVE_JOBS[job_id]["message"] = "Clip ready!"
        LIVE_JOBS[job_id]["clip"] = result_data

        # Update database if applicable
        try:
            update_job_status(job_id, "completed", clips_count=1, clips_data=[result_data])
        except Exception as db_err:
            print(f"[Live Radar DB Notice] {db_err}")

    except Exception as e:
        print(f"[Live Radar Worker Error] {e}")
        LIVE_JOBS[job_id]["status"] = "failed"
        LIVE_JOBS[job_id]["progress"] = 0
        LIVE_JOBS[job_id]["step"] = "error"
        LIVE_JOBS[job_id]["message"] = f"Extraction failed: {str(e)}"
        LIVE_JOBS[job_id]["error"] = str(e)
        try:
            update_job_status(job_id, "failed")
        except Exception:
            pass

@router.post("/probe")
def probe_live_stream(payload: LiveStreamProbeRequest):
    """
    Fast pre-flight check of an ongoing live stream URL.
    Returns status, title, viewer count, and live channel info.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Live stream URL cannot be empty.")
    
    meta = probe_live_stream_info(url)
    return {
        "success": True,
        "metadata": meta
    }

@router.post("/clip")
def create_live_stream_clip(
    payload: LiveStreamClipRequest,
    user: Dict[str, Any] = Depends(get_current_user_optional)
):
    """
    Submits a new live DVR slice job.
    Accepts start_sec and end_sec relative to stream start.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Stream URL is required.")

    if payload.end_sec <= payload.start_sec:
        raise HTTPException(status_code=400, detail="end_sec must be strictly greater than start_sec.")

    duration = payload.end_sec - payload.start_sec
    if duration > 300: # Max 5 min per instant live clip
        raise HTTPException(status_code=400, detail="Maximum clip duration is 300 seconds (5 minutes).")

    user_id = user.get("id") if user.get("is_authenticated") else "guest"

    # Verify / deduct credit if authenticated
    if user.get("is_authenticated"):
        has_credit = deduct_credit(user_id)
        if not has_credit:
            raise HTTPException(status_code=402, detail="Daily credit limit reached. Please upgrade or wait for daily reset.")

    job_id = str(uuid.uuid4())[:8]

    LIVE_JOBS[job_id] = {
        "job_id": job_id,
        "user_id": user_id,
        "url": url,
        "status": "processing",
        "progress": 10,
        "step": "initializing",
        "message": "Enqueuing live DVR capture...",
        "clip": None,
        "error": None,
        "created_at": time.time(),
        "params": payload.dict()
    }

    # Record job in database
    try:
        record_job(job_id, user_id, url, int(duration))
    except Exception as db_err:
        print(f"[Live Radar DB Notice] Record job notice: {db_err}")

    # Launch background thread
    t = threading.Thread(target=_run_live_clip_worker, args=(job_id, payload, user_id), daemon=True)
    t.start()

    return {
        "success": True,
        "job_id": job_id,
        "message": "Live clip extraction started.",
        "status": "processing"
    }

@router.get("/job/{job_id}")
def get_live_job_status(job_id: str):
    """
    Polls the current status, step, and progress percentage of a live clip job.
    """
    job = LIVE_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return {
        "job_id": job_id,
        "status": job.get("status"),
        "progress": job.get("progress", 0),
        "step": job.get("step"),
        "message": job.get("message"),
        "clip": job.get("clip"),
        "error": job.get("error")
    }

@router.get("/recent")
def get_recent_live_clips():
    """
    Retrieves the most recent completed live clips in memory.
    """
    completed = [
        j["clip"] for j in sorted(LIVE_JOBS.values(), key=lambda x: x.get("created_at", 0), reverse=True)
        if j.get("status") == "completed" and j.get("clip")
    ]
    return {
        "clips": completed[:20]
    }
