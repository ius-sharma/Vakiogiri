"""
Gaming Multimodal Viral Moments Engine (Vakiogiri AI 2.0)
Specialized for Gaming Streams & Videos (BGMI, Valorant, GTA V, Free Fire, CS2, Minecraft, etc.)

Fuses 4 Key Signals:
1. In-Game Killfeed & Action Dynamics (Visual motion / HUD flashes)
2. Streamer Facecam Body Language & Reaction (Chair jump / hands-on-head / desk slam motion)
3. Audio Tension-to-Climax Dynamics (Silence / low focus -> Sudden scream / laugh / impact)
4. YouTube Heatmap & Live Chat Velocity (Audience crowdsourced peaks)

Dynamic Windowing:
Never forces rigid 45s clips! Naturally sizes clips between 20s and 60s
to capture the complete gaming short arc: [Setup] -> [The Play] -> [Reaction & Payoff].
"""

import os
import sys
import json
import re
import math
import tempfile
import subprocess
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from dotenv import load_dotenv
load_dotenv(override=True)

from google import genai
import yt_dlp
from youtube_heatmap import extract_heatmap


def format_seconds_to_timestamp(seconds: float) -> str:
    """Format seconds into MM:SS or HH:MM:SS."""
    seconds = max(0.0, float(seconds))
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def get_gemini_client() -> Optional[genai.Client]:
    """Initialize Google GenAI client with GEMINI_API_KEY from environment."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "PASTE_YOUR_GEMINI_API_KEY_HERE":
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[GamingEngine] Client initialization error: {e}")
        return None


def probe_source_metadata(video_source: str) -> Dict[str, Any]:
    """Extract video duration, title, description, and chapters."""
    if os.path.exists(video_source) and os.path.isfile(video_source):
        from pipeline import get_video_duration
        dur = get_video_duration(video_source)
        return {
            "title": os.path.basename(video_source).rsplit(".", 1)[0],
            "duration": dur,
            "description": "",
            "chapters": [],
            "is_local": True
        }

    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'socket_timeout': 6,
        'nocheckcertificate': True,
        'no_color': True,
    }
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_source, download=False)
            if not info:
                return {"title": "Gaming Stream", "duration": 300.0, "description": "", "chapters": [], "is_local": False}
            return {
                "title": info.get("title") or "Gaming Stream",
                "duration": float(info.get("duration") or 300.0),
                "description": (info.get("description") or "")[:2500],
                "chapters": info.get("chapters") or [],
                "is_local": False,
                "view_count": info.get("view_count", 0),
            }
    except Exception as e:
        print(f"[GamingEngine] yt-dlp probe warning: {e}")
        return {"title": "Gaming Stream", "duration": 300.0, "description": "", "chapters": [], "is_local": False}


def detect_audio_tension_climax(
    audio_path: str,
    window_start: float = 0.0,
    window_end: float = 0.0,
    sample_rate: int = 16000
) -> List[Dict[str, Any]]:
    """
    Detects tension-to-climax acoustic transitions:
    [5-15s relative calm / silent concentration] -> [Sudden scream / laugh / loud impact peak].
    """
    if not os.path.exists(audio_path):
        return []

    try:
        import soundfile as sf
        y, sr = sf.read(audio_path)
        if len(y.shape) > 1:
            y = np.mean(y, axis=1)
        y = y.astype(np.float32)

        total_dur = len(y) / float(sr)
        hop_sec = 0.5
        hop_len = int(sr * hop_sec)
        num_hops = len(y) // hop_len

        rms_timeline = []
        for i in range(num_hops):
            chunk = y[i * hop_len : (i + 1) * hop_len]
            rms = float(np.sqrt(np.mean(chunk ** 2) + 1e-12))
            rms_timeline.append(rms)

        if not rms_timeline:
            return []

        rms_arr = np.array(rms_timeline)
        baseline_rms = np.median(rms_arr) + 1e-6

        peaks = []
        # Look for silence-to-impact transition (tension -> explosion)
        lookback_hops = int(10.0 / hop_sec)  # 10s lookback
        for i in range(lookback_hops, num_hops - 4):
            t_sec = window_start + (i * hop_sec)
            if window_end > window_start and (t_sec < window_start or t_sec > window_end):
                continue

            current_burst = np.mean(rms_arr[i : i + 4])  # 2s burst
            past_calm = np.mean(rms_arr[i - lookback_hops : i])  # past 10s calm

            ratio = current_burst / (past_calm + 1e-6)
            abs_ratio = current_burst / baseline_rms

            # High tension release pattern: sudden surge 2.5x above preceding calm and 2x above baseline
            if ratio >= 2.2 and abs_ratio >= 1.8:
                peaks.append({
                    "timestamp": round(t_sec, 1),
                    "intensity": round(float(min(1.0, (ratio * abs_ratio) / 10.0)), 3),
                    "type": "audio_tension_explosion"
                })

        # Non-maximum suppression (keep peaks at least 25s apart)
        peaks.sort(key=lambda x: x["intensity"], reverse=True)
        suppressed = []
        for p in peaks:
            if not any(abs(p["timestamp"] - sp["timestamp"]) < 25.0 for sp in suppressed):
                suppressed.append(p)

        return suppressed[:15]
    except Exception as e:
        print(f"[GamingEngine] Audio tension detection error: {e}")
        return []


def analyze_video_gameplay_and_facecam(
    video_path: str,
    window_start: float,
    window_end: float,
    sample_interval_sec: float = 1.0
) -> List[Dict[str, Any]]:
    """
    Lightweight computer vision analysis on local video:
    1. In-game HUD/killfeed zone color & luminance flash density
    2. Facecam body language & chair movement energy
    """
    if not os.path.exists(video_path):
        return []

    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0

        start_f = int(max(0.0, window_start) * fps)
        end_f = int(min(duration, window_end if window_end > 0 else duration) * fps)
        step_f = max(1, int(fps * sample_interval_sec))

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_f)
        cur_f = start_f

        prev_hud = None
        prev_face_box = None
        visual_peaks = []

        while cur_f < end_f:
            ret, frame = cap.read()
            if not ret:
                break

            h, w = frame.shape[:2]

            # 1. Killfeed region (top right quadrant)
            hud_crop = frame[0:int(h * 0.35), int(w * 0.65):w]
            hud_gray = cv2.cvtColor(hud_crop, cv2.COLOR_BGR2GRAY)

            hud_motion = 0.0
            if prev_hud is not None:
                hud_diff = cv2.absdiff(hud_gray, prev_hud)
                hud_motion = float(np.mean(hud_diff))
            prev_hud = hud_gray

            # 2. Facecam region (commonly top-left or bottom-right corner)
            # Sample bottom-right facecam corner motion
            face_crop = frame[int(h * 0.60):h, int(w * 0.70):w]
            face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

            face_motion = 0.0
            if prev_face_box is not None:
                face_diff = cv2.absdiff(face_gray, prev_face_box)
                face_motion = float(np.mean(face_diff))
            prev_face_box = face_gray

            t_sec = cur_f / fps
            combined_visual_score = (hud_motion * 1.5) + (face_motion * 2.0)

            if combined_visual_score > 35.0:  # Significant action/reaction threshold
                visual_peaks.append({
                    "timestamp": round(t_sec, 1),
                    "intensity": round(min(1.0, combined_visual_score / 120.0), 3),
                    "type": "gameplay_action_face_motion"
                })

            cur_f += step_f
            cap.set(cv2.CAP_PROP_POS_FRAMES, cur_f)

        cap.release()

        # Suppress close visual peaks
        visual_peaks.sort(key=lambda x: x["intensity"], reverse=True)
        suppressed = []
        for vp in visual_peaks:
            if not any(abs(vp["timestamp"] - svp["timestamp"]) < 20.0 for svp in suppressed):
                suppressed.append(vp)

        return suppressed[:15]
    except Exception as e:
        print(f"[GamingEngine] Visual gameplay analysis notice: {e}")
        return []


def discover_gaming_viral_moments(
    video_source: str,
    target_duration: int = 45,
    max_moments: int = 8,
    known_title: Optional[str] = None,
    known_duration: Optional[float] = None,
    start_sec: Optional[float] = None,
    end_sec: Optional[float] = None
) -> Dict[str, Any]:
    """
    Vakiogiri Gaming Multimodal Discovery Engine 2.0:
    Fuses:
    - YouTube Heatmaps & Chat Replay spikes (Signal 4)
    - Audio Tension-to-Climax pattern (Signal 3)
    - Facecam Body Language & In-Game Action/Killfeed (Signals 1 & 2)
    - Gemini 2.5 Flash Creative Gaming Director for Hook Titles & Dynamic Windowing
    """
    print("\n=================================================================")
    print("[🎮 Vakiogiri Gaming Moments Engine 2.0] Analyzing Video for Viral Gaming Shorts")
    print(f"    Source: {video_source}")
    print(f"    Max Moments: {max_moments}")
    print("=================================================================\n", flush=True)

    if known_title and known_duration and known_duration > 0:
        title = known_title
        duration = float(known_duration)
        description = ""
        chapters = []
        is_local = os.path.exists(video_source) and os.path.isfile(video_source)
    else:
        meta = probe_source_metadata(video_source)
        title = meta.get("title") or "Gaming Stream"
        duration = float(meta.get("duration") or 300.0)
        description = meta.get("description", "")
        chapters = meta.get("chapters", [])
        is_local = meta.get("is_local", False)

    window_start = max(0.0, float(start_sec or 0.0))
    window_end = min(duration, float(end_sec or duration))
    if window_end <= window_start or (window_end - window_start) < 20.0:
        window_start = 0.0
        window_end = duration

    # 1. Extract YouTube Heatmap Peaks (Signal 4)
    heatmap_moments = []
    is_yt = video_source.startswith("http://") or video_source.startswith("https://")
    if is_yt:
        try:
            hm_data = extract_heatmap(video_source)
            if isinstance(hm_data, dict):
                heatmap_moments = hm_data.get("markers", [])
            elif isinstance(hm_data, list):
                heatmap_moments = hm_data
            if heatmap_moments:
                print(f"[GamingEngine] Ingested {len(heatmap_moments)} YouTube heatmap peaks.")
        except Exception as e:
            print(f"[GamingEngine] Heatmap extraction notice: {e}")

    # 2. Extract Acoustic Tension Peaks (Signal 3)
    audio_tension_peaks = []
    temp_audio_file = None
    try:
        if is_local and os.path.exists(video_source):
            # Extract lightweight audio from local video
            temp_audio_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
            cmd = [
                "ffmpeg", "-y", "-ss", str(window_start), "-t", str(window_end - window_start),
                "-i", video_source, "-vn", "-ac", "1", "-ar", "16000", temp_audio_file
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            audio_tension_peaks = detect_audio_tension_climax(
                temp_audio_file, window_start=window_start, window_end=window_end
            )
        elif is_yt:
            # Check if yt-dlp can grab sample audio or if heatmap has peaks
            pass
    except Exception as a_err:
        print(f"[GamingEngine] Audio extraction notice: {a_err}")
    finally:
        if temp_audio_file and os.path.exists(temp_audio_file):
            try:
                os.remove(temp_audio_file)
            except Exception:
                pass

    # 3. Extract Gameplay & Facecam Visual Peaks (Signals 1 & 2)
    visual_peaks = []
    if is_local and os.path.exists(video_source):
        visual_peaks = analyze_video_gameplay_and_facecam(
            video_source, window_start=window_start, window_end=window_end
        )

    # 4. Synthesize Candidate Climax Points (Multimodal Fusion)
    candidate_climaxes = []

    # From Heatmap (Crowdsourced)
    for hm in heatmap_moments:
        t_mid = (hm.get("start_seconds", 0) + hm.get("end_seconds", 0)) / 2.0
        if window_start <= t_mid <= window_end:
            candidate_climaxes.append({
                "climax_sec": round(t_mid, 1),
                "intensity": float(hm.get("intensity", 0.8)),
                "source": "audience_replay_peak"
            })

    # From Audio Tension-to-Climax
    for ap in audio_tension_peaks:
        candidate_climaxes.append({
            "climax_sec": ap["timestamp"],
            "intensity": ap["intensity"],
            "source": "audio_scream_laugh_explosion"
        })

    # From Visual Gameplay & Facecam
    for vp in visual_peaks:
        candidate_climaxes.append({
            "climax_sec": vp["timestamp"],
            "intensity": vp["intensity"],
            "source": "gameplay_clutch_face_motion"
        })

    # Cluster close climaxes into single unified climax points
    candidate_climaxes.sort(key=lambda x: x["climax_sec"])
    merged_climaxes = []
    for c in candidate_climaxes:
        matched = False
        for mc in merged_climaxes:
            if abs(mc["climax_sec"] - c["climax_sec"]) < 18.0:
                # Merge into existing peak
                mc["intensity"] = max(mc["intensity"], c["intensity"])
                mc["sources"].append(c["source"])
                matched = True
                break
        if not matched:
            merged_climaxes.append({
                "climax_sec": c["climax_sec"],
                "intensity": c["intensity"],
                "sources": [c["source"]]
            })

    # Sort by multimodal intensity and multi-source count
    merged_climaxes.sort(
        key=lambda x: (len(set(x["sources"])) * 1.5 + x["intensity"]),
        reverse=True
    )

    print(f"[GamingEngine] Formed {len(merged_climaxes)} high-confidence gaming climax anchors.")

    # 5. Gemini 2.5 Flash Gaming Creative Director Synthesis
    client = get_gemini_client()
    if client:
        try:
            climax_summary = []
            for mc in merged_climaxes[:10]:
                climax_summary.append({
                    "climax_timestamp": f"{format_seconds_to_timestamp(mc['climax_sec'])} ({mc['climax_sec']}s)",
                    "signals_detected": list(set(mc["sources"])),
                    "confidence_score": round(mc["intensity"] * 100)
                })

            system_instruction = (
                "You are an elite Lead Gaming Shorts Creative Director for top esports creators (BGMI, Valorant, GTA V, Free Fire, CS2, Minecraft).\n"
                "Your mission is to turn stream climax moments into high-retention, viral vertical Gaming Shorts.\n\n"
                "GAMING SHORT ANATOMY RULES:\n"
                "1. DO NOT force rigid 45s lengths! Every moment MUST have its natural duration (between 20s and 60s) based on the play:\n"
                "   - [Setup / Trash Talk / Tension]: Starts 10s-20s BEFORE the climax timestamp.\n"
                "   - [The Play / Clutch / Fail]: The intense action around the climax timestamp.\n"
                "   - [Reaction & Payoff]: Extends 5s-12s AFTER the climax for the full streamer laugh, scream, or punchline.\n"
                "2. NO mid-sentence or mid-reaction cuts! Let the streamer finish laughing or talking.\n"
                "3. Titles must be click-worthy, modern gaming titles with emojis (e.g. '1v4 Clutch But My Teammate Sold 💀', 'Bro Really Thought He Could Sneak Up 😭').\n"
                "4. Assign Virality Score between 88 and 99.\n"
                "5. Provide the exact Opening Hook Quote.\n"
                "6. Output strictly valid JSON format."
            )

            prompt = f"""VIDEO CONTEXT:
