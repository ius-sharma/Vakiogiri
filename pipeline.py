import os
import sys
import shutil
import subprocess
import math
import json
import re
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
from stream_detector import detect_stream_audio_peaks, stitch_highlight_compilation

# ==============================================================================
# CONFIGURATION CONSTANTS
# ==============================================================================
DEFAULT_SEGMENT_DURATION = 45  # seconds (for shorts)
DEFAULT_STREAM_SEGMENT_DURATION = 180  # seconds (3 minutes for long-form stream highlights)
TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920
MAX_CLIPS_PER_VIDEO = 3
MAX_STREAM_CLIPS = 5

# Safety Guardrails for Stream & Video Length
MAX_STREAM_DURATION_HOURS = 5.0
MAX_STREAM_DURATION_SECONDS = int(MAX_STREAM_DURATION_HOURS * 3600)  # 18,000s = 5 hours


def strip_ansi(text: str) -> str:
    """Remove ANSI escape codes (e.g. \x1b[0;31m, [0;31m) from strings."""
    if not text:
        return ""
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]+m', '', str(text)).strip()


def format_duration(seconds: float) -> str:
    """Format seconds into readable 'Xh Ym' or 'Ym Zs' string."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def probe_stream_metadata(url: str) -> Dict[str, Any]:
    """
    Fast pre-flight inspection using yt-dlp without downloading media.
    Takes ~1-2 seconds and extracts duration, title, and live status.
    """
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'nocheckcertificate': True,
        'no_color': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {"duration": 0.0, "title": "YouTube Video", "is_live": False, "live_status": "unknown"}
            duration = float(info.get("duration") or 0.0)
            title = info.get("title") or "YouTube Video"
            live_status = str(info.get("live_status") or ("is_live" if info.get("is_live") else "not_live"))
            is_live_now = bool(info.get("is_live") or live_status == "is_live")
            was_live = bool(info.get("was_live") or live_status in ["post_live", "was_live"])
            return {
                "duration": duration,
                "title": title,
                "is_live": is_live_now,
                "live_status": live_status,
                "was_live": was_live,
                "uploader": info.get("uploader") or "",
            }
    except Exception as e:
        clean_msg = strip_ansi(str(e))
        print(f"[Probe Notice] Fast probe encountered notice: {clean_msg}")
        return {"duration": 0.0, "title": "YouTube Video", "is_live": False, "live_status": "unknown"}


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
        'no_color': True,
        'retries': 10,
        'fragment_retries': 10,
        'progress_hooks': [ytdl_hook],
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'mweb'],
            }
        },
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            base, _ = os.path.splitext(filename)
            mp4_filename = base + ".mp4"
            
            if os.path.exists(mp4_filename) and os.path.getsize(mp4_filename) > 1024:
                final_path = mp4_filename
            elif os.path.exists(filename) and os.path.getsize(filename) > 1024:
                final_path = filename
            else:
                valid_files = [
                    os.path.join(output_dir, f) for f in os.listdir(output_dir)
                    if os.path.isfile(os.path.join(output_dir, f)) and os.path.getsize(os.path.join(output_dir, f)) > 1024
                ]
                if not valid_files:
                    raise FileNotFoundError(
                        "The downloaded file is empty (0 bytes). If this is a recently ended stream, "
                        "YouTube is still processing the recording into a playable VOD. Please wait 15-30 minutes."
                    )
                final_path = max(valid_files, key=os.path.getmtime)

        print(f"[1/4] Download complete: {os.path.basename(final_path)}")
        if progress_callback:
            progress_callback("analyzing", 35, "Download complete. Reading video duration...")
        return final_path
    except Exception as e:
        clean_err = strip_ansi(str(e))
        if any(msg in clean_err.lower() for msg in ["live event has ended", "file is empty", "fragments: 0", "post_live"]):
            raise RuntimeError(
                "Yeh stream YouTube ke encoding queue me hai (Post-Live). Lambi streams (3+ ghante) ko YouTube apne server par finalize aur encode karne me 4 se 8+ ghante leta hai. "
                "YouTube par abhi is video ka player 'This live event has ended' dikha raha hai aur video play nahi ho raha hai. Jaise hi YouTube par video playback normal ho jaye, tab aap isse 1 click me clip kar sakte hain!"
            )
        raise RuntimeError(f"Download failed: {clean_err}")


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
    aspect_ratio: str = "9:16",
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[Dict[str, Any]]:
    """
    Split and render video clips based on dynamic best moments.
    Supports:
    - '9:16': Vertical center crop for mobile Shorts / Reels (1080x1920)
    - '16:9': Landscape widescreen for gaming & stream highlights (1920x1080)
    """
    os.makedirs(output_dir, exist_ok=True)
    if aspect_ratio == "16:9":
        # 16:9 Landscape - Perfect for gaming streams, preserves HUD, killfeed, minimap
        vf_filter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
    else:
        # 9:16 Vertical - Center-cropped for Shorts / Reels / TikTok
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
    ratio_label = "16:9 Widescreen" if aspect_ratio == "16:9" else "9:16 Vertical"
    print(f"[3/4] Rendering {num_clips} dynamic {ratio_label} clip(s)...")

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
                f"Rendering clip {i + 1} of {num_clips} ({ratio_label} '{target['title']}', score {target['score']})..."
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
                "duration": round(clip_dur, 2),
                "aspect_ratio": aspect_ratio
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
    mode: str = "heuristic",
    aspect_ratio: str = "9:16",
    content_type: str = "shorts",
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[Dict[str, Any]]:
    """
    Run complete AI / Heuristic video clipping pipeline:
    1. Pre-flight duration check (5-Hour max guardrail)
    2. Download YouTube video
    3. Extract duration
    4. Run Best Moment Detector (Heuristic or AI-Enhanced)
    5. Render dynamic clips (9:16 vertical or 16:9 widescreen)
    6. Optional Non-Linear Story Synthesis
    7. Clean up temporary download artifacts
    """
    check_ffmpeg_installed()
    ai_enabled = (mode == "ai_enhanced")

    # For gaming / long-form stream highlights: default to 3 minutes (180s) and 5 clips
    if content_type == "stream":
        if segment_duration <= 60:
            segment_duration = DEFAULT_STREAM_SEGMENT_DURATION
        if max_clips <= 3:
            max_clips = MAX_STREAM_CLIPS
    
    try:
        if progress_callback:
            mode_label = "AI Storytelling" if ai_enabled else "Fast Highlights"
            type_label = "Stream Highlights" if content_type == "stream" else "Shorts"
            progress_callback("probing", 5, f"Verifying {type_label} duration & metadata ({mode_label})...")

        # 0. Pre-Flight Duration & Live Status Safety Guardrail (Cap at 5 hours)
        meta = probe_stream_metadata(youtube_url)
        live_status = meta.get("live_status", "")
        if live_status == "is_live" or meta.get("is_live"):
            raise ValueError("Yeh live stream abhi chal rahi hai (Live). Stream khatam hone ke baad hi highlight clips banaye ja sakte hain!")
        elif live_status == "is_upcoming":
            raise ValueError("Yeh stream abhi shuru nahi hui hai (Upcoming). Stream broadcast complete hone ke baad try karein!")

        stream_dur = meta.get("duration", 0.0)
        if stream_dur > MAX_STREAM_DURATION_SECONDS:
            dur_str = format_duration(stream_dur)
            raise ValueError(
                f"Stream duration ({dur_str}) exceeds the beta safety limit of {int(MAX_STREAM_DURATION_HOURS)} hours. "
                f"Please choose a stream under {int(MAX_STREAM_DURATION_HOURS)} hours to avoid system overload."
            )

        # 1. Download YouTube video
        video_path = download_video(youtube_url, download_dir, progress_callback)
        
        # 2. Extract Duration
        duration = get_video_duration(video_path)
        
        # 3. Detect Best Moments
        if content_type == "stream":
            if progress_callback:
                progress_callback("analyzing_stream", 50, "Analyzing gaming screams, decibel surges & reaction peaks...")
            temp_wav = os.path.join(download_dir, "temp_stream_audio.wav")
            from moment_detector import extract_audio_pcm
            has_wav = extract_audio_pcm(video_path, temp_wav)
            stream_moments = []
            if has_wav and os.path.exists(temp_wav):
                try:
                    stream_moments = detect_stream_audio_peaks(
                        wav_path=temp_wav,
                        target_duration=segment_duration,
                        top_k=max_clips
                    )
                except Exception as stream_err:
                    print(f"[Stream Detector Notice] Audio peak scan notice: {stream_err}")

            if stream_moments and len(stream_moments) >= 2:
                moments = stream_moments
            else:
                moments = detect_best_moments(
                    video_path=video_path,
                    youtube_url=youtube_url,
                    duration=duration,
                    target_duration=segment_duration,
                    top_k=max_clips,
                    ai_enabled=ai_enabled,
                    progress_callback=progress_callback
                )
        else:
            moments = detect_best_moments(
                video_path=video_path,
                youtube_url=youtube_url,
                duration=duration,
                target_duration=segment_duration,
                top_k=max_clips,
                ai_enabled=ai_enabled,
                progress_callback=progress_callback
            )
        
        # 4. Crop & Split dynamically identified moments (9:16 or 16:9)
        clips = split_and_crop_video(
            video_path=video_path,
            output_dir=clips_output_dir,
            duration=duration,
            moments=moments,
            segment_len=segment_duration,
            max_clips=max_clips,
            aspect_ratio=aspect_ratio,
            progress_callback=progress_callback
        )
        
        for c in clips:
            c["mode"] = mode
            c["aspect_ratio"] = aspect_ratio
            c["content_type"] = content_type

        # 5. Optional Non-Linear Story Synthesis (Franken-Editing for AI mode)
        if synthesize_stories and ai_enabled:
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
                            "is_synthesized": True,
                            "mode": mode
                        })
                meta_file = os.path.join(clips_output_dir, "metadata.json")
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(clips, f, indent=2)
                print(f"[Pipeline] Added {len(blueprints)} synthesized micro-stories to {meta_file}")
            except Exception as synth_err:
                print(f"[Pipeline] Story synthesis notice: {synth_err}")

        # 6. Stream Compilation Reel Stitcher
        if content_type == "stream" and len(clips) >= 2:
            try:
                if progress_callback:
                    progress_callback("stitching_compilation", 92, "Merging highlight clips into single continuous stream reel...")
                clip_file_paths = [os.path.join(clips_output_dir, c["filename"]) for c in clips if not c.get("is_synthesized")]
                compilation_file = "compilation_highlights.mp4"
                compilation_path = os.path.join(clips_output_dir, compilation_file)
                compilation_info = stitch_highlight_compilation(
                    clip_paths=clip_file_paths,
                    output_compilation_path=compilation_path,
                    titles=[c.get("title", "Highlight") for c in clips if not c.get("is_synthesized")],
                    aspect_ratio=aspect_ratio
                )
                clips.insert(0, {
                    "filename": compilation_file,
                    "title": "Full Stream Highlights Compilation",
                    "score": 98,
                    "duration": compilation_info["total_duration"],
                    "aspect_ratio": aspect_ratio,
                    "content_type": content_type,
                    "mode": mode,
                    "is_compilation": True,
                    "chapters": compilation_info["chapters"],
                    "chapter_description": compilation_info["chapter_description"]
                })
                meta_file = os.path.join(clips_output_dir, "metadata.json")
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(clips, f, indent=2)
                print(f"[Pipeline] Successfully generated stream compilation reel: {compilation_file}")
            except Exception as stitch_err:
                print(f"[Pipeline Warning] Compilation stitching notice: {stitch_err}")
        
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


