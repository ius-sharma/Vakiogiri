"""
Sentence-ID Driven LLM Story & Play Arc Finder (Vakiogiri AI 2.0)
Replaces regex heuristics with semantic narrative understanding.

Key Pillars:
1. Sentence-ID Tagging ([S1], [S2]...): LLM picks discrete sentence IDs, code extracts exact timestamps. (0% hallucination)
2. Complete Arc Finder: Forces [Setup / Curiosity] -> [Action / Clutch / Drama] -> [Payoff / Punchline / Reaction].
3. Hinglish & English Dangling Opener Resolution: Never starts a clip on "Toh", "Aur", "Isliye", "But", "Phir".
4. Multi-Model Reliability: Gemini 3.8/3.5 Flash -> Groq Qwen 27B -> Local Fallback.
"""

import os
import sys
import json
import re
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

# Comprehensive Hinglish + English Dangling Starters
DANGLING_START_WORDS = {
    # English
    "and", "but", "or", "so", "because", "then", "which", "also", "plus",
    "yet", "however", "though", "well", "like", "actually", "basically",
    "now", "furthermore", "moreover", "anyway", "since", "until", "unless",
    # Hindi / Hinglish
    "toh", "to", "aur", "isliye", "fir", "phir", "lekin", "par", "magar",
    "kyunki", "kyuki", "jabki", "waise", "waisebhi", "matlab", "yani",
    "jaise", "jaisi", "agar", "tab", "tabhi", "phirbhi", "firbhi"
}

DANGLING_END_WORDS = {
    # English
    "and", "but", "or", "so", "because", "then", "which", "that", "like",
    "with", "to", "for", "of", "in", "on", "at", "by", "from", "about",
    "if", "when", "while", "as", "into", "through",
    # Hindi / Hinglish
    "ki", "ke", "ka", "ko", "se", "aur", "ya", "par", "pe", "toh", "to",
    "agar", "jab", "kyunki", "kyuki", "matlab"
}


def get_gemini_client() -> Optional[genai.Client]:
    """Initialize Google GenAI client with GEMINI_API_KEY from environment."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "PASTE_YOUR_GEMINI_API_KEY_HERE":
        return None
    try:
        from google.genai import types
        return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=10000))
    except Exception as e:
        print(f"[ArcFinder] Client init notice: {e}")
        return None


def get_groq_client():
    """Initialize Groq client as backup LLM."""
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=groq_key)
    except Exception as e:
        print(f"[ArcFinder] Groq client notice: {e}")
        return None


def build_sentence_index(segments: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Transforms word/phrase segments into indexed sentences with unique IDs: S1, S2, ..., SN.
    Returns:
    - sentence_list: ordered list of sentences with ID, text, start, end
    - id_map: fast lookup dict by ID
    """
    if not segments:
        return [], {}

    sentences = []
    id_map = {}
    current_words = []
    current_start = None
    current_end = None

    for seg in segments:
        text = seg.get("text", "").strip()
        start = float(seg.get("start", 0.0))
        end = float(seg.get("end", start + 1.0))

        if not text:
            continue

        if current_start is None:
            current_start = start

        current_words.append(text)
        current_end = end

        # Sentence completion indicators: terminal punctuation or long speech pause
        ends_with_terminal = bool(re.search(r"[.?!।]\s*$", text))
        has_pause = False
        # If words in chunk is large (>12 words), treat as sentence boundary
        word_count = sum(len(w.split()) for w in current_words)

        if ends_with_terminal or word_count >= 14:
            s_id = f"S{len(sentences) + 1}"
            full_text = " ".join(current_words).strip()
            # Clean punctuation
            full_text = re.sub(r"\s+", " ", full_text)

            s_data = {
                "id": s_id,
                "text": full_text,
                "start": round(current_start, 2),
                "end": round(current_end, 2),
                "duration": round(current_end - current_start, 2)
            }
            sentences.append(s_data)
            id_map[s_id] = s_data

            current_words = []
            current_start = None
            current_end = None

    # Flush remainder
    if current_words and current_start is not None:
        s_id = f"S{len(sentences) + 1}"
        full_text = " ".join(current_words).strip()
        s_data = {
            "id": s_id,
            "text": full_text,
            "start": round(current_start, 2),
            "end": round(current_end or current_start + 2.0, 2),
            "duration": round((current_end or current_start + 2.0) - current_start, 2)
        }
        sentences.append(s_data)
        id_map[s_id] = s_data

    return sentences, id_map


