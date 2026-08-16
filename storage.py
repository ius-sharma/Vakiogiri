import os
import requests
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY", "")
BUCKET_NAME = os.getenv("SUPABASE_STORAGE_BUCKET", "clips")


def is_storage_configured() -> bool:
    """Check if Supabase storage URL and Key are configured in environment."""
    return bool(SUPABASE_URL and SUPABASE_KEY and not "placeholder" in SUPABASE_URL)


def upload_file_to_supabase(
    local_path: str,
    destination_path: str,
    content_type: str = "video/mp4"
) -> Optional[str]:
    """
    Upload a file to Supabase Public Storage bucket.
    Returns the public CDN URL if successful, or None if failed / unconfigured.
    """
    if not is_storage_configured():
        return None

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{destination_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": content_type,
        "x-upsert": "true"
    }

    try:
        with open(local_path, "rb") as f:
            file_data = f.read()

        response = requests.post(upload_url, headers=headers, data=file_data, timeout=60)
        
        if response.status_code in [200, 201]:
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{destination_path}"
            print(f"[Supabase Storage] Successfully uploaded {destination_path} -> {public_url}")
            return public_url
        else:
            print(f"[Supabase Storage Warning] Upload failed ({response.status_code}): {response.text}")
            return None

    except Exception as e:
        print(f"[Supabase Storage Error] Could not upload file: {e}")
        return None


def delete_job_files_from_supabase(job_id: str, filenames: Optional[List[str]] = None) -> bool:
    """Delete all files belonging to a job from Supabase Storage bucket."""
    if not is_storage_configured():
        return True

    delete_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    try:
        if filenames:
            prefixes = [f"{job_id}/{fn}" for fn in filenames]
        else:
            prefixes = [f"{job_id}/clip_1.mp4", f"{job_id}/clip_2.mp4", f"{job_id}/clip_3.mp4", f"{job_id}/clip_4.mp4", f"{job_id}/clip_5.mp4"]

        body = {"prefixes": prefixes}
        response = requests.delete(delete_url, headers=headers, json=body, timeout=30)
        print(f"[Supabase Storage] Deleted files for job {job_id}: {response.status_code}")
        return response.status_code in [200, 204]
    except Exception as e:
        print(f"[Supabase Storage Error] Could not delete files: {e}")
        return False


def upload_clips_and_cleanup(
    job_id: str,
    clips_dir: str,
    clip_filenames: List[str],
    progress_callback: Optional[Any] = None
) -> List[Dict[str, str]]:
    """
    Upload all generated clips to Supabase Storage, and return clip metadata.
    If storage is configured, immediately purges local clip files after upload.
    """
    clip_results = []
    storage_active = is_storage_configured()

    for idx, filename in enumerate(clip_filenames):
        local_clip_path = os.path.join(clips_dir, filename)
        if not os.path.exists(local_clip_path):
            continue

        if progress_callback:
            percent = int(90 + ((idx + 1) / len(clip_filenames)) * 8)
            progress_callback("uploading", percent, f"Uploading clip {idx + 1}/{len(clip_filenames)} to Cloud CDN...")

        destination_path = f"{job_id}/{filename}"
        public_url = upload_file_to_supabase(local_clip_path, destination_path)

        if public_url:
            clip_results.append({
                "filename": filename,
                "url": public_url,
                "is_cloud": True
            })
        else:
            # Fallback to local server route
            clip_results.append({
                "filename": filename,
                "url": f"/clips/{job_id}/{filename}",
                "is_cloud": False
            })

    # If all clips uploaded to cloud storage, we can safely delete local clip directory to save disk space
    if storage_active and all(c.get("is_cloud") for c in clip_results):
        try:
            import shutil
            shutil.rmtree(clips_dir)
            print(f"[Zero-Disk-Waste] Deleted local clips folder for job {job_id} after cloud upload.")
        except Exception as err:
            print(f"[Cleanup Notice] Could not remove local clips folder: {err}")

    return clip_results
