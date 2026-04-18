# CLAUDE.md — Helios

AI collaboration context for this repo. Read HELIOS.md for the product plan and math.

## What this is

DataHacks 2026 hackathon submission. Mobile-first AI agent for home solar economics. **Target prize: Best Use of Orthogonal.** Everything in this project bends toward that prize.

## The prize is the Orthogonal ticker

The 30-second hero moment of the demo is an animation showing 8–10 paid APIs firing in parallel through Orthogonal, with real latencies streamed from the backend. If you're asked "where should I spend more time?", the answer is almost always **polishing the Orthogonal ticker animation and its surrounding pitch copy**. Econ math quality matters less than ticker polish.

## Architecture in 60 seconds

- **Backend (Python 3.11, FastAPI):** `backend/main.py` → `backend/routes/` → `backend/orchestrator.py` (fans out 10 parallel Orthogonal calls via `asyncio.gather`) → `backend/econ/` (pure-Python NPV + greedy arbitrage, zero network I/O).
- **Mobile (Expo, React Native, TypeScript):** `mobile/App.tsx` is the Phase 0 smoke test. WS3 builds `mobile/src/modeA/*`, WS4 builds `mobile/src/modeB/*`. All HTTP goes through `mobile/src/shared/api.ts`.
- **Wire contracts:** `backend/schemas.py` ↔ `mobile/src/shared/types.ts`. Any change to one requires the matching change to the other.
- **Data:** ZenPower permits CSV loaded once on backend boot into pandas (`backend/zenpower.py`).

## Running locally

```bash
# backend
cd backend && uv sync && uv run uvicorn main:app --reload
# mobile (separate terminal)
cd mobile && pnpm install && pnpm start
```

Backend boots on 8000; mobile reads `API_BASE_URL` from `app.json → expo.extra.apiBaseUrl`.

## Four parallel workstreams

Each session gets one directory and only touches files inside it. Contracts are the only interface between them.

| WS | Scope | Directory | Acceptance |
|----|-------|-----------|------------|
| 1 | Backend + Orthogonal orchestrator | `backend/` (non-econ) | `/api/roi` < 20s, `/api/live` < 5s, per-call `orthogonal_calls_made` always returned |
| 2 | Econ engine | `backend/econ/` | Pure-Python, numpy/scipy only, unit-tested NPV + arbitrage |
| 3 | Mobile Mode A | `mobile/src/modeA/` | Address → Ticker → Result in < 30s; ticker matches real `orthogonal_calls_made` |
| 4 | Mobile Mode B | `mobile/src/modeB/` | Live dashboard + widget preview + push notif |

See HELIOS.md §9 for full responsibilities and acceptance criteria per workstream.

## Conventions

- **Python:** type hints everywhere, async/await for I/O, pydantic-settings for config, pytest for tests. No wildcard imports.
- **TypeScript:** strict mode, no `any`, no `console.log` in committed code.
- **Secrets:** live in `.env` (gitignored). Never print or commit. `.env.example` holds the structure.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

## Don't cut these (HELIOS.md §12)

- The Orthogonal ticker animation.
- At least 8 distinct Orthogonal calls visible in the UI.
- ZenPower credibility line in the result card — it's the eligibility dataset.
- Mode A end-to-end (input → live orchestration → result).

## Phase 0 status (done)

- [x] Dir scaffold (backend/, backend/econ/, mobile/src/modeA, mobile/src/modeB)
- [x] Shared contracts locked (Pydantic + TS)
- [x] Backend boots with stub orchestrator returning shape-valid responses
- [x] Econ engine produces a real NPV from stub external inputs
- [x] Mobile App.tsx fires `POST /api/roi` and renders the result
- [x] ZenPower CSV loaded (37.9k CA permits)

## Phase 1 priorities

1. **Swap orchestrator stubs for real Orthogonal SDK calls.** File: `backend/orchestrator.py`. Keep the return-shape contract of each `_call_*` identical.
2. Build the `OrthogonalTicker` animation in `mobile/src/modeA/components/OrthogonalTicker.tsx` against the actual `orthogonal_calls_made` stream. This is the prize.
3. Build the onboarding + result screens in `mobile/src/modeA/screens/`.
4. Wire Mode B dashboard to `/api/live`.
