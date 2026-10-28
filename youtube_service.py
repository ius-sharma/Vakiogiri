import os
import time
import re
import urllib.parse
from typing import Dict, Any, List, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/youtube/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"


def parse_iso8601_duration(duration_str: str) -> int:
    """Convert YouTube ISO 8601 duration (e.g., 'PT1H2M34S') into total seconds."""
    if not duration_str:
        return 0
    pattern = re.compile(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")
    match = pattern.match(duration_str)
    if not match:
        return 0
    days, hours, minutes, seconds = [int(val or 0) for val in match.groups()]
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def format_seconds(seconds: int) -> str:
    """Format seconds into HH:MM:SS or MM:SS."""
    if seconds <= 0:
        return "0:00"
    hrs = seconds // 3600
    mins = (seconds % 3600) // 60
    secs = seconds % 60
    if hrs > 0:
        return f"{hrs}:{mins:02d}:{secs:02d}"
    return f"{mins}:{secs:02d}"


def get_client_credentials() -> Dict[str, str]:
    load_dotenv(override=True)
    return {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET),
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI),
        "frontend_url": os.getenv("FRONTEND_URL", FRONTEND_URL),
    }


def get_oauth_authorization_url(user_id: str) -> str:
    """Construct the official Google OAuth consent URL for YouTube read-only access."""
    creds = get_client_credentials()
    params = {
        "client_id": creds["client_id"],
        "redirect_uri": creds["redirect_uri"],
        "response_type": "code",
        "scope": YOUTUBE_READONLY_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": user_id,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchange authorization code for Google access token and refresh token."""
    creds = get_client_credentials()
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "redirect_uri": creds["redirect_uri"],
        "grant_type": "authorization_code",
    }
    res = requests.post(token_url, data=data, timeout=15)
    if not res.ok:
        raise Exception(f"Google token exchange failed: {res.text}")
    return res.json()


def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """Retrieve a new access token using a valid refresh token."""
    creds = get_client_credentials()
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    res = requests.post(token_url, data=data, timeout=15)
    if not res.ok:
        raise Exception(f"Google token refresh failed: {res.text}")
    return res.json()


def get_valid_access_token(user_id: str, channel_data: Dict[str, Any]) -> str:
    """Return a valid access token, automatically refreshing it if expired or near expiry."""
    from db import update_user_youtube_tokens

    access_token = channel_data.get("access_token", "")
    refresh_token = channel_data.get("refresh_token", "")
    token_expiry = channel_data.get("token_expiry", 0)

    # If token expires in less than 90 seconds, refresh it
    if time.time() > (token_expiry - 90) and refresh_token:
        try:
            refreshed = refresh_access_token(refresh_token)
            new_access_token = refreshed["access_token"]
            new_expiry = time.time() + refreshed.get("expires_in", 3600)
            update_user_youtube_tokens(user_id, new_access_token, new_expiry)
            return new_access_token
        except Exception as e:
            print(f"[YouTubeService] Token refresh error: {e}")

    return access_token


def fetch_user_channel_profile(access_token: str) -> Dict[str, Any]:
    """
    Fetch the authenticated user's OWN YouTube Channel using mine=true.
    Guarantees only the user's personal/managed channel is returned.
    """
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {
        "part": "snippet,contentDetails,statistics",
        "mine": "true",
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(url, params=params, headers=headers, timeout=15)
    if not res.ok:
        raise Exception(f"Failed to fetch YouTube channel profile: {res.text}")

    data = res.json()
    items = data.get("items", [])
    if not items:
        raise Exception("No YouTube channel found for this Google account. Please create a YouTube channel first.")

    item = items[0]
    snippet = item.get("snippet", {})
    statistics = item.get("statistics", {})
    content_details = item.get("contentDetails", {})
    related_playlists = content_details.get("relatedPlaylists", {})

    return {
        "channel_id": item.get("id"),
        "channel_title": snippet.get("title", "My YouTube Channel"),
        "channel_handle": snippet.get("customUrl", ""),
        "channel_thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url")
        or snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
        "subscriber_count": statistics.get("subscriberCount", "0"),
        "video_count": statistics.get("videoCount", "0"),
        "uploads_playlist_id": related_playlists.get("uploads", ""),
    }


