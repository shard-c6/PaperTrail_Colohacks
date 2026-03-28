"""
services/storage.py
Firebase Storage upload helpers.
"""

import uuid
import os
from firebase_config import bucket


def upload_image_bytes(image_bytes: bytes, prefix: str = "uploads", content_type: str = "image/jpeg") -> str:
    """Upload raw bytes to Firebase Storage. Returns a signed public URL."""
    filename = f"{prefix}/{uuid.uuid4().hex}.jpg"
    blob = bucket.blob(filename)
    blob.upload_from_string(image_bytes, content_type=content_type)
    blob.make_public()
    return blob.public_url


def upload_image_file(path: str, prefix: str = "uploads") -> str:
    """Upload a local file to Firebase Storage. Returns a public URL."""
    filename = f"{prefix}/{uuid.uuid4().hex}.jpg"
    blob = bucket.blob(filename)
    blob.upload_from_filename(path)
    blob.make_public()
    return blob.public_url
