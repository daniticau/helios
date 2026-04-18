"""Tests for backend.orchestrator — parallel fan-out + helpers."""

from __future__ import annotations

import asyncio

import httpx
import respx

from orchestrator import (
    _extract_zip,
    _state_from_profile,
    _timed_call,
    gather_for_live,
    gather_for_roi,
)
from schemas import UserProfile


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _profile(address: str = "9500 Gilman Dr, La Jolla, CA, 92093, US") -> UserProfile:
    return UserProfile(
        address=address,
        lat=32.8801,
        lng=-117.234,
        utility="SDGE",
        tariff_plan="EV-TOU-5",
        monthly_bill_usd=240.0,
        monthly_kwh=650.0,
    )


# ---------------------------------------------------------------------------
# _extract_zip
# ---------------------------------------------------------------------------


def test_extract_zip_with_standard_format() -> None:
    assert _extract_zip("9500 Gilman Dr, La Jolla, CA, 92093, US") == "92093"


def test_extract_zip_with_no_zip_falls_back_to_default() -> None:
    assert _extract_zip("Somewhere, CA") == "92093"


def test_extract_zip_picks_first_five_digit_run() -> None:
    # Four-digit numbers should be skipped, five-digit numbers picked.
    assert _extract_zip("Apt 1234 Main St, 90210") == "90210"


def test_extract_zip_ignores_six_digit_number() -> None:
    """Six-digit numbers must not be mistaken for a ZIP (regex bounds
    enforce word boundaries)."""
    assert _extract_zip("Box 123456") == "92093"


# ---------------------------------------------------------------------------
# _state_from_profile
# ---------------------------------------------------------------------------


def test_state_from_profile_extracts_two_letter_code() -> None:
    p = _profile()
    assert _state_from_profile(p) == "CA"


def test_state_from_profile_defaults_to_ca_when_missing() -> None:
    p = _profile(address="9500 Gilman Dr, La Jolla, 92093")
    assert _state_from_profile(p) == "CA"


# ---------------------------------------------------------------------------
# _timed_call
# ---------------------------------------------------------------------------


def test_timed_call_success_records_latency_and_status() -> None:
    async def _fn() -> dict:
        await asyncio.sleep(0.005)
        return {"ok": True}

    payload, log = _run(
        _timed_call("TestAPI", "demo", cache_key=None, ttl_seconds=60, coro_factory=_fn)
    )
    assert payload == {"ok": True}
    assert log.status == "success"
    assert log.api == "TestAPI"
    assert log.latency_ms >= 0
    assert log.error_message is None


def test_timed_call_exception_captures_error_message() -> None:
    async def _fn() -> dict:
        raise RuntimeError("simulated failure")

    payload, log = _run(
        _timed_call("TestAPI", "demo", cache_key=None, ttl_seconds=60, coro_factory=_fn)
    )
    assert payload == {}
    assert log.status == "error"
    assert "simulated failure" in (log.error_message or "")


def test_timed_call_cache_hit_returns_cached_log() -> None:
    """Second call with the same cache_key should short-circuit to the cache."""
    from cache import cache as ttl_cache
    from config import settings as _settings

    ttl_cache.clear()
    _settings.cache_enabled = True

    call_count = {"n": 0}

    async def _fn() -> dict:
        call_count["n"] += 1
        return {"n": call_count["n"]}

    p1, log1 = _run(_timed_call("A", "p", "k1", 60, _fn))
    assert log1.status == "success"
    p2, log2 = _run(_timed_call("A", "p", "k1", 60, _fn))
    assert log2.status == "cached"
    assert p2 == p1
    # Factory should only run once.
    assert call_count["n"] == 1


def test_timed_call_timeout_returns_error() -> None:
    """If the factory coroutine exceeds orthogonal_timeout_seconds, we
    get a status=error with a 'timeout' message."""
    from config import settings as _settings

    original = _settings.orthogonal_timeout_seconds
    _settings.orthogonal_timeout_seconds = 0.1

    async def _slow() -> dict:
        await asyncio.sleep(5.0)
        return {"ok": True}

    try:
        payload, log = _run(
            _timed_call("Slow", "p", cache_key=None, ttl_seconds=60, coro_factory=_slow)
        )
    finally:
        _settings.orthogonal_timeout_seconds = original

    assert payload == {}
    assert log.status == "error"
    assert "timeout" in (log.error_message or "").lower()


# ---------------------------------------------------------------------------
# gather_for_roi / gather_for_live (integration with respx)
# ---------------------------------------------------------------------------


