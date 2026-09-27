import os
import sys
import shutil
import subprocess
import math
import json
from typing import List, Callable, Optional, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import yt_dlp
from moment_detector import detect_best_moments, transcribe_video_audio
from story_synthesizer import synthesize_story_blueprints, stitch_synthesized_story

# ==============================================================================
# CONFIGURATION CONSTANTS
# ==============================================================================
DEFAULT_SEGMENT_DURATION = 45  # seconds
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
MAX_CLIPS_PER_VIDEO = 3


def check_ffmpeg_installed() -> bool:
    """Verify that ffmpeg and ffprobe are available in system PATH."""
    ffmpeg_path = shutil.which("ffmpeg")
    ffprobe_path = shutil.which("ffprobe")
    
    missing = []
    if not ffmpeg_path:
        missing.append("ffmpeg")
    if not ffprobe_path:
        missing.append("ffprobe")
        
    if missing:
        raise RuntimeError(f"The following required executable(s) were not found in system PATH: {', '.join(missing)}")
    return True


def download_video(url: str, output_dir: str, progress_callback: Optional[Callable[[str, int, str], None]] = None) -> str:
    """Download video from YouTube using yt-dlp in max 1080p quality into output_dir."""
    print(f"[1/4] Starting download for: {url}")
    if progress_callback:
        progress_callback("downloading", 10, "Connecting to YouTube and downloading video...")

    os.makedirs(output_dir, exist_ok=True)
    
    def ytdl_hook(d):
        if d.get('status') == 'downloading' and progress_callback:
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            if total > 0:
                percent = int(10 + (downloaded / total) * 20)  # 10% to 30%
                progress_callback("downloading", percent, f"Downloading video ({percent}%)...")

    ydl_opts = {
        'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
        'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
        'merge_output_format': 'mp4',
        'windowsfilenames': True,
        'quiet': False,
        'no_warnings': False,
        'nocheckcertificate': True,
        'geo_bypass': True,
        'progress_hooks': [ytdl_hook],
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios'],
            }
        },
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        
        base, _ = os.path.splitext(filename)
        mp4_filename = base + ".mp4"
        
        if os.path.exists(mp4_filename):
            final_path = mp4_filename
        elif os.path.exists(filename):
            final_path = filename
        else:
            files = [os.path.join(output_dir, f) for f in os.listdir(output_dir)]
            if not files:
                raise FileNotFoundError("Downloaded file could not be found.")
            final_path = max(files, key=os.path.getmtime)

    print(f"[1/4] Download complete: {os.path.basename(final_path)}")
    if progress_callback:
        progress_callback("analyzing", 35, "Download complete. Reading video duration...")
    return final_path


