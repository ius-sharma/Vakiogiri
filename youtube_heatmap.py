import re
import json
import requests
import sys
from typing import List, Dict, Any, Optional

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

def extract_video_id(url_or_id: str) -> str:
    match = re.search(r"(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})", url_or_id)
    if match:
        return match.group(1)
    return url_or_id.strip()

def extract_heatmap(video_id_or_url: str) -> Dict[str, Any]:
    """
    Extracts YouTube 'Most Replayed' heatmap data.
    """
    video_id = extract_video_id(video_id_or_url)
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        return {"video_id": video_id, "has_heatmap": False, "error": f"Failed to fetch watch page: {e}"}

    pattern = r"var\s+ytInitialData\s*=\s*(\{.*?\});</script>"
    match = re.search(pattern, html)
    if not match:
        pattern2 = r"window\[\"ytInitialData\"\]\s*=\s*(\{.*?\});"
        match = re.search(pattern2, html)

    if not match:
        return {"video_id": video_id, "has_heatmap": False, "error": "ytInitialData not found"}

    try:
        data = json.loads(match.group(1))
    except Exception as e:
        return {"video_id": video_id, "has_heatmap": False, "error": f"JSON parse error: {e}"}

    mutations = data.get("frameworkUpdates", {}).get("entityBatchUpdate", {}).get("mutations", [])
    
    raw_markers = []
    decoration_info = None

    for m in mutations:
        payload = m.get("payload", {})
        if "macroMarkersListEntity" in payload:
            m_entity = payload["macroMarkersListEntity"]
            markers_list = m_entity.get("markersList", {})
            if markers_list.get("markerType") == "MARKER_TYPE_HEATMAP":
                raw_markers = markers_list.get("markers", [])
                
        if "timedMarkerDecorations" in str(payload):
            markers_decoration = payload.get("macroMarkersListItemViewModel", {}).get("markersDecoration", {})
            if "timedMarkerDecorations" in markers_decoration:
                decorations = markers_decoration.get("timedMarkerDecorations", [])
                for dec in decorations:
                    label = dec.get("label", {}).get("runs", [{}])[0].get("text", "")
                    if label:
                        decoration_info = {
                            "label": label,
                            "time_seconds": dec.get("decorationTimeMillis", 0) / 1000.0,
                            "visible_start": dec.get("visibleTimeRangeStartMillis", 0) / 1000.0,
                            "visible_end": dec.get("visibleTimeRangeEndMillis", 0) / 1000.0
                        }

    if not raw_markers:
        return {
            "video_id": video_id,
            "has_heatmap": False,
            "message": "No heatmap available for this video."
        }

    parsed_markers = []
    for idx, item in enumerate(raw_markers):
        start_ms = float(item.get("startMillis", 0))
        duration_ms = float(item.get("durationMillis", 0))
        intensity = float(item.get("intensityScoreNormalized", 0.0))
        
        parsed_markers.append({
            "segment_index": idx,
            "start_seconds": round(start_ms / 1000.0, 2),
            "end_seconds": round((start_ms + duration_ms) / 1000.0, 2),
            "duration_seconds": round(duration_ms / 1000.0, 2),
            "intensity": round(intensity, 4)
        })

    return {
        "video_id": video_id,
        "has_heatmap": True,
        "total_segments": len(parsed_markers),
        "most_replayed_badge": decoration_info,
        "markers": parsed_markers
    }

def get_window_intensity_score(markers: List[Dict[str, Any]], start_sec: float, end_sec: float) -> float:
    """
    Computes an average normalized intensity score (0 to 100) for an arbitrary [start_sec, end_sec] window.
    """
    if not markers:
        return 50.0

    overlapping_intensities = []
    for m in markers:
        # Check for overlap: max(start1, start2) < min(end1, end2)
        if max(start_sec, m["start_seconds"]) < min(end_sec, m["end_seconds"]):
            overlapping_intensities.append(m["intensity"])

    if not overlapping_intensities:
        return 0.0

    avg_intensity = sum(overlapping_intensities) / len(overlapping_intensities)
    # Return as 0-100 score
    return round(avg_intensity * 100.0, 1)

def detect_heatmap_surges(markers: List[Dict[str, Any]], min_relative_surge: float = 0.08) -> List[Dict[str, Any]]:
    """
    Identifies dynamic surge regions using numerical derivative (rate of change in replay intensity).
    Returns list of detected surges with:
      - surge_start: Time where curve starts sharp upward climb (The Hook)
      - peak_time: Timestamp of maximum replay intensity (The Climax / Punchline)
      - peak_intensity: Maximum score reached
      - surge_end: Timestamp where intensity decays back to baseline
    """
    if not markers or len(markers) < 3:
        return []

    surges = []
    n = len(markers)
    
    # Calculate derivative (differences between consecutive segments)
    deltas = [0.0] * n
    for i in range(1, n):
        deltas[i] = markers[i]["intensity"] - markers[i-1]["intensity"]

    i = 1
    while i < n:
        # Check if an upward surge begins
        if deltas[i] >= min_relative_surge or (markers[i]["intensity"] >= 0.70 and deltas[i] >= 0.02):
            surge_start_idx = max(0, i - 1)
            surge_start_time = markers[surge_start_idx]["start_seconds"]
            
            # Trace upward climb to the peak
            peak_idx = i
            while peak_idx < n - 1 and markers[peak_idx + 1]["intensity"] >= markers[peak_idx]["intensity"]:
                peak_idx += 1
            
            peak_time = (markers[peak_idx]["start_seconds"] + markers[peak_idx]["end_seconds"]) / 2.0
            peak_val = markers[peak_idx]["intensity"]

            # Trace decay after peak
            end_idx = peak_idx
            while end_idx < n - 1 and markers[end_idx + 1]["intensity"] <= markers[end_idx]["intensity"] and markers[end_idx + 1]["intensity"] >= (peak_val * 0.75):
                end_idx += 1
            
            surge_end_time = markers[end_idx]["end_seconds"]

            surges.append({
                "surge_start": surge_start_time,
                "peak_time": round(peak_time, 2),
                "peak_intensity": round(peak_val, 4),
                "surge_end": surge_end_time,
                "peak_marker_idx": peak_idx
            })

            # Advance pointer past peak
            i = max(i + 1, end_idx)
        else:
            i += 1

    # Sort surges by peak intensity descending
    surges.sort(key=lambda x: x["peak_intensity"], reverse=True)
    return surges

