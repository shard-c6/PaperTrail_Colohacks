"""
firebase_config.py
Initialises Firebase Admin SDK (singleton). All routers import `db` and
`bucket` from here instead of calling firebase_admin directly.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv

load_dotenv()

_app = None


def _init_firebase():
    global _app
    if _app is not None:
        return

    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "")

    if sa_json:
        import json
        cred_dict = json.loads(sa_json)
        cred = credentials.Certificate(cred_dict)
    else:
        cred = credentials.Certificate(sa_path)
    _app = firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})


_init_firebase()

db: firestore.Client = firestore.client()
bucket = storage.bucket()
