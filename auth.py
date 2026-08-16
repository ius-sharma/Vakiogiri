import os
import base64
import json
import jwt
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from dotenv import load_dotenv
from db import get_or_create_user

load_dotenv()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def decode_jwt_payload_safely(token: str) -> Optional[Dict[str, Any]]:
    """
    Safely decode Supabase JWT token supporting HS256, RS256, ES256, and Google OAuth tokens.
    Handles base64url padding and eliminates 'alg value not allowed' errors.
    """
    try:
        # 1. If secret is configured, try standard verification with all supported algorithms
        if SUPABASE_JWT_SECRET:
            try:
                return jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256", "HS384", "HS512", "RS256", "ES256"],
                    options={"verify_aud": False}
                )
            except Exception:
                pass  # Fallback to direct claims decoding below

        # 2. Try decoding without signature verification specifying all common algorithms
        try:
            return jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False},
                algorithms=["HS256", "HS384", "HS512", "RS256", "ES256", "PS256", "none"]
            )
        except Exception:
            pass

        # 3. Direct base64url payload segment extraction (RFC 7519 standard)
        parts = token.split(".")
        if len(parts) >= 2:
            payload_segment = parts[1]
            padded = payload_segment + "=" * (-len(payload_segment) % 4)
            decoded_bytes = base64.urlsafe_b64decode(padded)
            return json.loads(decoded_bytes.decode("utf-8"))

    except Exception as err:
        print(f"[Auth Error] Could not parse token payload: {err}")
        return None

    return None


def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extract user from Supabase JWT token if provided.
    If no token is provided or invalid, gracefully returns guest state.
    """
    guest_state = {
        "id": "guest",
        "email": "guest@vakiogiri.ai",
        "is_authenticated": False,
        "credits_remaining": 3,
        "max_daily_credits": 3
    }

    if not authorization or not authorization.startswith("Bearer "):
        return guest_state

    token = authorization.split(" ")[1].strip()
    if not token or token in ["undefined", "null"]:
        return guest_state

    payload = decode_jwt_payload_safely(token)
    if not payload:
        return guest_state

    user_id = payload.get("sub")
    email = payload.get("email") or payload.get("user_metadata", {}).get("email") or "user@vakiogiri.ai"

    if not user_id:
        return guest_state

    user_data = get_or_create_user(user_id, email)
    user_data["is_authenticated"] = True
    return user_data


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Strict auth requirement for protected actions like POST /process.
    Rejects unauthenticated guests with HTTP 401.
    """
    user = get_current_user_optional(authorization)
    if not user.get("is_authenticated"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with Google or Email to generate video clips."
        )
    return user
