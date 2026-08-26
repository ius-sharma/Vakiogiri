# uvicorn main:app --reload --port 8000

import os
import uuid
import requests
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

from pipeline import run_pipeline, DEFAULT_SEGMENT_DURATION
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

# CORS middleware for Next.js frontend running on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dictionary to track live job state
# Schema: { job_id: {"status": str, "step": str, "progress": int, "message": str, "clips": [...], "error": str | None} }
jobs: Dict[str, Dict[str, Any]] = {}


class ProcessRequest(BaseModel):
    youtube_url: str
    segment_duration: Optional[int] = Field(default=DEFAULT_SEGMENT_DURATION, ge=15, le=180)


def process_video_task(job_id: str, user_id: str, youtube_url: str, segment_duration: int):
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
        print(f"[Job {job_id}] Processing completed successfully. Stored {len(uploaded_clips)} clip(s).")
        
    except Exception as e:
        print(f"[Job {job_id}] Processing failed with error: {e}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["step"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["message"] = f"Failed: {str(e)}"
        
        # Refund credit to user on failure
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
    
    # Check and deduct 1 credit (Daily 3 video generations quota)
    has_credit = deduct_credit(user_id)
    if not has_credit:
        raise HTTPException(
            status_code=403,
            detail="Daily limit reached (0/3 generations remaining). Your quota resets at midnight UTC!"
        )

    job_id = str(uuid.uuid4())
    segment_duration = request.segment_duration or DEFAULT_SEGMENT_DURATION
    
    jobs[job_id] = {
        "status": "processing",
        "step": "initializing",
        "progress": 5,
        "message": "Initializing video clipping job...",
        "segment_duration": segment_duration,
        "clips": [],
        "error": None
    }
    
    # Record job in database
    record_job(job_id, user_id, request.youtube_url.strip(), segment_duration)
    
    background_tasks.add_task(
        process_video_task,
        job_id,
        user_id,
        request.youtube_url.strip(),
        segment_duration
    )
    
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 5,
        "message": "Initializing video clipping job...",
        "credits_remaining": user["credits_remaining"] - 1
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
