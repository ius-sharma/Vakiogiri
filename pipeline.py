import os
import sys
import shutil
import subprocess
import math
import json
import re
import time
import threading
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
from gemini_stream_detector import detect_stream_highlights_gemini
from vakiogiri_layout import vakiogiri_layout_engine

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


def parse_time_to_sec(val: Any, default: float = 0.0) -> float:
    """Safely parse integer, float, string seconds ('45.2s'), or timecodes ('00:21:06', '04:12') to seconds."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s_val = str(val).strip().replace("s", "")
    if ":" in s_val:
        parts = s_val.split(":")
        try:
            if len(parts) == 3:
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            elif len(parts) == 2:
                return float(parts[0]) * 60 + float(parts[1])
        except Exception:
            pass
    try:
        return float(s_val)
    except Exception:
        return default


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


def format_bytes(num_bytes: float) -> str:
    """Format bytes into human-readable string (e.g. 14.5 MB, 1.2 GB)."""
    if not num_bytes or num_bytes <= 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if num_bytes < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} PB"


def format_progress_bar(percent: float, width: int = 24) -> str:
    """Render a clean unicode progress bar."""
    clamped = max(0.0, min(100.0, float(percent)))
    filled = int(round(width * (clamped / 100.0)))
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {clamped:5.1f}%"


def probe_stream_metadata(url: str) -> Dict[str, Any]:
    """
    Fast pre-flight inspection using yt-dlp without downloading media.
    Takes ~1-2 seconds and extracts duration, title, and live status.
    """
    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'nocheckcertificate': True,
        'no_color': True,

    }
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path
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
            video_id = info.get("id") or ""
            thumbnail = info.get("thumbnail") or (f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg" if video_id else "")
            is_stream = bool(was_live or is_live_now or ("/live/" in url.lower()) or (duration >= 900.0))
            return {
                "is_stream": is_stream,
                "duration": duration,
                "duration_formatted": format_duration(duration),
                "title": title,
                "is_live": is_live_now,
                "live_status": live_status,
                "was_live": was_live,
                "uploader": info.get("uploader") or info.get("channel") or "",
                "video_id": video_id,
                "thumbnail": thumbnail,
            }
    except Exception as e:
        clean_msg = strip_ansi(str(e))
        print(f"[Probe Notice] Fast probe encountered notice: {clean_msg}")
        title = "YouTube Video"
        uploader = ""
        thumbnail = ""
        try:
            import urllib.request
            oe_url = f"https://www.youtube.com/oembed?url={url}&format=json"
            req = urllib.request.Request(oe_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=4) as r:
                d = json.loads(r.read().decode("utf-8"))
                title = d.get("title") or title
                uploader = d.get("author_name") or uploader
                thumbnail = d.get("thumbnail_url") or thumbnail
        except Exception:
            pass
        vid_match = re.search(r"(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})", url)
        v_id = vid_match.group(1) if vid_match else ""
        is_live_hint = ("/live/" in url.lower()) or ("live" in title.lower()) or ("bgmi" in title.lower())
        est_dur = 14400.0 if is_live_hint else 1800.0
        return {
            "is_stream": is_live_hint,
            "duration": est_dur,
            "duration_formatted": format_duration(est_dur),
            "title": title,
            "is_live": False,
            "live_status": "not_live",
            "was_live": is_live_hint,
            "uploader": uploader,
            "video_id": v_id,
            "thumbnail": thumbnail or (f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg" if v_id else "")
        }


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


def resolve_youtube_stream_source(url: str, quality: str = "720p") -> Optional[Dict[str, Any]]:
    """
    Extracts direct HLS (m3u8) or HTTPS direct stream URLs using yt-dlp in ~2-5s.
    Enables instant micro-slicing (Option D): zero whole-video download, zero disk overflow.
    """
    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    try:
        max_h = int(quality.lower().rstrip("p")) if quality and quality.lower() != "best" else 720
    except Exception:
        max_h = 720

    # Priority 1: HLS m3u8 (Segmented parallel streams, fastest and immune to YouTube throttling)
    hls_opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'format': f'bestvideo[protocol*=m3u8][height<={max_h}]+bestaudio[protocol*=m3u8]/best[protocol*=m3u8][height<={max_h}]/best[protocol*=m3u8]',
    }
    if os.path.exists(cookie_path):
        hls_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(hls_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info and info.get('url'):
                return {'type': 'hls', 'url': info['url'], 'quality': quality}
    except Exception as e:
        print(f"[Stream Resolver] HLS probe notice: {strip_ansi(str(e))}")

    # Priority 2: Direct DASH separate video + audio streams
    dash_opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'format': f'bestvideo[height<={max_h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={max_h}]+bestaudio/best[height<={max_h}]',
    }
    if os.path.exists(cookie_path):
        dash_opts['cookiefile'] = cookie_path

    try:
        with yt_dlp.YoutubeDL(dash_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            req = info.get('requested_formats')
            if req and len(req) >= 2:
                return {'type': 'dash', 'video_url': req[0]['url'], 'audio_url': req[1]['url'], 'quality': quality}
            elif info.get('url'):
                return {'type': 'single', 'url': info['url'], 'quality': quality}
    except Exception as e:
        print(f"[Stream Resolver] DASH probe notice: {strip_ansi(str(e))}")

    return None


def extract_stream_slice(stream_source: Dict[str, Any], start_sec: float, duration_sec: float, output_path: str) -> bool:
    """
    Extracts a pristine micro-slice directly from YouTube HLS m3u8 streams in ~1-2s.
    Zero full-video download, zero disk overflow.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    st_type = stream_source.get("type", "single")
    
    stream_url = stream_source.get("url") or stream_source.get("video_url")
    if not stream_url:
        return False

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_sec),
        "-t", str(duration_sec),
        "-i", stream_url,
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        output_path
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return os.path.exists(output_path) and os.path.getsize(output_path) > 10000
    except Exception as err:
        print(f"[Micro-Slice Notice] ffmpeg direct stream slice notice: {err}")
        return False


