import requests
import cv2
import numpy as np

BASE_URL = "http://localhost:8000/v1"

def test_api():
    print("Testing Auth... (Clerk Role)")
    headers_clerk = {"Authorization": "Bearer test_clerk_token"}
    r = requests.get(f"{BASE_URL}/auth/me", headers=headers_clerk)
    print("GET /auth/me (Clerk):", r.status_code, r.text)
    
    print("\nTesting Auth... (Admin Role)")
    headers_admin = {"Authorization": "Bearer test_admin_token"}
    r = requests.get(f"{BASE_URL}/auth/me", headers=headers_admin)
    print("GET /auth/me (Admin):", r.status_code, r.text)

    print("\nTesting pipeline... (Upload dummy image)")
    # Create a dummy image
    img = np.zeros((800, 600, 3), dtype=np.uint8)
    img.fill(255)
    cv2.putText(img, "TEST", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    _, buffer = cv2.imencode(".jpg", img)
    
    files = {"file": ("test.jpg", buffer.tobytes(), "image/jpeg")}
    r = requests.post(f"{BASE_URL}/pipeline/preprocess", headers=headers_clerk, files=files)
    print("POST /pipeline/preprocess:", r.status_code, r.text)
    
    session_id = r.text.get("session_id") if r.status_code == 200 else None
    
    if session_id:
        print(f"\nTesting Match Template for {session_id}...")
        r = requests.post(f"{BASE_URL}/pipeline/match-template/{session_id}", headers=headers_clerk)
        print("POST /pipeline/match-template:", r.status_code, r.text)
        
        print(f"\nTesting Classify for {session_id}...")
        r = requests.get(f"{BASE_URL}/pipeline/classify/{session_id}", headers=headers_clerk)
        print("GET /pipeline/classify:", r.status_code, r.text)

    print("\nTesting Admin endpoints...")
    r = requests.get(f"{BASE_URL}/admin/records", headers=headers_admin)
    print("GET /admin/records:", r.status_code, r.text)

if __name__ == "__main__":
    test_api()
