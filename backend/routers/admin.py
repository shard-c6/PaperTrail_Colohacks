"""
routers/admin.py
Admin-only endpoints for user management, records oversight, template approval.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from firebase_config import db
from middleware.auth import require_admin
from models.schemas import (
    RoleChangeRequest,
    PaginatedRecordsResponse, RecordSummary,
    LatestDocumentsResponse, LatestDocumentEntry,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── 5.1 User Management ───────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    role: str = Query(None, description="Filter by role: clerk or admin"),
    admin: dict = Depends(require_admin),
):
    query = db.collection("users")
    if role:
        query = query.where("role", "==", role)
    docs = query.stream()
    return {"users": [d.to_dict() for d in docs]}


@router.patch("/users/{uid}/role")
async def change_role(
    uid: str,
    body: RoleChangeRequest,
    admin: dict = Depends(require_admin),
):
    if body.role not in ("clerk", "admin"):
        raise HTTPException(status_code=422, detail={"code": "invalid_role", "message": "Role must be 'clerk' or 'admin'."})
    if uid == admin["uid"]:
        raise HTTPException(status_code=400, detail={"code": "self_role_change", "message": "Admins cannot change their own role."})

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail={"code": "user_not_found", "message": "User not found."})

    db.collection("users").document(uid).update({"role": body.role})
    return {"uid": uid, "new_role": body.role, "updated_at": _now()}


# ── 5.2 Document Oversight ────────────────────────────────────────────────────

@router.get("/documents/latest", response_model=LatestDocumentsResponse)
async def latest_documents(admin: dict = Depends(require_admin)):
    """Latest submission record per clerk."""
    users_docs = db.collection("users").where("role", "==", "clerk").stream()
    entries = []
    for uDoc in users_docs:
        u = uDoc.to_dict()
        records = (
            db.collection("records")
            .where("clerk_uid", "==", u["uid"])
            .order_by("submitted_at", direction="DESCENDING")
            .limit(1)
            .stream()
        )
        latest = next(records, None)
        if latest:
            r = latest.to_dict()
            entries.append(LatestDocumentEntry(
                clerk_uid=u["uid"],
                clerk_name=u.get("name", ""),
                record_id=r.get("record_id"),
                submitted_at=r.get("submitted_at"),
                template_name=r.get("template_name"),
            ))
        else:
            entries.append(LatestDocumentEntry(
                clerk_uid=u["uid"],
                clerk_name=u.get("name", ""),
                record_id=None,
                submitted_at=None,
                template_name=None,
            ))
    return LatestDocumentsResponse(entries=entries)


@router.get("/records", response_model=PaginatedRecordsResponse)
async def list_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    clerk_uid: str = Query(None),
    department: str = Query(None),
    admin: dict = Depends(require_admin),
):
    query = db.collection("records").order_by("submitted_at", direction="DESCENDING")
    if clerk_uid:
        query = query.where("clerk_uid", "==", clerk_uid)
    if department:
        query = query.where("department", "==", department)

    all_docs = list(query.stream())
    total = len(all_docs)
    start = (page - 1) * page_size
    page_docs = all_docs[start: start + page_size]

    summaries = [
        RecordSummary(
            record_id=d.to_dict()["record_id"],
            clerk_uid=d.to_dict()["clerk_uid"],
            clerk_name=d.to_dict().get("clerk_name", ""),
            template_name=d.to_dict().get("template_name", ""),
            department=d.to_dict().get("department", ""),
            submitted_at=d.to_dict()["submitted_at"],
        )
        for d in page_docs
    ]
    return PaginatedRecordsResponse(records=summaries, total=total, page=page, page_size=page_size)


# ── 5.3 Template Approval ─────────────────────────────────────────────────────

@router.get("/templates/pending")
async def pending_templates(admin: dict = Depends(require_admin)):
    docs = db.collection("templates_pending").where("status", "==", "pending").stream()
    return {"pending_templates": [d.to_dict() for d in docs]}


@router.post("/templates/{template_pending_id}/approve")
async def approve_template(
    template_pending_id: str,
    admin: dict = Depends(require_admin),
):
    doc = db.collection("templates_pending").document(template_pending_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Template submission not found."})

    data = doc.to_dict()
    import uuid
    new_id = uuid.uuid4().hex
    now = _now()

    # Move to approved templates
    db.collection("templates").document(new_id).set({
        "template_id": new_id,
        "name": data["form_name"],
        "department": data["department"],
        "field_schema": data["field_schema"],
        "template_image_url": data["template_image_url"],
        "approved_by": admin["uid"],
        "created_at": now,
        "available_departments": [data["department"]],
    })

    # Update pending doc
    db.collection("templates_pending").document(template_pending_id).update({
        "status": "approved",
        "approved_template_id": new_id,
        "reviewed_at": now,
    })

    return {"template_id": new_id, "status": "approved", "approved_at": now}


@router.post("/templates/{template_pending_id}/reject")
async def reject_template(
    template_pending_id: str,
    body: dict,
    admin: dict = Depends(require_admin),
):
    doc = db.collection("templates_pending").document(template_pending_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Template submission not found."})

    rejection_reason = body.get("rejection_reason", "")
    db.collection("templates_pending").document(template_pending_id).update({
        "status": "rejected",
        "rejection_reason": rejection_reason,
        "reviewed_at": _now(),
    })
    return {"template_pending_id": template_pending_id, "status": "rejected"}
