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
        print(f"[GeminiMoments] Client initialization error: {e}")
        return None


def probe_video_details(video_source: str) -> Dict[str, Any]:
    """Extract title, duration, chapters, and description using yt-dlp."""
    if os.path.exists(video_source) and os.path.isfile(video_source):
        from pipeline import get_video_duration
        dur = get_video_duration(video_source)
        return {
            "title": os.path.basename(video_source).rsplit(".", 1)[0],
            "duration": dur,
            "description": "",
            "chapters": [],
        }

    cookie_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'nocheckcertificate': True,
        'no_color': True,
    }
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_source, download=False)
            if not info:
                return {"title": "YouTube Video", "duration": 300.0, "description": "", "chapters": []}
            return {
                "title": info.get("title") or "YouTube Video",
                "duration": float(info.get("duration") or 300.0),
                "description": (info.get("description") or "")[:2000],
                "chapters": info.get("chapters") or [],
            }
    except Exception as e:
        print(f"[GeminiMoments] yt-dlp probe warning: {e}")
        return {"title": "YouTube Video", "duration": 300.0, "description": "", "chapters": []}


def discover_viral_moments_gemini(
    video_source: str,
    target_duration: int = 45,
    max_moments: int = 8,
    known_title: Optional[str] = None,
    known_duration: Optional[float] = None,
    start_sec: Optional[float] = None,
    end_sec: Optional[float] = None
) -> Dict[str, Any]:
    """
    Stage 1: Fast AI Viral Moments Discovery using Google Gemini 2.5 Flash.
    Returns potential viral moments with titles, timestamps, virality scores, and hook quotes
    without performing any heavy FFmpeg video rendering.
    Optionally scopes moments discovery strictly to [start_sec, end_sec] for stream cuts.
    """
    if known_title and known_duration and known_duration > 0:
        title = known_title
        duration = float(known_duration)
        description = ""
        chapters = []
    else:
        video_info = probe_video_details(video_source)
        title = video_info["title"]
        duration = video_info["duration"]
        description = video_info["description"]
        chapters = video_info["chapters"]

    window_start = max(0.0, float(start_sec or 0.0))
    window_end = min(duration, float(end_sec or duration))
    if window_end <= window_start or (window_end - window_start) < 20.0:
        window_start = 0.0
        window_end = duration

    # 1. Fetch Heatmaps if YouTube URL
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
                print(f"[GeminiMoments] Ingested {len(heatmap_moments)} YouTube heatmap peaks.")
        except Exception as e:
            print(f"[GeminiMoments] Heatmap extraction skipped: {e}")

    # 2. Call Gemini 2.5 Flash
    client = get_gemini_client()
    if client:
        try:
            range_instruction = ""
            if window_start > 0 or window_end < duration:
                range_instruction = (
                    f"\nSTRICT USER SLICE WINDOW:\n"
                    f"- The user specifically requested moments ONLY between {window_start:.1f}s ({format_seconds_to_timestamp(window_start)}) and {window_end:.1f}s ({format_seconds_to_timestamp(window_end)}).\n"
                    f"- Every moment's `start` timestamp MUST be >= {window_start:.1f} and `end` MUST be <= {window_end:.1f}!\n"
                )

            system_instruction = (
                "You are an elite YouTube Shorts & TikTok Creative Director with 10+ years of viral growth experience. "
                "Your mission is to analyze video content, chapters, audience heatmap engagement peaks, and context "
                "to discover the absolute highest-retention, most viral moments for 9:16 vertical shorts.\n\n"
                "CRITICAL RULES:\n"
                "1. Each moment must be between 25 and 60 seconds long.\n"
                "2. Start timestamp MUST begin on a punchy opening hook or strong statement.\n"
                "3. End timestamp MUST complete the thought or punchline cleanly (no abrupt mid-sentence cut).\n"
                "4. Provide realistic, enticing click-worthy hook titles (avoid generic names).\n"
                "5. Assign a virality score between 80 and 99 based on emotional hook and retention.\n"
                "6. Provide the exact hook quote (the opening 1-2 sentences in that clip).\n"
                "7. Output strictly valid JSON format."
                + range_instruction
            )

            prompt = f"""VIDEO CONTEXT:
- Title: {title}
- Total Duration: {duration:.1f}s ({format_seconds_to_timestamp(duration)})
- Scoped Search Window: {window_start:.1f}s to {window_end:.1f}s ({format_seconds_to_timestamp(window_start)} ➔ {format_seconds_to_timestamp(window_end)})
- Target Short Duration: {target_duration}s (range 25s - 60s)
- Max Moments Requested: {max_moments}

CHAPTERS / TIMESTAMPS:
{json.dumps(chapters, indent=2) if chapters else "No chapters provided."}

YOUTUBE HEATMAP (Most Replayed Sections by Viewers):
{json.dumps(heatmap_moments[:12], indent=2) if heatmap_moments else "No heatmap available."}

DESCRIPTION / TOPICS:
{description[:800] if description else "No description available."}

JSON OUTPUT FORMAT:
Return a JSON array of objects with the following schema:
[
  {{
    "id": "moment_1",
    "title": "Punchy Hook Title Here",
    "start": {max(window_start, 65.0):.1f},
    "end": {min(window_end, max(window_start + 45.0, 108.0)):.1f},
    "virality_score": 97,
    "virality_reason": "High curiosity opening + immediate emotional payoff.",
    "hook_quote": "The biggest reason 90% of developers fail..."
  }}
]
"""

            # Try gemini-3.5-flash-lite first, fallback to gemini-3.5-flash
            response = None
            for m_name in ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]:
                try:
                    response = client.models.generate_content(
                        model=m_name,
                        contents=prompt,
                        config={
                            "system_instruction": system_instruction,
                            "response_mime_type": "application/json",
                            "temperature": 0.3,
                        }
                    )
                    if response and response.text:
                        break
                except Exception:
                    continue

            data = json.loads(response.text.strip())
            if isinstance(data, list) and len(data) > 0:
                validated_moments = []
                for idx, m in enumerate(data):
                    s = max(window_start, float(m.get("start", window_start)))
                    e = min(window_end, float(m.get("end", s + target_duration)))
                    if e <= s or (e - s) < 15.0:
                        e = min(window_end, s + target_duration)
                    dur = round(e - s, 1)

                    validated_moments.append({
                        "id": f"moment_{idx + 1}",
                        "title": m.get("title") or f"Viral Moment {idx + 1}",
                        "start": round(s, 1),
                        "end": round(e, 1),
                        "duration": dur,
                        "duration_formatted": format_seconds_to_timestamp(dur),
                        "start_formatted": format_seconds_to_timestamp(s),
                        "end_formatted": format_seconds_to_timestamp(e),
                        "virality_score": int(m.get("virality_score", 90)),
                        "virality_reason": m.get("virality_reason", "High retention hook and engaging narrative."),
                        "hook_quote": m.get("hook_quote", ""),
                    })

                # Sort by virality score descending
                validated_moments.sort(key=lambda x: x["virality_score"], reverse=True)

                return {
                    "video_title": title,
                    "duration": duration,
                    "duration_formatted": format_seconds_to_timestamp(duration),
                    "moments": validated_moments[:max_moments],
                    "engine": "gemini-3.5-flash-lite"
                }
        except Exception as e:
            print(f"[GeminiMoments] Gemini inference error: {e}")

    # Fallback: Generate smart heuristic moments if Gemini client fails
    fallback_moments = []
    window_dur = max(30.0, window_end - window_start)
    step = max(30.0, window_dur / float(max_moments + 1))
    for i in range(min(max_moments, 6)):
        s = round(window_start + (i + 0.5) * step, 1)
        dur = target_duration
        e = min(window_end, s + dur)
        fallback_moments.append({
            "id": f"moment_{i + 1}",
            "title": f"Key Highlight #{i + 1}",
            "start": s,
            "end": e,
            "duration": round(e - s, 1),
            "duration_formatted": format_seconds_to_timestamp(e - s),
            "start_formatted": format_seconds_to_timestamp(s),
            "end_formatted": format_seconds_to_timestamp(e),
            "virality_score": 95 - (i * 3),
            "virality_reason": "High viewer activity segment.",
            "hook_quote": f"Highlight moment from {format_seconds_to_timestamp(s)}",
        })

    return {
        "video_title": title,
        "duration": duration,
        "duration_formatted": format_seconds_to_timestamp(duration),
        "moments": fallback_moments,
        "engine": "heuristic_fallback"
    }
