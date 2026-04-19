"""Shared helpers for the notebook and screenshot scripts."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
ECON_DIR = BACKEND_DIR / "econ"
CSV_PATH = BACKEND_DIR / "data" / "zenpower_permits.csv"

ANALYSIS_ZENPOWER_COLUMNS = (
    "kilowatt_value",
    "issue_date",
    "apply_date",
    "city",
    "state",
    "postal_code",
    "is_system_size_estimation",
    "is_active",
)


def ensure_backend_paths() -> tuple[Path, Path, Path, Path]:
    for path in (BACKEND_DIR, ECON_DIR):
        path_str = str(path)
        if path_str not in sys.path:
            sys.path.insert(0, path_str)
    return REPO_ROOT, BACKEND_DIR, ECON_DIR, CSV_PATH


def load_zenpower_analysis_frame(csv_path: Path = CSV_PATH) -> pd.DataFrame:
    ensure_backend_paths()
    from zenpower import load_zenpower_frame

    return load_zenpower_frame(csv_path, usecols=ANALYSIS_ZENPOWER_COLUMNS)


def residential_subset(df: pd.DataFrame) -> pd.DataFrame:
    return df[(df["kilowatt_value"] >= 2) & (df["kilowatt_value"] <= 25)].copy()
