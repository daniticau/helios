"""POST /api/roi — returns an NPV/payback estimate for an install.

Phase 0: returns plausible stub data with a mocked Orthogonal call log so
the mobile side can render the ticker animation end-to-end. Phase 1 wires
real Orthogonal fan-out + real econ math.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from econ import compute_roi, recommend_system_size
from orchestrator import gather_for_roi
from schemas import ROIRequest, ROIResult

router = APIRouter()


@router.post("/roi", response_model=ROIResult)
async def post_roi(req: ROIRequest, request: Request) -> ROIResult:
    profile = req.profile
    system = req.proposed_system or recommend_system_size(profile.monthly_kwh)

    zenpower = request.app.state.zenpower
    external = await gather_for_roi(profile, zenpower)

    return compute_roi(profile=profile, system=system, external=external)
