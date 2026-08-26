import os
import re
import json
import math
import shutil
import tempfile
import subprocess
from typing import List, Dict, Any, Optional, Tuple, Callable
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# CONFIGURATION & CONSTANTS
# ==============================================================================
DEFAULT_CLIP_DURATION = 45  # seconds
MIN_CLIP_DURATION = 15
MAX_CLIP_DURATION = 90
DEFAULT_TOP_CANDIDATES = 10
FINAL_TOP_MOMENTS = 3

# Multi-Factor Weights for Smart Detector 2.0
WEIGHT_SEMANTIC_HOOK = 0.40      # Semantic hook, curiosity, narrative completeness
WEIGHT_DYNAMIC_AUDIO = 0.30      # Relative dynamic energy surge & excitement peaks
WEIGHT_SOCIAL_COMMENTS = 0.20    # YouTube comment timestamp mentions
WEIGHT_SPEECH_PACING = 0.10      # Conversational density (WPM)

# Rebalanced weights when video has no comment timestamps
WEIGHT_SEMANTIC_NO_COMMENTS = 0.50
WEIGHT_AUDIO_NO_COMMENTS = 0.35
WEIGHT_PACING_NO_COMMENTS = 0.15

# Common viral hook patterns and curiosity indicators
HOOK_QUESTION_WORDS = {
    "why", "how", "what", "who", "when", "where", "which", "whose",
    "can", "could", "would", "should", "is", "are", "do", "did", "does",
    "will", "have", "has", "tell"
}

HOOK_TRIGGERS = [
    r"\bthe truth (?:about|is)\b",
    r"\bi (?:never|always|finally|realized|discovered)\b",
    r"\bnobody (?:knows|tells you|realized)\b",
    r"\b(?:insane|crazy|impossible|unbelievable|shocking|secret|warning)\b",
    r"\b(?:best|worst|biggest|greatest|most)\b",
    r"\b(?:money|million|billion|dollar|dollars|cash)\b",
    r"\b(?:mistake|problem|danger|ruined|destroyed|killed|died|won|lost)\b",
    r"\b(?:agree|disagree|better than|worse than|compare|goat)\b",
    r"\b(?:actually|honestly|listen|look|wait|stop)\b",
    r"\b(?:how to|secret to|way to)\b",
    r"\b(?:don't|never|stop doing)\b",
]


# ==============================================================================
# AUDIO EXTRACTION UTILITY
# ==============================================================================
def extract_audio_pcm(video_path: str, output_wav_path: str, sample_rate: int = 16000) -> bool:
    """
    Extract video audio to a clean 16kHz mono WAV file using FFmpeg.
    Ensures seamless and fast compatibility with librosa and Whisper.
    """
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-ac", "1",
        output_wav_path
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[MomentDetector] Audio extraction failed: {e.stderr.decode('utf-8', errors='ignore')}")
        return False
    except Exception as e:
        print(f"[MomentDetector] Audio extraction error: {e}")
        return False


# ==============================================================================
# SPEECH TRANSCRIPTION (WHISPER SINGLETON)
# ==============================================================================
_CACHED_WHISPER_MODEL = None

def get_cached_whisper_model():
    """Module-level cached faster-whisper singleton for fast repeated inference."""
    global _CACHED_WHISPER_MODEL
    if _CACHED_WHISPER_MODEL is None:
        try:
            from faster_whisper import WhisperModel
            print("  -> Initializing and caching faster-whisper (tiny model, CPU)...")
            _CACHED_WHISPER_MODEL = WhisperModel("tiny", device="cpu", compute_type="int8")
        except Exception as e:
            print(f"  -> Could not initialize faster-whisper: {e}")
            _CACHED_WHISPER_MODEL = False
    return _CACHED_WHISPER_MODEL if _CACHED_WHISPER_MODEL is not False else None


