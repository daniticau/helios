"""Thin async client for the Orthogonal unified API gateway.

Orthogonal does not ship a Python SDK (as of DataHacks 2026). Instead,
every partner call goes through a single REST endpoint:

    POST https://api.orthogonal.com/v1/run
    Authorization: Bearer orth_live_...

with a body like

    {"api": "precip", "path": "/api/v1/solar-radiation-hourly",
     "query": {...}, "body": {...}}

See https://docs.orthogonal.com/api-reference/run for the full spec.
Response shape is ``{"success": bool, "priceCents": number,
"data": object, "requestId": str}``.

This module provides a minimal ``run()`` coroutine around that endpoint
plus a lazy singleton client so the orchestrator can fire many requests
concurrently through the same httpx connection pool.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from config import settings

BASE_URL = "https://api.orthogonal.com/v1"


class OrthogonalError(RuntimeError):
    """Raised when the Orthogonal gateway returns success=false or HTTP error."""


_client: httpx.AsyncClient | None = None
_client_lock = asyncio.Lock()


def _connection_limits() -> httpx.Limits:
    parallelism = max(1, settings.orthogonal_parallelism)
    return httpx.Limits(
        max_connections=max(20, parallelism * 2),
        max_keepalive_connections=max(10, parallelism),
    )


async def get_client() -> httpx.AsyncClient:
    """Return a shared async httpx client with sane connection-pool limits.

    The orchestrator fans out ~10 parallel requests per user action; we
    keep one client around for the life of the process so TLS handshakes
    don't dominate latency.
    """
    global _client
    if _client is None:
        async with _client_lock:
            if _client is None:
                _client = httpx.AsyncClient(
                    base_url=BASE_URL,
                    timeout=httpx.Timeout(settings.orthogonal_timeout_seconds),
                    headers={
                        "Authorization": f"Bearer {settings.orthogonal_api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "helios-backend/0.1",
                    },
                    limits=_connection_limits(),
                )
    return _client


async def run(
    api: str,
    path: str,
    *,
    body: dict | None = None,
    query: dict | None = None,
    timeout: float | None = None,
) -> Any:
    """Invoke a single partner endpoint through Orthogonal's gateway.

    Args:
        api: partner slug (e.g. ``"linkup"``, ``"precip"``, ``"scrapegraph"``).
        path: endpoint path on the partner API (e.g. ``"/search"``).
        body: JSON body for POST/PUT/PATCH endpoints.
        query: query-string params as a dict.
        timeout: per-call override (seconds). Defaults to
            ``settings.orthogonal_timeout_seconds``.

    Returns:
        The ``data`` field of the gateway response (partner-specific shape).

    Raises:
        OrthogonalError: on HTTP error or ``success=false`` response.
        httpx.TimeoutException: if the call exceeds ``timeout``.
    """
    if not settings.orthogonal_api_key:
        raise OrthogonalError("ORTHOGONAL_API_KEY is not configured")

    client = await get_client()
    payload: dict = {"api": api, "path": path}
    if body is not None:
        payload["body"] = body
    if query is not None:
        # Gateway expects all query values as strings.
        payload["query"] = {k: str(v) for k, v in query.items() if v is not None}

    call_timeout = timeout or settings.orthogonal_timeout_seconds
    resp = await client.post("/run", json=payload, timeout=call_timeout)
    if resp.status_code >= 400:
        # Try to surface the partner error verbatim.
        try:
            err = resp.json()
        except ValueError:
            err = {"error": resp.text[:300]}
        raise OrthogonalError(
            f"Orthogonal {api}{path} -> HTTP {resp.status_code}: {err}"
        )

    data = resp.json()
    if not data.get("success"):
        raise OrthogonalError(
            f"Orthogonal {api}{path} -> success=false: "
            f"{data.get('error') or data.get('code') or data}"
        )
    if "data" in data:
        return data["data"]
    return {}


async def close() -> None:
    """Shut down the shared client (called from FastAPI lifespan on exit)."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


__all__ = ["OrthogonalError", "close", "get_client", "run"]
