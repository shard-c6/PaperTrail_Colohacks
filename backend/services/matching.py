"""
services/matching.py
Layer 2 — Template Matching (MOCKED for Phase 1 demo).

In production this would:
  - Generate a CLIP/ResNet-50 embedding of the cleaned image
  - Compute cosine similarity against all template embeddings in Firestore
  - Return best match if score > threshold (0.80)

For the 24-hour demo build, we always return the pre-seeded
income_certificate_mh_v1 template as a hardcoded match.
"""

import os
from firebase_config import db

MATCH_CONFIDENCE_THRESHOLD = float(os.getenv("MATCH_CONFIDENCE_THRESHOLD", "0.80"))

# The single seeded template ID used for all demo matches
DEMO_TEMPLATE_ID = "income_certificate_mh_v1"


def match_template(cleaned_image_url: str) -> dict:
    """
    Returns a match result dict.
    match_status: "matched" | "no_match"
    """
    # ── MOCK: always return the demo template ─────────────────────────────────
    template_doc = db.collection("templates").document(DEMO_TEMPLATE_ID).get()

    if not template_doc.exists:
        # Template not seeded yet — inform caller
        return {
            "match_status": "no_match",
            "template_id": None,
            "template_name": None,
            "confidence": 0.0,
        }

    tmpl = template_doc.to_dict()
    return {
        "match_status": "matched",
        "template_id": DEMO_TEMPLATE_ID,
        "template_name": tmpl.get("name", "Income Certificate"),
        "confidence": 0.95,  # mocked high confidence
    }
