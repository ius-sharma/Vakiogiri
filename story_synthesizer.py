"""
Multi-Segment Narrative Story Synthesizer (Franken-Editing Engine)
Constructs viral, cohesive short-form stories by dynamically identifying,
re-sequencing, and seamlessly stitching non-contiguous parts of a video:
[HOOK (3-7s)] + [CORE / CONTEXT (10-25s)] + [PUNCHLINE (4-10s)]
Includes 0.1s audio crossfade & 9:16 vertical cropping.
"""

import os
import sys
import json
import tempfile
import subprocess
from typing import List, Dict, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from dotenv import load_dotenv
load_dotenv()

from groq import Groq

def get_groq_client():
    key = os.getenv("GROQ_API_KEY")
    if key and key.strip().startswith("gsk_"):
        try:
            return Groq(api_key=key.strip())
        except Exception:
            return None
    return None


def synthesize_story_blueprints(
    segments: List[Dict[str, Any]],
    video_duration: float,
    max_stories: int = 2
) -> List[Dict[str, Any]]:
    """
    Uses LLM discourse reasoning to identify non-contiguous sentences that combine into
    a powerful, self-contained micro-story (Hook + Context + Punchline).
    """
    if not segments or len(segments) < 4:
        return []

    client = get_groq_client()
    if not client:
        print("[StorySynthesizer] Groq client unavailable. Falling back to heuristic synthesis.")
        return fallback_heuristic_synthesis(segments)

    # Format transcript with indexes and timestamps
    transcript_lines = []
    for idx, seg in enumerate(segments):
        s_time = round(seg.get("start", 0.0), 2)
        e_time = round(seg.get("end", 0.0), 2)
        txt = seg.get("text", "").strip()
        transcript_lines.append(f"[{idx}] ({s_time}s - {e_time}s): \"{txt}\"")

    full_transcript_str = "\n".join(transcript_lines)

    prompt = f"""You are a master viral short-form video editor (Franken-editor) creating high-retention YouTube Shorts, Reels, and TikToks.
Your mission is to construct 2 to {max_stories} COMPLETE, COMPELLING, HIGH-RETENTION micro-stories by selecting and combining NON-CONTIGUOUS parts of the transcript below.

TRANSCRIPT WITH EXACT TIMESTAMPS:
{full_transcript_str}

CRITICAL UNIVERSAL STORYTELLING RULES (MANDATORY):
1. COMPLETENESS & CLARITY (ZERO INCOMPLETE THOUGHTS):
   - A viewer hearing this short MUST understand the message from start to finish without having seen the full video.
   - If the video is about building a project, tool, product, or idea, you MUST include:
     a) The problem/frustration or curiosity trigger (Hook)
     b) The actual project name and what it does or the core explanation (Context/Core)
     c) The demo, punchline, result, or call to action (Resolution)
   - NEVER leave a dangling sentence (e.g. cutting off at "where any student...", "because our main...", "and then after...").
   - If an idea spans multiple transcript lines, span your start and end across all those lines so the full sentence is heard!

2. THREE-ACT SHORT-FORM STRUCTURE (MANDATORY 3 PARTS PER STORY):
   - Every story MUST contain all 3 parts: 'hook', 'core', and 'punchline'. Stories with only 1 or 2 parts will be discarded.
   - Part 1 [HOOK] (5-18s): The curiosity hook, problem, bold question, or frustration.
   - Part 2 [CORE] (12-30s): The core explanation, code, or context that directly answers the hook.
   - Part 3 [PUNCHLINE / PAYOFF] (5-18s): The demo payoff, tangible result, answer, or empowering call to action.
   - CRITICAL: Never omit the punchline! The punchline must finish with the resolution or answer. Never end on an incomplete clause!

3. ANGLE VARIETY:
   - Generate AT LEAST 2 (up to {max_stories}) DISTINCT stories covering DIFFERENT angles or moments of the video (e.g. Angle 1: The Problem & The Solution Pitch; Angle 2: The Live Demonstration / Feature Walkthrough; Angle 3: The Behind-the-Scenes struggle/building process).
   - Each story's total stitched duration must be between 22 and 70 seconds.

Respond with JSON ONLY in this format:
{{
  "stories": [
    {{
      "title": "Clear catchy title",
      "angle": "e.g. Problem-Solution Pitch / Live Demo / Behind The Scenes",
      "rationale": "Why this stitched story is 100% complete and cohesive",
      "score": 95,
      "segments": [
        {{"role": "hook", "start": 0.0, "end": 24.1, "text": "Exact text from transcript..."}},
        {{"role": "core", "start": 29.8, "end": 58.7, "text": "Exact text from transcript..."}},
        {{"role": "punchline", "start": 355.2, "end": 373.0, "text": "Exact text from transcript..."}}
      ]
    }}
  ]
}}
"""

    models_to_try = [
        "qwen/qwen3.8-27b"
    ]

    parsed = None
    for model_name in models_to_try:
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are an expert viral video editor specializing in non-linear story synthesis. Always respond in valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=900,
                response_format={"type": "json_object"}
            )
            content = resp.choices[0].message.content or "{}"
            parsed = json.loads(content)
            if parsed:
                print(f"[StorySynthesizer] Successfully synthesized blueprints using {model_name}.")
                break
        except Exception as e:
            print(f"[StorySynthesizer] Model {model_name} notice: {e}. Trying next fallback model...")

    if parsed:
        # Extract list
        stories = parsed if isinstance(parsed, list) else parsed.get("stories") or parsed.get("micro_stories") or []
        if not stories and isinstance(parsed, dict):
            for v in parsed.values():
                if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict) and "segments" in v[0]:
                    stories = v
                    break

        valid_stories = []
        dangling_words = {"behind", "where", "and", "because", "so", "that", "the", "a", "or", "in", "to", "of", "with", "like"}
        
        for s in stories[:max_stories]:
            segs = s.get("segments", [])
            # Must have at least 3 parts: Hook, Core, and Punchline
            if len(segs) < 3:
                continue

            # Auto-repair any dangling segment endings using transcript
            repaired_segs = []
            for seg in segs:
                t = seg.get("text", "").strip()
                words = t.split()
                last_w = words[-1].lower().rstrip(".,?!:;") if words else ""
                if last_w in dangling_words:
                    cur_end = float(seg["end"])
                    for idx, raw_s in enumerate(segments):
                        if abs(float(raw_s["end"]) - cur_end) < 1.5 or (float(raw_s["start"]) <= cur_end <= float(raw_s["end"])):
                            if idx + 1 < len(segments):
                                next_raw = segments[idx + 1]
                                seg["end"] = round(float(next_raw["end"]), 2)
                                seg["text"] = t + " " + next_raw["text"].strip()
                            break
                repaired_segs.append(seg)

            s["segments"] = repaired_segs
            total_dur = sum((float(seg["end"]) - float(seg["start"])) for seg in repaired_segs)
            if 20.0 <= total_dur <= 75.0:
                s["total_duration"] = round(total_dur, 2)
                valid_stories.append(s)

        if len(valid_stories) >= 1:
            print(f"[StorySynthesizer] Generated {len(valid_stories)} verified non-linear story blueprints.")
            return valid_stories

    return fallback_heuristic_synthesis(segments)


