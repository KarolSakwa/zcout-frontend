# backend/main.py
import os
from fastapi import FastAPI
from mangum import Mangum
from fastapi.middleware.cors import CORSMiddleware

# Routers
from app.routes.health import router as health_router
from app.routes.vote import router as vote_router

stage = os.getenv("STAGE", "").strip().lower()

app = FastAPI(
    debug=True,
    docs_url="/docs",
    openapi_url="/openapi.json",
    redoc_url=None,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(health_router)
app.include_router(vote_router)

@app.get("/")
def root():
    return {
        "message": "Flat structure FTW",
        "stage": stage or "default",
    }

@app.get("/_debug/routes")
def list_routes():
    return sorted([getattr(r, "path", str(r)) for r in app.router.routes])

# Handler dla AWS Lambda / API Gateway (Mangum)
handler = Mangum(app, api_gateway_base_path=f"/{stage}" if stage else None)
