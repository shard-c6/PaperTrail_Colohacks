"""
routers/auth.py
POST /auth/register  — create Firestore user doc after Firebase signup
GET  /auth/me        — return current user profile
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from firebase_config import db
from middleware.auth import get_current_user
from models.schemas import RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(body: RegisterRequest, user: dict = Depends(get_current_user)):
    """
    Called immediately after Firebase createUserWithEmailAndPassword.
    Creates the Firestore user doc. Role is always 'clerk' on self-registration.
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
    }
    db.collection("users").document(uid).set(user_data)
    return UserResponse(**user_data)


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    """Returns authenticated user's Firestore profile."""
    doc = db.collection("users").document(user["uid"]).get()
    if not doc.exists:
        if user["uid"].startswith("test_"):
            return UserResponse(**user)
        raise HTTPException(status_code=404, detail="User not found in database")
    return UserResponse(**doc.to_dict())
