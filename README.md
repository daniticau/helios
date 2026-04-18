# Helios

Mobile-first AI agent for home solar economics. Built for DataHacks 2026.

Two modes in one app:
- **Mode A — "Should I?"** Enter an address, get a 25-year NPV and payback period for installing solar + battery.
- **Mode B — "Right Now?"** For existing owners: live recommendation on whether to charge, discharge, or sell to the grid, with an iOS home-screen widget and push notifs at peak windows.

The hero: per user action, the backend fans out **8–10 Orthogonal API calls in parallel** (tariffs, wholesale prices, weather, permits, installer pricing, financing, property value, demographics, reviews, carbon price). One SDK integration instead of ten.

**Target prize:** Best Use of Orthogonal.
**Dataset:** ZenPower solar permit records.
**Full plan:** [HELIOS.md](./HELIOS.md) · [Devpost draft](./DEVPOST_SUBMISSION.md)

---

## Layout

```
helios/
  backend/             FastAPI service + pure-Python econ engine
    main.py            app entrypoint
    routes/            /api/roi, /api/live, /api/parse-bill, /api/zenpower/summary
    orchestrator.py    Orthogonal fan-out (10 calls in parallel)
    econ/              NPV + arbitrage + production + sizing
    data/              ZenPower permits CSV
  mobile/              Expo + React Native + TypeScript
    App.tsx            Phase 0 smoke-test entry
    src/shared/        API client, Zustand store, shared TS types
    src/modeA/         Install ROI flow (WS3)
    src/modeB/         Live arbitrage flow (WS4)
  HELIOS.md            North star — plan, math, architecture, contracts
  DEVPOST_SUBMISSION.md  Submission copy
```

## Local setup

1. Copy `.env.example` to `.env` and fill in keys (`ORTHOGONAL_API_KEY`, `ANTHROPIC_API_KEY`).
2. Backend:
   ```bash
   cd backend
   uv sync
   uv run uvicorn main:app --reload
   # -> http://localhost:8000/docs
   ```
3. Mobile:
   ```bash
   cd mobile
   npm install
   npm start
   # scan QR with Expo Go
   ```

## Reproducible analysis

- `analysis/helios_analysis.py` -- a [Marimo](https://marimo.io) reactive notebook with five sections on the ZenPower dataset plus a live NPV sensitivity tool that imports `backend/econ/npv.py` directly. See `analysis/README.md` for details; `analysis/html/helios_analysis.html` is the pre-rendered static export.

## Contracts

Wire types are defined twice and must stay in sync:
- Python/Pydantic: `backend/schemas.py`
- TypeScript: `mobile/src/shared/types.ts`

Any change to one requires the matching change to the other.

## Workstreams

Four parallel Claude Code sessions, each scoped to one directory. See HELIOS.md §9 for the acceptance criteria.

| WS | Directory | Focus |
|----|-----------|-------|
| 1 | `backend/` (non-econ) | FastAPI + Orthogonal orchestrator + routes |
| 2 | `backend/econ/` | Pure-Python NPV + arbitrage + production + sizing |
| 3 | `mobile/src/modeA/` | Onboarding + Orthogonal ticker + ROI result |
| 4 | `mobile/src/modeB/` | Live dashboard + widget + push notifs |

Workstreams communicate only through the contracts in HELIOS.md §6.

## License

MIT.