def transcribe_video_audio(video_or_audio_path: str) -> List[Dict[str, Any]]:
    """
    Transcribe audio with segment/phrase timestamps using faster-whisper or OpenAI Whisper.
    Returns list of segments: [{'start': float, 'end': float, 'text': str}, ...]
    """
    print("[Smart Detector 2.0] Transcribing speech for semantic hooks & boundary alignment...")
    segments: List[Dict[str, Any]] = []

    # 1. Try local cached faster-whisper first
    try:
        model = get_cached_whisper_model()
        if model is not None:
            whisper_segments, _ = model.transcribe(video_or_audio_path, beam_size=1)
            for s in whisper_segments:
                text_clean = s.text.strip()
                if text_clean:
                    segments.append({
                        "start": round(float(s.start), 2),
                        "end": round(float(s.end), 2),
                        "text": text_clean
                    })
            if segments:
                print(f"  -> Transcribed {len(segments)} speech segments with faster-whisper.")
                return segments
    except Exception as fw_err:
        print(f"  -> faster-whisper local transcription skipped: {fw_err}")

    # 2. Try OpenAI Whisper API fallback if OPENAI_API_KEY is configured
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            import openai
            client = openai.OpenAI(api_key=openai_key)
            temp_dir = tempfile.mkdtemp(prefix="whisper_api_")
            temp_audio = os.path.join(temp_dir, "speech.mp3")
            
            cmd = [
                "ffmpeg", "-y", "-i", video_or_audio_path,
                "-vn", "-ar", "16000", "-b:a", "64k", temp_audio
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            
            with open(temp_audio, "rb") as af:
                transcript_resp = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=af,
                    response_format="verbose_json"
                )
                raw_segs = getattr(transcript_resp, "segments", []) or []
                for s in raw_segs:
                    txt = s.get("text", "").strip()
                    if txt:
                        segments.append({
                            "start": round(float(s.get("start", 0)), 2),
                            "end": round(float(s.get("end", 0)), 2),
                            "text": txt
                        })
            shutil.rmtree(temp_dir, ignore_errors=True)
            print(f"  -> Transcribed {len(segments)} segments using OpenAI Whisper API.")
            return segments
        except Exception as oai_err:
            print(f"  -> OpenAI Whisper API transcription failed: {oai_err}")

    return segments


# ==============================================================================
# SENTENCE & SILENCE BOUNDARY SNAPPING (NO MID-SENTENCE CUTS)
# ==============================================================================
def snap_to_sentence_boundaries(
    target_start: float,
    target_end: float,
    segments: List[Dict[str, Any]],
    total_duration: float,
    min_duration: float = MIN_CLIP_DURATION,
    max_duration: float = MAX_CLIP_DURATION
) -> Tuple[float, float]:
    """
    Snap candidate start/end timestamps to natural sentence beginnings and ends.
    Prevents abrupt mid-word or mid-sentence cuts in rendered clips.
    """
    if not segments:
        s = max(0.0, round(target_start, 2))
        e = min(total_duration, round(target_end, 2))
        return s, e

    # Find the best sentence start near target_start (search window +/- 4.5 seconds)
    best_start = target_start
    start_candidates = [
        seg["start"] for seg in segments
        if abs(seg["start"] - target_start) <= 5.0 and seg["start"] < target_end
    ]
    if start_candidates:
        # Prefer the sentence start closest to target_start
        best_start = min(start_candidates, key=lambda s: abs(s - target_start))

    # Find the best sentence end near target_end (search window +/- 5.0 seconds)
    best_end = target_end
    end_candidates = [
        seg["end"] for seg in segments
        if abs(seg["end"] - target_end) <= 6.0 and seg["end"] > best_start
    ]
    if end_candidates:
        best_end = min(end_candidates, key=lambda e: abs(e - target_end))

    # Validate duration constraints
    dur = best_end - best_start
    if dur < min_duration:
        # Extend end to encompass next sentence or add time
        extend_candidates = [seg["end"] for seg in segments if seg["end"] >= best_start + min_duration]
        if extend_candidates:
            best_end = min(extend_candidates)
        else:
            best_end = min(total_duration, best_start + min_duration)
    elif dur > max_duration:
        # Shrink to previous sentence end
        shrink_candidates = [seg["end"] for seg in segments if best_start + min_duration <= seg["end"] <= best_start + max_duration]
        if shrink_candidates:
            best_end = max(shrink_candidates)
        else:
            best_end = min(total_duration, best_start + max_duration)

    best_start = max(0.0, round(best_start, 2))
    best_end = min(total_duration, round(best_end, 2))
    return best_start, best_end


