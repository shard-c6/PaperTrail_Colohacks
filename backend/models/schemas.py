"""
models/schemas.py
Pydantic v2 request/response models for all API endpoints.
"""

from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, EmailStr


# ────────────────────────────────────────────────────────────────────────────────
# Auth
# ────────────────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr


class UserResponse(BaseModel):
    uid: str
    name: str
    email: str
    role: str
    created_at: str


# ────────────────────────────────────────────────────────────────────────────────
# Pipeline — Layer 1: Preprocessing
# ────────────────────────────────────────────────────────────────────────────────

class PreprocessResponse(BaseModel):
    session_id: str
    original_image_url: str
    cleaned_image_url: str
    skew_corrected_degrees: float


# ────────────────────────────────────────────────────────────────────────────────
# Pipeline — Layer 2: Template Matching
# ────────────────────────────────────────────────────────────────────────────────

class MatchTemplateRequest(BaseModel):
    session_id: str


class MatchTemplateResponse(BaseModel):
    session_id: str
    match_status: str          # "matched" | "no_match"
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    confidence: Optional[float] = None


# ────────────────────────────────────────────────────────────────────────────────
# Pipeline — Layer 3: Classification
# ────────────────────────────────────────────────────────────────────────────────

class FieldSchema(BaseModel):
    field_name: str
    label: str
    data_type: str             # text | date | number | aadhaar | pincode | gender_enum | boolean
    bounding_box: dict         # {x, y, width, height} — relative coords

class ClassifyResponse(BaseModel):
    session_id: str
    template_id: str
    template_name: str
    department: str
    available_departments: list[str]
    fields: list[FieldSchema]


# ────────────────────────────────────────────────────────────────────────────────
# Pipeline — Layer 4: OCR Extraction
# ────────────────────────────────────────────────────────────────────────────────

class ExtractedField(BaseModel):
    field_name: str
    label: str
    value: Optional[str]
    confidence: float
    uncertain: bool
    bounding_box: dict

class ExtractionSummary(BaseModel):
    total_fields: int
    uncertain_fields: int
    empty_fields: int

class ExtractResponse(BaseModel):
    session_id: str
    fields: list[ExtractedField]
    summary: ExtractionSummary


# ────────────────────────────────────────────────────────────────────────────────
# Pipeline — Layer 5: Save Draft
# ────────────────────────────────────────────────────────────────────────────────

class DraftField(BaseModel):
    field_name: str
    value: Optional[str]

class SaveDraftRequest(BaseModel):
    fields: list[DraftField]

class SaveDraftResponse(BaseModel):
    session_id: str
    saved_at: str


# ────────────────────────────────────────────────────────────────────────────────
# Pipeline — Layer 6: Submit
# ────────────────────────────────────────────────────────────────────────────────

class SubmitField(BaseModel):
    field_name: str
    final_value: Optional[str]

class SubmitRequest(BaseModel):
    fields: list[SubmitField]
    department_override: Optional[str] = None

class SubmitResponseField(BaseModel):
    field_name: str
    label: str
    extracted_value: Optional[str]
    final_value: Optional[str]
    was_corrected: bool

class SubmitResponse(BaseModel):
    record_id: str
    session_id: str
    template_name: str
    department: str
    submitted_at: str
    extracted_fields: list[SubmitResponseField]


# ────────────────────────────────────────────────────────────────────────────────
# Template Pipeline
# ────────────────────────────────────────────────────────────────────────────────

class TemplateSubmissionResponse(BaseModel):
    template_pending_id: str
    status: str
    submitted_at: str

class MySubmission(BaseModel):
    template_pending_id: str
    form_name: str
    department: str
    status: str
    submitted_at: str
    rejection_reason: Optional[str] = None

class MySubmissionsResponse(BaseModel):
    submissions: list[MySubmission]


# ────────────────────────────────────────────────────────────────────────────────
# Admin
# ────────────────────────────────────────────────────────────────────────────────

class RoleChangeRequest(BaseModel):
    role: str   # "clerk" | "admin"

class RecordSummary(BaseModel):
    record_id: str
    clerk_uid: str
    clerk_name: str
    template_name: str
    department: str
    submitted_at: str

class PaginatedRecordsResponse(BaseModel):
    records: list[RecordSummary]
    total: int
    page: int
    page_size: int

class LatestDocumentEntry(BaseModel):
    clerk_uid: str
    clerk_name: str
    record_id: Optional[str]
    submitted_at: Optional[str]
    template_name: Optional[str]

class LatestDocumentsResponse(BaseModel):
    entries: list[LatestDocumentEntry]
