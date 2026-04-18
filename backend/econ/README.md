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

## Phase 1 status

- NPV uses an hourly TOU model (`compute_annual_savings_hourly`) — typical residential duck-curve load shape dispatched against the hourly clear-sky production curve, priced at the hourly retail / NEM 3.0 export rates. Battery adds a separate arbitrage uplift via one cycle/day.
- Arbitrage solver applies HELIOS.md §3.2 rules with 6/12hr lookahead and a roundtrip-efficiency gate on grid-charge decisions. Reasoning strings cite the specific peak time and net $/kWh after loss.
- Unit tests cover: zero-solar baseline, typical SDGE household positive NPV, larger-system-more-savings, battery empty/full at peak, off-peak grid-charge decision, midnight/noon/full-cloud production boundaries.

## Stretch

- LP formulation of the 24h arbitrage problem (HELIOS.md §3.2 "stretch") for multi-cycle dispatch.
- Seasonal load shape variation (AC-heavy summer vs gas-heat winter).
