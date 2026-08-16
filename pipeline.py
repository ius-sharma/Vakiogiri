import os
import sys
import shutil
import subprocess
import math
from typing import List, Callable, Optional
import yt_dlp

# ==============================================================================
# CONFIGURATION CONSTANTS
# ==============================================================================
DEFAULT_SEGMENT_DURATION = 45  # seconds
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920


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
        'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]/best',
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'merge_output_format': 'mp4',
        'quiet': False,
        'no_warnings': False,
        'nocheckcertificate': True,
        'geo_bypass': True,
        'progress_hooks': [ytdl_hook],
        'extractor_args': {
            'youtube': {
                'player_client': ['mweb', 'ios', 'web', 'android'],
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us,en;q=0.5',
        }
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

    print(f"[1/4] Download complete: {final_path}")
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


MAX_CLIPS_PER_VIDEO = 5


def split_and_crop_video(
    video_path: str,
    output_dir: str,
    duration: float,
    segment_len: int = DEFAULT_SEGMENT_DURATION,
    max_clips: int = MAX_CLIPS_PER_VIDEO,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[str]:
    """Split video into fixed-length segments (up to max_clips) and crop/scale each segment to 1080x1920 (9:16)."""
    os.makedirs(output_dir, exist_ok=True)
    total_available_segments = math.ceil(duration / segment_len)
    num_segments = min(total_available_segments, max_clips)
    
    print(f"[2/4] Total video duration: {duration:.2f}s ({total_available_segments} available, creating {num_segments} clip(s) of max {segment_len}s)")
    print(f"[3/4] Splitting video into clips and cropping to 9:16 vertical ({TARGET_WIDTH}x{TARGET_HEIGHT})...")
    
    vf_filter = f"scale={TARGET_WIDTH}:{TARGET_HEIGHT}:force_original_aspect_ratio=increase,crop={TARGET_WIDTH}:{TARGET_HEIGHT}"

    created_clips = []
    for i in range(num_segments):
        start_time = i * segment_len
        clip_name = f"clip_{i + 1}.mp4"
        clip_path = os.path.join(output_dir, clip_name)
        
        # Calculate progress between 40% and 90%
        if progress_callback:
            clip_progress = int(40 + ((i + 1) / num_segments) * 50)
            progress_callback(
                "clipping",
                clip_progress,
                f"Cropping & rendering clip {i + 1} of {num_segments} ({segment_len}s)..."
            )

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(start_time),
            "-t", str(segment_len),
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
            print(f"  -> Created {clip_name} (starts at {start_time}s)")
            created_clips.append(clip_name)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed creating clip {clip_name}: {e.stderr}")

    return created_clips


def run_pipeline(
    youtube_url: str,
    clips_output_dir: str,
    download_dir: str = "downloads",
    segment_duration: int = DEFAULT_SEGMENT_DURATION,
    max_clips: int = MAX_CLIPS_PER_VIDEO,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[str]:
    """Run the complete download, duration reading, splitting pipeline, and cleanup."""
    check_ffmpeg_installed()
    
    try:
        if progress_callback:
            progress_callback("initializing", 5, "Initializing pipeline...")

        # 1. Download YouTube video
        video_path = download_video(youtube_url, download_dir, progress_callback)
        
        # 2. Extract Duration
        duration = get_video_duration(video_path)
        
        # 3. Crop & Split (up to max_clips)
        clips = split_and_crop_video(video_path, clips_output_dir, duration, segment_duration, max_clips, progress_callback)
        
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

