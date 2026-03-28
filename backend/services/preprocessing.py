"""
services/preprocessing.py
Layer 1 — Image preprocessing pipeline.

Steps:
  1. Deskew   — detect rotation via Hough line transform (±15°)
  2. Denoise  — Gaussian blur + adaptive thresholding
  3. CLAHE    — contrast normalisation for uneven lighting
  4. Resize   — standardise to 300 DPI (2480×3508 for A4)
"""

import cv2
import numpy as np
from PIL import Image
import io


def _deskew(gray: np.ndarray) -> tuple[np.ndarray, float]:
    """Detect and correct rotation using Hough line transform."""
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100,
                             minLineLength=100, maxLineGap=10)
    if lines is None:
        return gray, 0.0

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 - x1 != 0:
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if -15 <= angle <= 15:
                angles.append(angle)

    if not angles:
        return gray, 0.0

    median_angle = float(np.median(angles))
    h, w = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), median_angle, 1.0)
    rotated = cv2.warpAffine(gray, M, (w, h),
                              flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    return rotated, round(median_angle, 2)


def _apply_clahe(gray: np.ndarray) -> np.ndarray:
    """Apply CLAHE for contrast normalisation."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def _denoise(gray: np.ndarray) -> np.ndarray:
    """Gaussian blur + adaptive thresholding."""
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    # Keep as grayscale (not binary) to preserve partial info for OCR
    denoised = cv2.fastNlMeansDenoising(blurred, h=10)
    return denoised


def preprocess_image(image_bytes: bytes) -> tuple[bytes, float]:
    """
    Full preprocessing pipeline.
    Returns (cleaned_image_bytes, skew_angle_degrees).
    """
    # Decode
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Ensure it is a valid JPG or PNG.")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step 1: Deskew
    deskewed, angle = _deskew(gray)

    # Step 2: CLAHE
    contrast = _apply_clahe(deskewed)

    # Step 3: Denoise
    clean = _denoise(contrast)

    # Step 4: Resize to ~300 DPI (2480 wide for A4)
    h, w = clean.shape[:2]
    target_width = 2480
    if w < target_width:
        scale = target_width / w
        new_w = target_width
        new_h = int(h * scale)
        clean = cv2.resize(clean, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # Encode back to JPEG
    _, buffer = cv2.imencode(".jpg", clean, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return buffer.tobytes(), angle
