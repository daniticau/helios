"""POST /api/live — live charge/discharge recommendation.

Phase 0: returns stub recommendation + mocked Orthogonal/CAISO calls.
"""

from __future__ import annotations

from fastapi import APIRouter

from econ import recommend_action
from orchestrator import gather_for_live
from schemas import LiveRecommendation, LiveStateRequest

router = APIRouter()


@router.post("/live", response_model=LiveRecommendation)
async def post_live(req: LiveStateRequest) -> LiveRecommendation:
    external = await gather_for_live(req.profile)
    return recommend_action(profile=req.profile, state=req.current_state, external=external)