def _make_orthogonal_route(
    mock: respx.MockRouter, handler=None, always_fail: bool = False
) -> None:
    def _default(request: httpx.Request) -> httpx.Response:
        import json

        payload = json.loads(request.content or b"{}")
        api = payload.get("api")

        if always_fail:
            return httpx.Response(500, text="partner down")

        if api == "precip":
            hours = []
            for i in range(48):
                hour = i % 24
                watts = 800 if 6 <= hour <= 19 else 0
                hours.append({"DSWRF": watts, "startTime": f"h{i}"})
            return httpx.Response(
                200,
                json={
                    "success": True,
                    "priceCents": 1,
                    "data": {"hours": hours},
                    "requestId": "test",
                },
            )
        if api == "linkup":
            return httpx.Response(
                200,
                json={
                    "success": True,
                    "priceCents": 1,
                    "data": {
                        "apr_low": 0.07,
                        "apr_high": 0.1,
                        "usd_per_watt_low": 3.2,
                        "usd_per_watt_high": 4.5,
                        "estimated_value_usd": 900_000,
                        "usd_per_ton_co2": 185,
                        "results": [
                            {"name": "n", "url": "u", "content": "c"},
                        ],
                    },
                    "requestId": "test",
                },
            )
        if api == "aviato":
            return httpx.Response(
                200,
                json={
                    "success": True,
                    "data": {"id": "aviato-abc", "URLs": {"linkedin": "x"}},
                    "requestId": "test",
                },
            )
        if api == "peopledatalabs":
            return httpx.Response(
                200,
                json={
                    "success": True,
                    "data": {
                        "employee_count": 10000,
                        "industry": "utilities",
                        "size": "10001+",
                    },
                    "requestId": "test",
                },
            )
        return httpx.Response(
            200,
            json={"success": True, "data": {}, "requestId": "test"},
        )

    mock.post("https://api.orthogonal.com/v1/run").mock(side_effect=handler or _default)


def test_gather_for_roi_returns_all_ten_keys() -> None:
    from config import settings as _settings

    _settings.orthogonal_api_key = "orth_test"

    with respx.mock(assert_all_called=False) as mock:
        _make_orthogonal_route(mock)
        mock.get("https://oasis.caiso.com/oasisapi/SingleZip").mock(
            return_value=httpx.Response(500, text="oasis down")
        )
        result = _run(gather_for_roi(_profile(), zenpower=None))

    assert "calls" in result
    assert len(result["calls"]) == 10
    expected_keys = {
        "tariff",
        "weather",
        "installer_pricing",
        "financing",
        "news",
        "property_value",
        "demographics",
        "reviews",
        "carbon_price",
        "zenpower",
    }
    returned_keys = set(result.keys()) - {"calls", "caiso_lmp_24h"}
    assert expected_keys.issubset(returned_keys), returned_keys


def test_gather_for_roi_handles_partner_500_as_error_logs() -> None:
    """With every Orthogonal call returning 500, we still get 10 logs —
    the status just flips to error.
    """
    from config import settings as _settings

    _settings.orthogonal_api_key = "orth_test"

    with respx.mock(assert_all_called=False) as mock:
        _make_orthogonal_route(mock, always_fail=True)
        mock.get("https://oasis.caiso.com/oasisapi/SingleZip").mock(
            return_value=httpx.Response(500, text="oasis down")
        )
        result = _run(gather_for_roi(_profile(), zenpower=None))

    assert len(result["calls"]) == 10
    # The ZenPower one still succeeds (local CSV — but we passed None so
    # it errors out with "CSV not loaded"). Orthogonal-backed ones will
    # all be "error". At minimum we should have error entries.
    statuses = [c.status for c in result["calls"]]
    assert "error" in statuses


def test_gather_for_live_has_expected_keys() -> None:
    from config import settings as _settings

    _settings.orthogonal_api_key = "orth_test"

    with respx.mock(assert_all_called=False) as mock:
        _make_orthogonal_route(mock)
        mock.get("https://oasis.caiso.com/oasisapi/SingleZip").mock(
            return_value=httpx.Response(500, text="oasis down")
        )
        result = _run(gather_for_live(_profile()))

    # Expected per orchestrator: weather + caiso_lmp + news + calls.
    assert "calls" in result
    assert len(result["calls"]) == 3
    assert "weather" in result
    assert "news" in result
    assert "caiso_lmp" in result


def test_gather_for_live_fetches_caiso_when_available() -> None:
    """When the CAISO endpoint returns a valid zipped CSV, the
    orchestrator should expose ``caiso_lmp_24h`` in the result.
    """
    from tests.test_caiso import _build_oasis_zip
    from config import settings as _settings

    _settings.orthogonal_api_key = "orth_test"

    zip_bytes = _build_oasis_zip([35.0 + i for i in range(24)])

    with respx.mock(assert_all_called=False) as mock:
        _make_orthogonal_route(mock)
        mock.get("https://oasis.caiso.com/oasisapi/SingleZip").mock(
            return_value=httpx.Response(200, content=zip_bytes)
        )
        result = _run(gather_for_live(_profile()))

    lmp_entry = result.get("caiso_lmp")
    assert isinstance(lmp_entry, dict)
    series = lmp_entry.get("hourly_usd_kwh")
    assert isinstance(series, list)
    assert len(series) == 24
    # Promoted flat list:
    assert "caiso_lmp_24h" in result
    assert len(result["caiso_lmp_24h"]) == 24
