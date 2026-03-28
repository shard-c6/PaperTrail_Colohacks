"""
seed/seed_templates.py
Seeds Phase 1 templates into Firestore.
Run once: python seed/seed_templates.py

Seeds: income_certificate_mh_v1
(birth_registration_mh_v1 and caste_certificate_mh_v1 can be added similarly)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_config import db
from datetime import datetime, timezone

INCOME_CERT_TEMPLATE = {
    "template_id": "income_certificate_mh_v1",
    "name": "Income Certificate",
    "department": "Revenue Department",
    "available_departments": [
        "Revenue Department",
        "Social Welfare",
        "Municipal Corporation",
        "General Administration",
    ],
    "field_schema": [
        {
            "field_name": "applicant_name",
            "label": "Applicant Name",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.18, "width": 0.55, "height": 0.05},
        },
        {
            "field_name": "father_name",
            "label": "Father / Husband Name",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.25, "width": 0.55, "height": 0.05},
        },
        {
            "field_name": "date_of_birth",
            "label": "Date of Birth",
            "data_type": "date",
            "bounding_box": {"x": 0.30, "y": 0.32, "width": 0.30, "height": 0.05},
        },
        {
            "field_name": "address",
            "label": "Residential Address",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.40, "width": 0.55, "height": 0.08},
        },
        {
            "field_name": "annual_income",
            "label": "Annual Income (₹)",
            "data_type": "number",
            "bounding_box": {"x": 0.30, "y": 0.52, "width": 0.35, "height": 0.05},
        },
        {
            "field_name": "taluka",
            "label": "Taluka",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.60, "width": 0.30, "height": 0.05},
        },
    ],
    "approved_by": "system",
    "created_at": datetime.now(timezone.utc).isoformat(),
}

BIRTH_REG_TEMPLATE = {
    "template_id": "birth_registration_mh_v1",
    "name": "Birth Registration",
    "department": "Municipal Corporation",
    "available_departments": ["Municipal Corporation", "Revenue Department"],
    "field_schema": [
        {
            "field_name": "child_name",
            "label": "Child's Name",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.18, "width": 0.55, "height": 0.05},
        },
        {
            "field_name": "date_of_birth",
            "label": "Date of Birth",
            "data_type": "date",
            "bounding_box": {"x": 0.30, "y": 0.26, "width": 0.30, "height": 0.05},
        },
        {
            "field_name": "gender",
            "label": "Gender",
            "data_type": "gender_enum",
            "bounding_box": {"x": 0.30, "y": 0.33, "width": 0.20, "height": 0.05},
        },
        {
            "field_name": "father_name",
            "label": "Father's Name",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.41, "width": 0.55, "height": 0.05},
        },
        {
            "field_name": "mother_name",
            "label": "Mother's Name",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.49, "width": 0.55, "height": 0.05},
        },
        {
            "field_name": "place_of_birth",
            "label": "Place of Birth (Hospital/Address)",
            "data_type": "text",
            "bounding_box": {"x": 0.30, "y": 0.57, "width": 0.55, "height": 0.07},
        },
    ],
    "approved_by": "system",
    "created_at": datetime.now(timezone.utc).isoformat(),
}


def seed():
    for tmpl in [INCOME_CERT_TEMPLATE, BIRTH_REG_TEMPLATE]:
        tid = tmpl["template_id"]
        existing = db.collection("templates").document(tid).get()
        if existing.exists:
            print(f"[SKIP] Template already exists: {tid}")
        else:
            db.collection("templates").document(tid).set(tmpl)
            print(f"[OK]   Seeded template: {tid}")
    print("Seeding complete.")


if __name__ == "__main__":
    seed()
