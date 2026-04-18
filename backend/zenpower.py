"""ZenPower permit dataset — in-memory index for fast per-ZIP lookup.

Loaded once on backend boot (see `main.py` lifespan). Schema follows the
`records.csv` columns documented at
https://github.com/Zen-Power-Solar/DataHacks-ZenPower-Challenge-Spring-2026.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from schemas import ZenPowerSummary


@dataclass
class ZenPowerIndex:
    df: pd.DataFrame

    @property
    def n(self) -> int:
        return len(self.df)

    @classmethod
    def load(cls, path: Path) -> ZenPowerIndex | None:
        if not path.exists():
            return None
        df = pd.read_csv(
            path,
            usecols=[
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
            ],
            dtype={"postal_code": "string"},
        )
        df["postal_code"] = df["postal_code"].str.zfill(5)
        df["issue_date"] = pd.to_datetime(df["issue_date"], errors="coerce", utc=True)
        df["apply_date"] = pd.to_datetime(df["apply_date"], errors="coerce", utc=True)
        df["permit_days"] = (df["issue_date"] - df["apply_date"]).dt.total_seconds() / 86400.0
        return cls(df=df)

    def summary_for_zip(self, zip_code: str) -> ZenPowerSummary:
        z = str(zip_code).zfill(5)
        sub = self.df[self.df["postal_code"] == z]
        if sub.empty:
            return ZenPowerSummary(
                zip=z, avg_system_kw=0.0, median_permit_days=None, installs_count=0
            )
        kw = sub["kilowatt_value"].dropna()
        days = sub["permit_days"].dropna()
        return ZenPowerSummary(
            zip=z,
            avg_system_kw=float(kw.mean()) if not kw.empty else 0.0,
            median_permit_days=float(days.median()) if not days.empty else None,
            installs_count=int(len(sub)),
        )
