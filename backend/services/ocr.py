"""
services/ocr.py
Layer 4 — OCR Extraction.

Primary:  Google Cloud Vision API  (GOOGLE_VISION_ENABLED=true)
Fallback: Tesseract                (GOOGLE_VISION_ENABLED=false)

For each field in the template schema, crops the cleaned image to the
field's bounding box and runs OCR on the crop independently.
Returns a list of ExtractedField-compatible dicts.
"""

import os
import io
import re
import numpy as np
import cv2

GOOGLE_VISION_ENABLED = os.getenv("GOOGLE_VISION_ENABLED", "true").lower() == "true"
UNCERTAINTY_THRESHOLD = float(os.getenv("OCR_UNCERTAINTY_THRESHOLD", "0.75"))


# ── Google Cloud Vision ───────────────────────────────────────────────────────

def _vision_ocr_crop(image_bytes: bytes, bbox: dict) -> tuple[str, float]:
    """
    Crops to bbox region and calls Google Vision document_text_detection.
    bbox = {x, y, width, height} in relative coords [0.0–1.0].
    Returns (text, confidence).
    """
    from google.cloud import vision

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    h, w = img.shape[:2]

    x1 = int(bbox["x"] * w)
    y1 = int(bbox["y"] * h)
    x2 = int((bbox["x"] + bbox["width"]) * w)
    y2 = int((bbox["y"] + bbox["height"]) * h)

    # Clamp to image bounds
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return "", 0.0

    _, buf = cv2.imencode(".jpg", crop)
    content = buf.tobytes()

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=content)
    response = client.document_text_detection(image=image)

    if response.error.message:
        return "", 0.0

    full_text = response.full_text_annotation.text.strip()
    # Derive confidence from word-level confidences
    words = [
        w
        for page in response.full_text_annotation.pages
        for block in page.blocks
        for para in block.paragraphs
        for w in para.words
    ]
    if not words:
        return full_text, 0.0 if not full_text else 0.6

    avg_conf = sum(w.confidence for w in words) / len(words)
    return full_text, round(avg_conf, 4)


# ── Tesseract fallback ────────────────────────────────────────────────────────

def _tesseract_ocr_crop(image_bytes: bytes, bbox: dict) -> tuple[str, float]:
    """Crop + OCR with Tesseract. Returns (text, confidence)."""
    import pytesseract
    from PIL import Image as PILImage

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    h, w = img.shape[:2]

    x1 = int(bbox["x"] * w)
    y1 = int(bbox["y"] * h)
    x2 = int((bbox["x"] + bbox["width"]) * w)
    y2 = int((bbox["y"] + bbox["height"]) * h)
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return "", 0.0

    pil_img = PILImage.fromarray(crop)
    data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT, lang="eng")

    texts, confs = [], []
    for i, conf in enumerate(data["conf"]):
        if int(conf) > 0:
            texts.append(data["text"][i])
            confs.append(int(conf) / 100.0)

    text = " ".join(t for t in texts if t.strip())
    confidence = round(sum(confs) / len(confs), 4) if confs else 0.0
    return text.strip(), confidence


# ── Public API ────────────────────────────────────────────────────────────────

def extract_fields(image_bytes: bytes, field_schemas: list[dict]) -> list[dict]:
    """
    For each field in field_schemas, runs OCR on the bounding box region.
    Returns a list of dicts compatible with ExtractedField schema.
    """
    results = []
    for field in field_schemas:
        bbox = field.get("bounding_box", {})
        try:
            if GOOGLE_VISION_ENABLED:
                value, confidence = _vision_ocr_crop(image_bytes, bbox)
            else:
                value, confidence = _tesseract_ocr_crop(image_bytes, bbox)
        except Exception:
            value, confidence = None, 0.0

        results.append(
            {
                "field_name": field["field_name"],
                "label": field.get("label", field["field_name"]),
                "value": value if value else None,
                "confidence": confidence,
                "uncertain": confidence < UNCERTAINTY_THRESHOLD,
                "bounding_box": bbox,
            }
        )
    return results