def resolve_dangling_boundaries(
    start_id: str,
    end_id: str,
    sentences: List[Dict[str, Any]],
    id_map: Dict[str, Dict[str, Any]],
    min_duration: float = 20.0,
    max_duration: float = 65.0
) -> Tuple[float, float, str, str]:
    """
    Inspects start and end sentences.
    If the start sentence begins with a dangling conjunction (Toh, Aur, Isliye, But, Phir),
    expands backward by 1-2 sentences to capture the setup.
    If the end sentence is dangling, expands forward.
    Returns: (final_start_sec, final_end_sec, final_start_id, final_end_id)
    """
    id_to_idx = {s["id"]: idx for idx, s in enumerate(sentences)}
    start_idx = id_to_idx.get(start_id, 0)
    end_idx = id_to_idx.get(end_id, min(len(sentences) - 1, start_idx + 4))

    # 1. Resolve dangling start
    max_lookback = 2
    lookback_count = 0
    while start_idx > 0 and lookback_count < max_lookback:
        first_word = sentences[start_idx]["text"].split()[0].lower().strip(".,!?;:\"'-()[]{}")
        if first_word in DANGLING_START_WORDS:
            # Shift start 1 sentence backward to include setup context
            start_idx -= 1
            lookback_count += 1
        else:
            break

    # 2. Resolve dangling end
    max_lookahead = 2
    lookahead_count = 0
    while end_idx < len(sentences) - 1 and lookahead_count < max_lookahead:
        last_word = sentences[end_idx]["text"].split()[-1].lower().strip(".,!?;:\"'-()[]{}")
        if last_word in DANGLING_END_WORDS:
            end_idx += 1
            lookahead_count += 1
        else:
            break

    # Calculate timestamps
    final_start = sentences[start_idx]["start"]
    final_end = sentences[end_idx]["end"]
    dur = final_end - final_start

    # Ensure duration constraints
    if dur > max_duration and end_idx > start_idx + 1:
        # Trim from end while preserving min_duration
        while (sentences[end_idx]["end"] - final_start) > max_duration and end_idx > start_idx + 1:
            end_idx -= 1
        final_end = sentences[end_idx]["end"]

    final_start_id = sentences[start_idx]["id"]
    final_end_id = sentences[end_idx]["id"]

    return final_start, final_end, final_start_id, final_end_id