def download_clip_micro_slice(
    url: str,
    start_sec: float,
    duration_sec: float,
    output_path: str,
    quality: str = "720p"
) -> bool:
    """
    Robust targeted micro-range downloader via yt-dlp.
    Downloads ONLY the specified ~30-60s window (~8-15 MB) directly from YouTube.
    Works universally across normal VODs, live streams, and post-live streams.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    try:
        max_h = int(quality.lower().rstrip("p")) if quality and quality.lower() != "best" else 720
    except Exception:
        max_h = 720

    end_sec = round(start_sec + duration_sec, 2)
    clean_url = url
    # Clean trailing query params or /live/ quirks
    v_match = re.search(r"(?:v=|\/live\/|youtu\.be\/)([0-9A-Za-z_-]{11})", url)
    if v_match:
        clean_url = f"https://www.youtube.com/watch?v={v_match.group(1)}"

    ytdlp_bin = shutil.which("yt-dlp") or "yt-dlp"
    cmd = [
        ytdlp_bin,
        "--download-sections", f"*{start_sec}-{end_sec}",
        "--force-keyframes-at-cuts",
        "-f", f"bestvideo[height<={max_h}][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<={max_h}]+bestaudio/best[height<={max_h}]/best",
        "--merge-output-format", "mp4",
        "--no-warnings",
        "--quiet",
        clean_url,
        "-o", output_path,
        "--force-overwrites"
    ]
    if os.path.exists(cookie_path):
        cmd.insert(1, "--cookies")
        cmd.insert(2, cookie_path)

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        # Verify output exists and is not corrupt/empty
        if os.path.exists(output_path) and os.path.getsize(output_path) > 10000:
            return True
        # If merged with different extension, check and rename
        for alt_ext in [".mp4.webm", ".mp4.mkv", ".mkv", ".webm"]:
            alt_file = output_path + alt_ext if not output_path.endswith(alt_ext) else output_path
            if os.path.exists(alt_file) and os.path.getsize(alt_file) > 10000:
                shutil.move(alt_file, output_path)
                return True
        return False
    except Exception as err:
        print(f"[Micro-Slice Notice] yt-dlp micro-slice notice: {err}")
        return False


def download_video(
    url: str,
    output_dir: str,
    quality: str = "1080p",
    start_sec: float = 0.0,
    end_sec: Optional[float] = None,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> str:
    """
    Download video from YouTube using yt-dlp in requested quality (1080p, 720p, 480p, best) into output_dir.
    If start_sec or end_sec are specified, downloads ONLY that time-slice via HTTP Range requests.
    """
    has_slice = (start_sec > 0 or (end_sec is not None and end_sec > 0))
    if has_slice:
        effective_end = end_sec if (end_sec and end_sec > start_sec) else float("inf")
        slice_label = f"{format_duration(start_sec)} ➔ {format_duration(effective_end) if effective_end < float('inf') else 'End'}"
        print(f"\n=================================================================")
        print(f"[⬇️ Downloader] Starting Time-Sliced Stream Download")
        print(f"    URL     : {url}")
        print(f"    Range   : {slice_label}")
        print(f"    Quality : {quality}")
        print(f"=================================================================\n", flush=True)
        if progress_callback:
            progress_callback("downloading", 10, f"Downloading stream slice ({slice_label}) in {quality}...")
    else:
        print(f"\n=================================================================")
        print(f"[⬇️ Downloader] Starting Video Download")
        print(f"    URL     : {url}")
        print(f"    Quality : {quality}")
        print(f"=================================================================\n", flush=True)
        if progress_callback:
            progress_callback("downloading", 10, f"Connecting to YouTube and downloading video ({quality})...")

    os.makedirs(output_dir, exist_ok=True)
    download_start_time = time.time()
    last_print_time = [0.0]
    
    def ytdl_hook(d):
        now = time.time()
        status = d.get('status')
        if status == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            speed = d.get('speed') or 0
            eta = d.get('eta')
            
            # Throttle terminal updates to every ~0.3s so terminal remains clean and readable
            if now - last_print_time[0] >= 0.3 or (total > 0 and downloaded >= total):
                last_print_time[0] = now
                speed_str = f"{format_bytes(speed)}/s" if speed else "-- MB/s"
                
                if total > 0:
                    pct = (downloaded / total) * 100.0
                    bar = format_progress_bar(pct)
                    eta_str = f"ETA: {int(eta)}s" if eta is not None else "ETA: --"
                    print(
                        f"\r[⬇️ Downloading] {format_bytes(downloaded)} / {format_bytes(total)} {bar} | Speed: {speed_str} | {eta_str}   ",
                        end="",
                        flush=True
                    )
                else:
                    print(
                        f"\r[⬇️ Downloading] {format_bytes(downloaded)} received | Speed: {speed_str}   ",
                        end="",
                        flush=True
                    )

            if progress_callback and total > 0:
                frontend_pct = int(10 + (downloaded / total) * 20)  # 10% to 30%
                msg = f"Downloading slice ({slice_label} - {frontend_pct}%)..." if has_slice else f"Downloading video ({quality} - {frontend_pct}%)..."
                progress_callback("downloading", frontend_pct, msg)

        elif status == 'finished':
            total = d.get('total_bytes') or d.get('downloaded_bytes') or 0
            print(
                f"\n[📦 Stream Saved] Received {format_bytes(total)}. Finalizing media container...",
                flush=True
            )

    # Determine maximum height based on quality preference
    try:
        max_h = int(quality.lower().rstrip("p")) if quality and quality.lower() != "best" else 1080
    except Exception:
        max_h = 1080

    if has_slice:
        # Time-sliced stream downloads REQUIRE segmented HLS (m3u8) streams!
        # Prioritize lightweight, hardware-accelerated AVC1 (H.264) streams over bloated 16Mbps VP9 master streams
        format_selector = (
            f"bestvideo[protocol*=m3u8][vcodec^=avc1][height<={max_h}]+bestaudio[protocol*=m3u8]/"
            f"bestvideo[protocol*=m3u8][height<={max_h}][tbr<7500]+bestaudio[protocol*=m3u8]/"
            f"bestvideo[protocol*=m3u8][height<={max_h}]+bestaudio[protocol*=m3u8]/"
            f"bestvideo[height<={max_h}][ext=mp4]+bestaudio[ext=m4a]/"
            f"bestvideo[height<={max_h}]+bestaudio/"
            f"best[height<={max_h}]/best"
        )
    else:
        format_selector = (
            f"bestvideo[height<={max_h}][vcodec!*=none]+bestaudio[acodec!*=none][xtags*=original]/"
            f"bestvideo[height<={max_h}][vcodec!*=none]+bestaudio[acodec!*=none][language=hi]/"
            f"bestvideo[height<={max_h}][vcodec!*=none]+bestaudio[acodec!*=none]/"
            f"bestvideo[height<={max_h}]+bestaudio[xtags*=original]/"
            f"bestvideo[height<={max_h}]+bestaudio[language=hi]/"
            f"bestvideo[height<={max_h}]+bestaudio/"
            f"bestvideo+bestaudio/"
            f"best[height<={max_h}]/"
            f"best"
        )

    base_ydl_opts = {
        'format': format_selector,
        'format_sort': ['res', 'fps', 'tbr', 'vbr', 'hasaud', 'lang:hi,default,original'],
        'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
        'merge_output_format': 'mp4',
        'windowsfilenames': True,
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'geo_bypass': True,
        'no_color': True,
        'retries': 20,
        'fragment_retries': 20,
        'http_chunk_size': 10 * 1024 * 1024,  # 10MB chunking prevents YouTube 250KiB/s throttle & 403 token expiration
        'concurrent_fragment_downloads': 4,
        'progress_hooks': [ytdl_hook],
        'downloader_args': {
            'ffmpeg': ['-nostdin'],
            'ffmpeg_i': [
                '-nostdin',
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5'
            ]
        },
        'postprocessor_args': {
            'ffmpeg': ['-nostdin']
        }
    }

    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    if os.path.exists(cookie_path):
        base_ydl_opts['cookiefile'] = cookie_path

    stop_slice_monitor = threading.Event()

    if has_slice:
        effective_end = end_sec if (end_sec and end_sec > start_sec) else float("inf")
        base_ydl_opts['download_ranges'] = yt_dlp.utils.download_range_func(None, [(start_sec, effective_end)])
        base_ydl_opts['force_keyframes_at_cuts'] = True

        def slice_monitor_worker():
            slice_start_t = time.time()
            last_size = -1
            print(f"[🔍 Step 1/2] Connecting to YouTube HLS servers & resolving slice segments...", flush=True)
            # Estimate expected size: slice duration * ~400 KB/s for 1080p, 200 KB/s for 720p
            slice_dur = max(30.0, float(effective_end - start_sec)) if effective_end < float('inf') else 1800.0
            expected_bytes = max(1024 * 1024, slice_dur * (400_000 if '1080' in quality else 200_000))

            while not stop_slice_monitor.is_set():
                time.sleep(0.4)
                if not os.path.exists(output_dir):
                    continue
                part_files = [
                    os.path.join(output_dir, f) for f in os.listdir(output_dir)
                    if f.endswith('.part') or f.endswith('.ytdl') or f.endswith('.mp4') or f.endswith('.webm')
                ]
                if part_files:
                    cur_size = sum(os.path.getsize(p) for p in part_files if os.path.exists(p))
                    if cur_size > 0 and cur_size != last_size:
                        last_size = cur_size
                        elapsed = max(0.1, time.time() - slice_start_t)
                        spd = cur_size / elapsed
                        spd_str = f"{format_bytes(spd)}/s"
                        size_str = format_bytes(cur_size)

                        # Dynamically advance frontend progress from 10% to 35%
                        ratio = min(0.98, cur_size / expected_bytes)
                        dyn_pct = int(10 + ratio * 25)
                        pct_label = int(ratio * 100)

                        print(
                            f"\r[⬇️ Step 2/2 - Streaming Slice] Downloaded: {size_str} ({pct_label}%) | Speed: ~{spd_str} | Range: {slice_label}   ",
                            end="",
                            flush=True
                        )
                        if progress_callback:
                            progress_callback(
                                "downloading",
                                dyn_pct,
                                f"Downloading stream slice ({size_str} / ~{format_bytes(expected_bytes)} - {pct_label}%)..."
                            )

        monitor_thread = threading.Thread(target=slice_monitor_worker, daemon=True)
        monitor_thread.start()
    else:
        print(f"[🔍 Step 1/2] Fetching video metadata and resolving {quality} streams...", flush=True)

    try:
        try:
            with yt_dlp.YoutubeDL(base_ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
        except Exception as primary_err:
            err_text = str(primary_err).lower()
            if "403" in err_text or "forbidden" in err_text or "unable to download video data" in err_text or "requested format is not available" in err_text:
                print(f"\n[Downloader Notice] 403 Forbidden detected. Engaging resilient HLS/DASH fallback...", flush=True)
                if progress_callback:
                    progress_callback("downloading", 12, "Re-routing via resilient HLS/DASH stream to bypass 403...")
                fallback_opts = dict(base_ydl_opts)
                if has_slice:
                    fallback_opts['format'] = (
                        f"bestvideo[protocol*=m3u8][height<={max_h}]+bestaudio[protocol*=m3u8]/"
                        f"bestvideo[height<={max_h}]+bestaudio/best"
                    )
                else:
                    fallback_opts['format'] = (
                        f"bestvideo[height<={max_h}]+bestaudio/"
                        f"bestvideo+bestaudio/"
                        f"best[height<={max_h}]/"
                        f"best"
                    )
                if has_slice:
                    fallback_opts['download_ranges'] = base_ydl_opts['download_ranges']
                    fallback_opts['force_keyframes_at_cuts'] = True

                with yt_dlp.YoutubeDL(fallback_opts) as ydl_fb:
                    info = ydl_fb.extract_info(url, download=True)
                    filename = ydl_fb.prepare_filename(info)
            else:
                raise primary_err
        finally:
            stop_slice_monitor.set()

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

        elapsed_sec = int(time.time() - download_start_time)
        file_size_str = format_bytes(os.path.getsize(final_path)) if os.path.exists(final_path) else "Unknown size"
        print(f"\n\n[✅ Download Complete] File: {os.path.basename(final_path)} ({file_size_str}) in {elapsed_sec}s\n", flush=True)
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


def get_render_dimensions(aspect_ratio: str, quality: str = "1080p") -> tuple[int, int]:
    """Calculate rendering dimensions matching aspect ratio and user quality setting."""
    try:
        req_h = int(quality.lower().rstrip("p")) if quality and quality.lower() != "best" else 1080
    except Exception:
        req_h = 1080

    if aspect_ratio == "16:9":
        if req_h <= 480:
            return 854, 480
        elif req_h <= 720:
            return 1280, 720
        elif req_h <= 1080:
            return 1920, 1080
        else:
            return 2560, 1440
    else:
        # 9:16 Vertical
        if req_h <= 480:
            return 480, 854
        elif req_h <= 720:
            return 720, 1280
        elif req_h <= 1080:
            return 1080, 1920
        else:
            return 1440, 2560


def split_and_crop_video(
    video_path: Optional[str],
    output_dir: str,
    duration: float,
    moments: Optional[List[Dict[str, Any]]] = None,
    segment_len: int = DEFAULT_SEGMENT_DURATION,
    max_clips: int = MAX_CLIPS_PER_VIDEO,
    aspect_ratio: str = "9:16",
    quality: str = "1080p",
    caption_style: str = "hormozi",
    speech_segments: Optional[List[Dict[str, Any]]] = None,
    progress_callback: Optional[Callable[[str, int, str], None]] = None,
    subtitle_language: str = "hinglish",
    layout_mode: str = "gaming_split",
    stream_source: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Split and render video clips based on dynamic best moments.
    Supports:
    - '9:16': Vertical center crop for mobile Shorts / Reels
    - '16:9': Landscape widescreen for gaming & stream highlights
    Quality options: '1080p', '720p', '480p', 'best'
    """
    os.makedirs(output_dir, exist_ok=True)
    target_w, target_h = get_render_dimensions(aspect_ratio, quality)
    if aspect_ratio == "16:9":
        # 16:9 Landscape - Perfect for gaming streams, preserves HUD, killfeed, minimap
        # Lanczos sharp sinc scaling + subtle unsharp mask for pristine HUD/killfeed sharpness
        vf_filter = (
            f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease:flags=lanczos,"
            f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2,"
            f"unsharp=5:5:0.5:5:5:0.0"
        )
    else:
        # 9:16 Vertical - Center-cropped for Shorts / Reels / TikTok
        # Lanczos high-order scaling + adaptive sharpening to counter zoom softness
        vf_filter = (
            f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop={target_w}:{target_h},"
            f"unsharp=5:5:0.6:5:5:0.0"
        )

    # Use dynamically detected moments if provided; otherwise fallback to uniform split
    clip_targets = []
    if moments and len(moments) > 0:
        for idx, m in enumerate(moments[:max_clips]):
            s_time = max(0.0, parse_time_to_sec(m.get("start"), 0.0))
            e_time = min(duration, parse_time_to_sec(m.get("end"), s_time + float(segment_len)))
            if e_time <= s_time:
                e_time = min(duration, s_time + float(segment_len))
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
        
        # Calculate progress
        if progress_callback:
            base_prog = 20 if stream_source else 75
            max_span = 72 if stream_source else 17
            clip_progress = int(base_prog + ((i) / max(1, num_clips)) * max_span)
            progress_callback(
                "clipping",
                clip_progress,
                f"Rendering Short {i + 1} of {num_clips} ({ratio_label} '{target['title']}')..."
            )

        # Option D: Direct Micro-Slice handling (Zero whole-video download, zero disk overflow)
        current_input_video = video_path
        current_seek = start_time
        temp_raw_slice = None

        if stream_source or not video_path:
            temp_raw_slice = os.path.join(output_dir, f"temp_raw_{i + 1}.mp4")
            if progress_callback:
                progress_callback(
                    "clipping",
                    clip_progress,
                    f"Direct streaming Short {i + 1} of {num_clips} ({format_duration(start_time)})..."
                )
            slice_ok = False
            # 1. Try instant HLS m3u8 direct micro-slice (~1-2s)
            if stream_source and stream_source.get("type") == "hls":
                slice_ok = extract_stream_slice(
                    stream_source=stream_source,
                    start_sec=start_time,
                    duration_sec=clip_dur,
                    output_path=temp_raw_slice
                )

            # 2. If HLS unavailable or failed, use targeted yt-dlp micro-slice (~30-60s range)
            if not slice_ok or not os.path.exists(temp_raw_slice) or os.path.getsize(temp_raw_slice) < 10000:
                slice_ok = download_clip_micro_slice(
                    url=youtube_url,
                    start_sec=start_time,
                    duration_sec=clip_dur,
                    output_path=temp_raw_slice,
                    quality=quality
                )

            if slice_ok and os.path.exists(temp_raw_slice):
                current_input_video = temp_raw_slice
                current_seek = 0.0
            else:
                print(f"[Pipeline Warning] Micro-slice extraction failed for clip {i + 1}, falling back to video_path.")

        if not current_input_video or not os.path.exists(current_input_video):
            print(f"[Pipeline Error] No valid input video for clip {i + 1}")
            continue

        try:
            # Dynamic Vakiogiri 9:16 Signature Layout Engine (Top Gameplay + Bottom Facecam + Center Line & Captions)
            current_vf = vf_filter
            use_filter_complex = False
            current_filtergraph = None

            if aspect_ratio == "9:16":
                # 1. Detect facecam/reaction window in video
                facecam_box = vakiogiri_layout_engine.detect_facecam_box(
                    video_path=current_input_video,
                    start_time=current_seek,
                    duration=clip_dur,
                    layout_mode=layout_mode
                )

                # 2. Build center-anchored subtitle file if caption_style != 'none'
                ass_sub_path = None
                if caption_style != "none":
                    ass_file = os.path.join(output_dir, f"subs_{i + 1}.ass")
                    
                    # Always transcribe this specific clip's audio slice directly for 100% full-clip subtitle coverage
                    slice_wav = os.path.join(output_dir, f"temp_slice_{i + 1}.wav")
                    subprocess.run([
                        "ffmpeg", "-y",
                        "-ss", str(current_seek),
                        "-t", str(clip_dur),
                        "-i", current_input_video,
                        "-vn", "-ac", "1", "-ar", "16000",
                        slice_wav
                    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    
                    direct_segs = []
                    if os.path.exists(slice_wav):
                        try:
                            direct_segs = transcribe_video_audio(slice_wav, subtitle_language=subtitle_language)
                        finally:
                            if os.path.exists(slice_wav):
                                try:
                                    os.remove(slice_wav)
                                except Exception:
                                    pass

                    if direct_segs:
                        ass_sub_path = vakiogiri_layout_engine.generate_center_ass_subtitles(
                            ass_path=ass_file,
                            speech_segments=direct_segs,
                            video_w=target_w,
                            video_h=target_h,
                            style=caption_style,
                            clip_start=0.0,
                            clip_end=clip_dur,
                            layout_mode=layout_mode
                        )
                        # Update title and hook_quote with first spoken words
                        if direct_segs[0].get("text") and str(target.get("title", "")).startswith("Key Highlight #"):
                            first_hook = direct_segs[0]["text"].strip()
                            target["title"] = f'"{first_hook}"'
                            target["hook_quote"] = first_hook
                    elif speech_segments:
                        # Fallback to global speech segments if slice transcription was empty
                        clip_words = [s for s in speech_segments if float(s.get("end", 0.0)) > start_time and float(s.get("start", 0.0)) < (start_time + clip_dur)]
                        if clip_words:
                            ass_sub_path = vakiogiri_layout_engine.generate_center_ass_subtitles(
                                ass_path=ass_file,
                                speech_segments=speech_segments,
                                video_w=target_w,
                                video_h=target_h,
                                style=caption_style,
                                clip_start=start_time,
                                clip_end=start_time + clip_dur,
                                layout_mode=layout_mode
                            )

                # 3. Construct dual-stack split layout or fallback vertical crop
                current_filtergraph = vakiogiri_layout_engine.build_ffmpeg_filter(
                    target_w=target_w,
                    target_h=target_h,
                    facecam_box=facecam_box,
                    ass_subtitle_path=ass_sub_path,
                    layout_mode=layout_mode
                )
                use_filter_complex = True

            if use_filter_complex and current_filtergraph:
                fg_with_pts = current_filtergraph + ",setpts=PTS-STARTPTS[outv]"
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-ss", str(current_seek),
                    "-t", str(clip_dur),
                    "-i", current_input_video,
                    "-avoid_negative_ts", "make_zero",
                    "-filter_complex", fg_with_pts,
                    "-map", "[outv]",
                    "-map", "0:a?",
                    "-af", "asetpts=PTS-STARTPTS",
                    "-c:v", "libx264",
                    "-preset", "veryfast",
                    "-crf", "20",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-ar", "48000",
                    "-movflags", "+faststart",
                    clip_path
                ]
            else:
                vf_with_pts = current_vf + (",setpts=PTS-STARTPTS" if current_vf else "setpts=PTS-STARTPTS")
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-ss", str(current_seek),
                    "-t", str(clip_dur),
                    "-i", current_input_video,
                    "-avoid_negative_ts", "make_zero",
                    "-vf", vf_with_pts,
                    "-af", "asetpts=PTS-STARTPTS",
                    "-c:v", "libx264",
                    "-preset", "veryfast",
                    "-crf", "20",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-ar", "48000",
                    "-movflags", "+faststart",
                    clip_path
                ]
            
            # Real-time sub-progress streaming via ffmpeg -progress pipe:1
            # Updates progress bar every ~1.5s smoothly (e.g. 21% -> 22% -> 23% -> 27%)
            ffmpeg_cmd_with_prog = list(ffmpeg_cmd)
            ffmpeg_cmd_with_prog.extend(["-progress", "pipe:1"])

            clip_base_pct = base_prog + int(((i) / max(1, num_clips)) * max_span)
            clip_span = max_span / max(1, num_clips)
            last_sub_update = time.time()

            try:
                proc = subprocess.Popen(
                    ffmpeg_cmd_with_prog,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True,
                    bufsize=1
                )

                while True:
                    line = proc.stdout.readline() if proc.stdout else None
                    if not line and proc.poll() is not None:
                        break
                    if line:
                        line = line.strip()
                        if line.startswith("out_time_us="):
                            try:
                                us_val = float(line.split("=")[1])
                                sec_val = us_val / 1_000_000.0
                                frac = min(0.96, max(0.0, sec_val / max(1.0, clip_dur)))
                                now_t = time.time()
                                if (now_t - last_sub_update) >= 1.5:
                                    last_sub_update = now_t
                                    smooth_pct = min(92, int(clip_base_pct + (frac * clip_span)))
                                    if progress_callback:
                                        progress_callback(
                                            "clipping",
                                            smooth_pct,
                                            f"Rendering Short {i + 1} of {num_clips} ({int(frac * 100)}%)..."
                                        )
                            except Exception:
                                pass

                ret_code = proc.wait()
                if ret_code != 0:
                    raise RuntimeError(f"FFmpeg encoding exited with code {ret_code}")
            except Exception as render_ex:
                # Direct fallback if pipe streaming had an issue
                if not os.path.exists(clip_path) or os.path.getsize(clip_path) < 10000:
                    subprocess.run(ffmpeg_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, check=True)
            
            # Extract instant visual preview thumbnail poster from rendered video
            thumb_name = f"thumb_{i + 1}.jpg"
            thumb_path = os.path.join(output_dir, thumb_name)
            thumb_seek = min(1.5, max(0.5, clip_dur * 0.2))
            try:
                subprocess.run([
                    "ffmpeg", "-y",
                    "-ss", str(thumb_seek),
                    "-i", clip_path,
                    "-vframes", "1",
                    "-q:v", "2",
                    thumb_path
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            except Exception as th_err:
                print(f"[Pipeline Notice] Could not extract thumbnail: {th_err}")

            safe_title = str(target.get('title', '')).encode('ascii', 'replace').decode('ascii')
            print(f"  -> Created {clip_name} (starts at {start_time:.1f}s, len: {clip_dur:.1f}s, score: {target['score']}, title: '{safe_title}')")
            created_clips.append({
                "filename": clip_name,
                "thumbnail": thumb_name,
                "title": target["title"],
                "score": target["score"],
                "heatmap_score": target.get("heatmap_score"),
                "start": round(start_time, 2),
                "end": round(start_time + clip_dur, 2),
                "duration": round(clip_dur, 2),
                "aspect_ratio": aspect_ratio,
                "layout_mode": layout_mode,
                "quality": quality,
                "resolution": f"{target_w}x{target_h}"
            })
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed creating clip {clip_name}: {e.stderr}")
        finally:
            if temp_raw_slice and os.path.exists(temp_raw_slice):
                try:
                    os.remove(temp_raw_slice)
                except Exception:
                    pass

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
    stream_output_mode: str = "single_reel",
    quality: str = "1080p",
    stream_start_min: float = 0.0,
    stream_end_min: Optional[float] = None,
    progress_callback: Optional[Callable[[str, int, str], None]] = None,
    selected_moments: Optional[List[Dict[str, Any]]] = None,
    caption_style: str = "hormozi",
    subtitle_language: str = "hinglish",
    layout_mode: str = "gaming_split"
) -> List[Dict[str, Any]]:
    """
    Run complete AI / Heuristic video clipping pipeline:
    1. Pre-flight duration check (5-Hour max guardrail)
    2. Download YouTube video in selected quality
    3. Extract duration
    4. Run Best Moment Detector (Heuristic or AI-Enhanced)
    5. Render dynamic clips (9:16 vertical or 16:9 widescreen in target quality)
    6. Optional Non-Linear Story Synthesis
    7. Clean up temporary download artifacts
    """
    check_ffmpeg_installed()
    ai_enabled = (mode == "ai_enhanced")

    # For gaming / long-form stream highlights or supercuts:
    is_supercut = (content_type == "stream") or (stream_output_mode in ["single_reel", "both"])
    if is_supercut:
        if segment_duration is None or segment_duration < 60:
            segment_duration = DEFAULT_STREAM_SEGMENT_DURATION
        if max_clips <= 3:
            max_clips = MAX_STREAM_CLIPS
    
    try:
        if progress_callback:
            mode_label = "AI Storytelling" if ai_enabled else "Fast Highlights"
            type_label = "Stream Highlights" if content_type == "stream" else "Highlights Supercut" if is_supercut else "Shorts"
            progress_callback("probing", 5, f"Verifying {type_label} duration & metadata ({quality}, {mode_label})...")

        is_local_file = os.path.exists(youtube_url) and os.path.isfile(youtube_url)
        if is_local_file:
            video_path = youtube_url
            duration = get_video_duration(video_path)
            meta = {
                "duration": duration,
                "title": os.path.splitext(os.path.basename(youtube_url))[0],
                "is_live": False,
                "live_status": "not_live",
                "uploader": "Local Video",
                "thumbnail": "",
            }
        else:
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

            # Option D: If user selected specific viral moments, use direct streaming micro-slicing!
            # Zero 10GB downloads, zero 2-hour throttling, zero disk overflow!
            if selected_moments and len(selected_moments) > 0:
                if progress_callback:
                    progress_callback("resolving_stream", 15, "Connecting to direct YouTube stream for instant micro-slicing (Option D)...")
                try:
                    stream_source = resolve_youtube_stream_source(youtube_url, quality=quality)
                    if stream_source:
                        print(f"[Pipeline] Option D Active: Resolved high-speed direct stream ({stream_source['type']}).")
                except Exception as stream_res_err:
                    print(f"[Pipeline Notice] Stream resolver notice: {stream_res_err}")

            if stream_source:
                duration = stream_dur if stream_dur > 0 else 14400.0
                video_path = None
                is_partial_stream = False
            else:
                # Determine slice bounds for stream mode or user-selected moments
                stream_slice_start = max(0.0, float(stream_start_min or 0.0) * 60.0) if content_type == "stream" else 0.0
                stream_slice_end = (float(stream_end_min) * 60.0) if (content_type == "stream" and stream_end_min and float(stream_end_min) > 0) else None

                # Only perform time-sliced download when an explicit, bounded end timestamp is provided
                is_partial_stream = (stream_slice_end is not None and stream_slice_end > stream_slice_start)

                # For full-length downloads of long livestreams (> 30 mins) without slicing,
                # cap quality to 720p to guarantee safe remuxing within server disk limits (prevents 20GB disk full crash)
                effective_quality = quality
                if not is_partial_stream and stream_dur > 1800.0 and quality.lower() in ["1080p", "best"]:
                    print(f"[Pipeline] Long stream detected ({format_duration(stream_dur)}). Using 720p to guarantee safe remuxing within disk limits.")
                    effective_quality = "720p"

                # 1. Download YouTube video in requested quality (partial range download if stream slice active)
                video_path = download_video(
                    url=youtube_url,
                    output_dir=download_dir,
                    quality=effective_quality,
                    start_sec=stream_slice_start if is_partial_stream else 0.0,
                    end_sec=stream_slice_end if is_partial_stream else None,
                    progress_callback=progress_callback
                )
                
                # 2. Extract Duration of downloaded media
                duration = get_video_duration(video_path)
        
        # 3. Detect Best Moments
        if is_supercut:
            if progress_callback:
                progress_callback("analyzing_stream", 50, "Analyzing stream climax peaks & audience heatmaps...")
            temp_wav = os.path.join(download_dir, "temp_stream_audio.wav")
            from moment_detector import extract_audio_pcm
            has_wav = extract_audio_pcm(video_path, temp_wav)
            stream_moments = []
            detector_mode = "clips" if stream_output_mode == "clips" else "supercut"
            if has_wav and os.path.exists(temp_wav):
                try:
                    if is_partial_stream:
                        print(f"[Pipeline] Sliced Download Active: scan range 0.0s to {duration:.1f}s")
                        stream_moments = detect_stream_audio_peaks(
                            wav_path=temp_wav,
                            target_duration=segment_duration,
                            top_k=max_clips,
                            mode=detector_mode,
                            start_offset=0.0,
                            end_offset=duration,
                            stream_time_shift=0.0
                        )
                    else:
                        start_sec = stream_slice_start
                        end_sec = stream_slice_end
                        if start_sec > 0:
                            print(f"[Pipeline] Stream Intro Skip active: ignoring first {stream_start_min:.1f} mins ({start_sec:.0f}s)")
                        stream_moments = detect_stream_audio_peaks(
                            wav_path=temp_wav,
                            target_duration=segment_duration,
                            top_k=max_clips,
                            mode=detector_mode,
                            start_offset=start_sec,
                            end_offset=end_sec,
                            stream_time_shift=0.0
                        )
                except Exception as stream_err:
                    print(f"[Stream Detector Notice] Audio peak scan notice: {stream_err}")

            # Primary: Gemini 2.5 Flash Climax & Reaction Intelligence
            gemini_moments = []
            try:
                if progress_callback:
                    progress_callback("gemini_stream_analysis", 60, "Gemini 2.5 Flash analyzing clutch plays, reactions & context...")
                gemini_moments = detect_stream_highlights_gemini(
                    youtube_url=youtube_url,
                    duration=duration,
                    target_duration=segment_duration,
                    start_offset=stream_slice_start if not is_partial_stream else 0.0,
                    end_offset=stream_slice_end if not is_partial_stream else duration,
                    audio_peaks=stream_moments,
                    stream_title=meta.get("title")
                )
            except Exception as gem_err:
                print(f"[Pipeline Notice] Gemini stream highlights notice: {gem_err}")

            if gemini_moments and len(gemini_moments) >= 2:
                print(f"[Pipeline] Using {len(gemini_moments)} Gemini-detected 16:9 stream highlights!")
                moments = gemini_moments
                max_clips = max(max_clips, len(gemini_moments))
            elif stream_moments and len(stream_moments) >= 2:
                print(f"[Pipeline] Falling back to {len(stream_moments)} acoustic reaction peaks.")
                moments = stream_moments
                if detector_mode == "supercut":
                    max_clips = max(max_clips, len(stream_moments))
            else:
                # Safe fallback without triggering heavy OpenCV frame loops on long streams
                print("[Pipeline] Generating spaced highlight windows across stream...")
                num_fallback = max(3, max_clips)
                chunk_len = round(float(segment_duration) / float(num_fallback), 1)
                stride = max(chunk_len + 10.0, duration / float(num_fallback + 1))
                moments = []
                for f_idx in range(num_fallback):
                    f_start = min(duration - chunk_len, (f_idx + 1) * stride)
                    f_end = min(duration, f_start + chunk_len)
                    moments.append({
                        "start": round(f_start, 2),
                        "end": round(f_end, 2),
                        "duration": round(f_end - f_start, 2),
                        "title": f"Highlight Segment {f_idx + 1}",
                        "score": 80.0
                    })
        elif selected_moments and len(selected_moments) > 0:
            print(f"[Pipeline] Using {len(selected_moments)} user-selected viral moments for rendering!")
            if progress_callback:
                progress_callback("curating_moments", 60, f"Processing {len(selected_moments)} curated viral moment(s)...")
            moments = []
            for idx, m in enumerate(selected_moments):
                orig_s = max(0.0, parse_time_to_sec(m.get("start"), 0.0))
                orig_e = parse_time_to_sec(m.get("end"), orig_s + float(segment_duration))
                if orig_e <= orig_s:
                    orig_e = orig_s + float(segment_duration)
                dur = max(1.0, orig_e - orig_s)

                # If partial slice was downloaded, shift timestamps relative to slice start!
                if is_partial_stream:
                    s = max(0.0, orig_s - stream_slice_start)
                    e = min(duration, s + dur)
                else:
                    s = max(0.0, orig_s)
                    e = min(duration, orig_e)

                moments.append({
                    "start": s,
                    "end": e,
                    "duration": round(e - s, 2),
                    "title": m.get("title") or f"Short {idx + 1}",
                    "score": int(m.get("virality_score", m.get("score", 95))),
                    "heatmap_score": int(m.get("virality_score", m.get("score", 95))),
                    "virality_reason": m.get("virality_reason", ""),
                    "hook_quote": m.get("hook_quote", ""),
                })
            max_clips = len(moments)
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
        
        # 4. Transcribe speech segments for center-anchored kinetic captions (if caption_style != 'none')
        # For long videos (> 10 mins) or curated moments, skip whole-video transcription:
        # split_and_crop_video directly and accurately transcribes each 30-second slice in 2 seconds without OOM!
        speech_segments = None
        has_curated_moments = bool(selected_moments and len(selected_moments) > 0)
        if caption_style != "none" and aspect_ratio == "9:16" and duration <= 600.0 and not has_curated_moments:
            try:
                if progress_callback:
                    lang_label = "Hinglish (Hindi in English)" if subtitle_language == "hinglish" else "English" if subtitle_language == "english" else "Auto-Detected Language"
                    progress_callback("transcribing", 72, f"Transcribing speech in {lang_label} for Vakiogiri kinetic captions...")
                speech_segments = transcribe_video_audio(video_path, subtitle_language=subtitle_language)
            except Exception as tr_err:
                print(f"[Pipeline Notice] Speech transcription for captions notice: {tr_err}")
        elif progress_callback:
            progress_callback("clipping", 75, "Preparing high-speed precision rendering & animated subtitles...")

        # 5. Crop & Split dynamically identified moments (9:16 Vakiogiri Signature Split or 16:9 in target quality)
        clips = split_and_crop_video(
            video_path=video_path,
            output_dir=clips_output_dir,
            duration=duration,
            moments=moments,
            segment_len=segment_duration,
            max_clips=max_clips,
            aspect_ratio=aspect_ratio,
            quality=quality,
            caption_style=caption_style,
            speech_segments=speech_segments,
            progress_callback=progress_callback,
            subtitle_language=subtitle_language,
            layout_mode=layout_mode,
            stream_source=stream_source
        )
        
        for c in clips:
            c["mode"] = mode
            c["aspect_ratio"] = aspect_ratio
            c["layout_mode"] = layout_mode
            c["content_type"] = content_type
            c["quality"] = quality

        # 5. Optional Non-Linear Story Synthesis (Franken-Editing for AI mode)
        # Strictly disabled when user selected specific moments
        has_curated_moments = bool(selected_moments and len(selected_moments) > 0)
        if synthesize_stories and ai_enabled and not has_curated_moments:
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

        # 6. Stream / Video Compilation Reel Stitcher
        if is_supercut and stream_output_mode in ["single_reel", "both"] and len(clips) >= 2:
            try:
                if progress_callback:
                    progress_callback("stitching_compilation", 92, "Merging highlight clips into single cohesive reel...")
                clip_file_paths = [os.path.join(clips_output_dir, c["filename"]) for c in clips if not c.get("is_synthesized")]
                compilation_file = "compilation_highlights.mp4"
                compilation_path = os.path.join(clips_output_dir, compilation_file)
                compilation_info = stitch_highlight_compilation(
                    clip_paths=clip_file_paths,
                    output_compilation_path=compilation_path,
                    titles=[c.get("title", "Highlight") for c in clips if not c.get("is_synthesized")],
                    aspect_ratio=aspect_ratio
                )
                reel_dur_min = max(1, int(round(compilation_info["total_duration"] / 60.0)))
                target_w, target_h = get_render_dimensions(aspect_ratio, quality)
                compilation_record = {
                    "filename": compilation_file,
                    "title": f"Master Highlights Reel ({reel_dur_min}m Supercut)",
                    "score": 99,
                    "duration": compilation_info["total_duration"],
                    "aspect_ratio": aspect_ratio,
                    "content_type": content_type,
                    "mode": mode,
                    "quality": quality,
                    "resolution": f"{target_w}x{target_h}",
                    "is_compilation": True,
                    "chapters": compilation_info["chapters"],
                    "chapter_description": compilation_info["chapter_description"]
                }

                if stream_output_mode == "single_reel":
                    # Clean up intermediate clips so user receives exactly the 1 master highlight reel
                    for c in clips:
                        c_file = os.path.join(clips_output_dir, c["filename"])
                        if os.path.exists(c_file) and c["filename"] != compilation_file:
                            try:
                                os.remove(c_file)
                            except Exception:
                                pass
                    clips = [compilation_record]
                else:  # "both"
                    clips.insert(0, compilation_record)

                meta_file = os.path.join(clips_output_dir, "metadata.json")
                with open(meta_file, "w", encoding="utf-8") as f:
                    json.dump(clips, f, indent=2)
                print(f"[Pipeline] Successfully generated stream compilation reel: {compilation_file} (mode: {stream_output_mode})")
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


