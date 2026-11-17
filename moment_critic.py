"""
moment_critic.py - The Independent Completeness & Payoff Critic Agent (Step D)

Evaluates each candidate moment before it reaches the user or render pipeline:
1. Context Test: Is the clip self-contained, or does it start in the middle of an unexplained thought?
2. Payoff Test: Does the clip end cleanly AFTER the punchline, clutch, or streamer reaction?
3. Actionable Boundary Nudging: Can expand start backward (-1/-2 sentences) or end forward (+1/+2 sentences)
   to ensure zero abrupt cutoffs.
"""

import os
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv

load_dotenv(override=True)


def get_critic_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "PASTE_YOUR_GEMINI_API_KEY_HERE":
        return None
    try:
        from google import genai
        from google.genai import types
        return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=8000))
    except Exception:
        return None


def get_critic_groq_client():
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=groq_key)
    except Exception:
        return None


CRITIC_SYSTEM_INSTRUCTION = (
    "You are the Executive Shorts Quality Critic & Narrative Gatekeeper.\n"
    "Your mission: RUTHLESSLY judge whether a short-form video clip is satisfying, complete, and viral.\n\n"
    "CRITICAL RULES:\n"
    "1. Payoff & Reaction Completeness: A great clip must NEVER end on the action itself; it MUST include the reaction "
    "(laughter, scream, victory shout, facepalm, or relief) and conclude when that reaction settles.\n"
    "2. If the clip cuts off mid-sentence, mid-reaction, or right before a punchline, you MUST request an end extension ('adjust_end': +1 or +2).\n"
    "3. If the clip opens with no context (e.g. 'Toh usne ye kiya' without knowing who 'usne' is), you MUST request a start extension ('adjust_start': -1 or -2).\n"
    "4. Score from 1 to 10. Minimum passing score is 7.0.\n"
    "5. Return strictly valid JSON."
)


def evaluate_moment_completeness(
    clip_sentences: List[Dict[str, Any]],
    before_sentences: List[Dict[str, Any]],
    after_sentences: List[Dict[str, Any]],
    video_title: str = "Gaming Stream"
) -> Dict[str, Any]:
    """
    Evaluates a candidate moment transcript for narrative completeness.
    Returns:
    {
        "passed": bool,
        "score": float (1-10),
        "adjust_start": int (e.g. -1, -2 to expand backward, or 0),
        "adjust_end": int (e.g. +1, +2 to expand forward, or 0),
        "reason": str
    }
    """
    if not clip_sentences:
        return {"passed": False, "score": 0.0, "adjust_start": 0, "adjust_end": 0, "reason": "Empty clip."}

    clip_text = " ".join(s["text"] for s in clip_sentences).strip()
    before_text = " ".join(s["text"] for s in before_sentences).strip() if before_sentences else "(None)"
    after_text = " ".join(s["text"] for s in after_sentences).strip() if after_sentences else "(None)"

    prompt = f"""VIDEO TITLE: {video_title}

[PRECEDING CONTEXT (Before clip starts)]:
{before_text}

[CANDIDATE CLIP TRANSCRIPT]:
{clip_text}

[FOLLOWING CONTEXT (After clip ends)]:
{after_text}

EVALUATION TASK:
1. Does this clip have a clear hook/curiosity setup?
2. Does this clip end cleanly AFTER the punchline/clutch/reaction, or is it cut off abruptly?
3. If setup is missing, should we add 1 or 2 preceding sentences? (adjust_start = -1 or -2)
4. If reaction was cut short, should we add 1 or 2 following sentences? (adjust_end = +1 or +2)

JSON OUTPUT FORMAT:
{{
  "score": 8.5,
  "setup_complete": true,
  "payoff_complete": true,
  "adjust_start": 0,
  "adjust_end": 0,
  "verdict": "PASS",
  "reason": "Clear setup, clutch moment resolved, and player reaction ends naturally."
}}
"""

    # 1. Try Gemini
    gemini_client = get_critic_gemini_client()
    raw_text = None
    if gemini_client:
        for model in ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash"]:
            try:
                res = gemini_client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "system_instruction": CRITIC_SYSTEM_INSTRUCTION,
                        "response_mime_type": "application/json",
                        "temperature": 0.1
                    }
                )
                if res and res.text:
                    raw_text = res.text.strip()
                    break
            except Exception:
                continue

    # 2. Try Groq (qwen/qwen3.8-27b or openai/gpt-oss-20b)
    if not raw_text:
        groq_client = get_critic_groq_client()
        if groq_client:
            for g_model in ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
                try:
                    g_res = groq_client.chat.completions.create(
                        model=g_model,
                        messages=[
                            {"role": "system", "content": CRITIC_SYSTEM_INSTRUCTION},
                            {"role": "user", "content": prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.1
                    )
                    if g_res.choices and g_res.choices[0].message.content:
                        raw_text = g_res.choices[0].message.content.strip()
                        break
                except Exception:
                    continue

    if raw_text:
        try:
            # Parse response
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            clean_json = match.group(0) if match else raw_text
            data = json.loads(clean_json)

            score = float(data.get("score", 7.0))
            adj_start = int(data.get("adjust_start", 0))
            adj_end = int(data.get("adjust_end", 0))
            verdict = str(data.get("verdict", "PASS")).upper()
            reason = str(data.get("reason", "Satisfying clip arc."))

            passed = (score >= 6.8 and verdict != "REJECT")
            return {
                "passed": passed,
                "score": score,
                "adjust_start": adj_start if before_sentences else 0,
                "adjust_end": adj_end if after_sentences else 0,
                "reason": reason
            }
        except Exception as parse_err:
            print(f"[Critic Notice] JSON parse notice: {parse_err}")

    # Fallback heuristic: Simple linguistic check
    last_sentence = clip_sentences[-1]["text"].lower().strip()
    is_dangling = any(last_sentence.endswith(w) for w in ["and", "but", "so", "ki", "aur", "toh", "ke", "ka", "pe"])
    return {
        "passed": not is_dangling,
        "score": 7.5 if not is_dangling else 6.0,
        "adjust_start": 0,
        "adjust_end": 1 if (is_dangling and after_sentences) else 0,
        "reason": "Heuristic fallback: ending check."
    }
