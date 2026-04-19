"""POST /api/roi — returns an NPV/payback estimate for an install.

Phase 0: returns plausible stub data with a mocked Orthogonal call log so
the mobile side can render the ticker animation end-to-end. Phase 1 wires
real Orthogonal fan-out + real econ math.

Auth: optional. Anonymous calls are first-class. When a valid Supabase JWT
is present we log the user_id for the demo — response shape is unchanged.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request

from auth import User, get_optional_user
from econ import compute_roi, recommend_system_size
from orchestrator import collect_fallbacks_used, gather_for_roi
from schemas import ROIRequest, ROIResult

logger = logging.getLogger("helios.routes.roi")
router = APIRouter()
optional_user_dep = Depends(get_optional_user)


@router.post("/roi", response_model=ROIResult)
async def post_roi(
    req: ROIRequest,
    request: Request,
    user: User | None = optional_user_dep,
) -> ROIResult:
    profile = req.profile
    system = req.proposed_system or recommend_system_size(profile.monthly_kwh)

    if user is not None:
        logger.info("roi request user_id=%s utility=%s", user.id, profile.utility)
    else:
        logger.info("roi request user_id=- utility=%s (anonymous)", profile.utility)

    zenpower = request.app.state.zenpower
    external = await gather_for_roi(profile, zenpower)

    result = compute_roi(profile=profile, system=system, external=external)
    return result.model_copy(
        update={"fallbacks_used": collect_fallbacks_used(external)}
    )