# ==============================================================================
# CHANNEL 1: RELATIVE DYNAMIC AUDIO SURGE DETECTOR (THE "VIBE" CHECK)
# ==============================================================================
def detect_relative_audio_surges(
    video_or_audio_path: str,
    duration: float,
    target_duration: int = DEFAULT_CLIP_DURATION,
    top_n: int = DEFAULT_TOP_CANDIDATES
) -> List[Dict[str, Any]]:
    """
    Analyze audio with Dynamic Relative Surge Detection (Peak-to-Median dynamic range).
    Detects sudden bursts of laughter, screaming, gasps, pitch shifts, and excitement
    relative to the local background noise level (ignores steady intro/background music).
    """
    print(f"[Channel 1/3: Audio Surges] Analyzing dynamic relative excitement across {duration:.1f}s...")
    if duration <= target_duration:
        return [{"start": 0.0, "end": round(duration, 2), "audio_score": 90.0}]

    temp_dir = tempfile.mkdtemp(prefix="audio_surge_")
    wav_path = os.path.join(temp_dir, "temp_audio.wav")
    candidate_windows = []

    try:
        extracted = extract_audio_pcm(video_or_audio_path, wav_path, sample_rate=16000)
        if extracted:
            import numpy as np
            with open(wav_path, "rb") as f:
                f.seek(44)
                raw_data = f.read()
                int_samples = np.frombuffer(raw_data, dtype=np.int16)
                y = int_samples.astype(np.float32) / 32768.0
                sr = 16000

            if len(y) > sr:
                hop_length = 512
                frame_length = 2048
                num_frames = max(1, 1 + (len(y) - frame_length) // hop_length)
                shape = (num_frames, frame_length)
                strides = (y.strides[0] * hop_length, y.strides[0])
                frames = np.lib.stride_tricks.as_strided(y, shape=shape, strides=strides)
                
                # Frame-level RMS energy
                rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
                times = np.arange(len(rms)) * (hop_length / sr)

                # Local baseline (moving average baseline over ~20 seconds to remove steady music)
                baseline_window = max(3, int(20.0 * sr / hop_length))
                pad_size = baseline_window // 2
                padded_rms = np.pad(rms, pad_size, mode='edge')
                baseline = np.convolve(padded_rms, np.ones(baseline_window)/baseline_window, mode='valid')[:len(rms)]
                
                # Dynamic Relative Surge: Ratio of RMS to local baseline
                surge_ratio = np.maximum(0.0, rms - baseline) / (baseline + 1e-4)

                window_frames = max(1, int(target_duration * sr / hop_length))
                step_frames = max(1, int(2.0 * sr / hop_length))

                scores = []
                for i in range(0, len(rms) - window_frames + 1, step_frames):
                    w_surge = surge_ratio[i : i + window_frames]
                    w_rms = rms[i : i + window_frames]

                    start_t = float(times[i])
                    end_t = min(duration, start_t + target_duration)

                    peak_surge = float(np.max(w_surge))
                    mean_surge = float(np.mean(w_surge))
                    peak_rms = float(np.max(w_rms))

                    # Multi-factor audio metric: heavily reward relative spikes over baseline
                    audio_metric = (peak_surge * 0.5) + (mean_surge * 0.3) + (peak_rms * 0.2)
                    scores.append((start_t, end_t, audio_metric))

                if scores:
                    scores.sort(key=lambda x: x[2], reverse=True)
                    max_raw = max(s[2] for s in scores)
                    min_raw = min(s[2] for s in scores)
                    denom = (max_raw - min_raw) if (max_raw - min_raw) > 1e-6 else 1.0

                    min_separation = target_duration * 0.4
                    selected = []
                    for s_start, s_end, raw_val in scores:
                        if any(abs(s_start - exist["start"]) < min_separation for exist in selected):
                            continue
                        normalized = round(50.0 + 48.0 * ((raw_val - min_raw) / denom), 1)
                        selected.append({
                            "start": round(s_start, 2),
                            "end": round(s_end, 2),
                            "audio_score": normalized,
                            "source": "audio_surge"
                        })
                        if len(selected) >= top_n:
                            break
                    candidate_windows = selected
    except Exception as err:
        print(f"[Channel 1 Warning] Dynamic relative audio analysis error: {err}")
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    if not candidate_windows:
        num_splits = min(top_n, max(1, math.ceil(duration / target_duration)))
        step = (duration - target_duration) / max(1, (num_splits - 1)) if num_splits > 1 else 0
        for i in range(num_splits):
            s_time = round(i * step, 2)
            candidate_windows.append({
                "start": s_time,
                "end": round(min(duration, s_time + target_duration), 2),
                "audio_score": 75.0,
                "source": "fallback"
            })

    return candidate_windows


# ==============================================================================
# CHANNEL 2: SEMANTIC STORY & VIRAL HOOK CANDIDATE DETECTOR
# ==============================================================================
def score_transcript_hook_and_story(
    text_slice: str,
    opener_slice: str,
    word_count: int,
    duration: float
) -> Tuple[float, str]:
    """
    Score semantic virality, curiosity hooks, and narrative coherence of a transcript slice.
    Returns (hook_score_100, candidate_title).
    """
    if not text_slice or word_count < 4:
        return 50.0, "Interesting Moment"

    lower_text = text_slice.lower()
    lower_opener = opener_slice.lower()
    first_words = lower_opener.split()[:4]

    score = 65.0  # Base score

    # 1. Hook Opener Check (First 3-5 seconds):
    # Questions are the #1 highest-converting short-form hook format
    if any(q in first_words for q in HOOK_QUESTION_WORDS) or "?" in opener_slice:
        score += 15.0

    # 2. Viral Trigger Regex Matches (Curiosity gap, controversy, superlatives, shocking words)
    trigger_matches = 0
    for pattern in HOOK_TRIGGERS:
        if re.search(pattern, lower_text, re.IGNORECASE):
            trigger_matches += 1
    score += min(18.0, trigger_matches * 6.0)

    # 3. Conversational Interaction & Pacing (Words Per Minute):
    # Ideal viral short pacing is 130 - 180 WPM
    wpm = (word_count / max(5.0, duration)) * 60.0
    if 110 <= wpm <= 190:
        score += 8.0
    elif wpm < 80:
        score -= 5.0  # Dead air / slow speech

    # 4. Emotional Exclamation Punctuation:
    if "!" in text_slice:
        score += 4.0

    score = max(40.0, min(99.0, score))

    # Generate Smart Title from first sentence or strong topic clause
    clean_title = generate_smart_title_from_text(text_slice)

    return round(score, 1), clean_title


def generate_smart_title_from_text(text: str) -> str:
    """Generate a clean, viral 3-6 word title from transcript text."""
    if not text:
        return "Top Video Moment"

    clean = re.sub(r'\[.*?\]', '', text).strip()
    sentences = re.split(r'[.!?\n]', clean)
    first_sentence = sentences[0].strip() if sentences else clean
    
    words = [w.strip() for w in first_sentence.split() if w.strip()]
    if 3 <= len(words) <= 7:
        title = " ".join(words).capitalize()
        return title.rstrip(",.;:-")

    if len(words) > 7:
        title = " ".join(words[:5]).capitalize() + "..."
        return title

    return "Best Video Highlight"


def detect_semantic_story_candidates(
    segments: List[Dict[str, Any]],
    duration: float,
    target_duration: int = DEFAULT_CLIP_DURATION,
    top_n: int = DEFAULT_TOP_CANDIDATES
) -> List[Dict[str, Any]]:
    """
    Scan transcript across sentence boundaries to find high-converting story blocks.
    Identifies setups, punchlines, controversial debates, and curiosity hooks.
    """
    print(f"[Channel 2/3: Semantic Stories] Scanning {len(segments)} speech segments for viral story hooks...")
    if not segments:
        return []

    candidates = []
    num_segs = len(segments)

    for i in range(num_segs):
        start_seg = segments[i]
        c_start = start_seg["start"]
        
        # Accumulate segments until reaching target_duration
        accumulated_text = []
        c_end = c_start
        for j in range(i, num_segs):
            seg = segments[j]
            accumulated_text.append(seg["text"])
            c_end = seg["end"]
            curr_dur = c_end - c_start
            
            if curr_dur >= (target_duration - 5):
                break

        curr_dur = c_end - c_start
        if curr_dur < MIN_CLIP_DURATION:
            continue

        full_text = " ".join(accumulated_text).strip()
        opener_text = " ".join(accumulated_text[:2]).strip()
        words = full_text.split()
        
        hook_score, title = score_transcript_hook_and_story(
            text_slice=full_text,
            opener_slice=opener_text,
            word_count=len(words),
            duration=curr_dur
        )

        candidates.append({
            "start": round(c_start, 2),
            "end": round(c_end, 2),
            "semantic_score": hook_score,
            "title": title,
            "text": full_text,
            "source": "semantic_story"
        })

    # Sort candidates by semantic score and apply Non-Maximum Suppression
    candidates.sort(key=lambda x: x["semantic_score"], reverse=True)
    min_separation = target_duration * 0.4
    selected = []
    for cand in candidates:
        if any(abs(cand["start"] - s["start"]) < min_separation for s in selected):
            continue
        selected.append(cand)
        if len(selected) >= top_n:
            break

    return selected


# ==============================================================================
# CHANNEL 3: YOUTUBE COMMENT TIMESTAMP EXTRACTION (SOCIAL PROOF)
# ==============================================================================
def parse_timestamp_string(ts_str: str) -> Optional[float]:
    """Parse timestamp strings like '2:34', '1:05:20', '5m12s', '45s' into seconds."""
    ts_str = ts_str.strip().lower()
    
    colon_match = re.match(r'^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$', ts_str)
    if colon_match:
        hours = int(colon_match.group(1)) if colon_match.group(1) else 0
        minutes = int(colon_match.group(2))
        seconds = int(colon_match.group(3))
        return float(hours * 3600 + minutes * 60 + seconds)
    
    min_sec_match = re.match(r'^(\d+)\s*(?:m|min|mins|minute|minutes)\s*(?:(\d+)\s*(?:s|sec|secs|second|seconds))?$', ts_str)
    if min_sec_match:
        minutes = int(min_sec_match.group(1))
        seconds = int(min_sec_match.group(2)) if min_sec_match.group(2) else 0
        return float(minutes * 60 + seconds)

    sec_match = re.match(r'^(\d+)\s*(?:s|sec|secs|second|seconds)$', ts_str)
    if sec_match:
        return float(int(sec_match.group(1)))

    return None


def extract_youtube_comment_timestamps(youtube_url: str, max_comments: int = 100) -> List[float]:
    """Fetch top YouTube comments and extract all timestamp references."""
    print(f"[Channel 3/3: Comments] Mining timestamps from top {max_comments} YouTube comments...")
    timestamps: List[float] = []
    
    ts_regex = re.compile(
        r'(?:\b(?:\d{1,2}:)?[0-5]?\d:[0-5]\d\b)|'
        r'(?:\b\d+\s*(?:m|min|mins|minute|minutes)\s*(?:\d+\s*(?:s|sec|secs|second|seconds))?\b)|'
        r'(?:\b\d+\s*(?:s|sec|secs|second|seconds)\b)',
        re.IGNORECASE
    )

    try:
        import yt_dlp
        ydl_opts = {
            'get_comments': True,
            'extractor_args': {
                'youtube': {
                    'max_comments': [str(max_comments), 'all', str(max_comments), '0'],
                    'player_client': ['android', 'web']
                }
            },
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'extract_flat': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            comments = info.get('comments', []) if info else []
            for c in comments:
                text = c.get('text', '') or ''
                matches = ts_regex.findall(text)
                for m in matches:
                    ts = parse_timestamp_string(m)
                    if ts is not None and ts >= 0:
                        timestamps.append(ts)

    except Exception as e:
        print(f"[Channel 3 Notice] Could not fetch comments from YouTube ({e}). Proceeding without social proof.")

    print(f"  -> Extracted {len(timestamps)} comment timestamps: {sorted(timestamps)}")
    return timestamps


def boost_candidates_with_comments(
    candidates: List[Dict[str, Any]],
    comment_timestamps: List[float],
    tolerance_seconds: float = 6.0
) -> List[Dict[str, Any]]:
    """Match comment timestamps against candidate windows to add social proof scores."""
    has_comments = len(comment_timestamps) > 0
    updated = []

    for cand in candidates:
        start = cand["start"]
        end = cand["end"]
        
        mentions = sum(
            1 for ts in comment_timestamps
            if (start - tolerance_seconds) <= ts <= (end + tolerance_seconds)
        )
        
        c_copy = dict(cand)
        c_copy["comment_mentions"] = mentions
        if has_comments:
            c_copy["comment_score"] = min(100.0, mentions * 35.0) if mentions > 0 else 0.0
        else:
            c_copy["comment_score"] = None
        updated.append(c_copy)

    return updated


# ==============================================================================
# LLM EVALUATION (OPENAI / GEMINI COMPATIBILITY)
# ==============================================================================
def evaluate_context_with_llm(text: str, duration: float) -> Tuple[float, str]:
    """
    Pass candidate transcript to LLM (gpt-4o-mini or Gemini) for viral hook rating (1-10) and title.
    """
    if not text or len(text.split()) < 3:
        return 7.0, "Engaging Video Highlight"

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            import openai
            client = openai.OpenAI(api_key=openai_key)
            prompt = (
                f"You are an expert viral short video editor (TikTok/Reels/Shorts).\n"
                f"Evaluate this transcript segment (~{int(duration)}s):\n\n"
                f"\"{text}\"\n\n"
                f"Rate virality/hook/punchline on scale 1-10, and generate a punchy 3-6 word click-worthy title.\n"
                f"Return JSON only: {{\"rating\": 8, \"title\": \"Short Viral Title\"}}"
            )
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional video editor. Return JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=120,
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content or "{}")
            rating = max(1.0, min(10.0, float(data.get("rating", 7))))
            title = data.get("title", "").strip() or generate_smart_title_from_text(text)
            return rating, title
        except Exception as err:
            print(f"  -> OpenAI LLM context evaluation notice: {err}")

    words = text.split()
    hook_score, smart_title = score_transcript_hook_and_story(
        text_slice=text,
        opener_slice=" ".join(words[:4]),
        word_count=len(words),
        duration=duration
    )
    rating_1_to_10 = round(hook_score / 10.0, 1)
    return rating_1_to_10, smart_title


# ==============================================================================
# MAIN SMART BEST MOMENT DETECTOR 2.0 ENTRYPOINT
# ==============================================================================
def detect_best_moments(
    video_path: str,
    youtube_url: Optional[str] = None,
    duration: Optional[float] = None,
    target_duration: int = DEFAULT_CLIP_DURATION,
    top_k: int = FINAL_TOP_MOMENTS,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> List[Dict[str, Any]]:
    """
    Industry-grade Best Moment Detector 2.0:
    1. Transcribes full speech with faster-whisper to get precise phrase timestamps.
    2. Runs Dual-Channel Candidate Generation (Semantic Story Hooks + Acoustic Relative Energy Surges).
    3. Mines YouTube comment timestamps for community social proof.
    4. Snaps all candidate cuts to sentence/silence boundaries (0 mid-sentence cuts).
    5. Evaluates Multi-Factor Viral Scoring and outputs top K moments.
    """
    if duration is None or duration <= 0:
        from pipeline import get_video_duration
        duration = get_video_duration(video_path)

    print(f"\n=======================================================")
    print(f"[Smart Moment Detector 2.0] Analyzing Video: {video_path} ({duration:.1f}s)")
    print(f"=======================================================")

    if duration <= target_duration:
        title = generate_smart_title_from_text(os.path.splitext(os.path.basename(video_path))[0])
        return [{
            "start": 0.0,
            "end": round(duration, 2),
            "title": title,
            "score": 95
        }]

    # --------------------------------------------------------------------------
    # STAGE 1: SPEECH TRANSCRIPTION & PHRASE TIMESTAMPS
    # --------------------------------------------------------------------------
    if progress_callback:
        progress_callback("analyzing_transcript", 40, "Stage 1/3: Transcribing audio & mapping sentence boundaries...")

    transcript_segments = transcribe_video_audio(video_path)

    # --------------------------------------------------------------------------
    # STAGE 2: DUAL-CHANNEL CANDIDATE PROPOSALS
    # --------------------------------------------------------------------------
    if progress_callback:
        progress_callback("analyzing_audio", 55, "Stage 2/3: Scanning dynamic relative audio surges & semantic story hooks...")

    # Channel A: Semantic Story Blocks
    semantic_candidates = detect_semantic_story_candidates(
        segments=transcript_segments,
        duration=duration,
        target_duration=target_duration,
        top_n=8
    )

    # Channel B: Dynamic Relative Audio Surges (Laughter, excitement, shouts vs background)
    audio_candidates = detect_relative_audio_surges(
        video_or_audio_path=video_path,
        duration=duration,
        target_duration=target_duration,
        top_n=8
    )

    # Channel C: Social Proof Comments
    if progress_callback:
        progress_callback("analyzing_comments", 70, "Stage 3/3: Mining community comment timestamps...")

    comment_timestamps = []
    if youtube_url and ("youtube.com" in youtube_url or "youtu.be" in youtube_url):
        comment_timestamps = extract_youtube_comment_timestamps(youtube_url, max_comments=100)

    # --------------------------------------------------------------------------
    # UNIFIED CANDIDATE POOL & SENTENCE BOUNDARY SNAPPING
    # --------------------------------------------------------------------------
    raw_pool = []
    
    for sc in semantic_candidates:
        raw_pool.append({
            "start": sc["start"],
            "end": sc["end"],
            "semantic_score": sc["semantic_score"],
            "audio_score": 70.0,
            "title": sc["title"],
            "text": sc.get("text", "")
        })

    for ac in audio_candidates:
        t_slice = ""
        if transcript_segments:
            t_slice = " ".join([
                s["text"] for s in transcript_segments
                if not (s["end"] < ac["start"] or s["start"] > ac["end"])
            ]).strip()
        
        hook_sc, title = score_transcript_hook_and_story(
            text_slice=t_slice,
            opener_slice=" ".join(t_slice.split()[:4]),
            word_count=len(t_slice.split()),
            duration=ac["end"] - ac["start"]
        )

        raw_pool.append({
            "start": ac["start"],
            "end": ac["end"],
            "semantic_score": hook_sc,
            "audio_score": ac["audio_score"],
            "title": title,
            "text": t_slice
        })

    boosted_pool = boost_candidates_with_comments(raw_pool, comment_timestamps, tolerance_seconds=6.0)

    snapped_candidates = []
    for cand in boosted_pool:
        snapped_s, snapped_e = snap_to_sentence_boundaries(
            target_start=cand["start"],
            target_end=cand["end"],
            segments=transcript_segments,
            total_duration=duration,
            min_duration=MIN_CLIP_DURATION,
            max_duration=MAX_CLIP_DURATION
        )

        cand_copy = dict(cand)
        cand_copy["start"] = snapped_s
        cand_copy["end"] = snapped_e
        cand_copy["duration"] = round(snapped_e - snapped_s, 2)
        snapped_candidates.append(cand_copy)

    # --------------------------------------------------------------------------
    # MULTI-FACTOR FINAL VIRAL SCORING
    # --------------------------------------------------------------------------
    has_comments = len(comment_timestamps) > 0
    scored_candidates = []

    for cand in snapped_candidates:
        s_score = cand.get("semantic_score", 70.0)
        a_score = cand.get("audio_score", 70.0)
        c_score = cand.get("comment_score")
        
        word_count = len(cand.get("text", "").split())
        wpm = (word_count / max(5.0, cand["duration"])) * 60.0
        pacing_score = 80.0
        if 120 <= wpm <= 180:
            pacing_score = 95.0
        elif wpm < 70:
            pacing_score = 60.0

        if has_comments and c_score is not None:
            final_score = (
                (s_score * WEIGHT_SEMANTIC_HOOK) +
                (a_score * WEIGHT_DYNAMIC_AUDIO) +
                (c_score * WEIGHT_SOCIAL_COMMENTS) +
                (pacing_score * WEIGHT_SPEECH_PACING)
            )
        else:
            final_score = (
                (s_score * WEIGHT_SEMANTIC_NO_COMMENTS) +
                (a_score * WEIGHT_AUDIO_NO_COMMENTS) +
                (pacing_score * WEIGHT_PACING_NO_COMMENTS)
            )

        cand["score"] = int(round(max(40.0, min(99.0, final_score))))
        scored_candidates.append(cand)

    # --------------------------------------------------------------------------
    # NON-MAXIMUM SUPPRESSION & TOP K MOMENTS SELECTION
    # --------------------------------------------------------------------------
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    
    final_moments = []
    min_separation = target_duration * 0.45
    
    for cand in scored_candidates:
        if any(abs(cand["start"] - exist["start"]) < min_separation for exist in final_moments):
            continue
        
        final_moments.append({
            "start": cand["start"],
            "end": cand["end"],
            "title": cand["title"],
            "score": cand["score"]
        })
        if len(final_moments) >= top_k:
            break

    if not final_moments:
        final_moments = [{
            "start": 0.0,
            "end": round(min(duration, float(target_duration)), 2),
            "title": "Top Moment Highlight",
            "score": 85
        }]

    print(f"[Smart Moment Detector 2.0] Selected Top {len(final_moments)} Moments:")
    print(json.dumps(final_moments, indent=2))
    return final_moments


if __name__ == "__main__":
    import sys
    print("Testing Smart Best Moment Detector 2.0...")
    if len(sys.argv) > 1:
        test_video = sys.argv[1]
        url = sys.argv[2] if len(sys.argv) > 2 else None
        res = detect_best_moments(test_video, url)
        print("Detected Moments:", res)
    else:
        print("Usage: python moment_detector.py <video_file> [youtube_url]")
