import os
from fastapi import FastAPI
from mangum import Mangum
from app.routes.vote import router as vote_router
from app.routes.player import router as player_router

stage = os.getenv("STAGE", "").strip().lower()

app = FastAPI(
    debug=True,
    docs_url="/docs",
    openapi_url="/openapi.json",
    redoc_url=None,
)

app.include_router(vote_router)
app.include_router(player_router)
print(">>> MAIN: player_router included")


@app.get("/")
def root():
    return {
        "message": "Flat structure FTW",
        "stage": stage or "default",
    }

@app.get("/_debug/routes")
def list_routes():
    return sorted([getattr(r, "path", str(r)) for r in app.router.routes])


handler = Mangum(app, api_gateway_base_path=f"/{stage}" if stage else None)
