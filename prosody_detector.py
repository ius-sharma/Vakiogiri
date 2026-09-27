"""
Acoustic Prosody & Pitch (F0) Dynamics Analyzer (Pure NumPy + Soundfile)
Specialized in:
1. Vocal Intonation & Pitch Modulation (Inflection variance vs monotone speech)
2. "The Whisper Hook" Detection: High spectral flatness + unvoiced high-frequency ratio at low RMS
3. Vocal Deceleration & Dynamic Energy Contrast
4. Opening 3-5s Prosodic Hook Intensity (0-100)
Pure NumPy & Soundfile implementation for sub-second, zero-dependency, bulletproof execution.
"""

import os
import sys
import numpy as np
import soundfile as sf
from typing import Dict, List, Any, Optional

class ProsodyDynamicsAnalyzer:
    def __init__(self, sample_rate: int = 16000, hop_length_sec: float = 0.05):
        self.sample_rate = sample_rate
        self.hop_length_sec = hop_length_sec
        self.hop_samples = int(sample_rate * hop_length_sec)
        self.frame_length = int(sample_rate * 0.08)  # 80ms window for pitch & spectral flatness
        self.window = np.hanning(self.frame_length)

    def analyze_audio_file(self, wav_path: str) -> Dict[str, Any]:
        """
        Extracts frame-by-frame pitch, spectral flatness, and energy metrics from a 16kHz mono WAV.
        """
        if not os.path.exists(wav_path):
            raise FileNotFoundError(f"Audio file not found: {wav_path}")

        y, sr = sf.read(wav_path)
        if len(y.shape) > 1:
            y = np.mean(y, axis=1)  # Convert to Mono
        
        # Ensure float32
        y = y.astype(np.float32)

        total_samples = len(y)
        duration = total_samples / float(sr)
        if duration <= 0:
            return {"duration": 0.0, "timeline": []}

        timeline = []
        hop = self.hop_samples
        flen = self.frame_length
        win = self.window

        num_frames = max(1, (total_samples - flen) // hop)

        # Min and max lag for human voice (65 Hz to 450 Hz)
        min_lag = int(sr / 450)
        max_lag = int(sr / 65)

        for i in range(num_frames):
            start_idx = i * hop
            frame = y[start_idx : start_idx + flen]
            if len(frame) < flen:
                break

            t_sec = (start_idx + flen / 2.0) / float(sr)

            # 1. RMS Energy
            rms = float(np.sqrt(np.mean(frame ** 2) + 1e-12))
            rms_db = float(20.0 * np.log10(max(1e-5, rms)))

            # 2. Spectral Flatness via NumPy RFFT
            windowed_frame = frame * win
            rfft = np.abs(np.fft.rfft(windowed_frame)) ** 2 + 1e-12
            geo_mean = float(np.exp(np.mean(np.log(rfft))))
            arith_mean = float(np.mean(rfft))
            flatness = float(geo_mean / arith_mean)

            # 3. Fundamental Frequency (F0) via Autocorrelation
            corr = np.correlate(frame, frame, mode="full")
            corr = corr[len(corr)//2:]

            f0_hz = 0.0
            if max_lag < len(corr) and corr[0] > 1e-6:
                search_region = corr[min_lag:max_lag]
                peak_idx = int(np.argmax(search_region))
                peak_val = float(search_region[peak_idx])
                if peak_val > 0.28 * corr[0]:  # Valid voiced frame threshold
                    true_lag = min_lag + peak_idx
                    f0_hz = float(sr / true_lag)

            # 4. Whisper Hook Signature: High spectral flatness (>0.15) at low/medium speech volume (-42 to -22 dB)
            is_whisper = (flatness > 0.15) and (-42.0 <= rms_db <= -22.0)
            whisper_intensity = float(np.clip((flatness * 120.0) * (1.2 if is_whisper else 0.4), 0.0, 100.0))

            timeline.append({
                "timestamp": round(t_sec, 2),
                "rms_db": round(rms_db, 1),
                "f0_hz": round(f0_hz, 1),
                "spectral_flatness": round(flatness, 3),
                "whisper_intensity": round(whisper_intensity, 1)
            })

        return {
            "duration": round(duration, 2),
            "timeline": timeline
        }

    def score_window(self, analysis_data: Dict[str, Any], start_sec: float, end_sec: float) -> Dict[str, float]:
        """
        Scores a candidate time window (start_sec to end_sec) for vocal prosody and hook modulation.
        Returns prosody_overall, pitch_variance, whisper_score, and opening_prosody_hook.
        """
        samples = analysis_data.get("timeline", [])
        if not samples:
            return {
                "prosody_overall": 75.0,
                "prosody_hook": 75.0,
                "pitch_variance_score": 75.0,
                "whisper_score": 50.0
            }

        window_samples = [s for s in samples if start_sec <= s["timestamp"] <= end_sec]
        if not window_samples:
            return {
                "prosody_overall": 75.0,
                "prosody_hook": 75.0,
                "pitch_variance_score": 75.0,
                "whisper_score": 50.0
            }

        # Opening 3.5s hook zone
        hook_end = min(end_sec, start_sec + 3.5)
        hook_samples = [s for s in window_samples if s["timestamp"] <= hook_end]

        # 1. Pitch Inflection & Modulation
        voiced_f0 = [s["f0_hz"] for s in window_samples if s["f0_hz"] > 0]
        hook_voiced_f0 = [s["f0_hz"] for s in hook_samples if s["f0_hz"] > 0] if hook_samples else voiced_f0

        f0_std = float(np.std(voiced_f0)) if len(voiced_f0) > 5 else 20.0
        hook_f0_std = float(np.std(hook_voiced_f0)) if len(hook_voiced_f0) > 3 else f0_std

        # Standard vocal modulation ranges: 10 Hz (monotone robot) to 45+ Hz (hyper-engaging storyteller)
        pitch_score = float(np.clip((f0_std / 32.0) * 85.0 + 15.0, 25.0, 100.0))
        hook_pitch_score = float(np.clip((hook_f0_std / 32.0) * 85.0 + 15.0, 25.0, 100.0))

        # 2. Whisper / Secret Hook Intensity
        avg_whisper = float(np.mean([s["whisper_intensity"] for s in window_samples]))
        hook_whisper = float(np.mean([s["whisper_intensity"] for s in hook_samples])) if hook_samples else avg_whisper

        whisper_score = float(np.clip(avg_whisper * 1.5, 20.0, 100.0))
        hook_whisper_score = float(np.clip(hook_whisper * 1.8, 20.0, 100.0))

        # 3. Dynamic RMS Contrast (Energy swing between hook and climax)
        rms_vals = [s["rms_db"] for s in window_samples if s["rms_db"] > -55.0]
        rms_dyn_range = float(np.percentile(rms_vals, 90) - np.percentile(rms_vals, 10)) if len(rms_vals) > 5 else 14.0
        energy_contrast_score = float(np.clip((rms_dyn_range / 16.0) * 80.0 + 20.0, 35.0, 100.0))

        # Opening 3.5s Prosodic Hook: High vocal inflection OR magnetic whisper/intimate delivery
        prosody_hook = float(0.60 * hook_pitch_score + 0.25 * hook_whisper_score + 0.15 * energy_contrast_score)

        # Overall Prosodic Score across the full clip
        prosody_overall = float(0.45 * pitch_score + 0.30 * energy_contrast_score + 0.25 * prosody_hook)

        return {
            "prosody_overall": round(prosody_overall, 1),
            "prosody_hook": round(prosody_hook, 1),
            "pitch_variance_score": round(pitch_score, 1),
            "whisper_score": round(whisper_score, 1),
            "f0_std_hz": round(f0_std, 1)
        }

if __name__ == "__main__":
    from moment_detector import extract_audio_pcm
    test_video = "test_download/wnHW6o8WMas.mp4"
    if len(sys.argv) > 1:
        test_video = sys.argv[1]
    
    print(f"[ProsodyAnalyzer] Extracting audio from {test_video}...")
    temp_wav = "temp_prosody_test.wav"
    extract_audio_pcm(test_video, temp_wav)
    
    analyzer = ProsodyDynamicsAnalyzer()
    data = analyzer.analyze_audio_file(temp_wav)
    print(f"[ProsodyAnalyzer] Extracted {len(data['timeline'])} prosodic frames over {data['duration']}s.")
    
    scores = analyzer.score_window(data, 31.4, 58.16)
    print(f"[ProsodyAnalyzer] Window 31.4s-58.16s ('Stop The Pity Party') scores: {scores}")
    
    scores2 = analyzer.score_window(data, 62.66, 104.9)
    print(f"[ProsodyAnalyzer] Window 62.66s-104.9s ('Stop Lying To Yourself') scores: {scores2}")
    
    if os.path.exists(temp_wav):
        os.remove(temp_wav)
