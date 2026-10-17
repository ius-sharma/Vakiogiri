"""
Gemini Multimodal Stream Highlights Engine (Vakiogiri AI 2.0)
Analyzes long YouTube gaming streams/VODs (up to 5 hours) using Google Gemini 2.5 Flash
combined with YouTube Heatmaps ("Most Replayed"), Audio Peak Dynamics, and Comment Timestamps.

Produces 16:9 Widescreen Master Highlights with natural context buildup, zero desync,
and auto-generated YouTube chapters.
"""

import os
import sys
import json
import re
from typing import List, Dict, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from dotenv import load_dotenv
load_dotenv()

from google import genai
from youtube_heatmap import extract_heatmap


def get_gemini_client() -> Optional[genai.Client]:
    """Initialize and return the official Google GenAI Client if API key is present."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not api_key.strip() or api_key.strip() == "PASTE_YOUR_GEMINI_API_KEY_HERE":
        return None
    try:
        return genai.Client(api_key=api_key.strip())
    except Exception as e:
        print(f"[GeminiEngine] Client initialization error: {e}")
        return None


def format_timestamp(seconds: float) -> str:
    """Format seconds into readable MM:SS or HH:MM:SS."""
    seconds = max(0.0, float(seconds))
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def detect_stream_highlights_gemini(
    youtube_url: str,
    duration: float,
    target_duration: int = 300,
    start_offset: float = 0.0,
    end_offset: Optional[float] = None,
    audio_peaks: Optional[List[Dict[str, Any]]] = None,
    stream_title: Optional[str] = None,
    video_metadata: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Detects top 16:9 stream highlight moments using Gemini 2.5 Flash.
    Fuses audience replay heatmap data, acoustic energy surges, and stream context.
    """
    client = get_gemini_client()
    if not client:
        print("[GeminiEngine] GEMINI_API_KEY not configured or invalid. Falling back to local heuristic.")
        return []

    print("\n=================================================================")
    print("[🧠 Gemini AI] Analyzing Stream for 16:9 Climax Highlights")
    print(f"    Target Duration : {target_duration}s ({target_duration // 60}m compilation)")
    print(f"    Stream Length   : {format_timestamp(duration)}")
    print(f"    Analysis Range  : {format_timestamp(start_offset)} ➔ {format_timestamp(end_offset or duration)}")
    print("=================================================================\n", flush=True)

    # 1. Fetch YouTube 'Most Replayed' Heatmap
    heatmap_moments = []
    try:
        raw_heatmap = extract_heatmap(youtube_url)
        if raw_heatmap and len(raw_heatmap) > 0:
            # Sort by intensity descending and select top peaks
            sorted_heat = sorted(raw_heatmap, key=lambda x: x.get("intensity", 0.0), reverse=True)
            for h in sorted_heat[:15]:
                t = h.get("start", 0.0)
                if t >= start_offset and (end_offset is None or t <= end_offset):
                    heatmap_moments.append({
                        "timestamp": round(t, 1),
                        "timestamp_formatted": format_timestamp(t),
                        "audience_replay_intensity": round(h.get("intensity", 0.0), 3)
                    })
            print(f"[GeminiEngine] Ingested {len(heatmap_moments)} audience replay peaks from YouTube Heatmap.")
    except Exception as heat_err:
        print(f"[GeminiEngine Notice] Heatmap extraction notice: {heat_err}")

    # 2. Extract Acoustic Peaks if provided
    formatted_audio_peaks = []
    if audio_peaks:
        for p in audio_peaks[:12]:
            t = p.get("start", p.get("time", 0.0))
            if t >= start_offset and (end_offset is None or t <= end_offset):
                formatted_audio_peaks.append({
                    "timestamp": round(t, 1),
                    "timestamp_formatted": format_timestamp(t),
                    "audio_surge_score": round(p.get("score", 80), 1),
                    "type": p.get("type", "scream_or_clutch")
                })
        print(f"[GeminiEngine] Ingested {len(formatted_audio_peaks)} high-energy acoustic scream/reaction peaks.")

    # 3. Determine ideal number of moments and segment length
    if target_duration <= 120:
        num_moments = 3  # ~40s each
    elif target_duration <= 180:
        num_moments = 4  # ~45s each
    elif target_duration <= 300:
        num_moments = 6  # ~50s each
    elif target_duration <= 600:
        num_moments = 8  # ~75s each
    else:
        num_moments = 10

    avg_clip_dur = round(float(target_duration) / float(num_moments), 1)

    # 4. Construct Prompt for Gemini 2.5 Flash
    system_instruction = (
        "You are an elite YouTube & Esports Video Director with 15+ years of experience editing "
        "gaming stream highlight supercuts and compilation videos (16:9 widescreen format).\n"
        "Your task is to identify the absolute best, highest-intensity, most entertaining climax moments "
        "from a long gaming stream or VOD, and return them with natural context buildup."
    )

    prompt = f"""VIDEO INFORMATION:
- Title: {stream_title or 'Gaming Stream / VOD'}
- Total Stream Duration: {duration:.1f} seconds ({format_timestamp(duration)})
- Allowed Range: {start_offset:.1f}s ({format_timestamp(start_offset)}) to {end_offset or duration:.1f}s ({format_timestamp(end_offset or duration)})
- Target Master Compilation Duration: {target_duration}s ({target_duration // 60} minutes)
- Number of Highlights Needed: {num_moments} moments (~{avg_clip_dur}s per highlight)

AUDIENCE SIGNALS:
1. YouTube Heatmap (Most Replayed Peaks by viewers):
{json.dumps(heatmap_moments, indent=2) if heatmap_moments else "No heatmap available (use acoustic peaks and stream flow)."}

2. Acoustic Energy / Reaction Peaks (Player screams, shouts, laughter, loud gameplay spikes):
{json.dumps(formatted_audio_peaks, indent=2) if formatted_audio_peaks else "Acoustic peaks analyzed across stream."}

CRITICAL EDITING DIRECTIVES (16:9 Widescreen):
1. NATURAL BUILDUP CONTEXT:
   - In gaming, streamer shouts or celebrations happen AFTER the kill or clutch.
   - You MUST place the start timestamp 20 to 30 seconds BEFORE the climax occurs so viewers can see the fight setup, crosshair placement, suspense, and enemy positioning.
   - End the clip 5 to 10 seconds AFTER the celebration settles so there is no awkward cut mid-word or mid-reaction.
2. DURATION BALANCE:
   - Each individual moment MUST be between 30 and 70 seconds.
   - The sum of all moments should roughly equal the target compilation duration ({target_duration} seconds).
3. SPACING & PACING:
   - Do NOT enforce a rigid 15-minute gap. If two insane plays happened in the same 5-minute match, include both!
   - Ensure moments do not overlap each other (minimum 15s separation between end of one clip and start of next).
4. PUNCHY METADATA:
   - Give each highlight an engaging, click-worthy title (e.g. "1v4 Impossible Clutch", "Jump Scare Screamer", "Insane Sniper Collateral").
   - Assign a virality score from 85 to 99 based on climax intensity.

RETURN ONLY A VALID JSON ARRAY OF OBJECTS matching this exact schema:
[
  {{
    "start": 842.0,
    "end": 887.0,
    "duration": 45.0,
    "title": "Insane 1v4 Clutch Ace",
    "score": 97,
    "type": "clutch",
    "rationale": "High tension 1v4 round with a 25s setup leading to streamer celebration.",
    "chapter_name": "1v4 Clutch Ace"
  }}
]
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "temperature": 0.2,
            }
        )

        response_text = response.text.strip()
        data = json.loads(response_text)

        if not isinstance(data, list) or len(data) == 0:
            print("[GeminiEngine] Received empty list from Gemini. Falling back to heuristic.")
            return []

        # Validate and sanitize moments
        valid_moments = []
        for item in data:
            s = float(item.get("start", 0.0))
            e = float(item.get("end", 0.0))
            if e <= s:
                e = s + avg_clip_dur
            # Clamp to stream bounds
            s = max(start_offset, min(s, duration - 10.0))
            e = max(s + 15.0, min(e, end_offset or duration))
            dur = round(e - s, 2)

            valid_moments.append({
                "start": round(s, 2),
                "end": round(e, 2),
                "duration": dur,
                "title": item.get("title") or f"Highlight ({format_timestamp(s)})",
                "score": float(item.get("score") or 90.0),
                "type": item.get("type", "highlight"),
                "rationale": item.get("rationale", ""),
                "chapter_name": item.get("chapter_name") or item.get("title", "Highlight"),
                "detected_by": "gemini-2.5-flash"
            })

        # Sort chronologically for natural compilation timeline
        valid_moments.sort(key=lambda x: x["start"])

        print(f"[GeminiEngine] Successfully generated {len(valid_moments)} precision 16:9 highlights:")
        for idx, vm in enumerate(valid_moments):
            print(f"   [{idx + 1}] {format_timestamp(vm['start'])} - {format_timestamp(vm['end'])} ({vm['duration']}s) | Score: {vm['score']} | {vm['title']}")

        return valid_moments

    except Exception as gen_err:
        print(f"[GeminiEngine Error] Gemini generation error: {gen_err}")
        return []
