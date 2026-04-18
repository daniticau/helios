# backend/econ/

Pure-Python econ engine. Zero network I/O, zero FastAPI import, zero Orthogonal import. Imported by `backend/routes/` via:

```python
from econ import compute_roi, recommend_action, forecast_production, recommend_system_size
```

## Run tests

```bash
cd backend
uv run pytest econ
```

## Math spec

- NPV: HELIOS.md §3.1
- 24hr arbitrage: HELIOS.md §3.2

## Phase 1 TODO (WS2)

- Split the naive `self_consume_frac` heuristic in `npv.py` into an hourly model that uses the household load shape + the production curve.
- Add unit tests for PG&E EV2-A peak scenario + battery empty/full at peak.
- Optional: LP formulation of the arbitrage problem (HELIOS.md §3.2 "stretch").
