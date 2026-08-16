import sqlite3
import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

DB_FILE = os.path.join(os.path.dirname(__file__), "database.db")
MAX_DAILY_CREDITS = 3


def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite tables for users, credits, and jobs."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT,
                credits_remaining INTEGER DEFAULT 3,
                last_reset_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                youtube_url TEXT,
                status TEXT,
                segment_duration INTEGER DEFAULT 45,
                clips_count INTEGER DEFAULT 0,
                clips_json TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        # Migration: Ensure clips_json column exists if DB was already created
        try:
            cursor.execute("ALTER TABLE jobs ADD COLUMN clips_json TEXT DEFAULT '[]'")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        conn.commit()


def get_today_str() -> str:
    """Return current UTC date in YYYY-MM-DD format for daily credit reset calculation."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_or_create_user(user_id: str, email: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve user and automatically reset daily credits to 3 if a new day has arrived."""
    init_db()
    today = get_today_str()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()

        if row is None:
            # Create new user with 3 credits
            cursor.execute(
                "INSERT INTO users (id, email, credits_remaining, last_reset_date) VALUES (?, ?, ?, ?)",
                (user_id, email or "guest@vakiogiri.ai", MAX_DAILY_CREDITS, today)
            )
            conn.commit()
            return {
                "id": user_id,
                "email": email or "guest@vakiogiri.ai",
                "credits_remaining": MAX_DAILY_CREDITS,
                "last_reset_date": today,
                "max_daily_credits": MAX_DAILY_CREDITS
            }
        else:
            user = dict(row)
            # Check if daily reset is needed
            if user["last_reset_date"] != today:
                cursor.execute(
                    "UPDATE users SET credits_remaining = ?, last_reset_date = ? WHERE id = ?",
                    (MAX_DAILY_CREDITS, today, user_id)
                )
                conn.commit()
                user["credits_remaining"] = MAX_DAILY_CREDITS
                user["last_reset_date"] = today

            user["max_daily_credits"] = MAX_DAILY_CREDITS
            return user


def deduct_credit(user_id: str) -> bool:
    """Atomically check and deduct 1 credit if available."""
    today = get_today_str()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Ensure user exists and has fresh daily reset
        user = get_or_create_user(user_id)
        
        if user["credits_remaining"] <= 0:
            return False

        cursor.execute(
            "UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0",
            (user_id,)
        )
        conn.commit()
        return cursor.rowcount > 0


def refund_credit(user_id: str):
    """Refund 1 credit in case job fails to complete."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET credits_remaining = MIN(credits_remaining + 1, ?) WHERE id = ?",
            (MAX_DAILY_CREDITS, user_id)
        )
        conn.commit()


def record_job(job_id: str, user_id: str, youtube_url: str, segment_duration: int):
    """Record initial job entry in database."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO jobs (id, user_id, youtube_url, status, segment_duration, clips_json) VALUES (?, ?, ?, 'processing', ?, '[]')",
            (job_id, user_id, youtube_url, segment_duration)
        )
        conn.commit()


def update_job_status(job_id: str, status: str, clips_count: int = 0, clips_data: Optional[List[Any]] = None):
    """Update job status, clips count, and JSON payload of generated clips."""
    clips_json_str = json.dumps(clips_data or [])
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE jobs SET status = ?, clips_count = ?, clips_json = ? WHERE id = ?",
            (status, clips_count, clips_json_str, job_id)
        )
        conn.commit()


def delete_user_job(job_id: str, user_id: str) -> bool:
    """Delete a job entry from database for a specific user."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM jobs WHERE id = ? AND user_id = ?", (job_id, user_id))
        conn.commit()
        return cursor.rowcount > 0


def get_user_history(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve all past jobs and video clips generated by a specific user."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, youtube_url, status, segment_duration, clips_count, clips_json, created_at FROM jobs WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            job_dict = dict(row)
            try:
                job_dict["clips"] = json.loads(job_dict.get("clips_json") or "[]")
            except Exception:
                job_dict["clips"] = []
            history.append(job_dict)
            
        return history
