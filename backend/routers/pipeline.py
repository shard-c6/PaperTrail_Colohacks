"""
routers/pipeline.py
All 6 pipeline layer endpoints mapped to /pipeline/*.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from firebase_config import db
from middleware.auth import get_current_user
from services.preprocessing import preprocess_image
from services.storage import upload_image_bytes
from services.matching import match_template
from services.ocr import extract_fields
from models.schemas import (
    PreprocessResponse,
    MatchTemplateRequest, MatchTemplateResponse,
    ClassifyResponse,
    ExtractResponse, ExtractionSummary,
    SaveDraftRequest, SaveDraftResponse,
    SubmitRequest, SubmitResponse, SubmitResponseField,
)

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_session(session_id: str) -> dict:
    doc = db.collection("sessions").document(session_id).get()
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "session_not_found", "message": f"Session {session_id!r} not found."},
        )
    return doc.to_dict()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Layer 1: Preprocess ───────────────────────────────────────────────────────

@router.post("/preprocess", response_model=PreprocessResponse)
async def preprocess(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Accept a form image, apply OpenCV preprocessing, upload both orignal and
    cleaned images to Firebase Storage, create a session, return session_id.
    """
    allowed = {"image/jpeg", "image/png", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_file_type", "message": "Only JPG, PNG, or PDF accepted."},
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "file_too_large", "message": "Maximum file size is 10 MB."},
        )

    # Upload original
    original_url = upload_image_bytes(raw_bytes, prefix="originals")

    # Preprocess
    try:
        cleaned_bytes, skew_angle = preprocess_image(raw_bytes)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "preprocessing_failed", "message": str(e)},
        )

    # Upload cleaned
    cleaned_url = upload_image_bytes(cleaned_bytes, prefix="cleaned")

    # Create session
    session_id = uuid.uuid4().hex
    session_data = {
        "session_id": session_id,
        "clerk_uid": user["uid"],
        "original_image_url": original_url,
        "cleaned_image_url": cleaned_url,
        "skew_corrected_degrees": skew_angle,
        "status": "preprocessed",
        "created_at": _now(),
        "updated_at": _now(),
    }
    db.collection("sessions").document(session_id).set(session_data)

    return PreprocessResponse(
        session_id=session_id,
        original_image_url=original_url,
        cleaned_image_url=cleaned_url,
        skew_corrected_degrees=skew_angle,
    )


# ── Layer 2: Match Template ───────────────────────────────────────────────────

@router.post("/match-template", response_model=MatchTemplateResponse)
async def match_template_endpoint(
    body: MatchTemplateRequest,
    user: dict = Depends(get_current_user),
):
    session = _get_session(body.session_id)
    result = await match_template(session["cleaned_image_url"])

    # Update session
    db.collection("sessions").document(body.session_id).update({
        "template_id": result.get("template_id"),
        "match_confidence": result.get("confidence"),
        "status": "matched" if result["match_status"] == "matched" else "no_match",
        "updated_at": _now(),
    })

    return MatchTemplateResponse(
        session_id=body.session_id,
        **result,
    )


# ── Layer 3: Classify ─────────────────────────────────────────────────────────

@router.get("/classify/{session_id}", response_model=ClassifyResponse)
async def classify(session_id: str, user: dict = Depends(get_current_user)):
    session = _get_session(session_id)
    template_id = session.get("template_id")
    if not template_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "no_template", "message": "Template has not been matched yet."},
        )

    tmpl_doc = db.collection("templates").document(template_id).get()
    if not tmpl_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "template_not_found", "message": "Template record not found."},
        )
    tmpl = tmpl_doc.to_dict()

    # Update session with classification
    db.collection("sessions").document(session_id).update({
        "department": tmpl.get("department"),
        "status": "classified",
        "updated_at": _now(),
    })

    return ClassifyResponse(
        session_id=session_id,
        template_id=template_id,
        template_name=tmpl.get("name", ""),
        department=tmpl.get("department", ""),
        available_departments=tmpl.get("available_departments", [tmpl.get("department", "General")]),
        fields=tmpl.get("field_schema", []),
    )


# ── Layer 4: Extract ──────────────────────────────────────────────────────────