def fetch_channel_videos(access_token: str, uploads_playlist_id: str, max_results: int = 50) -> List[Dict[str, Any]]:
    """
    Fetch ONLY regular Long-form videos from the user's channel uploads.
    Strictly filters out:
    1. YouTube Shorts (duration <= 75s or title containing #shorts).
    2. Live Streams (videos with liveStreamingDetails or active live broadcast).
    """
    if not uploads_playlist_id:
        return []

    # 1. Fetch playlist items (retrieve up to 50 items to ensure enough long videos after filtering)
    playlist_url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part": "snippet,contentDetails",
        "playlistId": uploads_playlist_id,
        "maxResults": 50,
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(playlist_url, params=params, headers=headers, timeout=15)
    if not res.ok:
        raise Exception(f"Failed to fetch channel uploads: {res.text}")

    playlist_data = res.json()
    items = playlist_data.get("items", [])
    if not items:
        return []

    video_ids = [item["contentDetails"]["videoId"] for item in items if "contentDetails" in item and "videoId" in item["contentDetails"]]
    if not video_ids:
        return []

    # 2. Fetch full video statistics, durations, and live streaming metadata
    videos_url = "https://www.googleapis.com/youtube/v3/videos"
    v_params = {
        "part": "snippet,contentDetails,statistics,liveStreamingDetails",
        "id": ",".join(video_ids),
    }
    v_res = requests.get(videos_url, params=v_params, headers=headers, timeout=15)
    if not v_res.ok:
        raise Exception(f"Failed to fetch video durations: {v_res.text}")

    videos_data = v_res.json()
    result_videos = []

    for v in videos_data.get("items", []):
        snippet = v.get("snippet", {})
        content = v.get("contentDetails", {})
        stats = v.get("statistics", {})

        # 1. FILTER: Exclude Live Streams (past broadcasts or current streams)
        if "liveStreamingDetails" in v or snippet.get("liveBroadcastContent") in ("live", "upcoming"):
            continue

        dur_seconds = parse_iso8601_duration(content.get("duration", ""))
        title_lower = snippet.get("title", "").lower()

        # 2. FILTER: Exclude YouTube Shorts (duration <= 75s or tagged with #shorts)
        if dur_seconds <= 75 or "#shorts" in title_lower or "#short" in title_lower:
            continue

        v_id = v.get("id")
        dur_formatted = format_seconds(dur_seconds)

        thumbs = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("standard", {}).get("url")
            or thumbs.get("high", {}).get("url")
            or thumbs.get("medium", {}).get("url")
            or thumbs.get("default", {}).get("url")
            or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
        )

        result_videos.append({
            "id": v_id,
            "title": snippet.get("title", "Untitled Video"),
            "url": f"https://www.youtube.com/watch?v={v_id}",
            "thumbnail": thumbnail_url,
            "duration": dur_seconds,
            "duration_formatted": dur_formatted,
            "uploader": snippet.get("channelTitle", ""),
            "view_count": int(stats.get("viewCount", 0)),
            "published_at": snippet.get("publishedAt", ""),
        })

    return result_videos


def fetch_channel_streams(access_token: str, uploads_playlist_id: str, channel_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch ONLY Live Streams and Stream VODs from the user's channel.
    Uses official YouTube search (eventType=completed) and playlistItems liveStreamingDetails check.
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    stream_ids = []

    # 1. Search for completed live events
    if channel_id:
        try:
            search_url = "https://www.googleapis.com/youtube/v3/search"
            s_params = {
                "part": "snippet",
                "channelId": channel_id,
                "type": "video",
                "eventType": "completed",
                "maxResults": 50,
            }
            s_res = requests.get(search_url, params=s_params, headers=headers, timeout=15)
            if s_res.ok:
                for item in s_res.json().get("items", []):
                    vid = item.get("id", {}).get("videoId")
                    if vid and vid not in stream_ids:
                        stream_ids.append(vid)
        except Exception as e:
            print(f"[YouTube Streams] Search error: {e}")

    # 2. Check uploads playlist for any videos that have liveStreamingDetails
    if uploads_playlist_id:
        try:
            playlist_url = "https://www.googleapis.com/youtube/v3/playlistItems"
            params = {
                "part": "contentDetails",
                "playlistId": uploads_playlist_id,
                "maxResults": 50,
            }
            res = requests.get(playlist_url, params=params, headers=headers, timeout=15)
            if res.ok:
                p_items = res.json().get("items", [])
                p_ids = [it["contentDetails"]["videoId"] for it in p_items if "contentDetails" in it and "videoId" in it["contentDetails"]]
                if p_ids:
                    v_url = "https://www.googleapis.com/youtube/v3/videos"
                    v_res = requests.get(v_url, params={"part": "snippet,contentDetails,liveStreamingDetails", "id": ",".join(p_ids[:50])}, headers=headers, timeout=15)
                    if v_res.ok:
                        for v in v_res.json().get("items", []):
                            if "liveStreamingDetails" in v or v.get("snippet", {}).get("liveBroadcastContent") in ("completed", "live"):
                                vid = v.get("id")
                                if vid and vid not in stream_ids:
                                    stream_ids.append(vid)
        except Exception as e:
            print(f"[YouTube Streams] Playlist inspection error: {e}")

    if not stream_ids:
        return []

    # Fetch full video details for identified streams
    videos_url = "https://www.googleapis.com/youtube/v3/videos"
    v_params = {
        "part": "snippet,contentDetails,statistics,liveStreamingDetails",
        "id": ",".join(stream_ids[:50]),
    }
    v_res = requests.get(videos_url, params=v_params, headers=headers, timeout=15)
    if not v_res.ok:
        return []

    result_streams = []
    for v in v_res.json().get("items", []):
        snippet = v.get("snippet", {})
        content = v.get("contentDetails", {})
        stats = v.get("statistics", {})

        dur_seconds = parse_iso8601_duration(content.get("duration", ""))
        v_id = v.get("id")
        dur_formatted = format_seconds(dur_seconds)

        thumbs = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("standard", {}).get("url")
            or thumbs.get("high", {}).get("url")
            or thumbs.get("medium", {}).get("url")
            or thumbs.get("default", {}).get("url")
            or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
        )

        result_streams.append({
            "id": v_id,
            "title": snippet.get("title", "Untitled Stream"),
            "url": f"https://www.youtube.com/watch?v={v_id}",
            "thumbnail": thumbnail_url,
            "duration": dur_seconds,
            "duration_formatted": dur_formatted,
            "uploader": snippet.get("channelTitle", ""),
            "view_count": int(stats.get("viewCount", 0)),
            "published_at": snippet.get("publishedAt", ""),
            "is_stream": True,
        })

    return result_streams