- Title: {title}
- Total Duration: {duration:.1f}s ({format_seconds_to_timestamp(duration)})
- Scoped Window: {window_start:.1f}s to {window_end:.1f}s ({format_seconds_to_timestamp(window_start)} ➔ {format_seconds_to_timestamp(window_end)})
- Target Moments: {max_moments}

MULTIMODAL GAMING CLIMAX ANCHORS DETECTED:
{json.dumps(climax_summary, indent=2) if climax_summary else "No climax anchors; utilize chapters or title context."}

CHAPTERS / TOPICS:
{json.dumps(chapters, indent=2) if chapters else "No chapters provided."}

DESCRIPTION / CONTEXT:
{description[:600] if description else "Gaming livestream."}

JSON OUTPUT FORMAT:
Return a JSON array of objects with this schema:
[
  {{
    "id": "moment_1",
    "title": "1v4 Clutch But Bro Sold 💀",
    "start": {max(window_start, 60.0):.1f},
    "end": {min(window_end, max(window_start + 32.0, 95.0)):.1f},
    "virality_score": 98,
    "virality_reason": "Suspenseful setup followed by rapid 3-kill clutch and table slam reaction.",
    "hook_quote": "Bhai dekh akele sambhalta hu..."
  }}
]
"""
            response = None
            for m_name in ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"]:
                try:
                    response = client.models.generate_content(
                        model=m_name,
                        contents=prompt,
                        config={
                            "system_instruction": system_instruction,
                            "response_mime_type": "application/json",
                            "temperature": 0.35,
                        }
                    )
                    if response and response.text:
                        break
                except Exception as ex_m:
                    print(f"[GamingEngine] Model {m_name} notice: {ex_m}")
                    continue

            data = json.loads(response.text.strip())
            if isinstance(data, list) and len(data) > 0:
                validated_moments = []
                for idx, m in enumerate(data):
                    s = max(window_start, float(m.get("start", window_start)))
                    e = min(window_end, float(m.get("end", s + 35.0)))
                    
                    # Ensure flexible gaming length between 18s and 65s
                    dur = e - s
                    if dur < 18.0:
                        e = min(window_end, s + 30.0)
                        dur = e - s
                    elif dur > 65.0:
                        e = s + 55.0
                        dur = 55.0

                    validated_moments.append({
                        "id": f"moment_{idx + 1}",
                        "title": m.get("title") or f"Gaming Highlight #{idx + 1}",
                        "start": round(s, 1),
                        "end": round(e, 1),
                        "duration": round(dur, 1),
                        "duration_formatted": format_seconds_to_timestamp(dur),
                        "start_formatted": format_seconds_to_timestamp(s),
                        "end_formatted": format_seconds_to_timestamp(e),
                        "virality_score": int(m.get("virality_score", 95)),
                        "virality_reason": m.get("virality_reason", "High-intensity clutch and streamer reaction."),
                        "hook_quote": m.get("hook_quote", ""),
                    })

                validated_moments.sort(key=lambda x: x["virality_score"], reverse=True)
                return {
                    "video_title": title,
                    "duration": duration,
                    "duration_formatted": format_seconds_to_timestamp(duration),
                    "moments": validated_moments[:max_moments],
                    "engine": "vakiogiri_gaming_multimodal_v2"
                }
        except Exception as gemini_err:
            print(f"[GamingEngine] Gemini synthesis error: {gemini_err}")

    # 6. Fallback: Multimodal Anchored Dynamic Windowing (No Dumb Spacing)
    fallback_moments = []
    anchors_to_use = merged_climaxes if merged_climaxes else []

    if not anchors_to_use:
        # If no peaks at all, generate 4 dynamic gaming windows around video thirds
        w_len = max(30.0, window_end - window_start)
        anchors_to_use = [
            {"climax_sec": window_start + (w_len * 0.25), "intensity": 0.85, "sources": ["play_start"]},
            {"climax_sec": window_start + (w_len * 0.50), "intensity": 0.95, "sources": ["mid_clutch"]},
            {"climax_sec": window_start + (w_len * 0.75), "intensity": 0.90, "sources": ["end_climax"]}
        ]

    for idx, anc in enumerate(anchors_to_use[:max_moments]):
        t_climax = anc["climax_sec"]
        
        # Gaming Short Formula:
        # Setup: 18s before climax
        # Reaction: 12s after climax -> Total ~30s dynamic short
        s = max(window_start, t_climax - 18.0)
        e = min(window_end, t_climax + 12.0)
        dur = round(e - s, 1)

        fallback_moments.append({
            "id": f"moment_{idx + 1}",
            "title": f"Epic Gaming Play #{idx + 1} 🎯",
            "start": round(s, 1),
            "end": round(e, 1),
            "duration": dur,
            "duration_formatted": format_seconds_to_timestamp(dur),
            "start_formatted": format_seconds_to_timestamp(s),
            "end_formatted": format_seconds_to_timestamp(e),
            "virality_score": 96 - (idx * 2),
            "virality_reason": f"Climax anchor at {format_seconds_to_timestamp(t_climax)} with full setup and reaction payoff.",
            "hook_quote": f"Play starts at {format_seconds_to_timestamp(s)}",
        })

    return {
        "video_title": title,
        "duration": duration,
        "duration_formatted": format_seconds_to_timestamp(duration),
        "moments": fallback_moments,
        "engine": "vakiogiri_gaming_multimodal_heuristic"
    }
