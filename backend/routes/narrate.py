"""POST /api/narrate — text-to-speech via ElevenLabs.

Accepts either a raw script or an ROIResult payload. When given an
ROIResult, the route renders a 40–60 word narration from a template so
callers on the mobile app can hit a single button to have the agent
speak the outcome out loud.

Response: ``Content-Type: audio/mpeg`` with raw mp3 bytes streamed back
to the client (no base64, no JSON wrapping). Results are cached by
script hash for 24 hours so repeated "speak my result" taps don't burn
ElevenLabs quota.

Failure modes:
    - missing API key → 503 with ``x-helios-reason: no-key``
    - ElevenLabs HTTP error → 502 with body from upstream
    - body validation failure → 422 (handled by FastAPI/pydantic)
"""

from __future__ import annotations

import hashlib

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from cache import cache
from config import settings
from eleven_client import ElevenLabsError, synthesize
from schemas import ROIResult

router = APIRouter()

# 24h TTL keeps the free-tier character budget intact across repeat demos.
_CACHE_TTL_SECONDS = 60 * 60 * 24


class NarrateRequest(BaseModel):
    """At least one of ``script`` or ``roi_result`` must be present."""

    script: str | None = Field(
        default=None,
        description="Raw narration text. Overrides roi_result if both are set.",
    )
    roi_result: ROIResult | None = Field(
        default=None,
        description="If set, backend renders a spoken summary from the numbers.",
    )


def _render_from_roi(result: ROIResult) -> str:
    """Build a ~45–55 word human-sounding narration from an ROIResult.

    Kept deterministic so the cache actually hits on repeat taps. The
    copy matches the demo script vocabulary ("pays back in", "NPV",
    "tons of carbon dioxide") and opts into the ZenPower credibility
    line if it's available.
    """
    solar_kw = round(result.recommended_system.solar_kw, 1)
    battery_kwh = round(result.recommended_system.battery_kwh, 1)
    payback = round(result.payback_years, 1)
    npv = round(result.npv_25yr_usd)
    co2 = round(result.co2_avoided_tons_25yr, 1)

    # Avoid awkward "negative N dollars" phrasing — Eleven voices cope,
    # but the punctuation-light dollar formatting reads cleaner.
    def usd(n: float) -> str:
        sign = "negative " if n < 0 else ""
        return f"{sign}{abs(int(round(n))):,} dollars"

    credibility = ""
    if result.zenpower_permits_in_zip and result.zenpower_avg_system_kw:
        credibility = (
            f" ZenPower permit data shows {result.zenpower_permits_in_zip} "
            f"recent installs in your ZIP, averaging "
            f"{round(result.zenpower_avg_system_kw, 1)} kilowatts — "
            f"so the sizing checks out."
        )
    elif result.roi_pct_of_home_value is not None:
        credibility = (
            f" That's roughly {round(result.roi_pct_of_home_value)} percent "
            f"of your home's value back over the lifetime of the system."
        )

    return (
        f"At your address, a {solar_kw} kilowatt solar system with a "
        f"{battery_kwh} kilowatt-hour battery pays back in {payback} years. "
        f"Over twenty-five years, it clears {usd(npv)} in net present value, "
        f"avoiding {co2} tons of carbon dioxide.{credibility}"
    )


def _cache_key(text: str, voice_id: str) -> str:
    # voice_id is part of the key so switching voices mid-run doesn't
    # serve stale audio from the prior voice.
    digest = hashlib.sha256(f"{voice_id}|{text}".encode("utf-8")).hexdigest()
    return f"narrate:{digest[:24]}"


@router.post(
    "/narrate",
    response_class=Response,
    responses={
        200: {"content": {"audio/mpeg": {}}, "description": "raw mp3 bytes"},
        400: {"description": "empty or missing script"},
        502: {"description": "ElevenLabs upstream error"},
        503: {"description": "ElevenLabs API key not configured"},
    },
)
async def post_narrate(req: NarrateRequest) -> Response:
    # Prefer an explicit script over the rendered template.
    script = (req.script or "").strip()
    if not script and req.roi_result is not None:
        script = _render_from_roi(req.roi_result)

    if not script:
        raise HTTPException(
            status_code=400,
            detail="Provide 'script' or 'roi_result' in the body.",
        )

    # 2500 chars is the per-request safe ceiling on the free tier; we
    # truncate rather than fail so a long roi_result can't block demo.
    if len(script) > 2500:
        script = script[:2500]

    voice_id = settings.elevenlabs_voice_id

    if settings.cache_enabled:
        cached = cache.get(_cache_key(script, voice_id))
        if cached is not None:
            return Response(
                content=cached,
                media_type="audio/mpeg",
                headers={"x-helios-cache": "hit"},
            )

    if not settings.elevenlabs_api_key:
        # 503 signals transient-misconfiguration so the mobile button can
        # surface a friendly message instead of crashing. The client
        # already bails on !res.ok, so no additional contract required.
        raise HTTPException(
            status_code=503,
            detail=(
                "ElevenLabs is not configured. "
                "Set ELEVENLABS_API_KEY in .env — see docs/ELEVENLABS.md."
            ),
            headers={"x-helios-reason": "no-key"},
        )

    try:
        mp3 = await synthesize(script, voice_id=voice_id)
    except ElevenLabsError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    if settings.cache_enabled:
        cache.set(_cache_key(script, voice_id), mp3, _CACHE_TTL_SECONDS)

    return Response(
        content=mp3,
        media_type="audio/mpeg",
        headers={"x-helios-cache": "miss"},
    )