def fallback_heuristic_synthesis(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Intelligent fallback that produces 2 complete micro-stories and avoids outro fluff."""
    if len(segments) < 6:
        return []
    
    # Filter out outro segments (bye bye, see you, subscribe, etc.)
    usable_segs = []
    for s in segments:
        txt = s.get("text", "").lower()
        if any(w in txt for w in ["bye bye", "see you in the next", "keep branding", "subscribe to my", "thanks for watching"]):
            continue
        usable_segs.append(s)
        
    if len(usable_segs) < 6:
        usable_segs = segments

    stories = []
    
    # Story 1: Problem + Solution Pitch
    h_idx = 0
    c_idx = min(len(usable_segs) // 3, len(usable_segs) - 4)
    p_idx = min(len(usable_segs) - 2, c_idx + 4)
    
    h_segs = usable_segs[h_idx : min(len(usable_segs), h_idx + 2)]
    c_segs = usable_segs[c_idx : min(len(usable_segs), c_idx + 3)]
    p_segs = usable_segs[p_idx : min(len(usable_segs), p_idx + 2)]
    
    s1_segs = [
        {"role": "hook", "start": h_segs[0]["start"], "end": h_segs[-1]["end"], "text": " ".join(s.get("text", "") for s in h_segs)},
        {"role": "core", "start": c_segs[0]["start"], "end": c_segs[-1]["end"], "text": " ".join(s.get("text", "") for s in c_segs)},
        {"role": "punchline", "start": p_segs[0]["start"], "end": p_segs[-1]["end"], "text": " ".join(s.get("text", "") for s in p_segs)}
    ]
    s1_dur = sum(s["end"] - s["start"] for s in s1_segs)
    stories.append({
        "title": "The Core Breakthrough",
        "angle": "Problem-Solution Arc",
        "rationale": "High-retention progression from initial frustration to project revelation and payoff.",
        "score": 90,
        "total_duration": round(s1_dur, 2),
        "segments": s1_segs
    })

    # Story 2: Live Walkthrough & Demo Arc
    demo_start = len(usable_segs) // 2
    h2_segs = usable_segs[demo_start : min(len(usable_segs), demo_start + 2)]
    c2_segs = usable_segs[min(len(usable_segs) - 4, demo_start + 3) : min(len(usable_segs), demo_start + 6)]
    p2_segs = usable_segs[-3 : -1] if len(usable_segs) >= 4 else usable_segs[-2:]
    
    s2_segs = [
        {"role": "hook", "start": h2_segs[0]["start"], "end": h2_segs[-1]["end"], "text": " ".join(s.get("text", "") for s in h2_segs)},
        {"role": "core", "start": c2_segs[0]["start"], "end": c2_segs[-1]["end"], "text": " ".join(s.get("text", "") for s in c2_segs)},
        {"role": "punchline", "start": p2_segs[0]["start"], "end": p2_segs[-1]["end"], "text": " ".join(s.get("text", "") for s in p2_segs)}
    ]
    s2_dur = sum(s["end"] - s["start"] for s in s2_segs)
    stories.append({
        "title": "Behind The Demo",
        "angle": "Live Walkthrough & Result",
        "rationale": "Shows the live execution and tangible result.",
        "score": 89,
        "total_duration": round(s2_dur, 2),
        "segments": s2_segs
    })

    return stories


def stitch_synthesized_story(
    video_path: str,
    story_blueprint: Dict[str, Any],
    output_path: str,
    target_width: int = 1080,
    target_height: int = 1920
) -> bool:
    """
    Renders a synthesized non-linear short by extracting each segment,
    applying 9:16 vertical crop, and seamlessly concatenating them with
    audio crossfade to prevent audible clicks.
    """
    segments = story_blueprint.get("segments", [])
    if not segments:
        return False

    temp_dir = tempfile.mkdtemp(prefix="synth_stitch_")
    part_files = []

    try:
        # Step 1: Render each cropped sub-clip
        for idx, seg in enumerate(segments):
            # Pre-roll 0.05s and post-roll 0.15s to preserve speech syllables and consonants
            raw_s = float(seg["start"])
            raw_e = float(seg["end"])
            s_time = max(0.0, raw_s - 0.05)
            dur = max(0.5, (raw_e - s_time) + 0.15)
            part_path = os.path.join(temp_dir, f"part_{idx}.mp4")

            # Crop 9:16 vertical + scale + accurate audio seek
            cmd = [
                "ffmpeg",
                "-y",
                "-ss", str(s_time),
                "-i", video_path,
                "-t", str(dur),
                "-vf", f"crop=ih*(9/16):ih:(iw-ow)/2:0,scale={target_width}:{target_height}",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar", "44100",
                "-avoid_negative_ts", "make_zero",
                part_path
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if os.path.exists(part_path) and os.path.getsize(part_path) > 1000:
                part_files.append(part_path)

        if len(part_files) != len(segments):
            print(f"[StorySynthesizer] Failed to render all parts ({len(part_files)}/{len(segments)})")
            return False

        # Step 2: Concatenate with FFmpeg filter_complex
        # Uses acrossfade for smooth audio transition between cuts
        num_parts = len(part_files)
        inputs = []
        for p in part_files:
            inputs.extend(["-i", p])

        if num_parts == 2:
            filter_str = (
                "[0:v][1:v]concat=n=2:v=1:a=0[v];"
                "[0:a][1:a]acrossfade=d=0.08:c1=tri:c2=tri[a]"
            )
        elif num_parts == 3:
            filter_str = (
                "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v];"
                "[0:a][1:a]acrossfade=d=0.08:c1=tri:c2=tri[a01];"
                "[a01][2:a]acrossfade=d=0.08:c1=tri:c2=tri[a]"
            )
        else:
            # Simple concat for N parts
            concat_v = "".join(f"[{i}:v][{i}:a]" for i in range(num_parts))
            filter_str = f"{concat_v}concat=n={num_parts}:v=1:a=1[v][a]"

        cmd_concat = [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex", filter_str,
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output_path
        ]
        res = subprocess.run(cmd_concat, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"[StorySynthesizer] Concat filter failed: {res.stderr.decode('utf-8', errors='ignore')}")
            # Fallback to standard concat demuxer
            list_file = os.path.join(temp_dir, "parts.txt")
            with open(list_file, "w", encoding="utf-8") as f:
                for p in part_files:
                    f.write(f"file '{p}'\n")
            cmd_demux = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
                "-c", "copy", output_path
            ]
            subprocess.run(cmd_demux, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        return os.path.exists(output_path) and os.path.getsize(output_path) > 10000

    finally:
        import shutil
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    from moment_detector import transcribe_video_audio
    test_vid = "test_download/wnHW6o8WMas.mp4"
    if len(sys.argv) > 1:
        test_vid = sys.argv[1]

    print(f"[StorySynthesizer] Transcribing {test_vid}...")
    segs = transcribe_video_audio(test_vid)
    print(f"[StorySynthesizer] Transcribed {len(segs)} segments.")

    blueprints = synthesize_story_blueprints(segs, 199.6, max_stories=1)
    print("[StorySynthesizer] Blueprint generated:")
    print(json.dumps(blueprints, indent=2))

    if blueprints:
        out_file = "test_synthesized_clip.mp4"
        print(f"[StorySynthesizer] Rendering synthesized short to {out_file}...")
        ok = stitch_synthesized_story(test_vid, blueprints[0], out_file)
        print(f"[StorySynthesizer] Render status: {ok} (File exists: {os.path.exists(out_file)})")
