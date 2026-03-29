import os
import cv2
import httpx
import numpy as np
import pytesseract
from sklearn.metrics.pairwise import cosine_similarity
from firebase_config import db

MATCH_CONFIDENCE_THRESHOLD = float(os.getenv("MATCH_CONFIDENCE_THRESHOLD", "0.80"))
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:1.5b")
HOGS_DIR = os.path.join(os.path.dirname(__file__), "..", "seed", "hogs")


def compute_hog_feature(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Invalid image for HOG")
    
    # Resize to standard size (e.g. 800x800) for consistent features across differently sized inputs
    img = cv2.resize(img, (800, 800))
    
    hog = cv2.HOGDescriptor(
        _winSize=(64, 64),
        _blockSize=(16, 16),
        _blockStride=(8, 8),
        _cellSize=(8, 8),
        _nbins=9
    )
    return hog.compute(img).flatten()


def load_template_hogs() -> dict:
    template_hogs = {}
    if not os.path.exists(HOGS_DIR):
        return template_hogs
    for f in os.listdir(HOGS_DIR):
        if f.endswith(".npy"):
            tid = f.replace(".npy", "")
            template_hogs[tid] = np.load(os.path.join(HOGS_DIR, f))
    return template_hogs


def extract_top_text(image_bytes: bytes) -> str:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return ""
    h, w = img.shape[:2]
    crop = img[0:int(h * 0.3), 0:w]  # Top 30% of the document
    return pytesseract.image_to_string(crop).strip()


async def ollama_fallback_classification(text: str) -> tuple[str, float]:
    # Fetch existing template IDs from Firestore dynamically
    try:
        templates = [doc.id for doc in db.collection("templates").stream()]
    except Exception:
        templates = []
        
    if not templates:
        return "no_match", 0.0

    prompt = f"""You are a document classifier.
Determine which form template this text belongs to.
Possible templates: {', '.join(templates)}

Extracted Text:
\"\"\"
{text[:1000]}
\"\"\"

Reply ONLY with the exact template ID it matches from the list above, or "no_match" if uncertain. DO NOT EXPLAIN."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(OLLAMA_URL, json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            }, timeout=20.0)
            
            data = response.json()
            resp_text = data.get("response", "").strip()
            
            for t in templates:
                # Check if deepseek mentioned the exact template_id
                if t in resp_text:
                    return t, 0.75  # LLM automatically implies borderline confidence passing score
            return "no_match", 0.0
    except Exception as e:
        print(f"Ollama classification failed: {e}")
        return "no_match", 0.0


async def match_template(cleaned_image_url: str) -> dict:
    """
    1. Synchronously downloads image from cleaned_image_url.
    2. Stage 1: Computes HOG and compares with known templates via Cosine Sim.
    3. If max >= THRESHOLD, return matched template.
    4. Else, run Stage 2: Ollama LLM fallback asynchronously on the top 30% OCR.
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(cleaned_image_url, timeout=10.0)
            resp.raise_for_status()
            image_bytes = resp.content
    except Exception as e:
        print(f"Failed to fetch image: {e}")
        return {"match_status": "no_match", "template_id": None, "template_name": None, "confidence": 0.0}

    # Stage 1: Visio-ML Matching (HOG + Cosine Similarity)
    try:
        incoming_feature = compute_hog_feature(image_bytes)
        template_hogs = load_template_hogs()
        
        best_match = None
        best_score = 0.0
        
        if template_hogs:
            for tid, t_feat in template_hogs.items():
                if len(incoming_feature) == len(t_feat):
                    score = cosine_similarity([incoming_feature], [t_feat])[0][0]
                    if score > best_score:
                        best_score = score
                        best_match = tid

        if best_match and best_score >= MATCH_CONFIDENCE_THRESHOLD:
            doc = db.collection("templates").document(best_match).get()
            name = doc.to_dict().get("name", best_match) if doc.exists else best_match
            return {
                "match_status": "matched",
                "template_id": best_match,
                "template_name": name,
                "confidence": round(float(best_score), 4)
            }
            
    except Exception as e:
        print(f"HOG computation error: {e}")

    # Stage 2: AI Verification Fallback (Ollama)
    text = extract_top_text(image_bytes)
    if len(text) > 10:
        llm_match, llm_conf = await ollama_fallback_classification(text)
        if llm_match != "no_match":
            doc = db.collection("templates").document(llm_match).get()
            name = doc.to_dict().get("name", llm_match) if doc.exists else llm_match
            return {
                "match_status": "matched",
                "template_id": llm_match,
                "template_name": name,
                "confidence": llm_conf
            }

    return {
        "match_status": "no_match",
        "template_id": None,
        "template_name": None,
        "confidence": 0.0
    }