@router.post("/extract/{session_id}", response_model=ExtractResponse)
async def extract(session_id: str, user: dict = Depends(get_current_user)):
    session = _get_session(session_id)
    template_id = session.get("template_id")
    if not template_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "no_template", "message": "Run /match-template and /classify first."},
        )

    tmpl_doc = db.collection("templates").document(template_id).get()
    tmpl = tmpl_doc.to_dict()
    field_schemas = tmpl.get("field_schema", [])

    # Fetch cleaned image bytes from URL for OCR
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(session["cleaned_image_url"])
    image_bytes = resp.content

    extracted = extract_fields(image_bytes, field_schemas)

    # Persist extracted results into session
    db.collection("sessions").document(session_id).update({
        "ocr_results": extracted,
        "status": "extracted",
        "updated_at": _now(),
    })

    uncertain_count = sum(1 for f in extracted if f["uncertain"])
    empty_count = sum(1 for f in extracted if not f["value"])

    return ExtractResponse(
        session_id=session_id,
        fields=extracted,
        summary=ExtractionSummary(
            total_fields=len(extracted),
            uncertain_fields=uncertain_count,
            empty_fields=empty_count,
        ),
    )


# ── Layer 5: Save Draft ───────────────────────────────────────────────────────

@router.post("/save-draft/{session_id}", response_model=SaveDraftResponse)
async def save_draft(
    session_id: str,
    body: SaveDraftRequest,
    user: dict = Depends(get_current_user),
):
    _get_session(session_id)  # validates existence
    now = _now()
    db.collection("sessions").document(session_id).update({
        "draft_fields": [f.model_dump() for f in body.fields],
        "draft_saved_at": now,
        "updated_at": now,
    })
    return SaveDraftResponse(session_id=session_id, saved_at=now)


# ── Layer 6: Submit ───────────────────────────────────────────────────────────

@router.post("/submit/{session_id}", response_model=SubmitResponse)
async def submit(
    session_id: str,
    body: SubmitRequest,
    user: dict = Depends(get_current_user),
):
    session = _get_session(session_id)

    # Idempotent — return existing record on duplicate submit
    existing_record_id = session.get("record_id")
    if existing_record_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_submitted", "message": "This session has already been submitted.", "record_id": existing_record_id},
        )

    ocr_results = session.get("ocr_results", [])
    final_map = {f.field_name: f.final_value for f in body.fields}

    # Build response fields
    response_fields = []
    for ocr_f in ocr_results:
        fn = ocr_f["field_name"]
        final_val = final_map.get(fn, ocr_f.get("value"))
        was_corrected = final_val != ocr_f.get("value")
        response_fields.append(
            SubmitResponseField(
                field_name=fn,
                label=ocr_f.get("label", fn),
                extracted_value=ocr_f.get("value"),
                final_value=final_val,
                was_corrected=was_corrected,
            )
        )

    # Fetch template name + department
    tmpl_doc = db.collection("templates").document(session["template_id"]).get()
    tmpl = tmpl_doc.to_dict()
    dept = body.department_override or session.get("department", tmpl.get("department", ""))

    record_id = uuid.uuid4().hex[:12].upper()
    now = _now()

    record_data = {
        "record_id": record_id,
        "session_id": session_id,
        "clerk_uid": user["uid"],
        "clerk_name": user.get("name", ""),
        "template_id": session["template_id"],
        "template_name": tmpl.get("name", ""),
        "department": dept,
        "original_image_url": session.get("original_image_url"),
        "cleaned_image_url": session.get("cleaned_image_url"),
        "extracted_fields": [f.model_dump() for f in response_fields],
        "department_override": body.department_override,
        "submitted_at": now,
    }
    db.collection("records").document(record_id).set(record_data)

    # Audit log entry
    db.collection("audit_log").add({
        "record_id": record_id,
        "session_id": session_id,
        "clerk_uid": user["uid"],
        "action": "submit",
        "timestamp": now,
        "corrections": [f.model_dump() for f in response_fields if f.was_corrected],
    })

    # Mark session as submitted
    db.collection("sessions").document(session_id).update({
        "record_id": record_id,
        "status": "submitted",
        "updated_at": now,
    })

    return SubmitResponse(
        record_id=record_id,
        session_id=session_id,
        template_name=tmpl.get("name", ""),
        department=dept,
        submitted_at=now,
        extracted_fields=response_fields,
    )


# ── Record Retrieval ──────────────────────────────────────────────────────────

@router.get("/record/{record_id}")
async def get_record(record_id: str, user: dict = Depends(get_current_user)):
    doc = db.collection("records").document(record_id).get()
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "record_not_found", "message": f"Record {record_id!r} not found."},
        )
    data = doc.to_dict()

    # Clerks can only see their own records
    if user["role"] == "clerk" and data.get("clerk_uid") != user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": "You can only view your own records."},
        )

    return data
