import re
import json
import requests
import sys

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

def extract_heatmap(video_id_or_url: str):
    """
    Extracts YouTube 'Most Replayed' heatmap data.
    """
    video_id = extract_video_id(video_id_or_url)
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    html = resp.text

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

def generate_clip_windows(markers, target_clip_duration=45.0, min_intensity_threshold=0.6, max_clips=3):
    """
    Groups high-intensity segments into continuous 30-60s clip candidates for Shorts/Reels.
    """
    if not markers:
        return []

    # Find peaks above threshold or top percentiles
    intensities = [m["intensity"] for m in markers]
    avg_intensity = sum(intensities) / len(intensities)
    threshold = max(min_intensity_threshold, avg_intensity * 1.5)

    # Sort segments by intensity to find anchor peaks
    sorted_markers = sorted(markers, key=lambda x: x["intensity"], reverse=True)
    
    clips = []
    used_ranges = []

    for marker in sorted_markers:
        peak_time = (marker["start_seconds"] + marker["end_seconds"]) / 2.0
        
        # Check if already covered by another clip
        overlap = False
        for start, end in used_ranges:
            if start <= peak_time <= end:
                overlap = True
                break
        if overlap:
            continue

        # Build a window centered around the peak
        half_window = target_clip_duration / 2.0
        clip_start = max(0.0, peak_time - half_window)
        clip_end = clip_start + target_clip_duration

        # Calculate average intensity in this window
        window_intensities = [
            m["intensity"] for m in markers 
            if (m["start_seconds"] >= clip_start and m["end_seconds"] <= clip_end)
        ]
        score = sum(window_intensities) / len(window_intensities) if window_intensities else marker["intensity"]

        clips.append({
            "start_seconds": round(clip_start, 1),
            "end_seconds": round(clip_end, 1),
            "duration": round(target_clip_duration, 1),
            "peak_second": round(peak_time, 1),
            "peak_intensity": marker["intensity"],
            "window_score": round(score, 3)
        })
        used_ranges.append((clip_start - 10, clip_end + 10))

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
        
        # Suggested Shorts/Reels Cliping Windows
        clips = generate_clip_windows(result["markers"], target_clip_duration=45.0, max_clips=4)
        
        print("\nSUGGESTED SHORTS/REELS CLIP WINDOWS (45s each):")
        print("-------------------------------------------------------")
        for idx, clip in enumerate(clips, 1):
            t_start = format_timestamp(clip['start_seconds'])
            t_end = format_timestamp(clip['end_seconds'])
            t_peak = format_timestamp(clip['peak_second'])
            bar = "#" * int(clip['window_score'] * 20)
            print(f"Clip #{idx}: {t_start} -> {t_end} (Peak at {t_peak})")
            print(f"         Engagement Score: {clip['window_score']*100:5.1f}% | {bar}\n")
