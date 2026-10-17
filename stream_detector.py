"""
Gaming & Stream Highlight Detection Engine (StreamAI / Vakiogiri 2.0)
Specialized in:
1. Gemini 2.5 Flash Climax & Reaction Intelligence (Audience Heatmap + Acoustic + Context)
2. Local High-Energy Peak & Reaction Detection (Adaptive Rolling Noise Floor + Non-Maximum Suppression)
3. 16:9 Widescreen Highlight Compilation Stitcher (FFmpeg Filter Complex, Zero Desync, Chapter Timestamps)
"""

import os
import sys
import math
import subprocess
import numpy as np
import soundfile as sf
from typing import Dict, List, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from gemini_stream_detector import detect_stream_highlights_gemini, get_gemini_client


def detect_stream_audio_peaks(
    wav_path: str,
    target_duration: int = 300,
    min_peak_distance: Optional[float] = None,
    top_k: int = 5,
    mode: str = "supercut",
    start_offset: float = 0.0,
    end_offset: Optional[float] = None,
    stream_time_shift: float = 0.0
) -> List[Dict[str, Any]]:
    """
    Scans a 16kHz mono audio WAV for gaming scream, shout, and clutch reaction peaks.
    Uses an adaptive rolling baseline to distinguish player reactions from background audio.
    
    Modes:
    - 'supercut': target_duration represents the TOTAL runtime of the stitched highlight reel (e.g. 3m, 5m, 10m).
      Identifies top N punchy, high-energy micro-moments across the stream.
    - 'clips': target_duration represents the length of each individual highlight clip.
    """
    if not os.path.exists(wav_path):
        raise FileNotFoundError(f"Audio file not found: {wav_path}")

    y, sr = sf.read(wav_path)
    if len(y.shape) > 1:
        y = np.mean(y, axis=1)
    y = y.astype(np.float32)

    total_samples = len(y)
    duration = total_samples / float(sr)
    if duration < 10.0:
        return []

    if mode == "supercut":
        if target_duration <= 120:
            num_moments = 4  # 4 moments x 30s = 120s (2 min)
        elif target_duration <= 180:
            num_moments = 5  # 5 moments x 36s = 180s (3 min)
        elif target_duration <= 300:
            num_moments = 6  # 6 moments x 50s = 300s (5 min)
        elif target_duration <= 480:
            num_moments = 8
        else:
            num_moments = 10
        clip_len = round(float(target_duration) / num_moments, 1)
        needed_clips = num_moments
        # FIX: Allow bursty gaming highlights (e.g. 35s apart) instead of locking out for 15 minutes!
        if min_peak_distance is None:
            min_peak_distance = max(30.0, min(60.0, clip_len * 0.8))
    else:
        clip_len = float(target_duration)
        needed_clips = top_k
        if min_peak_distance is None:
            min_peak_distance = max(30.0, clip_len * 0.85)

    # 100ms analysis frames
    hop_sec = 0.1
    hop = int(sr * hop_sec)
    frame_len = int(sr * 0.15)
    num_frames = (total_samples - frame_len) // hop

    if num_frames <= 0:
        return []

    # Fast chunked vectorized RMS computation
    chunk_size = 50000
    rms_list = []
    for start_idx in range(0, num_frames, chunk_size):
        end_idx = min(num_frames, start_idx + chunk_size)
        n_sub = end_idx - start_idx
        sub_y = y[start_idx * hop : (end_idx - 1) * hop + frame_len]
        sub_frames = np.lib.stride_tricks.as_strided(
            sub_y,
            shape=(n_sub, frame_len),
            strides=(sub_y.strides[0] * hop, sub_y.strides[0])
        )
        sub_rms = np.sqrt(np.mean(sub_frames ** 2, axis=1) + 1e-12)
        rms_list.append(sub_rms)

    rms = np.concatenate(rms_list)
    rms_db = 20.0 * np.log10(np.maximum(1e-5, rms))
    times = (np.arange(len(rms)) * hop_sec) + (frame_len / (2.0 * sr))

    # Fast uniform baseline filter via numpy cumulative sum
    window_frames = int(60.0 / hop_sec)
    pad = window_frames // 2
    padded = np.pad(rms_db, pad, mode='edge')
    cumsum = np.cumsum(padded, dtype=np.float64)
    local_floor = (cumsum[window_frames:] - cumsum[:-window_frames]) / window_frames
    local_floor = local_floor[:len(rms_db)].astype(np.float32)

    # Energy headroom above rolling baseline
    headroom = rms_db - local_floor

    # Identify candidate loud frames
    loud_indices = np.where((rms_db >= -24.0) & (headroom > 5.0))[0]
    relative_surge = np.where((rms_db >= -24.0) & (headroom > 5.0), headroom, 0.0)

    # Peak candidate finding
    peak_indices = np.where(relative_surge > 7.0)[0]
    if len(peak_indices) == 0:
        peak_indices = np.argsort(rms_db)[-40:]

    sorted_peaks = sorted(peak_indices, key=lambda idx: relative_surge[idx], reverse=True)

    selected_times = []
    candidates = []
    for p_idx in sorted_peaks:
        t_peak = float(times[p_idx])
        surge_val = float(relative_surge[p_idx])

        if t_peak < start_offset:
            continue
        if end_offset and t_peak > end_offset:
            continue

        if any(abs(t_peak - st) < min_peak_distance for st in selected_times):
            continue

        selected_times.append(t_peak)

        # FIX: Generous lead-in so the player's fight and setup buildup are preserved (25-30s)
        lead_in = min(30.0 if mode == "supercut" else 120.0, float(clip_len) * 0.55)
        start_time = max(start_offset, t_peak - lead_in)
        end_time = min(duration, start_time + clip_len)
        if end_offset and end_time > end_offset:
            end_time = end_offset

        score = float(np.clip(75.0 + (surge_val * 1.6), 75.0, 98.0))

        if surge_val > 14.0:
            prefix = "Insane Climax / Reaction"
        elif surge_val > 10.0:
            prefix = "High Energy Play"
        else:
            prefix = "Stream Highlight"

        candidates.append({
            "start": round(start_time + stream_time_shift, 2),
            "end": round(end_time + stream_time_shift, 2),
            "duration": round(end_time - start_time, 2),
            "score": round(score, 1),
            "peak_time": round(t_peak + stream_time_shift, 2),
            "surge_db": round(surge_val, 1),
            "title": f"{prefix} @ {format_timestamp_short(t_peak + stream_time_shift)}"
        })

        if len(candidates) >= needed_clips:
            break

    candidates.sort(key=lambda c: c["start"])
    return candidates


