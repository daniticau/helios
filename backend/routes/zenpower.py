"""GET /api/zenpower/summary — per-ZIP permit aggregate from ZenPower dataset."""

from __future__ import annotations

from fastapi import APIRouter, Request

from schemas import ZenPowerSummary

router = APIRouter()


@router.get("/zenpower/summary", response_model=ZenPowerSummary)
async def zenpower_summary(zip: str, request: Request) -> ZenPowerSummary:
    index = request.app.state.zenpower
    return index.summary_for_zip(zip)