def get_video_duration(video_path: str) -> float:
    """Get total duration of the video in seconds using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        video_path
    ]
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        duration = float(result.stdout.strip())
        print(f"  -> Extracted video duration: {duration:.2f} seconds")
        return duration
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Reading video duration with ffprobe failed: {e.stderr}")
    except ValueError:
        raise ValueError("Parsing video duration from ffprobe output failed.")


def split_and_crop_video(
    video_path: str,
    output_dir: str,
    duration: float,
    moments: Optional[List[Dict[str, Any]]] = None,
    segment_len: int = DEFAULT_SEGMENT_DURATION,
    max_clips: int = MAX_CLIPS_PER_VIDEO,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[str]:
    """
    Split and crop video into 9:16 vertical (1080x1920) clips based on dynamic best moments
    (or fallback uniform segments).
    """
    os.makedirs(output_dir, exist_ok=True)
    vf_filter = f"scale={TARGET_WIDTH}:{TARGET_HEIGHT}:force_original_aspect_ratio=increase,crop={TARGET_WIDTH}:{TARGET_HEIGHT}"

    # Use dynamically detected moments if provided; otherwise fallback to uniform split
    clip_targets = []
    if moments and len(moments) > 0:
        for idx, m in enumerate(moments[:max_clips]):
            s_time = max(0.0, float(m["start"]))
            e_time = min(duration, float(m["end"]))
            clip_dur = max(1.0, e_time - s_time)
            clip_targets.append({
                "start": s_time,
                "duration": clip_dur,
                "title": m.get("title", f"Clip {idx + 1}"),
                "score": m.get("score", 85),
                "heatmap_score": m.get("heatmap_score")
            })
    else:
        total_available_segments = math.ceil(duration / segment_len)
        num_segments = min(total_available_segments, max_clips)
        for i in range(num_segments):
            s_time = i * segment_len
            clip_dur = min(float(segment_len), max(1.0, duration - s_time))
            clip_targets.append({
                "start": s_time,
                "duration": clip_dur,
                "title": f"Clip {i + 1}",
                "score": 75
            })

    num_clips = len(clip_targets)
    print(f"[3/4] Cropping and rendering {num_clips} dynamic 9:16 vertical clip(s)...")

    created_clips = []
    for i, target in enumerate(clip_targets):
        start_time = target["start"]
        clip_dur = target["duration"]
        clip_name = f"clip_{i + 1}.mp4"
        clip_path = os.path.join(output_dir, clip_name)
        
        # Calculate progress between 75% and 92%
        if progress_callback:
            clip_progress = int(75 + ((i + 1) / max(1, num_clips)) * 17)
            progress_callback(
                "clipping",
                clip_progress,
                f"Cropping & rendering clip {i + 1} of {num_clips} ('{target['title']}', score {target['score']})..."
            )

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(start_time),
            "-t", str(clip_dur),
            "-i", video_path,
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            clip_path
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            safe_title = str(target.get('title', '')).encode('ascii', 'replace').decode('ascii')
            print(f"  -> Created {clip_name} (starts at {start_time:.1f}s, len: {clip_dur:.1f}s, score: {target['score']}, title: '{safe_title}')")
            created_clips.append({
                "filename": clip_name,
                "title": target["title"],
                "score": target["score"],
                "heatmap_score": target.get("heatmap_score"),
                "start": round(start_time, 2),
                "end": round(start_time + clip_dur, 2),
                "duration": round(clip_dur, 2)
            })
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed creating clip {clip_name}: {e.stderr}")

    # Persist clip metadata.json for the frontend, critic agent, and API consumers
    try:
        meta_file = os.path.join(output_dir, "metadata.json")
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(created_clips, f, indent=2)
        print(f"[Pipeline] Saved {len(created_clips)} clip records to {meta_file}")
    except Exception as meta_err:
        print(f"[Pipeline Warning] Could not write metadata.json: {meta_err}")

    return created_clips


def run_pipeline(
    youtube_url: str,
    clips_output_dir: str,
    download_dir: str = "downloads",
    segment_duration: int = DEFAULT_SEGMENT_DURATION,
    max_clips: int = MAX_CLIPS_PER_VIDEO,
    synthesize_stories: bool = False,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[Dict[str, Any]]:
    """
    Run complete AI video clipping pipeline:
    1. Download YouTube video
    2. Extract duration
    3. Run 3-Stage Smart Best Moment Detector
    4. Render dynamic 9:16 center-cropped clips
    5. Clean up temporary download artifacts
    """
    check_ffmpeg_installed()
    
    try:
        if progress_callback:
            progress_callback("initializing", 5, "Initializing pipeline...")

        # 1. Download YouTube video
        video_path = download_video(youtube_url, download_dir, progress_callback)
        
        # 2. Extract Duration
        duration = get_video_duration(video_path)
        
        # 3. Detect Best Moments using 3-Stage Scoring
        moments = detect_best_moments(
            video_path=video_path,
            youtube_url=youtube_url,
            duration=duration,
            target_duration=segment_duration,
            top_k=max_clips,
            progress_callback=progress_callback
        )
        
        # 4. Crop & Split dynamically identified moments
        clips = split_and_crop_video(
            video_path=video_path,
            output_dir=clips_output_dir,
            duration=duration,
            moments=moments,
            segment_len=segment_duration,
            max_clips=max_clips,
            progress_callback=progress_callback
        )

        # 5. Optional Non-Linear Story Synthesis (Franken-Editing)
        if synthesize_stories:
            try:
                if progress_callback:
                    progress_callback("synthesizing_stories", 88, "Synthesizing non-linear narrative micro-stories...")
                segs = transcribe_video_audio(video_path)
                blueprints = synthesize_story_blueprints(segs, duration, max_stories=3)
                for s_idx, bp in enumerate(blueprints):
                    synth_filename = f"synth_clip_{s_idx+1}.mp4"
                    synth_path = os.path.join(clips_output_dir, synth_filename)
                    if stitch_synthesized_story(video_path, bp, synth_path):
                        clips.append({
                            "filename": synth_filename,
                            "title": bp.get("title", f"Synthesized Story {s_idx+1}"),
                            "score": bp.get("score", 92),
                            "duration": bp.get("total_duration", 30.0),
                            "angle": bp.get("angle", "Narrative Story"),
                            "rationale": bp.get("rationale", ""),
                            "sub_segments": bp.get("segments", []),
                            "is_synthesized": True
                        })
                meta_file = os.path.join(clips_output_dir, "metadata.json")
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(clips, f, indent=2)
                print(f"[Pipeline] Added {len(blueprints)} synthesized micro-stories to {meta_file}")
            except Exception as synth_err:
                print(f"[Pipeline] Story synthesis notice: {synth_err}")
        
        if progress_callback:
            progress_callback("cleaning", 95, "Purging raw temporary downloads...")
            
        return clips
        
    finally:
        # Guaranteed Zero-Disk-Waste Cleanup of the raw download folder
        if os.path.exists(download_dir):
            try:
                shutil.rmtree(download_dir)
                print(f"[Auto-Clean] Successfully purged raw download directory: {download_dir}")
            except Exception as clean_err:
                print(f"[Auto-Clean Warning] Could not remove download dir {download_dir}: {clean_err}")


