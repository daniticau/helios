"""ZenPower permit dataset — in-memory index for fast per-ZIP lookup.

Loaded once on backend boot (see `main.py` lifespan). Schema follows the
`records.csv` columns documented at
https://github.com/Zen-Power-Solar/DataHacks-ZenPower-Challenge-Spring-2026.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from schemas import ZenPowerSummary

DEFAULT_ZENPOWER_COLUMNS = (
    "kilowatt_value",
    "issue_date",
    "apply_date",
    "latitude",
    "longitude",
    "city",
    "state",
    "postal_code",
    "is_active",
    "is_system_size_estimation",
)


def load_zenpower_frame(
    path: Path,
    *,
    usecols: Sequence[str] | None = None,
) -> pd.DataFrame:
    selected_cols = list(usecols or DEFAULT_ZENPOWER_COLUMNS)
    df = pd.read_csv(
        path,
        usecols=selected_cols,
        dtype={"postal_code": "string"},
    )
    if "postal_code" in df.columns:
        df["postal_code"] = df["postal_code"].str.zfill(5)
    for date_col in ("issue_date", "apply_date"):
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce", utc=True)
    if {"issue_date", "apply_date"}.issubset(df.columns):
        df["permit_days"] = (df["issue_date"] - df["apply_date"]).dt.total_seconds() / 86400.0
    return df


def _build_summary_by_zip(df: pd.DataFrame) -> dict[str, ZenPowerSummary]:
    if df.empty:
        return {}

    grouped = (
        df.groupby("postal_code", sort=False)
        .agg(
            avg_system_kw=("kilowatt_value", "mean"),
            median_permit_days=("permit_days", "median"),
            installs_count=("postal_code", "size"),
        )
        .reset_index()
    )

    summary_by_zip: dict[str, ZenPowerSummary] = {}
    for row in grouped.itertuples(index=False):
        if pd.isna(row.postal_code):
            continue
        zip_code = str(row.postal_code).zfill(5)
        avg_system_kw = 0.0 if pd.isna(row.avg_system_kw) else float(row.avg_system_kw)
        median_permit_days = (
            None if pd.isna(row.median_permit_days) else float(row.median_permit_days)
        )
        summary_by_zip[zip_code] = ZenPowerSummary(
            zip=zip_code,
            avg_system_kw=avg_system_kw,
            median_permit_days=median_permit_days,
            installs_count=int(row.installs_count),
        )
    return summary_by_zip


@dataclass
class ZenPowerIndex:
    df: pd.DataFrame
    summary_by_zip: dict[str, ZenPowerSummary]

    @property
    def n(self) -> int:
        return len(self.df)

    @classmethod
    def load(cls, path: Path) -> ZenPowerIndex | None:
        if not path.exists():
            return None
        df = load_zenpower_frame(path)
        return cls(df=df, summary_by_zip=_build_summary_by_zip(df))

    def summary_for_zip(self, zip_code: str) -> ZenPowerSummary:
        z = str(zip_code).zfill(5)
        return self.summary_by_zip.get(
            z,
            ZenPowerSummary(
                zip=z,
                avg_system_kw=0.0,
                median_permit_days=None,
                installs_count=0,
            ),
        )
