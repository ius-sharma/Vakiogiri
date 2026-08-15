# uvicorn main:app --reload --port 8000

import os
import uuid
from typing import Dict, Any, List
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from pipeline import run_pipeline

app = FastAPI(title="AI Video Clipping Platform Backend")

# CORS middleware for Next.js frontend running on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory dictionary to track job state
# Schema: { job_id: {"status": "processing" | "completed" | "failed", "clips": [...], "error": str | None} }
jobs: Dict[str, Dict[str, Any]] = {}


class ProcessRequest(BaseModel):
    youtube_url: str


def process_video_task(job_id: str, youtube_url: str):
    """Background task to run video processing pipeline for a given job_id."""
    clips_output_dir = os.path.join("clips", job_id)
    download_dir = os.path.join("downloads", job_id)
    
    try:
        clips = run_pipeline(youtube_url, clips_output_dir, download_dir)
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["clips"] = clips
        print(f"[Job {job_id}] Processing completed successfully. Created {len(clips)} clip(s).")
    except Exception as e:
        print(f"[Job {job_id}] Processing failed with error: {e}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@app.post("/process")
def process_video(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Accept a YouTube URL, initialize a job, and run clipping pipeline in background."""
    if not request.youtube_url or not request.youtube_url.strip():
        raise HTTPException(status_code=400, detail="youtube_url must be provided.")
        
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "processing",
        "clips": [],
        "error": None
    }
    
    background_tasks.add_task(process_video_task, job_id, request.youtube_url)
    
    return {
        "job_id": job_id,
        "status": "processing"
    }


@app.get("/status/{job_id}")
def get_job_status(job_id: str):
    """Return the current processing status and clips list for a job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = jobs[job_id]
    response = {
        "job_id": job_id,
        "status": job["status"]
    }
    
    if job["status"] == "completed":
        response["clips"] = job["clips"]
    elif job["status"] == "failed":
        response["error"] = job["error"]
        
    return response


@app.get("/clips/{job_id}/{filename}")
def serve_clip(job_id: str, filename: str):
    """Serve a specific generated video clip file."""
    clip_path = os.path.join("clips", job_id, filename)
    
    if not os.path.exists(clip_path):
        raise HTTPException(status_code=404, detail="Clip file not found")
        
    return FileResponse(path=clip_path, media_type="video/mp4", filename=filename)
