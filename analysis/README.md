# Helios -- reproducible analysis

A [Marimo](https://marimo.io) reactive notebook that (1) does proper
exploratory analysis on the ZenPower solar permit dataset and (2)
validates the Helios NPV math against a realistic La Jolla / SDGE
household, with live sliders for the three sensitive assumptions.

Targets the Marimo MLH sponsor prize. Runs against the live backend
modules (not copies) -- if the backend NPV formula changes, this
notebook changes with it.

## What's in the notebook

`helios_analysis.py` is the only Marimo file. Five sections:

1. **Dataset overview** -- 37,901 permits, date range, state breakdown,
   ZIP coverage. Reactive filters: state dropdown, ZIP search box, date
   range pickers.
2. **Per-ZIP system size distribution** -- overall kW histogram, top 20
   ZIPs by install count (with mean kW), and a reactive ZIP drill-down
   that overlays a chosen ZIP's distribution against the CA baseline.
3. **Permit velocity** -- apply -> issue distribution (box plot) plus a
   monthly median time series. Shows the NEM 3.0 backlog spike.
4. **Install trends over time** -- CA monthly permit counts 2018-2026
   with a 3-month moving average, an NEM 3.0 deadline annotation, and
   a cumulative MW-installed chart.
5. **NPV validation** -- instantiates a realistic La Jolla SDGE profile
   (8 kW + 13.5 kWh battery, 650 kWh/mo), runs the live
   `backend/econ/npv.py::compute_roi`, compares it to a
   CPUC-style reference calc, and exposes six reactive sliders
   (discount, degradation, rate escalation, monthly kWh, system kW,
   battery kWh) so judges can see the sensitivity in real time.

## Findings surfaced

- **NEM 3.0 quasi-experiment.** CA residential permits averaged ~280/mo
  in the six months before NEM 3.0 (Oct 2022 - Mar 2023), spiked to
  677 in the deadline month (April 2023), then collapsed ~14% over the
  six months after. The market has since rebounded strongly in
  2025-2026 as batteries bring the new TOU math back into the money.
- **Permit backlog signal.** Median apply -> issue time spiked during
  2023-2024 -- permit offices were overwhelmed by the rush. Recent
  months are back under 10 days, consistent with SolarAPP+ rollout.
- **NPV calibration.** Default La Jolla profile pays back in ~5 years
  with a 25-year NPV of ~$85K. Sits between the optimistic 100%-retail
  reference and the ultra-conservative 60%-self-consumption
  reference -- consistent with NREL/EnergySage 2025 marketplace
  reports.

## Running the notebook

```bash
cd analysis
uv sync

# Interactive (live sliders, full reactivity)
uv run marimo edit helios_analysis.py

# Read-only app view
uv run marimo run helios_analysis.py

# Static HTML export (for the repo, no Marimo install required)
uv run marimo export html helios_analysis.py \
    -o html/helios_analysis.html --include-code
```

Open `html/helios_analysis.html` directly in a browser to see the
pre-rendered output without running anything.

## Regenerating the screenshots

```bash
uv run python _gen_screenshots.py
```

Writes five PNGs to `screenshots/` corresponding to the headline plots.

## How it talks to the backend

The notebook's `_setup` cell puts `../backend/` and `../backend/econ/`
on `sys.path`, then imports `npv` and `schemas` directly. It
deliberately bypasses `econ/__init__.py` so we don't need the backend's
`httpx` dependency in this analysis env.

The NPV cells monkey-patch `npv.DISCOUNT_RATE`, `npv.DEGRADATION_PER_YEAR`,
and `npv.RATE_ESCALATION_PER_YEAR` at call time from the sliders, then
restore the originals in a `finally` block -- so the sensitivity
analysis is reactive without leaking state.

## Dependency footprint

`analysis/` is a separate uv project from `backend/`. It only needs
`marimo`, `pandas`, `numpy`, `matplotlib`, and `pydantic` (for the
schemas). No FastAPI, no httpx, no pdfplumber.