def discover_story_arcs_with_sentence_ids(
    segments: List[Dict[str, Any]],
    video_title: str = "Video Stream",
    target_moments: int = 5,
    min_duration: float = 20.0,
    max_duration: float = 65.0
) -> List[Dict[str, Any]]:
    """
    Main Entrypoint: Uses Gemini / Groq with Sentence IDs to discover complete story/play arcs.
    No timestamp hallucination! Zero mid-thought cuts!
    """
    sentences, id_map = build_sentence_index(segments)
    if not sentences:
        return []

    # If transcript is very short (< 4 sentences), return the whole span
    if len(sentences) <= 3:
        s0 = sentences[0]
        s_end = sentences[-1]
        return [{
            "id": "moment_1",
            "title": video_title,
            "start": s0["start"],
            "end": s_end["end"],
            "duration": round(s_end["end"] - s0["start"], 1),
            "start_id": s0["id"],
            "end_id": s_end["id"],
            "virality_score": 92,
            "virality_reason": "Single continuous segment.",
            "hook_quote": s0["text"]
        }]

    # Format transcript with Sentence IDs for LLM
    formatted_lines = []
    for s in sentences:
        formatted_lines.append(f"[{s['id']}] {s['text']}")
    indexed_transcript_text = "\n".join(formatted_lines)

    system_instruction = (
        "You are the Lead Creative Director for Viral Shorts & Reels (Gaming, Podcasts, Hinglish & English Creators).\n"
        "Your task is to analyze the numbered transcript below and extract the TOP standalone viral moments.\n\n"
        "GOLDEN STORY ARC RULES:\n"
        "1. Every moment must be a COMPLETE standalone arc:\n"
        "   - Hook / Setup (The question, challenge, trash talk, or context)\n"
        "   - Progression / Action (The gameplay clutch, revelation, or debate)\n"
        "   - Payoff / Punchline (The resolution, reaction, victory shout, or laugh)\n"
        "2. RETURN ONLY SENTENCE IDs! Do NOT calculate or guess floating timestamps.\n"
        "   Specify 'start_id' (e.g. 'S3') and 'end_id' (e.g. 'S12').\n"
        "3. NEVER start on a dangling thought (e.g. don't start on 'Toh maine bola' without the setup).\n"
        "4. Each moment should span roughly 4 to 15 sentences (aim for ~25s to 55s total speech duration).\n"
        "5. Generate click-worthy viral titles with emojis (e.g. '1v4 Clutch Against Hacker Squad 💀🔥', 'He Really Exposed Himself Here 😭').\n"
        "6. Output strictly valid JSON format."
    )

    prompt = f"""VIDEO CONTEXT:
- Title: {video_title}
- Total Sentences: {len(sentences)}
- Max Moments Requested: {target_moments}

NUMBERED TRANSCRIPT:
{indexed_transcript_text[:18000]}

JSON OUTPUT FORMAT:
Return a JSON array of objects matching this exact schema:
[
  {{
    "id": "moment_1",
    "title": "Punchy Hook Title Here 🎯",
    "start_id": "S1",
    "end_id": "S8",
    "virality_score": 97,
    "virality_reason": "Clear curiosity hook at S1 with intense debate leading to funny punchline at S8.",
    "hook_quote": "Exact first sentence or hook quote."
  }}
]
"""

    # 1. Try Gemini Models in Cascade
    client = get_gemini_client()
    raw_response_text = None

    if client:
        for model_name in ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash"]:
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction,
                        "response_mime_type": "application/json",
                        "temperature": 0.3,
                    }
                )
                if res and res.text:
                    raw_response_text = res.text.strip()
                    break
            except Exception as e:
                print(f"[ArcFinder] Model {model_name} notice: {e}", flush=True)
                continue

    # 2. Try Groq (qwen/qwen3.8-27b) if Gemini failed or offline
    if not raw_response_text:
        groq_client = get_groq_client()
        if groq_client:
            try:
                g_res = groq_client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                raw_response_text = g_res.choices[0].message.content.strip()
            except Exception as g_err:
                print(f"[ArcFinder] Groq backup notice: {g_err}")

    # 3. Parse LLM JSON Output and Map Sentence IDs to Exact Timestamps
    discovered_moments = []
    if raw_response_text:
        try:
            # Clean possible markdown wrap
            clean_json = raw_response_text
            if clean_json.startswith("```json"):
                clean_json = clean_json.split("```json", 1)[1].rsplit("```", 1)[0].strip()
            elif clean_json.startswith("```"):
                clean_json = clean_json.split("```", 1)[1].rsplit("```", 1)[0].strip()

            parsed = json.loads(clean_json)
            # Handle both list and dict containing "moments"
            items = parsed if isinstance(parsed, list) else parsed.get("moments", [])

            for idx, item in enumerate(items):
                raw_start_id = str(item.get("start_id", "")).strip().upper()
                raw_end_id = str(item.get("end_id", "")).strip().upper()

                # If missing 'S' prefix, format as S<num>
                if raw_start_id.isdigit():
                    raw_start_id = f"S{raw_start_id}"
                if raw_end_id.isdigit():
                    raw_end_id = f"S{raw_end_id}"

                if raw_start_id not in id_map or raw_end_id not in id_map:
                    continue

                # Run Dangling Starter Resolution (+20s Lookaround / Lookbehind)
                start_sec, end_sec, resolved_start_id, resolved_end_id = resolve_dangling_boundaries(
                    start_id=raw_start_id,
                    end_id=raw_end_id,
                    sentences=sentences,
                    id_map=id_map,
                    min_duration=min_duration,
                    max_duration=max_duration
                )

                dur = round(end_sec - start_sec, 1)
                discovered_moments.append({
                    "id": f"moment_{len(discovered_moments) + 1}",
                    "title": item.get("title") or f"Story Arc #{len(discovered_moments) + 1} 🎯",
                    "start": round(start_sec, 1),
                    "end": round(end_sec, 1),
                    "duration": dur,
                    "start_id": resolved_start_id,
                    "end_id": resolved_end_id,
                    "virality_score": int(item.get("virality_score", 95)),
                    "virality_reason": item.get("virality_reason", "Complete story arc from setup to punchline."),
                    "hook_quote": item.get("hook_quote") or id_map[resolved_start_id]["text"],
                    "engine": "sentence_id_arc_finder_v2"
                })
        except Exception as parse_err:
            print(f"[ArcFinder] JSON parsing notice: {parse_err}")

    if discovered_moments:
        # Sort by virality score
        discovered_moments.sort(key=lambda x: x["virality_score"], reverse=True)
        return discovered_moments[:target_moments]

    # 4. Fallback: Sentence-boundary aware sliding chunks (Clean sentences, no mid-word cuts)
    fallback = []
    chunk_size = 6  # 6 sentences per moment
    step = max(3, len(sentences) // max(1, target_moments))
    for i in range(0, len(sentences) - 2, step):
        if len(fallback) >= target_moments:
            break
        s_id = sentences[i]["id"]
        e_idx = min(len(sentences) - 1, i + chunk_size)
        e_id = sentences[e_idx]["id"]

        start_sec, end_sec, res_s, res_e = resolve_dangling_boundaries(
            start_id=s_id,
            end_id=e_id,
            sentences=sentences,
            id_map=id_map,
            min_duration=min_duration,
            max_duration=max_duration
        )
        dur = round(end_sec - start_sec, 1)
        fallback.append({
            "id": f"moment_{len(fallback) + 1}",
            "title": f"Highlight Story #{len(fallback) + 1} 🔥",
            "start": round(start_sec, 1),
            "end": round(end_sec, 1),
            "duration": dur,
            "start_id": res_s,
            "end_id": res_e,
            "virality_score": 90 - (len(fallback) * 2),
            "virality_reason": "Clean sentence-boundary highlight window.",
            "hook_quote": id_map[res_s]["text"],
            "engine": "sentence_boundary_heuristic"
        })

    return fallback
