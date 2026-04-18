"""One-shot script to render the key plots from the notebook to PNG.

Not a Marimo notebook -- just reuses the same data pipeline so the
static screenshots match the reactive views. Run:

    uv run python _gen_screenshots.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
ECON_DIR = BACKEND_DIR / "econ"
for _p in (BACKEND_DIR, ECON_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

OUT = Path(__file__).resolve().parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
CSV = BACKEND_DIR / "data" / "zenpower_permits.csv"

# --- Load ------------------------------------------------------------------
raw = pd.read_csv(
    CSV,
    usecols=["kilowatt_value", "issue_date", "apply_date", "state",
             "postal_code", "is_system_size_estimation"],
    dtype={"postal_code": "string"},
)
raw["postal_code"] = raw["postal_code"].str.zfill(5)
raw["issue_date"] = pd.to_datetime(raw["issue_date"], errors="coerce", utc=True)
raw["apply_date"] = pd.to_datetime(raw["apply_date"], errors="coerce", utc=True)
raw["permit_days"] = (raw["issue_date"] - raw["apply_date"]).dt.total_seconds() / 86400.0
residential = raw[(raw["kilowatt_value"] >= 2) & (raw["kilowatt_value"] <= 25)].copy()

# --- 1. System size distribution ------------------------------------------
fig, ax = plt.subplots(figsize=(9, 3.5))
ax.hist(residential["kilowatt_value"], bins=60, edgecolor="white", linewidth=0.3)
med = residential["kilowatt_value"].median()
mean = residential["kilowatt_value"].mean()
ax.axvline(med, linestyle="--", linewidth=1.5, label=f"median {med:.2f} kW")
ax.axvline(mean, linestyle=":", linewidth=1.5, label=f"mean {mean:.2f} kW")
ax.set_xlabel("System size (kW DC)")
ax.set_ylabel("Permit count")
ax.set_title("ZenPower residential system size distribution (n=35,113)")
ax.legend()
fig.tight_layout()
fig.savefig(OUT / "01_size_distribution.png", dpi=130)
plt.close(fig)

# --- 2. NEM 3.0 monthly install trend -------------------------------------
ca = residential[residential["state"] == "CA"].dropna(subset=["issue_date"]).copy()
ca["ym"] = ca["issue_date"].dt.to_period("M").dt.to_timestamp()
monthly = ca.groupby("ym").agg(
    installs=("kilowatt_value", "size"),
    total_kw=("kilowatt_value", "sum"),
).reset_index()
monthly = monthly[monthly["ym"] >= pd.Timestamp("2018-01-01")]
monthly["ma3"] = monthly["installs"].rolling(3, center=True).mean()
monthly["cum_mw"] = monthly["total_kw"].cumsum() / 1000.0

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(11, 7), sharex=True)
ax1.bar(monthly["ym"], monthly["installs"], width=25, alpha=0.5, label="Monthly installs")
ax1.plot(monthly["ym"], monthly["ma3"], color="black", linewidth=1.5, label="3-mo moving avg")
ax1.axvline(pd.Timestamp("2023-04-15"), color="red", linestyle="--", linewidth=1.5,
            label="NEM 3.0 effective")
ax1.set_ylabel("Permits issued (CA)")
ax1.set_title("California residential installs -- NEM 3.0 rush + collapse")
ax1.legend(loc="upper left")
ax2.plot(monthly["ym"], monthly["cum_mw"], linewidth=2, color="seagreen")
ax2.fill_between(monthly["ym"], monthly["cum_mw"], alpha=0.2, color="seagreen")
ax2.set_ylabel("Cumulative MW installed")
ax2.set_xlabel("Month")
ax2.set_title("Cumulative residential capacity (CA)")
fig.autofmt_xdate()
fig.tight_layout()
fig.savefig(OUT / "02_nem3_trend.png", dpi=130)
plt.close(fig)

# --- 3. Permit velocity ----------------------------------------------------
valid = residential.dropna(subset=["permit_days", "issue_date"]).copy()
valid = valid[(valid["permit_days"] >= 0) & (valid["permit_days"] <= 365)]
valid["ym"] = valid["issue_date"].dt.to_period("M").dt.to_timestamp()
monthly_med = valid.groupby("ym").agg(
    median_days=("permit_days", "median"),
    n=("permit_days", "size"),
).reset_index()
monthly_med = monthly_med[monthly_med["n"] >= 20]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
ax1.boxplot([valid["permit_days"].values], vert=False, whis=(5, 95), showfliers=False)
ax1.set_yticks([1])
ax1.set_yticklabels(["All residential"])
ax1.set_xlabel("apply -> issue (days)")
ax1.set_title(f"Permit processing (median {valid['permit_days'].median():.1f} d)")
ax2.plot(monthly_med["ym"], monthly_med["median_days"], marker="o", markersize=3)
ax2.axvline(pd.Timestamp("2023-04-15"), color="red", linestyle="--",
            linewidth=1, label="NEM 3.0 (2023-04-15)")
ax2.set_xlabel("Month")
ax2.set_ylabel("Median permit days")
ax2.set_title("Monthly median processing time")
ax2.legend()
fig.autofmt_xdate()
fig.tight_layout()
fig.savefig(OUT / "03_permit_velocity.png", dpi=130)
plt.close(fig)

# --- 4. NPV cashflow curves -----------------------------------------------
import npv as npv_mod
from schemas import ProposedSystem, UserProfile

profile = UserProfile(
    address="UCSD La Jolla 92037",
    lat=32.88, lng=-117.23,
    utility="SDGE", tariff_plan="EV-TOU-5",
    monthly_bill_usd=273.0, monthly_kwh=650.0,
)
system = ProposedSystem(solar_kw=8.0, battery_kwh=13.5)
roi = npv_mod.compute_roi(profile, system, external={})

from npv import (
    LIFETIME_YEARS,
    MAINTENANCE_USD_PER_YEAR,
    _battery_arbitrage_uplift,
    compute_annual_savings_hourly,
)
year1_tariff, _, _ = compute_annual_savings_hourly(profile, system, 1.0)
arb = _battery_arbitrage_uplift(profile, system)
year1_total = year1_tariff + arb
years = np.arange(1, LIFETIME_YEARS + 1)
degradation = (1 - npv_mod.DEGRADATION_PER_YEAR) ** years
escalation = (1 + npv_mod.RATE_ESCALATION_PER_YEAR) ** years
savings = year1_total * degradation * escalation
maintenance = np.full_like(savings, MAINTENANCE_USD_PER_YEAR, dtype=float)
net_annual = savings - maintenance
cumulative_undisc = np.cumsum(net_annual)
cumulative_npv = np.cumsum(
    net_annual / ((1 + npv_mod.DISCOUNT_RATE) ** years)
)

fig, ax = plt.subplots(figsize=(10, 4.5))
ax.plot(years, cumulative_undisc, marker="o", markersize=3,
        label="Cumulative net (nominal)")
ax.plot(years, cumulative_npv, marker="s", markersize=3,
        label="Cumulative discounted (NPV)")
ax.axhline(roi.net_upfront_usd, color="red", linestyle=":",
           label=f"Net upfront: ${roi.net_upfront_usd:,.0f}")
ax.axhline(0, color="grey", linewidth=0.8)
ax.axvline(roi.payback_years, color="green", linestyle="--",
           label=f"Payback: {roi.payback_years:.1f} yr")
ax.set_xlabel("Year")
ax.set_ylabel("$")
ax.set_title(
    f"NPV validation -- La Jolla / SDGE / 8 kW + 13.5 kWh\n"
    f"25-year NPV: ${roi.npv_25yr_usd:,.0f}   Payback: {roi.payback_years:.1f} yr"
)
ax.legend(loc="lower right")
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(OUT / "04_npv_cashflow.png", dpi=130)
plt.close(fig)

# --- 5. Tariff shape (bonus) ----------------------------------------------
from tariffs import resolve_tariff

t = resolve_tariff("SDGE", "EV-TOU-5")
hours = list(range(24))
fig, ax = plt.subplots(figsize=(10, 3.5))
ax.plot(hours, t.retail_by_hour, marker="o", label="Retail ($/kWh)")
ax.plot(hours, t.export_by_hour, marker="s", label="Export (NEM 3.0 ACC)")
ax.fill_between(hours, t.retail_by_hour, alpha=0.1)
ax.fill_between(hours, t.export_by_hour, alpha=0.1)
ax.set_xticks(range(0, 24, 2))
ax.set_xlabel("Hour of day")
ax.set_ylabel("$/kWh")
ax.set_title("SDGE EV-TOU-5 -- the tariff shape driving the hourly NPV model")
ax.legend()
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(OUT / "05_sdge_tariff.png", dpi=130)
plt.close(fig)

print(f"Wrote {len(list(OUT.glob('*.png')))} screenshots to {OUT}")
