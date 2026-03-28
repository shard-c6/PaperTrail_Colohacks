"""
models/schemas.py
Pydantic v2 request/response models for all API endpoints.
"""

from __future__ import annotations
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field

# Accepted BCP-47 language tags
ACCEPTED_LANGUAGES = Literal["en-IN", "hi-IN", "mr-IN"]


# ────────────────────────────────────────────────────────────────────────────────
# Auth
# ────────────────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    preferred_language: Optional[ACCEPTED_LANGUAGES] = "en-IN"  # NEW


class UserResponse(BaseModel):
    uid: str
    name: str
    email: str
    role: str
    created_at: str
    # Voice preference fields (default-filled for backwards compat)
    preferred_language: str = "en-IN"
    voice_mode_enabled: bool = False
    voice_agent_enabled: bool = False


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


# ────────────────────────────────────────────────────────────────────────────────
# Voice — Feature 1: Language Preferences
# ────────────────────────────────────────────────────────────────────────────────

class VoicePreferencesUpdate(BaseModel):
    """All fields optional — only send what changed."""
    preferred_language: Optional[ACCEPTED_LANGUAGES] = None
    voice_mode_enabled: Optional[bool] = None
    voice_agent_enabled: Optional[bool] = None


class VoicePreferencesResponse(BaseModel):
    preferred_language: str
    voice_mode_enabled: bool
    voice_agent_enabled: bool


# ────────────────────────────────────────────────────────────────────────────────
# Voice — Feature 2: AI Voice Agent
# ────────────────────────────────────────────────────────────────────────────────

class VoiceAgentField(BaseModel):
    """Single extracted field sent by the frontend from /extract state."""
    field_id: str
    label: str
    value: Optional[str] = None
    confidence: float
    uncertain: bool
    bounding_box: Optional[dict] = None


class VoiceAgentRequest(BaseModel):
    session_id: str
    question: str = Field(..., max_length=300, description="Clerk's spoken question, transcribed by Web Speech API. Max 300 chars.")
    language: ACCEPTED_LANGUAGES
    extracted_fields: List[VoiceAgentField] = Field(..., min_length=1)


class VoiceAgentData(BaseModel):
    answer: str
    language: str
    field_referenced: Optional[str] = None  # field_id most relevant to the question, or null


class VoiceAgentResponse(BaseModel):
    success: bool = True
    data: VoiceAgentData