def format_timestamp_short(seconds: float) -> str:
    """Format seconds into HH:MM:SS or MM:SS."""
    seconds = max(0.0, float(seconds))
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def stitch_highlight_compilation(
    clip_paths: List[str],
    output_compilation_path: str,
    titles: Optional[List[str]] = None,
    aspect_ratio: str = "16:9"
) -> Dict[str, Any]:
    """
    Merges individual 16:9 highlight clips into a single continuous YouTube compilation video.
    Uses FFmpeg PTS-normalized filtergraph with audio sync and generates YouTube chapter description.
    """
    if not clip_paths:
        raise ValueError("No clips provided for compilation stitching.")

    valid_clips = [p for p in clip_paths if os.path.exists(p) and os.path.getsize(p) > 1000]
    if not valid_clips:
        raise FileNotFoundError("None of the specified clip files exist on disk.")

    output_dir = os.path.dirname(output_compilation_path)
    os.makedirs(output_dir, exist_ok=True)

    n_clips = len(valid_clips)
    print(f"\n[🎬 Concat Stitcher] Stitching {n_clips} clips into 16:9 Master Compilation: {os.path.basename(output_compilation_path)}")

    # Method 1: PTS-Normalized Filter Complex (Guaranteed 0% Audio/Video Desync across all cuts)
    input_args = []
    filter_parts = []
    concat_inputs = []

    for idx, p in enumerate(valid_clips):
        input_args.extend(["-i", os.path.abspath(p)])
        filter_parts.append(f"[{idx}:v]setpts=PTS-STARTPTS,fps=30[v{idx}];")
        filter_parts.append(f"[{idx}:a]asetpts=PTS-STARTPTS,aresample=48000[a{idx}];")
        concat_inputs.append(f"[v{idx}][a{idx}]")

    filter_complex = "".join(filter_parts) + "".join(concat_inputs) + f"concat=n={n_clips}:v=1:a=1[outv][outa]"

    concat_cmd = [
        "ffmpeg",
        "-y",
        *input_args,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-tune", "film",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        output_compilation_path
    ]

    try:
        subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        print(f"[🎬 Concat Stitcher] Successfully rendered PTS-synchronized 16:9 compilation video!")
    except subprocess.CalledProcessError as e:
        print(f"[Concat Stitcher Warning] Filter complex error: {e.stderr[:200] if e.stderr else 'unknown'}, trying demuxer fallback...")
        manifest_path = os.path.join(output_dir, "concat_manifest.txt")
        with open(manifest_path, "w", encoding="utf-8") as f:
            for p in valid_clips:
                safe_p = os.path.abspath(p).replace("\\", "/").replace("'", "'\\''")
                f.write(f"file '{safe_p}'\n")

        demuxer_cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", manifest_path,
            "-c:v", "libx264",
            "-preset", "faster",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output_compilation_path
        ]
        try:
            subprocess.run(demuxer_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        finally:
            if os.path.exists(manifest_path):
                try:
                    os.remove(manifest_path)
                except Exception:
                    pass

    # Calculate Chapter Timestamps
    chapters = []
    chapter_lines = []
    current_time = 0.0

    for idx, clip_p in enumerate(valid_clips):
        clip_dur = 45.0
        probe_cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            clip_p
        ]
        try:
            res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            clip_dur = float(res.stdout.strip())
        except Exception:
            pass

        time_str = format_timestamp_short(current_time)
        clip_title = titles[idx] if (titles and idx < len(titles)) else f"Highlight #{idx + 1}"
        chapters.append({
            "timestamp": time_str,
            "seconds": round(current_time, 2),
            "title": clip_title,
            "duration": round(clip_dur, 2)
        })
        chapter_lines.append(f"{time_str} - {clip_title}")
        current_time += clip_dur

    total_duration = round(current_time, 2)
    chapter_description = "\n".join(chapter_lines)

    return {
        "compilation_path": output_compilation_path,
        "filename": os.path.basename(output_compilation_path),
        "total_duration": total_duration,
        "clips_count": len(valid_clips),
        "chapters": chapters,
        "chapter_description": chapter_description,
        "aspect_ratio": aspect_ratio
    }
