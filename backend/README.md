# backend/

FastAPI service + pure-Python econ engine.

## Quick start

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
# docs: http://localhost:8000/docs
```

## Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, router wiring, ZenPower lifespan load |
| `config.py` | pydantic-settings, reads `.env` at repo root |
| `schemas.py` | Pydantic wire types — mirror of `mobile/src/shared/types.ts` |
| `routes/roi.py` | `POST /api/roi` — install NPV |
| `routes/live.py` | `POST /api/live` — arbitrage recommendation |
| `routes/parse_bill.py` | `POST /api/parse-bill` — utility bill PDF parse |
| `routes/zenpower.py` | `GET /api/zenpower/summary?zip=...` |
| `orchestrator.py` | Orthogonal fan-out — 10 parallel calls via `asyncio.gather` |
| `cache.py` | TTL in-memory cache |
| `caiso.py` | CAISO OASIS client (phase 0: synthesized LMP curve) |
| `zenpower.py` | In-memory ZenPower index (pandas, keyed by postal_code) |
| `tariffs.py` | Hardcoded CA utility TOU schedules (PG&E EV2-A, etc.) |
| `econ/` | Pure-Python NPV + greedy arbitrage (WS2 owns) |

## Docker

A `Dockerfile` and `.dockerignore` live alongside this README. Build from the repo root: `docker build -t helios-backend ./backend` and run with `docker run --rm -p 8080:8080 -e ORTHOGONAL_API_KEY=... -e ANTHROPIC_API_KEY=... helios-backend`. The image boots `uvicorn` on port 8080, runs as the non-root `helios` user, and bakes `data/zenpower_permits.csv` into the image so the container is self-contained. Deployment to AWS App Runner is documented in `docs/INFRA.md`.

## Phase 1 TODO

`orchestrator.py` currently uses `_stub()` for all API calls. Replace the body of each `fetch_*` function with a real Orthogonal SDK call, keeping the return shape `(payload: dict, OrthogonalCallLog)`.
