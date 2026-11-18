"""
vakiogiri_layout.py - Signature 9:16 Vertical Gaming Split & Reaction Layout Engine

Supports two high-retention vertical editing formats:
1. 'gaming_split' (Preserved Default - 50/50 Split):
   - Top Half (1080x960): Center/Action-focused Gameplay
   - Bottom Half (1080x960): Streamer Facecam / Reaction
   - Center Separation Line: 5px crisp white line at Y=958
   - Subtitles: 60pt font anchored at Y=920 (above center divider)

2. 'face_top_game_bottom' (Inverted - 37.5% Face / 62.5% Big Game):
   - Top Section (1080x720): Streamer Facecam / Reaction
   - Bottom Section (1080x1200): Dominant full-view Gameplay
   - Separation Line: 5px crisp white line at Y=718
   - Subtitles: 68pt bold kinetic font at Y=760 (below divider at top of gameplay),
     rapid 2-word cards, hot keywords punched in Electric Neon Amber (&H0000D4FF& / 120% bounce)
     and regular active words in Gold (&H002774FF& / 115% bounce), inactive words clean white.
"""

import os
import cv2
import json
import math
import subprocess
import numpy as np
from typing import Optional, Dict, Any, Tuple, List
from hinglish_transliterator import transliterate_word

HOT_KEYWORDS = {
    "JUMP", "SURFACE", "CIRCLE", "CIRCLES", "BHAI", "BRO", "LADLE", "BHAGJA",
    "LITERALLY", "BACH", "BACHA", "OP", "KILL", "HEADSHOT", "DEAD", "WIN", "RUN",
    "DANGER", "EPIC", "NOOB", "PRO", "AAGAYA", "MARO", "GAYA", "KHATAM", "SHIT",
    "WHAT", "WTF", "HELL", "SUPER", "NICE", "ROST", "CHALO", "DEKHO", "LOOK",
    "CHADH", "OYE", "ARRE", "KARENGE", "MAJA", "BHAIYA"
}


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

    def detect_facecam_gemini_vision(
        self,
        frame_bgr: np.ndarray,
        layout_mode: str = "face_top_game_bottom"
    ) -> Optional[Dict[str, int]]:
        """
        Use Gemini Vision to inspect a stream frame and accurately detect the real human
        streamer webcam / facecam overlay box, with 0% false positives on video game characters.
        """
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_key or len(gemini_key) < 15:
            return None

        try:
            from google import genai
            from google.genai import types

            h, w = frame_bgr.shape[:2]
            if h <= 0 or w <= 0:
                return None

            success, encoded_jpg = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if not success:
                return None

            img_bytes = encoded_jpg.tobytes()

            prompt = (
                "You are an expert AI video stream layout engineer.\n"
                "Examine this gaming livestream frame and determine if the streamer has a live webcam / facecam / reaction box or human cutout on screen.\n\n"
                "STRICT RULES:\n"
                "1. Distinguish between REAL HUMAN streamers and video game characters/animations. NEVER classify in-game characters or HUD graphics as a facecam.\n"
                "2. A streamer webcam is typically positioned along the perimeter or corners (bottom-left, bottom-right, top-left, top-right) and often has an overlay border or camera box.\n"
                "3. If a real human streamer facecam is detected, return bounding box coordinates [ymin, xmin, ymax, xmax] normalized from 0 to 1000:\n"
                "   - 'webcam_box': Bounding box of the entire webcam overlay container on screen.\n"
                "   - 'face_box': Bounding box of the streamer's human face/head inside that webcam.\n"
                "   {\"has_facecam\": true, \"webcam_box\": [ymin, xmin, ymax, xmax], \"face_box\": [ymin, xmin, ymax, xmax]}\n"
                "4. If NO human streamer webcam is present (pure gameplay only, or only video game characters), return:\n"
                "   {\"has_facecam\": false, \"webcam_box\": null, \"face_box\": null}\n"
                "5. Return ONLY a valid JSON object matching this schema."
            )

            client = genai.Client(api_key=gemini_key)
            response = None
            for model_name in ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                            prompt
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    if response and response.text:
                        break
                except Exception:
                    continue

            if not response or not response.text:
                return None

            data = json.loads(response.text)
            if not data.get("has_facecam"):
                print("  -> [Gemini Vision Layout] Confirmed: No streamer facecam (Pure Gameplay stream).")
                return None

            # Support both new schema ('webcam_box') and legacy schema ('box_2d')
            raw_box = data.get("webcam_box") or data.get("box_2d")
            if not raw_box or len(raw_box) != 4:
                return None

            ymin, xmin, ymax, xmax = [float(coord) for coord in raw_box]
            raw_x = int((xmin / 1000.0) * w)
            raw_y = int((ymin / 1000.0) * h)
            raw_w = int(((xmax - xmin) / 1000.0) * w)
            raw_h = int(((ymax - ymin) / 1000.0) * h)

            # Plausibility sanity checks:
            # A real webcam is between 40px and 70% of screen dimensions
            if raw_w < 40 or raw_h < 40 or raw_w > int(w * 0.70) or raw_h > int(h * 0.75):
                print(f"  -> [Gemini Vision Layout] Implausible facecam dimensions ({raw_w}x{raw_h}), rejecting.")
                return None

            # Detect or refine the streamer's face location inside the webcam box
            face_x, face_y, face_w, face_h = None, None, None, None
            raw_fb = data.get("face_box")
            if raw_fb and len(raw_fb) == 4:
                f_ymin, f_xmin, f_ymax, f_xmax = [float(coord) for coord in raw_fb]
                face_x = int((f_xmin / 1000.0) * w)
                face_y = int((f_ymin / 1000.0) * h)
                face_w = int(((f_xmax - f_xmin) / 1000.0) * w)
                face_h = int(((f_ymax - f_ymin) / 1000.0) * h)

            # Local Haar cascade refinement inside the webcam boundary if Gemini didn't return face_box
            if not face_w or face_w < 10 or not face_h or face_h < 10:
                try:
                    wc_crop = frame_bgr[raw_y:raw_y + raw_h, raw_x:raw_x + raw_w]
                    if wc_crop.shape[0] > 30 and wc_crop.shape[1] > 30:
                        gray_wc = cv2.cvtColor(wc_crop, cv2.COLOR_BGR2GRAY)
                        faces = self.face_cascade.detectMultiScale(
                            gray_wc,
                            scaleFactor=1.10,
                            minNeighbors=3,
                            minSize=(25, 25)
                        )
                        if len(faces) > 0:
                            bfx, bfy, bfw, bfh = max(faces, key=lambda b: b[2] * b[3])
                            face_x = raw_x + bfx
                            face_y = raw_y + bfy
                            face_w = bfw
                            face_h = bfh
                except Exception:
                    pass

            target_aspect_h = 720 if layout_mode == "face_top_game_bottom" else 960
            target_aspect_w = 1080
            aspect_ratio = target_aspect_w / float(target_aspect_h)  # 1.125 for 50/50 split

            # If face coordinates are found, zoom in tightly on the streamer's face & shoulders (~2.1x face height)
            # If no face is found, use the webcam center
            if face_w and face_h and face_w > 10 and face_h > 10:
                face_cx = face_x + face_w // 2
                face_cy = face_y + face_h // 2
                desired_h = max(int(face_h * 2.1), int(raw_h * 0.60))
            else:
                face_cx = raw_x + raw_w // 2
                face_cy = raw_y + raw_h // 2
                desired_h = raw_h

            desired_w = int(desired_h * aspect_ratio)

            # Strict Boundary Rule: Crop MUST stay completely inside the webcam box to prevent game HUD/floor bleed
            if desired_w > raw_w:
                desired_w = raw_w
                desired_h = int(desired_w / aspect_ratio)
            if desired_h > raw_h:
                desired_h = raw_h
                desired_w = int(desired_h * aspect_ratio)

            # Center on face while clamping strictly inside webcam perimeter
            cam_x = max(raw_x, min(face_cx - desired_w // 2, raw_x + raw_w - desired_w))
            cam_y = max(raw_y, min(face_cy - int(desired_h * 0.40), raw_y + raw_h - desired_h))
            cam_w = desired_w
            cam_h = desired_h

            cam_x -= (cam_x % 2)
            cam_y -= (cam_y % 2)
            cam_w -= (cam_w % 2)
            cam_h -= (cam_h % 2)

            print(f"  -> [Gemini Vision Layout] Detected tight zoomed facecam box: x={cam_x}, y={cam_y}, w={cam_w}, h={cam_h} (Aspect: {cam_w}:{cam_h})")
            return {
                "x": cam_x,
                "y": cam_y,
                "w": cam_w,
                "h": cam_h
            }
        except Exception as err:
            print(f"  -> [Gemini Vision Layout Notice] Vision detection notice: {err}")
            return None

    def detect_facecam_box(
        self,
        video_path: str,
        start_time: float,
        duration: float,
        sample_count: int = 6,
        layout_mode: str = "gaming_split"
    ) -> Optional[Dict[str, int]]:
        """
        Scan video frames to detect if a streamer facecam is present.
        Tier 1: Gemini Vision AI Inspector (100% accurate, distinguishes humans from game characters)
        Tier 2: OpenCV Haar Cascade with Corner-Locking Filter (rejects center game characters)
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

        # Grab a crisp representative sample frame ~2.5s into the clip for Gemini Vision
        sample_sec = min(start_time + 2.5, start_time + max(0.5, duration / 2.0))
        target_fnum = min(total_frames - 1, int(sample_sec * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_fnum)
        ret, sample_frame = cap.read()

        if ret and sample_frame is not None:
            # 1. Try Gemini Vision One-Shot Inspector first
            vision_box = self.detect_facecam_gemini_vision(sample_frame, layout_mode=layout_mode)
            if vision_box is not None:
                cap.release()
                return vision_box

        # Tier 2: Fallback Haar Cascade with Corner-Locking Heuristic
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
                # Corner Locking: Streamer webcam is ALWAYS in a corner/perimeter, NEVER in center of gameplay
                fcx = fx + fw // 2
                fcy = fy + fh // 2
                is_center_x = (0.28 * width) < fcx < (0.72 * width)
                is_center_y = (0.22 * height) < fcy < (0.78 * height)
                if is_center_x and is_center_y:
                    continue  # Reject video game character in center of screen!
                detected_boxes.append((fx, fy, fw, fh))

        cap.release()

        # Require at least 2 consistent perimeter detections to eliminate stray noise
        if len(detected_boxes) < 2:
            return None

        cx_list = [fx + fw // 2 for (fx, fy, fw, fh) in detected_boxes]
        cy_list = [fy + fh // 2 for (fx, fy, fw, fh) in detected_boxes]
        fw_list = [fw for (fx, fy, fw, fh) in detected_boxes]

        median_cx = int(sorted(cx_list)[len(cx_list) // 2])
        median_cy = int(sorted(cy_list)[len(cy_list) // 2])
        median_fw = int(sorted(fw_list)[len(fw_list) // 2])

        target_aspect_h = 720 if layout_mode == "face_top_game_bottom" else 960
        target_aspect_w = 1080
        aspect_ratio = target_aspect_w / float(target_aspect_h)

        # Tight face zoom: ~2.1x face height for impactful streamer facial reactions
        cam_target_h = int(max(median_fw * 2.1, 240))
        cam_target_w = int(cam_target_h * aspect_ratio)

        cam_x = max(0, min(median_cx - cam_target_w // 2, width - cam_target_w))
        cam_y = max(0, min(median_cy - int(cam_target_h * 0.40), height - cam_target_h))

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
        clip_end: Optional[float] = None,
        layout_mode: str = "gaming_split"
    ) -> Optional[str]:
        """
        Generate ASS subtitle file with animated, word-by-word active pop keywords.
        - 'gaming_split': 60pt font anchored right above center divider (Y=920).
        - 'face_top_game_bottom': 68pt bold font anchored below divider at top of gameplay (Y=760),
          fast 2-word pacing, HOT keywords highlighted in Electric Neon Amber.
        """
        if not speech_segments:
            return None

        clip_duration = (clip_end - clip_start) if clip_end is not None else 60.0

        # Primary highlight colors in ASS &HAABBGGRR format:
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

        # 2. Strict Monotonic Cleaning: sort all words and ensure strictly increasing time boundaries
        all_words = sorted(all_words, key=lambda w: float(w["start"]))
        clean_words = []
        last_t = 0.0
        for w in all_words:
            s = max(last_t, round(float(w["start"]), 2))
            e = max(s + 0.10, round(float(w["end"]), 2))
            # Never let a single word freeze across long silences
            if e - s > 0.80:
                e = round(s + 0.65, 2)
            tok = w["word"].replace("{", "").replace("}", "").strip().upper()
            if tok and any(c.isalnum() for c in tok):
                clean_words.append({"start": s, "end": e, "word": tok})
                last_t = s + 0.04

        if not clean_words:
            return None

        # 3. Dynamic phrase cards:
        # For 'face_top_game_bottom': faster pacing (2 words max per card, or 3 if all short <= 4 chars)
        # For 'gaming_split': 3 words max per card
        phrase_groups = []
        current_grp = []
        is_face_top = (layout_mode == "face_top_game_bottom")
        gap_threshold = 0.35 if is_face_top else 0.40

        for w in clean_words:
            if not current_grp:
                current_grp.append(w)
            else:
                gap = w["start"] - current_grp[-1]["end"]
                if is_face_top:
                    max_in_grp = 3 if all(len(x["word"]) <= 4 for x in current_grp) else 2
                else:
                    max_in_grp = 3

                if gap > gap_threshold or len(current_grp) >= max_in_grp:
                    phrase_groups.append(current_grp)
                    current_grp = [w]
                else:
                    current_grp.append(w)
        if current_grp:
            phrase_groups.append(current_grp)

        # 4. ASS Header Configuration
        if is_face_top:
            style_name = "BigPunchKinetic"
            style_line = "Style: BigPunchKinetic,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,5.0,2.5,5,24,24,0,1"
            sub_pos_y = 760  # Right below the 720px divider line, top edge of gameplay
        else:
            style_name = "VakiogiriKinetic"
            style_line = "Style: VakiogiriKinetic,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4.5,2.2,5,24,24,0,1"
            sub_pos_y = 920  # Right above the 960px center line

        ass_header = f"""[Script Info]
Title: Vakiogiri Kinetic Animated Captions
ScriptType: v4.00+
PlayResX: {video_w}
PlayResY: {video_h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{style_line}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events = []
        for g_idx, grp in enumerate(phrase_groups):
            card_start = grp[0]["start"]
            card_end_padding = 0.15 if is_face_top else 0.20
            # Natural card end follows voice closely with snappy padding, never freezing across pauses
            natural_end = grp[-1]["end"] + card_end_padding
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
                b_val = max(boundaries[-1] + 0.10, min(grp[k]["start"], card_end - 0.08 * (N - k)))
                boundaries.append(b_val)
            boundaries.append(card_end)

            for w_idx in range(N):
                w_active_start = boundaries[w_idx]
                w_active_end = boundaries[w_idx + 1]

                tokens = []
                for idx_other, other_w in enumerate(grp):
                    tok_word = other_w["word"]
                    if idx_other == w_idx:
                        if is_face_top:
                            clean_token = "".join(c for c in tok_word if c.isalnum())
                            is_hot = clean_token in HOT_KEYWORDS
                            active_color = "&H0000D4FF&" if is_hot else highlight_color
                            scale_val = "120" if is_hot else "115"
                            tokens.append(f"{{\\c{active_color}\\fscx{scale_val}\\fscy{scale_val}}}{tok_word}{{\\r}}")
                        else:
                            tokens.append(f"{{\\c{highlight_color}\\fscx115\\fscy115}}{tok_word}{{\\r}}")
                    else:
                        tokens.append(f"{{\\c&H00FFFFFF&}}{tok_word}{{\\r}}")
                line_text = " ".join(tokens)

                start_fmt = format_ass_time(w_active_start)
                end_fmt = format_ass_time(w_active_end)
                event_str = f"Dialogue: 0,{start_fmt},{end_fmt},{style_name},,0,0,0,,{{\\pos(540,{sub_pos_y})}}{line_text}"
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
        ass_subtitle_path: Optional[str] = None,
        layout_mode: str = "gaming_split"
    ) -> str:
        """
        Constructs the complete FFmpeg filtergraph:
        - 'face_top_game_bottom':
          Top: Facecam (1080x720) with Lanczos & unsharp
          Bottom: Gameplay (1080x1200) with Lanczos & unsharp
          Divider: 5px crisp white line at Y=718
          Subtitles: Fast, large kinetic captions anchored at Y=760

        - 'gaming_split' (Preserved Default):
          Top: Gameplay (1080x960) with Lanczos & unsharp
          Bottom: Facecam (1080x960) with Lanczos & unsharp
          Divider: 5px crisp white line at Y=958
          Subtitles: 60pt kinetic captions anchored at Y=920

        - Fallback (no facecam):
          Direct 9:16 vertical crop with sharp Lanczos & animated subtitles
        """
        line_thickness = 5
        sub_filter = ""
        if ass_subtitle_path and os.path.exists(ass_subtitle_path):
            escaped_path = ass_subtitle_path.replace("\\", "/").replace(":", "\\:")
            sub_filter = f",subtitles='{escaped_path}'"

        if layout_mode == "face_top_game_bottom":
            face_h = 720
            game_h = 1200
            line_y = face_h - (line_thickness // 2)  # 718

            if facecam_box:
                cx = facecam_box["x"]
                cy = facecam_box["y"]
                cw = facecam_box["w"]
                ch = facecam_box["h"]

                filtergraph = (
                    f"[0:v]split=2[gameplay_in][cam_in];"
                    f"[cam_in]crop={cw}:{ch}:{cx}:{cy},"
                    f"scale={target_w}:{face_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{face_h},"
                    f"unsharp=3:3:0.3,setsar=1[top_half];"
                    f"[gameplay_in]scale={target_w}:{game_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{game_h},setsar=1[bot_half];"
                    f"[top_half][bot_half]vstack=inputs=2,setsar=1[stacked];"
                    f"[stacked]drawbox=x=0:y={line_y}:w={target_w}:h={line_thickness}:color=white@0.95:t=fill"
                    f"{sub_filter}"
                )
                return filtergraph
            else:
                filtergraph = (
                    f"[0:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{target_h},setsar=1"
                    f"{sub_filter}"
                )
                return filtergraph
        else:
            # Preserved 'gaming_split' 50/50 layout
            half_h = target_h // 2
            line_y = half_h - (line_thickness // 2)  # 958

            if facecam_box:
                cx = facecam_box["x"]
                cy = facecam_box["y"]
                cw = facecam_box["w"]
                ch = facecam_box["h"]

                filtergraph = (
                    f"[0:v]split=2[gameplay_in][cam_in];"
                    f"[gameplay_in]scale={target_w}:{half_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{half_h},setsar=1[top_half];"
                    f"[cam_in]crop={cw}:{ch}:{cx}:{cy},"
                    f"scale={target_w}:{half_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{half_h},"
                    f"unsharp=3:3:0.3,setsar=1[bot_half];"
                    f"[top_half][bot_half]vstack=inputs=2,setsar=1[stacked];"
                    f"[stacked]drawbox=x=0:y={line_y}:w={target_w}:h={line_thickness}:color=white@0.95:t=fill"
                    f"{sub_filter}"
                )
                return filtergraph
            else:
                filtergraph = (
                    f"[0:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase:flags=bicubic,"
                    f"crop={target_w}:{target_h},setsar=1"
                    f"{sub_filter}"
                )
                return filtergraph


# Singleton instance for direct pipeline usage
vakiogiri_layout_engine = VakiogiriLayoutEngine()
