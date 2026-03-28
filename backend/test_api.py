import httpx
import time

BASE_URL = "http://127.0.0.1:8000"
ADMIN_HEADERS = {"Authorization": "Bearer test_admin_token"}
CLERK_HEADERS = {"Authorization": "Bearer test_clerk_token"}

def run_tests():
    print("--- Testing PaperTrail Backend APIs ---")
    
    with httpx.Client(base_url=BASE_URL) as client:
        # TEST 1: GET /auth/me (Clerk)
        print("\n1. GET /auth/me (As Clerk)")
        res = client.get("/auth/me", headers=CLERK_HEADERS)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")

        # TEST 2: GET /auth/me (Admin)
        print("\n2. GET /auth/me (As Admin)")
        res = client.get("/auth/me", headers=ADMIN_HEADERS)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")

        # TEST 3: Admin Only Endpoint Verification
        print("\n3. GET /admin/records (As Admin)")
        res = client.get("/admin/records", headers=ADMIN_HEADERS)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")

        print("\n4. GET /admin/records (As Clerk - Should Fail)")
        res = client.get("/admin/records", headers=CLERK_HEADERS)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")

        # TEST 5: Pipeline classification layer (mock session)
        print("\n5. GET /pipeline/classify/mock_session (As Clerk)")
        res = client.get("/pipeline/classify/mock_session", headers=CLERK_HEADERS)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")

if __name__ == "__main__":
    run_tests()
