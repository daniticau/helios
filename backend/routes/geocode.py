"""POST /api/geocode — forward-geocode a free-text address via Nominatim.

Kept server-side so we can respect Nominatim's User-Agent usage policy and
share a cache across web + mobile clients. Results feed profile.lat/lng so
``orchestrator.fetch_weather`` queries irradiance at the user's actual
coordinates instead of the La Jolla demo fallback.
"""

from __future__ import annotations

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from cache import cache

logger = logging.getLogger("helios.routes.geocode")
router = APIRouter()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "helios-hackathon/0.1 (daniticau@gmail.com)"
CACHE_TTL_SECONDS = 7 * 24 * 3600
REQUEST_TIMEOUT_SECONDS = 8.0


class GeocodeRequest(BaseModel):
    q: str = Field(min_length=3, max_length=300)


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str
    zip: str | None = None
    state: str | None = None


class AutocompleteResponse(BaseModel):
    results: list[GeocodeResponse]


def _normalize(q: str) -> str:
    return re.sub(r"\s+", " ", q.strip().lower())


def _parse_result(top: dict) -> GeocodeResponse | None:
    try:
        lat = float(top["lat"])
        lng = float(top["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    address = top.get("address") or {}
    state_full = address.get("state") or address.get("region")
    return GeocodeResponse(
        lat=lat,
        lng=lng,
        display_name=top.get("display_name") or "",
        zip=address.get("postcode"),
        state=_state_abbrev(state_full) if state_full else None,
    )


@router.post("/geocode", response_model=GeocodeResponse)
async def post_geocode(req: GeocodeRequest) -> GeocodeResponse:
    key = f"geocode:{_normalize(req.q)}"
    hit = cache.get(key)
    if hit is not None:
        return GeocodeResponse.model_validate(hit)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            res = await client.get(
                NOMINATIM_URL,
                params={
                    "q": req.q,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "limit": 1,
                },
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
    except httpx.HTTPError as e:
        logger.warning("geocode upstream failure: %s", e)
        raise HTTPException(status_code=502, detail="geocode upstream unreachable") from e

    if res.status_code == 429:
        raise HTTPException(status_code=429, detail="geocode rate-limited upstream")
    if res.status_code >= 500:
        raise HTTPException(status_code=502, detail=f"geocode upstream {res.status_code}")
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"geocode upstream {res.status_code}")

    try:
        results = res.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail="geocode upstream returned non-JSON") from e

    if not isinstance(results, list) or not results:
        raise HTTPException(status_code=404, detail="no match for address")

    parsed = _parse_result(results[0])
    if parsed is None:
        raise HTTPException(status_code=502, detail="geocode upstream missing coordinates")
    if not parsed.display_name:
        parsed = parsed.model_copy(update={"display_name": req.q})
    cache.set(key, parsed.model_dump(), CACHE_TTL_SECONDS)
    return parsed


@router.get("/geocode/autocomplete", response_model=AutocompleteResponse)
async def get_geocode_autocomplete(
    q: str = Query(min_length=3, max_length=300),
    limit: int = Query(5, ge=1, le=10),
) -> AutocompleteResponse:
    """Typeahead geocode: up to ``limit`` Nominatim matches for ``q``.

    Cached per (normalized query, limit) so rapid keystrokes don't hammer
    Nominatim. Returns an empty ``results`` array on zero matches rather
    than 404 — the UI treats "no results" as a valid display state.
    """
    key = f"geocode_ac:{_normalize(q)}:{limit}"
    hit = cache.get(key)
    if hit is not None:
        return AutocompleteResponse.model_validate(hit)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            res = await client.get(
                NOMINATIM_URL,
                params={
                    "q": q,
                    "format": "jsonv2",
                    "addressdetails": 1,
                    "limit": limit,
                },
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
    except httpx.HTTPError as e:
        logger.warning("geocode autocomplete upstream failure: %s", e)
        raise HTTPException(status_code=502, detail="geocode upstream unreachable") from e

    if res.status_code == 429:
        raise HTTPException(status_code=429, detail="geocode rate-limited upstream")
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"geocode upstream {res.status_code}")

    try:
        raw = res.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail="geocode upstream returned non-JSON") from e

    results: list[GeocodeResponse] = []
    if isinstance(raw, list):
        for item in raw:
            parsed = _parse_result(item)
            if parsed is not None and parsed.display_name:
                results.append(parsed)

    payload = AutocompleteResponse(results=results)
    cache.set(key, payload.model_dump(), CACHE_TTL_SECONDS)
    return payload


# Minimal US state-name → 2-letter code map; Nominatim returns full names.
_STATE_ABBREV = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "district of columbia": "DC", "florida": "FL", "georgia": "GA", "hawaii": "HI",
    "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME",
    "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
    "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
    "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI",
    "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
    "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
}


def _state_abbrev(name: str) -> str | None:
    # Already a 2-letter code.
    if len(name) == 2 and name.isalpha():
        return name.upper()
    return _STATE_ABBREV.get(name.strip().lower())
