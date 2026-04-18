"""Helios FastAPI entrypoint.

Run locally:
    uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

Phase 0 status: all endpoints wired with stub data. Real Orthogonal
fan-out and real econ math land in Phase 1 (see HELIOS.md §10).
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import live, parse_bill, roi, zenpower as zp_routes
from zenpower import ZenPowerIndex


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload ZenPower permits into memory for fast per-ZIP lookup.
    app.state.zenpower = ZenPowerIndex.load(settings.zenpower_csv_path)
    yield


app = FastAPI(
    title="Helios",
    description="Mobile-first AI agent for home solar economics.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.backend_allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roi.router, prefix="/api", tags=["roi"])
app.include_router(live.router, prefix="/api", tags=["live"])
app.include_router(parse_bill.router, prefix="/api", tags=["bill"])
app.include_router(zp_routes.router, prefix="/api", tags=["zenpower"])


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "helios",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health() -> dict[str, object]:
    zp = getattr(app.state, "zenpower", None)
    return {
        "status": "ok",
        "zenpower_loaded": zp is not None,
        "permits_count": getattr(zp, "n", 0),
    }
