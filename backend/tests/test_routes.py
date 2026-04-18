"""Integration tests for FastAPI routes.

Every test runs through ``TestClient(main.app)`` so we exercise the
full dependency chain — auth, orchestrator, econ. External calls are
mocked via the ``mock_orthogonal`` fixture in ``conftest``.
"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient


SAMPLE_PROFILE = {
    "address": "9500 Gilman Dr, La Jolla, CA, 92093, US",
    "lat": 32.8801,
    "lng": -117.234,
    "utility": "SDGE",
    "tariff_plan": "EV-TOU-5",
    "monthly_bill_usd": 240.0,
    "monthly_kwh": 650.0,
    "has_solar": False,
    "has_battery": False,
}


# ---------------------------------------------------------------------------
# Root + health
# ---------------------------------------------------------------------------


def test_root_returns_service_metadata(test_client: TestClient) -> None:
    resp = test_client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "helios"
    assert data["status"] == "ok"


def test_health_reports_zenpower_loaded(test_client: TestClient) -> None:
    resp = test_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["zenpower_loaded"] is True
    assert data["permits_count"] > 0


# ---------------------------------------------------------------------------
# /api/roi
# ---------------------------------------------------------------------------


def test_roi_anonymous_valid_profile_returns_roi_result(test_client: TestClient) -> None:
    resp = test_client.post("/api/roi", json={"profile": SAMPLE_PROFILE})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # ROIResult shape checks
    assert "recommended_system" in data
    assert "solar_kw" in data["recommended_system"]
    assert data["npv_25yr_usd"] != 0.0
    assert data["payback_years"] > 0
    assert data["upfront_cost_usd"] > 0
    assert data["federal_itc_usd"] > 0
    assert "orthogonal_calls_made" in data

    # The orchestrator fires 10 calls.
    assert len(data["orthogonal_calls_made"]) == 10

    # Each call log has the expected shape.
    for c in data["orthogonal_calls_made"]:
        assert "api" in c
        assert "purpose" in c
        assert "latency_ms" in c
        assert c["status"] in {"success", "cached", "error"}


def test_roi_invalid_profile_returns_422(test_client: TestClient) -> None:
    bad_profile = {**SAMPLE_PROFILE, "utility": "BOGUS"}  # utility is a Literal
    resp = test_client.post("/api/roi", json={"profile": bad_profile})
    assert resp.status_code == 422


def test_roi_missing_profile_returns_422(test_client: TestClient) -> None:
    resp = test_client.post("/api/roi", json={})
    assert resp.status_code == 422


def test_roi_respects_proposed_system(test_client: TestClient) -> None:
    resp = test_client.post(
        "/api/roi",
        json={
            "profile": SAMPLE_PROFILE,
            "proposed_system": {"solar_kw": 10.0, "battery_kwh": 20.0},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["recommended_system"]["solar_kw"] == 10.0
    assert data["recommended_system"]["battery_kwh"] == 20.0


# ---------------------------------------------------------------------------
# /api/live
# ---------------------------------------------------------------------------


def test_live_anonymous_returns_recommendation(test_client: TestClient) -> None:
    req = {
        "profile": SAMPLE_PROFILE,
        "current_state": {
            "battery_soc_pct": 60.0,
            "solar_kw_now": 4.0,
            "load_kw_now": 2.0,
            "timestamp": "2026-04-18T17:00:00Z",
        },
    }
    resp = test_client.post("/api/live", json=req)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    valid_actions = {
        "CHARGE_BATTERY_FROM_SOLAR",
        "EXPORT_SOLAR",
        "DISCHARGE_BATTERY_TO_HOUSE",
        "DISCHARGE_BATTERY_TO_GRID",
        "CHARGE_BATTERY_FROM_GRID",
        "HOLD",
    }
    assert data["action"] in valid_actions
    assert "reasoning" in data
    assert isinstance(data["reasoning"], str)
    assert "expected_hourly_gain_usd" in data
    assert "retail_rate_now" in data
    assert "export_rate_now" in data
    assert len(data["forecast_24h"]) == 24

    for fp in data["forecast_24h"]:
        assert "hour_offset" in fp
        assert "retail_rate" in fp
        assert "export_rate" in fp
        assert "solar_kw_forecast" in fp


def test_live_invalid_current_state_returns_422(test_client: TestClient) -> None:
    req = {
        "profile": SAMPLE_PROFILE,
        "current_state": {
            "battery_soc_pct": -1.0,  # NonNegativeFloat
            "solar_kw_now": 4.0,
            "load_kw_now": 2.0,
            "timestamp": "2026-04-18T17:00:00Z",
        },
    }
    resp = test_client.post("/api/live", json=req)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /api/parse-bill
# ---------------------------------------------------------------------------


def test_parse_bill_with_tiny_pdf_returns_shape(
    test_client: TestClient, minimal_pdf: bytes
) -> None:
    """Mock the Anthropic client so we never hit Claude."""

    async def _fake_parse_with_claude(pdf_bytes: bytes):
        from schemas import ParseBillResult

        return ParseBillResult(
            monthly_kwh=720.0,
            utility="PGE",
            tariff_guess="EV2-A",
        )

    with patch(
        "routes.parse_bill._parse_with_claude",
        side_effect=_fake_parse_with_claude,
    ):
        resp = test_client.post(
            "/api/parse-bill",
            files={"file": ("bill.pdf", minimal_pdf, "application/pdf")},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["monthly_kwh"] == 720.0
    assert data["utility"] == "PGE"
    assert data["tariff_guess"] == "EV2-A"


def test_parse_bill_claude_returns_none_falls_back_to_default(
    test_client: TestClient, minimal_pdf: bytes
) -> None:
    """If Claude returns None AND pdfplumber finds nothing useful, we
    should still get the hardcoded default (650 kWh / PGE / EV2-A).
    """

    async def _fake(pdf_bytes: bytes):
        return None

    def _fake_pdfplumber(pdf_bytes: bytes):
        return None

    with patch("routes.parse_bill._parse_with_claude", side_effect=_fake):
        with patch("routes.parse_bill._parse_with_pdfplumber", side_effect=_fake_pdfplumber):
            resp = test_client.post(
                "/api/parse-bill",
                files={"file": ("bill.pdf", minimal_pdf, "application/pdf")},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["monthly_kwh"] == 650.0
    assert data["utility"] == "PGE"


def test_parse_bill_empty_body_returns_default(test_client: TestClient) -> None:
    resp = test_client.post(
        "/api/parse-bill",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["monthly_kwh"] == 650.0


# ---------------------------------------------------------------------------
# /api/zenpower/summary
# ---------------------------------------------------------------------------


def test_zenpower_summary_ca_zip_has_installs(test_client: TestClient) -> None:
    """93230 has ~1.6k permits in the dataset."""
    resp = test_client.get("/api/zenpower/summary", params={"zip": "93230"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["installs_count"] > 0


def test_zenpower_summary_unknown_zip_zero_installs(test_client: TestClient) -> None:
    resp = test_client.get("/api/zenpower/summary", params={"zip": "99999"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["zip"] == "99999"
    assert data["installs_count"] == 0
    assert data["avg_system_kw"] == 0.0


def test_zenpower_summary_requires_zip_param(test_client: TestClient) -> None:
    resp = test_client.get("/api/zenpower/summary")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Auth integration
# ---------------------------------------------------------------------------


def test_roi_with_valid_jwt_returns_200(
    test_client: TestClient, generate_jwt, mock_jwks_server
) -> None:
    """Auth is optional — a valid token should also resolve to 200."""
    token = generate_jwt(sub="integration-user", email="u@h.com")
    resp = test_client.post(
        "/api/roi",
        json={"profile": SAMPLE_PROFILE},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200


def test_roi_with_invalid_jwt_still_returns_200(test_client: TestClient) -> None:
    """Invalid tokens resolve to anonymous — endpoint must still succeed."""
    resp = test_client.post(
        "/api/roi",
        json={"profile": SAMPLE_PROFILE},
        headers={"Authorization": "Bearer totally.bogus.token"},
    )
    assert resp.status_code == 200
