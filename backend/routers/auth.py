"""
routers/auth.py
POST /auth/register  — create Firestore user doc after Firebase signup
GET  /auth/me        — return current user profile (including voice preferences)
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from firebase_config import db
from middleware.auth import get_current_user
from models.schemas import RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(body: RegisterRequest, user: dict = Depends(get_current_user)):
    """
    Called immediately after Firebase createUserWithEmailAndPassword.
    Creates the Firestore user doc. Role is always 'clerk' on self-registration.
    Now also stores preferred_language + voice feature defaults.
    """
    uid = user["uid"]
    now = datetime.now(timezone.utc).isoformat()

    # Idempotent: if doc already exists return it
    existing = db.collection("users").document(uid).get()
    if existing.exists:
        data = existing.to_dict()
        return UserResponse(**data)

    user_data = {
        "uid": uid,
        "name": body.name,
        "email": body.email,
        "role": "clerk",
        "created_at": now,
        # ── Voice preference fields (Feature 1) ───────────────────────────────
        "preferred_language": body.preferred_language or "en-IN",
        "voice_mode_enabled": False,
        "voice_agent_enabled": False,
    }
    db.collection("users").document(uid).set(user_data)
    return UserResponse(**user_data)


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    """
    Returns authenticated user's Firestore profile.
    Includes voice preference fields (preferred_language, voice_mode_enabled,
    voice_agent_enabled) so the frontend can initialise the voice layer
    with zero extra API calls.
    """
    doc = db.collection("users").document(user["uid"]).get()
    if not doc.exists:
        if user["uid"].startswith("test_"):
            # Dev token fallback — return defaults
            return UserResponse(
                uid=user["uid"],
                name=user.get("name", "Test User"),
                email=user.get("email", "test@papertrail.local"),
                role=user.get("role", "clerk"),
                created_at="2026-01-01T00:00:00+00:00",
                preferred_language="en-IN",
                voice_mode_enabled=False,
                voice_agent_enabled=False,
            )
        raise HTTPException(status_code=404, detail="User not found in database")

    data = doc.to_dict()
    # Back-fill voice fields for existing docs that predate the voice feature
    data.setdefault("preferred_language", "en-IN")
    data.setdefault("voice_mode_enabled", False)
    data.setdefault("voice_agent_enabled", False)
    return UserResponse(**data)
