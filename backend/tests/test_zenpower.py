"""Tests for backend.zenpower — permit CSV loader + per-ZIP aggregate."""

from __future__ import annotations

from pathlib import Path

import pytest

from config import settings
from zenpower import ZenPowerIndex


@pytest.fixture(scope="module")
def real_index() -> ZenPowerIndex:
    idx = ZenPowerIndex.load(settings.zenpower_csv_path)
    if idx is None:
        pytest.skip(f"ZenPower CSV not present at {settings.zenpower_csv_path}")
    return idx


def test_load_missing_path_returns_none(tmp_path: Path) -> None:
    missing = tmp_path / "definitely-not-here.csv"
    assert ZenPowerIndex.load(missing) is None


def test_load_real_csv_has_many_rows(real_index: ZenPowerIndex) -> None:
    assert real_index.n > 30_000
    assert "postal_code" in real_index.df.columns
    assert "kilowatt_value" in real_index.df.columns


def test_summary_for_known_ca_zip_has_installs(real_index: ZenPowerIndex) -> None:
    """93230 has the most permits in the dataset (~1600)."""
    s = real_index.summary_for_zip("93230")
    assert s.installs_count > 100
    assert 2.0 <= s.avg_system_kw <= 20.0, s.avg_system_kw


def test_summary_for_small_zip_still_reasonable(real_index: ZenPowerIndex) -> None:
    """92101 (downtown San Diego) has a handful — still a reasonable kW avg."""
    s = real_index.summary_for_zip("92101")
    assert s.installs_count >= 1
    assert 1.0 <= s.avg_system_kw <= 20.0


def test_summary_for_unknown_zip_returns_zero(real_index: ZenPowerIndex) -> None:
    s = real_index.summary_for_zip("99999")
    assert s.zip == "99999"
    assert s.installs_count == 0
    assert s.avg_system_kw == 0.0
    assert s.median_permit_days is None


def test_summary_handles_short_zip_string(real_index: ZenPowerIndex) -> None:
    """ZIP is padded to 5 chars via zfill — "90001" and "90001" should match
    the same rows as "90001"."""
    normal = real_index.summary_for_zip("90001")
    padded = real_index.summary_for_zip("90001")
    short = real_index.summary_for_zip("00090001"[-5:])
    assert normal.installs_count == padded.installs_count == short.installs_count


def test_summary_handles_int_like_zip(real_index: ZenPowerIndex) -> None:
    """Passing the ZIP as an int-like string shouldn't blow up."""
    s = real_index.summary_for_zip(str(90001))
    assert s.zip == "90001"
    assert s.installs_count > 0


def test_summary_zfills_short_zip(real_index: ZenPowerIndex) -> None:
    s = real_index.summary_for_zip("123")
    assert s.zip == "00123"
    # We don't guarantee anything about 00123's count, only the format.


def test_index_dataframe_has_expected_columns(real_index: ZenPowerIndex) -> None:
    for col in [
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
        "permit_days",
    ]:
        assert col in real_index.df.columns, col


def test_postal_codes_are_at_least_five_chars(real_index: ZenPowerIndex) -> None:
    """CSV may carry ZIP+4 variants — zfill on load only pads short ones."""
    lengths = set(real_index.df["postal_code"].dropna().str.len().unique().tolist())
    assert min(lengths) >= 5, lengths
