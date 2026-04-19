"""POST /api/roi/start + GET /api/roi/stream/{job_id} — live SSE fan-out.

Phase 1 streaming variant of POST /api/roi. The blocking endpoint stays
in routes/roi.py for callers that want the full result in one shot
(Marimo, tests, App Runner health checks). This module emits each
``OrthogonalCallLog`` the instant its source resolves so the mobile/web
ticker can render rows live, instead of faking a staggered reveal after
a single monolithic JSON arrives.

Job registry is in-memory and module-level — fine for a single-instance
App Runner container. If we ever scale horizontally, swap the dict for
Redis pub/sub or pin clients to the same instance with sticky sessions.

Wire format: SSE (``text/event-stream``). Event types emitted:

* ``call``    — payload is one ``OrthogonalCallLog`` (json)
* ``result``  — payload is the final ``ROIResult`` (json)
* ``error``   — payload is ``{"message": "..."}`` and closes the stream
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from auth import User, get_optional_user
from econ import compute_roi, recommend_system_size
from orchestrator import collect_fallbacks_used, gather_for_roi, retry_one_source
from schemas import OrthogonalCallLog, ROIRequest
from zenpower import ZenPowerIndex

logger = logging.getLogger("helios.routes.roi_stream")
router = APIRouter()
optional_user_dep = Depends(get_optional_user)

# Sentinel — distinguished from event dicts so adding event keys later
# can never accidentally close the stream.
_STREAM_END = object()

JOB_TTL_SECONDS = 600  # evict completed/abandoned jobs after 10 min
HEARTBEAT_INTERVAL_SECONDS = 5.0  # SSE comment ping; keeps proxies open
RETRY_GRACE_SECONDS = 2.0  # keep job open briefly after the final result so
# the ticker's retry button still works if the user taps it within ~2s of
# the last row resolving. Without this, a retry POSTed after _JOBS.pop
# would 404 and force a full re-run.


@dataclass
class JobState:
    queue: asyncio.Queue
    created_at: float = field(default_factory=time.time)
    req: ROIRequest | None = None  # retained so retries can re-issue one source
    zenpower: ZenPowerIndex | None = None
    finalized: bool = False  # True once the ``result`` event has been emitted


# Module-level on purpose so /start and /stream share state within a process.
_JOBS: dict[str, JobState] = {}


def _evict_stale() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    for k in [k for k, j in _JOBS.items() if j.created_at < cutoff]:
        _JOBS.pop(k, None)


async def _run_job(
    job_id: str,
    req: ROIRequest,
    zenpower: ZenPowerIndex | None,
) -> None:
    state = _JOBS.get(job_id)
    if state is None:
        return
    try:
        profile = req.profile
        system = req.proposed_system or recommend_system_size(profile.monthly_kwh)

        def emit_call(log: OrthogonalCallLog) -> None:
            # Same event loop, unbounded queue — put_nowait is safe.
            state.queue.put_nowait(
                {"type": "call", "data": log.model_dump(mode="json")}
            )

        external = await gather_for_roi(profile, zenpower, on_event=emit_call)
        result = compute_roi(profile=profile, system=system, external=external)
        result = result.model_copy(
            update={"fallbacks_used": collect_fallbacks_used(external)}
        )
        state.queue.put_nowait(
            {"type": "result", "data": result.model_dump(mode="json")}
        )
        state.finalized = True
        # Grace window: retries queued in the next ~2s will still be
        # emitted on the same stream. After that the ``gen()`` finally
        # block pops the job and further retries 410.
        await asyncio.sleep(RETRY_GRACE_SECONDS)
    except Exception as e:
        logger.exception("roi stream job %s failed", job_id)
        state.queue.put_nowait(
            {"type": "error", "data": {"message": f"{type(e).__name__}: {e}"}}
        )
    finally:
        state.queue.put_nowait(_STREAM_END)


@router.post("/roi/start")
async def post_roi_start(
    req: ROIRequest,
    request: Request,
    user: User | None = optional_user_dep,
) -> dict[str, str]:
    """Kick off an ROI fan-out job. Returns ``{job_id}`` to subscribe via SSE."""
    _evict_stale()
    job_id = secrets.token_urlsafe(24)
    zenpower = request.app.state.zenpower
    _JOBS[job_id] = JobState(queue=asyncio.Queue(), req=req, zenpower=zenpower)
    if user is not None:
        logger.info("roi stream start job=%s user=%s", job_id, user.id)
    else:
        logger.info("roi stream start job=%s user=- (anonymous)", job_id)
    asyncio.create_task(_run_job(job_id, req, zenpower))
    return {"job_id": job_id}


@router.get("/roi/stream/{job_id}")
async def get_roi_stream(job_id: str) -> StreamingResponse:
    """Subscribe to a job's event stream as SSE."""
    state = _JOBS.get(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="job not found or expired")

    async def gen() -> AsyncIterator[bytes]:
        try:
            while True:
                try:
                    event = await asyncio.wait_for(
                        state.queue.get(), timeout=HEARTBEAT_INTERVAL_SECONDS
                    )
                except asyncio.TimeoutError:
                    yield b": ping\n\n"
                    continue
                if event is _STREAM_END:
                    break
                etype = event["type"]
                payload = json.dumps(event["data"], separators=(",", ":"))
                yield f"event: {etype}\ndata: {payload}\n\n".encode("utf-8")
                if etype == "error":
                    break
        finally:
            # Stream consumed — drop the job. Reconnects after the result
            # has been pulled hit a 404, which is the desired terminal.
            _JOBS.pop(job_id, None)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # disable nginx/AppRunner response buffering
            "Connection": "keep-alive",
        },
    )


@router.post("/roi/retry/{job_id}")
async def post_roi_retry(job_id: str, body: dict[str, str]) -> dict[str, str]:
    """Re-fire one Orthogonal source on an existing job.

    Body: ``{"source_id": "installer_pricing"}`` (keys from
    ``orchestrator._build_roi_source_specs``). The fresh log is pushed
    onto the live SSE queue so the ticker row re-animates.

    Returns 410 if the job is already finalized past the grace window
    (stream has closed). The mobile client should fall back to "run
    again" in that case.
    """
    state = _JOBS.get(job_id)
    if state is None:
        raise HTTPException(status_code=410, detail="job already finalized")
    if state.req is None:
        raise HTTPException(status_code=400, detail="job has no request context")

    source_id = (body or {}).get("source_id")
    if not source_id:
        raise HTTPException(status_code=422, detail="source_id required")

    def emit_call(log: OrthogonalCallLog) -> None:
        state.queue.put_nowait(
            {"type": "call", "data": log.model_dump(mode="json")}
        )

    try:
        await retry_one_source(
            source_id,
            state.req.profile,
            state.zenpower,
            on_event=emit_call,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    logger.info("roi retry job=%s source=%s", job_id, source_id)
    return {"status": "queued", "source_id": source_id}
