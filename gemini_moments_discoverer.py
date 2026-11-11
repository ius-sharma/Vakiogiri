import os
import sys
import json
import re
from typing import List, Dict, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from dotenv import load_dotenv
load_dotenv(override=True)

from gaming_moments_engine import (
    discover_gaming_viral_moments,
    format_seconds_to_timestamp,
    get_gemini_client,
    probe_source_metadata
)


def probe_video_details(video_source: str) -> Dict[str, Any]:
    """Compatibility wrapper for probing video details."""
    return probe_source_metadata(video_source)


def discover_viral_moments_gemini(
    video_source: str,
    target_duration: int = 45,
    max_moments: int = 8,
    known_title: Optional[str] = None,
    known_duration: Optional[float] = None,
    start_sec: Optional[float] = None,
    end_sec: Optional[float] = None
) -> Dict[str, Any]:
    """
    Vakiogiri Gaming Multimodal Viral Discovery Engine 2.0:
    Replaces old heuristic/blind guessing with multimodal gaming signals:
    - In-game action/killfeed dynamics
    - Streamer facecam body language & reaction
    - Acoustic tension-to-climax transitions
    - Audience replay heatmaps & chat spikes
    - Dynamic gaming short duration (20s-60s) rather than forced rigid length.
    """
    return discover_gaming_viral_moments(
        video_source=video_source,
        target_duration=target_duration,
        max_moments=max_moments,
        known_title=known_title,
        known_duration=known_duration,
        start_sec=start_sec,
        end_sec=end_sec
    )
