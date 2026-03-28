"""
routers/templates.py
Template submission pipeline for clerks.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from firebase_config import db
from middleware.auth import get_current_user
from services.storage import upload_image_bytes
from models.schemas import TemplateSubmissionResponse, MySubmissionsResponse, MySubmission
import json

router = APIRouter(prefix="/templates", tags=["Template Pipeline"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/submit", response_model=TemplateSubmissionResponse)
async def submit_template(
    form_name: str = Form(...),
    department: str = Form(...),
    field_schema: str = Form(...),   # JSON string
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Called when clerk encounters no_match and chooses to submit a new template.
    Stores in templates_pending; not usable until admin approves.
    """
    try:
        schema = json.loads(field_schema)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail={"code": "invalid_schema", "message": "field_schema must be valid JSON."})

    raw_bytes = await file.read()
    image_url = upload_image_bytes(raw_bytes, prefix="template_submissions")

    pending_id = uuid.uuid4().hex
    now = _now()
    doc = {
        "template_pending_id": pending_id,
        "form_name": form_name,
        "department": department,
        "field_schema": schema,
        "template_image_url": image_url,
        "submitted_by_uid": user["uid"],
        "submitted_by_name": user.get("name", ""),
        "status": "pending",
        "submitted_at": now,
        "rejection_reason": None,
    }
    db.collection("templates_pending").document(pending_id).set(doc)

    return TemplateSubmissionResponse(
        template_pending_id=pending_id,
        status="pending",
        submitted_at=now,
    )


@router.get("/my-submissions", response_model=MySubmissionsResponse)
async def my_submissions(user: dict = Depends(get_current_user)):
    docs = (
        db.collection("templates_pending")
        .where("submitted_by_uid", "==", user["uid"])
        .stream()
    )
    submissions = [
        MySubmission(
            template_pending_id=d.to_dict()["template_pending_id"],
            form_name=d.to_dict()["form_name"],
            department=d.to_dict()["department"],
            status=d.to_dict()["status"],
            submitted_at=d.to_dict()["submitted_at"],
            rejection_reason=d.to_dict().get("rejection_reason"),
        )
        for d in docs
    ]
    return MySubmissionsResponse(submissions=submissions)
