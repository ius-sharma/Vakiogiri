"""
Visual Dynamics & Face Motion Detector (Vision-AI)
Analyzes video for:
1. Physical motion energy (gestures, body language, action vs static screen)
2. Face presence, proximity shifts, and head movement
3. Visual cut / scene change velocity
4. Opening 3-5 second visual hook intensity
Optimized for ultra-fast CPU inference using OpenCV frame sampling.
"""

import os
import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional, Any

class VisualDynamicsAnalyzer:
    def __init__(self, sample_fps: float = 2.0, target_width: int = 320):
        self.sample_fps = sample_fps
        self.target_width = target_width
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        Extracts per-second visual dynamics metrics from video.
        Returns time-series data for motion, face scale, and visual cuts.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0

        if duration <= 0:
            cap.release()
            return {"duration": 0.0, "timeline": []}

        frame_step = max(1, int(round(fps / self.sample_fps)))
        
        timeline_samples = []
        prev_gray = None
        prev_hist = None

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_step == 0:
                timestamp = frame_idx / fps
                h, w = frame.shape[:2]
                scale = self.target_width / float(w)
                new_h = int(h * scale)
                small_frame = cv2.resize(frame, (self.target_width, new_h), interpolation=cv2.INTER_AREA)
                gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
                
                # 1. Motion Energy via Frame Difference
                motion_energy = 0.0
                if prev_gray is not None:
                    diff = cv2.absdiff(gray, prev_gray)
                    motion_energy = float(np.mean(diff))

                # 2. Shot Boundary / Scene Transition via HSV Histogram
                scene_cut_score = 0.0
                hsv = cv2.cvtColor(small_frame, cv2.COLOR_BGR2HSV)
                hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
                cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
                if prev_hist is not None:
                    # Correlation metric: 1.0 is identical, <0.6 indicates high visual change
                    corr = cv2.compareHist(hist, prev_hist, cv2.HISTCMP_CORREL)
                    scene_cut_score = max(0.0, 1.0 - corr) * 100.0
                
                # 3. Face Presence & Proximity
                faces = self.face_cascade.detectMultiScale(
                    gray, 
                    scaleFactor=1.15, 
                    minNeighbors=4, 
                    minSize=(24, 24)
                )
                face_detected = len(faces) > 0
                max_face_area_ratio = 0.0
                if face_detected:
                    total_area = float(self.target_width * new_h)
                    areas = [(w_f * h_f) / total_area for (x_f, y_f, w_f, h_f) in faces]
                    max_face_area_ratio = float(max(areas))

                timeline_samples.append({
                    "timestamp": round(timestamp, 2),
                    "motion_energy": round(motion_energy, 2),
                    "scene_cut_score": round(scene_cut_score, 2),
                    "face_detected": face_detected,
                    "face_ratio": round(max_face_area_ratio, 4)
                })

                prev_gray = gray
                prev_hist = hist

            frame_idx += 1

        cap.release()

        return {
            "duration": round(duration, 2),
            "timeline": timeline_samples
        }

    def score_window(self, timeline_data: Dict[str, Any], start_sec: float, end_sec: float) -> Dict[str, float]:
        """
        Scores a candidate time window (start_sec to end_sec) for visual dynamics.
        Evaluates overall visual energy and opening 3-second hook intensity.
        Returns a dictionary of normalized visual scores (0 to 100).
        """
        samples = timeline_data.get("timeline", [])
        if not samples:
            return {"visual_overall": 50.0, "visual_hook": 50.0, "face_score": 50.0}

        window_samples = [s for s in samples if start_sec <= s["timestamp"] <= end_sec]
        if not window_samples:
            return {"visual_overall": 50.0, "visual_hook": 50.0, "face_score": 50.0}

        # Opening 3.5s hook window samples
        hook_end = min(end_sec, start_sec + 3.5)
        hook_samples = [s for s in window_samples if s["timestamp"] <= hook_end]

        # Calculate average motion energy
        avg_motion = np.mean([s["motion_energy"] for s in window_samples])
        hook_motion = np.mean([s["motion_energy"] for s in hook_samples]) if hook_samples else avg_motion

        # Calculate face presence and proximity
        face_present_ratio = np.mean([1.0 if s["face_detected"] else 0.0 for s in window_samples])
        avg_face_scale = np.mean([s["face_ratio"] for s in window_samples])

        # Hook face presence
        hook_face_present = np.mean([1.0 if s["face_detected"] else 0.0 for s in hook_samples]) if hook_samples else 0.5
        hook_face_scale = np.mean([s["face_ratio"] for s in hook_samples]) if hook_samples else avg_face_scale

        # Global format check: Is this a talking-head video or a cinematic b-roll / action montage?
        all_samples = samples
        global_face_ratio = np.mean([1.0 if s["face_detected"] else 0.0 for s in all_samples]) if all_samples else 0.0
        is_talking_head = global_face_ratio >= 0.20

        # Motion score (avg pixel diff 8-20 indicates high cinematic/physical motion)
        motion_score = float(np.clip((avg_motion / 12.0) * 85.0 + 15.0, 15.0, 100.0))
        hook_motion_score = float(np.clip((hook_motion / 12.0) * 85.0 + 15.0, 15.0, 100.0))

        # Scene cut / transition energy in window
        avg_cuts = np.mean([s.get("scene_cut_score", 0.0) for s in window_samples])
        cut_score = float(np.clip(avg_cuts * 1.5, 20.0, 100.0))

        if is_talking_head:
            # Format A: Talking-head / Podcast / Streamer
            face_score = float(np.clip((face_present_ratio * 60.0) + (avg_face_scale * 500.0), 30.0, 100.0))
            hook_face_score = float(np.clip((hook_face_present * 60.0) + (hook_face_scale * 500.0), 30.0, 100.0))
            visual_hook = float(0.50 * hook_motion_score + 0.50 * hook_face_score)
            visual_overall = float(0.35 * motion_score + 0.35 * face_score + 0.15 * cut_score + 0.15 * visual_hook)
            video_format = "Talking Head / Interview"
        else:
            # Format B: Cinematic B-Roll / Action Montage / Sports / Documentary
            # High motion and rapid visual scene changes are the key viral drivers
            face_score = float(np.clip(motion_score * 0.9, 40.0, 100.0))
            visual_hook = float(0.70 * hook_motion_score + 0.30 * cut_score)
            visual_overall = float(0.55 * motion_score + 0.30 * cut_score + 0.15 * visual_hook)
            video_format = "Cinematic B-Roll / Action Montage"

        return {
            "visual_overall": round(visual_overall, 1),
            "visual_hook": round(visual_hook, 1),
            "face_score": round(face_score, 1),
            "avg_motion": round(float(avg_motion), 2),
            "video_format": video_format
        }

if __name__ == "__main__":
    import sys
    test_vid = "test_download/wnHW6o8WMas.mp4"
    if len(sys.argv) > 1:
        test_vid = sys.argv[1]
    print(f"[VisualDynamics] Testing on {test_vid}...")
    analyzer = VisualDynamicsAnalyzer(sample_fps=2.0)
    data = analyzer.analyze_video(test_vid)
    print(f"[VisualDynamics] Extracted {len(data['timeline'])} timeline frames over {data['duration']}s.")
    score = analyzer.score_window(data, 30.0, 60.0)
    print(f"[VisualDynamics] Window 30s-60s score: {score}")
