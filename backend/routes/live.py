"""POST /api/live — live charge/discharge recommendation.

Phase 0: returns stub recommendation + mocked Orthogonal/CAISO calls.

Auth: optional, same as /api/roi.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from auth import User, get_optional_user
from econ import recommend_action
from orchestrator import gather_for_live
from schemas import LiveRecommendation, LiveStateRequest

logger = logging.getLogger("helios.routes.live")
router = APIRouter()
optional_user_dep = Depends(get_optional_user)


@router.post("/live", response_model=LiveRecommendation)
async def post_live(
    req: LiveStateRequest,
    user: User | None = optional_user_dep,
) -> LiveRecommendation:
    if user is not None:
        logger.info("live request user_id=%s", user.id)
    else:
        logger.info("live request user_id=- (anonymous)")
    external = await gather_for_live(req.profile)
    return recommend_action(profile=req.profile, state=req.current_state, external=external)
