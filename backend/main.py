"""
main.py — FastAPI application entry point.
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, pipeline, templates, admin

app = FastAPI(
    title="PaperTrail API",
    description="Handwritten Government Form Digitisation Pipeline",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/v1")
app.include_router(pipeline.router, prefix="/v1")
app.include_router(templates.router, prefix="/v1")
app.include_router(admin.router, prefix="/v1")


@app.get("/")
async def root():
    return {"service": "PaperTrail API", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
