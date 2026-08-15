import sys
from pipeline import (
    run_pipeline,
    check_ffmpeg_installed,
    SEGMENT_DURATION
)

# ==============================================================================
# CONFIGURATION
# ==============================================================================
# Hardcoded YouTube video URL (Change this to any YouTube video URL you want to test)
YOUTUBE_URL = "https://youtu.be/_xZn02Q9yY8"

DOWNLOAD_DIR = "downloads"
CLIPS_DIR = "clips"


def main():
    print("==================================================")
    print("      AI Clip Generator - Pipeline Test Script    ")
    print("==================================================")
    
    try:
        check_ffmpeg_installed()
    except RuntimeError as e:
        print(f"[Error] {e}")
        sys.exit(1)
    
    if not YOUTUBE_URL:
        print("[Error] Please specify a valid YouTube URL in the YOUTUBE_URL variable at the top of clip_test.py.")
        sys.exit(1)

    try:
        clips = run_pipeline(YOUTUBE_URL, CLIPS_DIR, DOWNLOAD_DIR)
        print("==================================================")
        print(f"[4/4] All done! Created {len(clips)} clip(s) in '{CLIPS_DIR}/' folder.")
        print("==================================================")
    except Exception as e:
        print(f"[Error] Pipeline execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
