"""
routers/voice.py
Feature 1  — PATCH /v1/users/me/preferences
Feature 2  — POST  /v1/voice/agent

No audio processing here. The browser handles STT/TTS via Web Speech API.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from firebase_config import db
from middleware.auth import get_current_user
from models.schemas import (
    VoiceAgentRequest,
    VoiceAgentData,
    VoiceAgentResponse,
    VoicePreferencesUpdate,
    VoicePreferencesResponse,
)
from services.voice_agent import ask_voice_agent

router = APIRouter(tags=["Voice"])

ACCEPTED_LANGUAGES = {"en-IN", "hi-IN", "mr-IN"}


# ─── Feature 1: PATCH /users/me/preferences ───────────────────────────────────

@router.patch("/users/me/preferences", response_model=dict)
async def update_preferences(
    body: VoicePreferencesUpdate,
    user: dict = Depends(get_current_user),
):
    """
    Update voice/language preferences for the current clerk.
    All fields are optional — send only what changed.
    Performs a partial Firestore update (does NOT overwrite other fields).
    """
    # Build only the fields that were actually sent
    updates: dict = {}
    if body.preferred_language is not None:
        updates["preferred_language"] = body.preferred_language
    if body.voice_mode_enabled is not None:
        updates["voice_mode_enabled"] = body.voice_mode_enabled
    if body.voice_agent_enabled is not None:
        updates["voice_agent_enabled"] = body.voice_agent_enabled

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "empty_body", "message": "Request body is empty — nothing to update."},
        )

    uid = user["uid"]

    # For test tokens, skip Firestore write and echo back the updates
    if uid.startswith("test_"):
        return {
            "success": True,
            "data": {
                "preferred_language": updates.get("preferred_language", "en-IN"),
                "voice_mode_enabled": updates.get("voice_mode_enabled", False),
                "voice_agent_enabled": updates.get("voice_agent_enabled", False),
            },
        }

    user_ref = db.collection("users").document(uid)
    if not user_ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "user_not_found", "message": "User record not found."},
        )

    user_ref.update(updates)

    # Read back the full prefs to return
    updated_doc = user_ref.get().to_dict()
    return {
        "success": True,
        "data": {
            "preferred_language": updated_doc.get("preferred_language", "en-IN"),
            "voice_mode_enabled": updated_doc.get("voice_mode_enabled", False),
            "voice_agent_enabled": updated_doc.get("voice_agent_enabled", False),
        },
    }


# ─── Feature 2: POST /voice/agent ─────────────────────────────────────────────

@router.post("/voice/agent", response_model=VoiceAgentResponse)
async def voice_agent(
    body: VoiceAgentRequest,
    user: dict = Depends(get_current_user),
):
    """
    AI voice agent endpoint.
    Frontend sends the clerk's transcribed question + extracted_fields from state.
    Claude Sonnet answers in the clerk's language in 1-2 sentences.
    Returns answer text + field_referenced (for frontend bounding-box flash).
    """
    uid = user["uid"]

    # ── Guard 1: voice_agent_enabled must be true ────────────────────────────
    if not uid.startswith("test_"):
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "user_not_found", "message": "User record not found."},
            )
        user_data = user_doc.to_dict()
        if not user_data.get("voice_agent_enabled", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "voice_agent_disabled",
                    "message": "Voice agent is not enabled for your account. Enable it in Settings.",
                },
            )

        # ── Guard 2: session_id must exist and not be submitted ──────────────
        session_doc = db.collection("sessions").document(body.session_id).get()
        if not session_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "session_not_found", "message": "Session not found or expired."},
            )
        session_data = session_doc.to_dict()
        if session_data.get("status") == "submitted":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "session_submitted",
                    "message": "This form has already been submitted. Voice agent is unavailable.",
                },
            )

        template_name = session_data.get("template_name", "government form")
    else:
        # Dev token path — skip Firestore guards
        template_name = "test_form"

    # ── Call Claude ──────────────────────────────────────────────────────────
    fields_for_claude = [f.model_dump() for f in body.extracted_fields]

    try:
        result = await ask_voice_agent(
            question=body.question,
            language=body.language,
            extracted_fields=fields_for_claude,
            template_name=template_name,
        )
    except RuntimeError as exc:
        error_msg = str(exc)
        if "unreachable" in error_msg.lower() or "unavailable" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": "voice_agent_unavailable",
                    "message": "Voice agent is temporarily unavailable. Please try again shortly.",
                },
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "voice_agent_error", "message": error_msg},
        )

    return VoiceAgentResponse(
        data=VoiceAgentData(
            answer=result["answer"],
            language=body.language,
            field_referenced=result.get("field_referenced"),
        )
    )
