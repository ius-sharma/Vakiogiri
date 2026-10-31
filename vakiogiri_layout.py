"""
vakiogiri_layout.py - Signature 9:16 Vertical Gaming Split Layout Engine

Implements the official Vakiogiri signature editing format for high-retention gaming/streamer shorts:
1. Top Half (1080x960): Center/Action-focused Gameplay
2. Bottom Half (1080x960): Streamer Facecam / Reaction, auto-detected via OpenCV Haar Cascade
3. Center Separation Line: Ultra-thin, crisp 1-2px white separator (color=white@0.85) at exactly Y=960
4. Center-Anchored Word-by-Word Kinetic Animated Captions (Hormozi / MrBeast pop style)
5. Fallback Protection: Seamless 9:16 vertical crop if no facecam detected.
"""

import os
import cv2
import json
import math
import subprocess
from typing import Optional, Dict, Any, Tuple, List
from hinglish_transliterator import transliterate_word


def format_ass_time(seconds: float) -> str:
    """Format seconds into ASS dialogue timestamp: H:MM:SS.cc"""
    seconds = max(0.0, float(seconds))
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hrs}:{mins:02d}:{secs:05.2f}"


class VakiogiriLayoutEngine:
    def __init__(self):
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

    def detect_facecam_box(
        self,
        video_path: str,
        start_time: float,
        duration: float,
        sample_count: int = 6
    ) -> Optional[Dict[str, int]]:
        """
        Scan sample frames across the clip segment to detect if a streamer facecam
        is present in any corner or along the perimeter.
        Returns persistent facecam crop rectangle {x, y, w, h} or None if no facecam.
        """
        if not os.path.exists(video_path):
            return None

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if width <= 0 or height <= 0:
            cap.release()
            return None

        step = max(0.5, duration / (sample_count + 1))
        sample_times = [start_time + (i + 1) * step for i in range(sample_count)]

        detected_boxes = []

        for t in sample_times:
            frame_num = int(t * fps)
            if frame_num >= total_frames:
                continue
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.15,
                minNeighbors=4,
                minSize=(40, 40),
                maxSize=(int(width * 0.45), int(height * 0.65))
            )

            for (fx, fy, fw, fh) in faces:
                detected_boxes.append((fx, fy, fw, fh))

        cap.release()

        if not detected_boxes:
            return None

        cx_list = [fx + fw // 2 for (fx, fy, fw, fh) in detected_boxes]
        cy_list = [fy + fh // 2 for (fx, fy, fw, fh) in detected_boxes]
        fw_list = [fw for (fx, fy, fw, fh) in detected_boxes]

        median_cx = int(sorted(cx_list)[len(cx_list) // 2])
        median_cy = int(sorted(cy_list)[len(cy_list) // 2])
        median_fw = int(sorted(fw_list)[len(fw_list) // 2])

        cam_target_w = int(max(median_fw * 2.8, 300))
        cam_target_h = int(cam_target_w * (960 / 1080))

        cam_x = max(0, median_cx - cam_target_w // 2)
        cam_y = max(0, median_cy - int(cam_target_h * 0.42))

        if cam_x + cam_target_w > width:
            cam_x = max(0, width - cam_target_w)
        if cam_y + cam_target_h > height:
            cam_y = max(0, height - cam_target_h)

        cam_w = min(cam_target_w, width - cam_x)
        cam_h = min(cam_target_h, height - cam_y)

        cam_x = cam_x - (cam_x % 2)
        cam_y = cam_y - (cam_y % 2)
        cam_w = cam_w - (cam_w % 2)
        cam_h = cam_h - (cam_h % 2)

        return {
            "x": cam_x,
            "y": cam_y,
            "w": cam_w,
            "h": cam_h
        }

    def generate_center_ass_subtitles(
        self,
        ass_path: str,
        speech_segments: List[Dict[str, Any]],
        video_w: int = 1080,
        video_h: int = 1920,
        style: str = "hormozi",
        clip_start: float = 0.0,
        clip_end: Optional[float] = None
    ) -> Optional[str]:
        """
        Generate ASS subtitle file with animated, word-by-word active pop keywords
        anchored right above the center separation line (Y=960).
        """
        if not speech_segments:
            return None

        clip_duration = (clip_end - clip_start) if clip_end is not None else 60.0

        # Primary highlight colors in ASS &HAABBGGRR format:
        # Hormozi/Vakiogiri Gold-Amber: &H002774FF (BGR: R=FF, G=74, B=27)
        # Yellow Pop: &H0000FFFF
        # Beast Cyan: &H00FFFF00
        if style in ["hormozi", "vakiogiri"]:
            highlight_color = "&H002774FF&"
        elif style == "beast":
            highlight_color = "&H00FFFF00&"
        else:
            highlight_color = "&H0000FFFF&"

        # 1. Collect all valid words in this clip's time range
        all_words: List[Dict[str, Any]] = []

        for seg in speech_segments:
            seg_words = seg.get("words", [])
            s_abs = float(seg.get("start", 0.0))
            e_abs = float(seg.get("end", 0.0))
            txt = seg.get("text", "").strip()

            # Ignore empty or pure punctuation/ellipsis segments
            if not any(c.isalnum() for c in txt):
                continue

            if seg_words:
                for w in seg_words:
                    w_start = float(w.get("start", s_abs))
                    w_end = float(w.get("end", e_abs))
                    w_txt = str(w.get("word", "")).strip()

                    # Only keep alphanumeric words (filter out orphan dots/commas)
                    if not any(c.isalnum() for c in w_txt):
                        continue

                    if w_end > clip_start and w_start < (clip_start + clip_duration):
                        rel_start = max(0.0, w_start - clip_start)
                        rel_end = min(clip_duration, w_end - clip_start)
                        if rel_end > rel_start:
                            clean_w = transliterate_word(w_txt).strip().upper()
                            if clean_w and any(c.isalnum() for c in clean_w):
                                all_words.append({
                                    "start": rel_start,
                                    "end": rel_end,
                                    "word": clean_w
                                })
            else:
                # If word-level timestamps weren't available, synthesize per-word timing from segment
                words_in_text = [w for w in txt.split() if any(c.isalnum() for c in w)]
                if not words_in_text:
                    continue

                if e_abs > clip_start and s_abs < (clip_start + clip_duration):
                    rel_s = max(0.0, s_abs - clip_start)
                    rel_e = min(clip_duration, e_abs - clip_start)
                    dur = max(0.4, rel_e - rel_s)
                    per_word_dur = dur / len(words_in_text)

                    for w_idx, w_str in enumerate(words_in_text):
                        w_st = rel_s + (w_idx * per_word_dur)
                        w_et = min(clip_duration, w_st + per_word_dur)
                        clean_w = transliterate_word(w_str).strip().upper()
                        if clean_w and any(c.isalnum() for c in clean_w):
                            all_words.append({
                                "start": w_st,
                                "end": w_et,
                                "word": clean_w
                            })

        if not all_words:
            return None

        # 2. Build high-impact Single-Word Animated Kinetic Captions (Hormozi / Viral Shorts 1-word pop)
        ass_header = f"""[Script Info]
Title: Vakiogiri Kinetic Animated Captions
ScriptType: v4.00+
PlayResX: {video_w}
PlayResY: {video_h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: VakiogiriKinetic,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4.5,2.2,5,24,24,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        # 2. Strict Monotonic Cleaning: sort all words and ensure strictly increasing time boundaries
        all_words = sorted(all_words, key=lambda w: float(w["start"]))
        clean_words = []
        last_t = 0.0
        for w in all_words:
            s = max(last_t, round(float(w["start"]), 2))
            e = max(s + 0.10, round(float(w["end"]), 2))
            tok = w["word"].replace("{", "").replace("}", "").strip().upper()
            if tok and any(c.isalnum() for c in tok):
                clean_words.append({"start": s, "end": e, "word": tok})
                last_t = s + 0.05

        if not clean_words:
            return None

        # 3. Group into dynamic 2-3 word phrase cards (prevents fast-speech flicker and ensures 100% readability)
        phrase_groups = []
        current_grp = []
        for w in clean_words:
            if not current_grp:
                current_grp.append(w)
            else:
                gap = w["start"] - current_grp[-1]["end"]
                # Start a new phrase card on natural silence (>0.40s) or when 3 words reached
                if gap > 0.40 or len(current_grp) >= 3:
                    phrase_groups.append(current_grp)
                    current_grp = [w]
                else:
                    current_grp.append(w)
        if current_grp:
            phrase_groups.append(current_grp)

        events = []
        for g_idx, grp in enumerate(phrase_groups):
            card_start = grp[0]["start"]
            natural_end = max(grp[-1]["end"] + 0.25, card_start + 0.80)
            if g_idx + 1 < len(phrase_groups):
                # Clamp card_end strictly to the start of the next card so dialogues never overlap
                card_end = min(natural_end, phrase_groups[g_idx + 1][0]["start"])
            else:
                card_end = min(natural_end, clip_duration)

            if card_end <= card_start:
                card_end = card_start + 0.25

            N = len(grp)
            # Partition card_start -> card_end into N strictly non-overlapping contiguous intervals
            boundaries = [card_start]
            for k in range(1, N):
                b_val = max(boundaries[-1] + 0.12, min(grp[k]["start"], card_end - 0.08 * (N - k)))
                boundaries.append(b_val)
            boundaries.append(card_end)

            for w_idx in range(N):
                w_active_start = boundaries[w_idx]
                w_active_end = boundaries[w_idx + 1]

                tokens = []
                for idx_other, other_w in enumerate(grp):
                    if idx_other == w_idx:
                        tokens.append(f"{{\\c{highlight_color}\\fscx115\\fscy115}}{other_w['word']}{{\\r}}")
                    else:
                        tokens.append(f"{{\\c&H00FFFFFF&}}{other_w['word']}{{\\r}}")
                line_text = " ".join(tokens)

                start_fmt = format_ass_time(w_active_start)
                end_fmt = format_ass_time(w_active_end)
                event_str = f"Dialogue: 0,{start_fmt},{end_fmt},VakiogiriKinetic,,0,0,0,,{{\\pos(540,920)}}{line_text}"
                events.append(event_str)

        if not events:
            return None

        full_ass = ass_header + "\n".join(events) + "\n"

        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(full_ass)

        return ass_path

    def build_ffmpeg_filter(
        self,
        target_w: int = 1080,
        target_h: int = 1920,
        facecam_box: Optional[Dict[str, int]] = None,
        ass_subtitle_path: Optional[str] = None
    ) -> str:
        """
        Constructs the complete FFmpeg filtergraph:
        - If facecam is detected:
          [0:v] split into gameplay & facecam
          Top: Gameplay cropped/scaled to target_w x (target_h / 2) with Lanczos & subtle unsharp
          Bottom: Facecam cropped/scaled to target_w x (target_h / 2)
          Stacked: vstack
          Divider: drawbox at Y=(target_h / 2 - 1) with 2px crisp white line
          Subtitles: ASS center-anchored animated subtitles
        - Fallback (no facecam):
          Direct 9:16 vertical crop with center-anchored animated subtitles & sharp Lanczos
        """
        half_h = target_h // 2
        line_thickness = 5
        line_y = half_h - (line_thickness // 2)

        sub_filter = ""
        if ass_subtitle_path and os.path.exists(ass_subtitle_path):
            escaped_path = ass_subtitle_path.replace("\\", "/").replace(":", "\\:")
            sub_filter = f",subtitles='{escaped_path}'"

        if facecam_box:
            cx = facecam_box["x"]
            cy = facecam_box["y"]
            cw = facecam_box["w"]
            ch = facecam_box["h"]

            filtergraph = (
                f"[0:v]split=2[gameplay_in][cam_in];"
                f"[gameplay_in]scale={target_w}:{half_h}:force_original_aspect_ratio=increase:flags=lanczos,"
                f"crop={target_w}:{half_h},"
                f"unsharp=5:5:0.5:5:5:0.0[top_half];"
                f"[cam_in]crop={cw}:{ch}:{cx}:{cy},"
                f"scale={target_w}:{half_h}:force_original_aspect_ratio=increase:flags=lanczos,"
                f"crop={target_w}:{half_h},"
                f"unsharp=5:5:0.6:5:5:0.0[bot_half];"
                f"[top_half][bot_half]vstack=inputs=2[stacked];"
                f"[stacked]drawbox=x=0:y={line_y}:w={target_w}:h={line_thickness}:color=white@0.95:t=fill"
                f"{sub_filter}"
            )
            return filtergraph
        else:
            filtergraph = (
                f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=lanczos,"
                f"crop={target_w}:{target_h},"
                f"unsharp=5:5:0.6:5:5:0.0"
                f"{sub_filter}"
            )
            return filtergraph


# Singleton instance for direct pipeline usage
vakiogiri_layout_engine = VakiogiriLayoutEngine()