def generate_clip_windows(
    markers: List[Dict[str, Any]],
    target_clip_duration: float = 45.0,
    min_intensity_threshold: float = 0.45,
    max_clips: int = 5
) -> List[Dict[str, Any]]:
    """
    Groups high-intensity segments into intelligent candidate windows for Shorts/Reels.
    Uses Heatmap Surge Derivative (Slope) to anchor the clip start near the hook (surge start)
    and ensure the climax (peak) is delivered within the first 60-80% of the clip.
    """
    if not markers:
        return []

    # Method 1: Detect curve surges (derivative rate-of-change)
    surges = detect_heatmap_surges(markers)
    clips = []
    used_ranges = []

    for surge in surges:
        surge_start = surge["surge_start"]
        peak_time = surge["peak_time"]
        peak_intensity = surge["peak_intensity"]

        if peak_intensity < min_intensity_threshold:
            continue

        # Check overlap with existing chosen windows
        overlap = any(u_start <= peak_time <= u_end for u_start, u_end in used_ranges)
        if overlap:
            continue

        # Smart Hook-to-Climax windowing:
        # A great Short hooks at surge_start, and reaches the climax roughly 15-30s into the clip
        # rather than dumbly placing the peak at dead center.
        ideal_lead_in = min(20.0, target_clip_duration * 0.40)
        
        # Start shortly before surge start so speaker's phrase isn't cut off
        candidate_start = max(0.0, min(surge_start - 3.0, peak_time - ideal_lead_in))
        candidate_end = candidate_start + target_clip_duration

        window_score = get_window_intensity_score(markers, candidate_start, candidate_end)

        clips.append({
            "start_seconds": round(candidate_start, 1),
            "end_seconds": round(candidate_end, 1),
            "duration": round(target_clip_duration, 1),
            "peak_second": round(peak_time, 1),
            "peak_intensity": peak_intensity,
            "window_score": window_score,
            "surge_hook_second": round(surge_start, 1)
        })
        used_ranges.append((candidate_start - 12.0, candidate_end + 12.0))

        if len(clips) >= max_clips:
            break

    # Fallback if no distinct sharp surges detected: use global top peaks
    if len(clips) < max_clips:
        sorted_markers = sorted(markers, key=lambda x: x["intensity"], reverse=True)
        for marker in sorted_markers:
            peak_time = (marker["start_seconds"] + marker["end_seconds"]) / 2.0
            overlap = any(u_start <= peak_time <= u_end for u_start, u_end in used_ranges)
            if overlap:
                continue

            candidate_start = max(0.0, peak_time - (target_clip_duration * 0.38))
            candidate_end = candidate_start + target_clip_duration
            window_score = get_window_intensity_score(markers, candidate_start, candidate_end)

            clips.append({
                "start_seconds": round(candidate_start, 1),
                "end_seconds": round(candidate_end, 1),
                "duration": round(target_clip_duration, 1),
                "peak_second": round(peak_time, 1),
                "peak_intensity": marker["intensity"],
                "window_score": window_score,
                "surge_hook_second": round(candidate_start, 1)
            })
            used_ranges.append((candidate_start - 10.0, candidate_end + 10.0))

            if len(clips) >= max_clips:
                break

    return sorted(clips, key=lambda x: x["start_seconds"])

def format_timestamp(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

if __name__ == "__main__":
    test_id = sys.argv[1] if len(sys.argv) > 1 else "UF8uR6Z6KLc"
    print(f"\n=======================================================")
    print(f"Analyzing Video Heatmap: {test_id}")
    print(f"=======================================================")
    
    result = extract_heatmap(test_id)
    if not result.get("has_heatmap"):
        print(f"[!] {result.get('message', result.get('error'))}")
    else:
        print(f"[+] Total Segments Analyzed: {result['total_segments']}")
        clips = generate_clip_windows(result["markers"], target_clip_duration=45.0, max_clips=4)
        
        print("\nSUGGESTED SHORTS/REELS CLIP WINDOWS (45s each):")
        print("-------------------------------------------------------")
        for idx, clip in enumerate(clips, 1):
            t_start = format_timestamp(clip['start_seconds'])
            t_end = format_timestamp(clip['end_seconds'])
            t_peak = format_timestamp(clip['peak_second'])
            bar = "#" * int((clip['window_score'] / 100.0) * 20)
            print(f"Clip #{idx}: {t_start} -> {t_end} (Peak at {t_peak})")
            print(f"         Engagement Score: {clip['window_score']:5.1f}% | {bar}\n")
