"""Shared fixtures for the backend test suite.

Responsibilities:

- Add the backend package root to ``sys.path`` so tests can import
  ``main``, ``auth`` etc. directly.
- Mint throw-away ES256 / RS256 JWTs for auth tests without touching
  Supabase.
- Mock the Supabase JWKS endpoint so ``PyJWKClient`` can verify those
  tokens offline.
- Reset the module-level ``_jwks_client`` cache in ``auth`` between
  tests so settings/mocks compose cleanly.
- Provide a shared ``TestClient`` wired to ``main.app`` with every
  Orthogonal fan-out mocked so route tests run without network.
"""

from __future__ import annotations

import json
import sys
import time
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import httpx
import jwt
import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


# ---------------------------------------------------------------------------
# Settings + module-state reset
# ---------------------------------------------------------------------------

TEST_SUPABASE_URL = "https://test-project.supabase.co"
TEST_AUDIENCE = "authenticated"


@pytest.fixture(autouse=True)
def _reset_auth_and_cache(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Reset auth + orchestrator caches between tests.

    Autouse so every test starts with a clean ``_jwks_client`` and empty
    TTL cache. Also points ``settings.supabase_url`` at the test URL and
    sets a known audience.
    """
    import auth
    from cache import cache as ttl_cache
    from config import settings as _settings

    # Patch settings for the duration of the test.
    monkeypatch.setattr(_settings, "supabase_url", TEST_SUPABASE_URL)
    monkeypatch.setattr(_settings, "supabase_jwt_audience", TEST_AUDIENCE)

    # Clear the lazy JWKS client cache.
    auth._jwks_client = None
    # Clear TTL cache to keep tests independent.
    ttl_cache.clear()
    try:
        yield
    finally:
        auth._jwks_client = None
        ttl_cache.clear()


# ---------------------------------------------------------------------------
# RSA / ES256 keypairs for signing test JWTs
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def ec_keypair() -> dict[str, Any]:
    """Session-wide ES256 keypair + JWKS representation."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Export PEM strings for PyJWT signing.
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    numbers = public_key.public_numbers()
    # 32-byte big-endian x / y for P-256
    def _b64u_uint(n: int) -> str:
        import base64

        raw = n.to_bytes(32, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": _b64u_uint(numbers.x),
        "y": _b64u_uint(numbers.y),
        "kid": "test-es256-kid",
        "alg": "ES256",
        "use": "sig",
    }
    return {
        "private_pem": private_pem,
        "public_key": public_key,
        "jwk": jwk,
        "kid": "test-es256-kid",
        "alg": "ES256",
    }


@pytest.fixture(scope="session")
def rsa_keypair() -> dict[str, Any]:
    """Session-wide RSA 2048 keypair + JWKS representation."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    numbers = public_key.public_numbers()

    def _b64u_uint(n: int) -> str:
        import base64

        length = (n.bit_length() + 7) // 8
        raw = n.to_bytes(length, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    jwk = {
        "kty": "RSA",
        "n": _b64u_uint(numbers.n),
        "e": _b64u_uint(numbers.e),
        "kid": "test-rs256-kid",
        "alg": "RS256",
        "use": "sig",
    }
    return {
        "private_pem": private_pem,
        "public_key": public_key,
        "jwk": jwk,
        "kid": "test-rs256-kid",
        "alg": "RS256",
    }


# ---------------------------------------------------------------------------
# JWT minting helper
# ---------------------------------------------------------------------------


@pytest.fixture
def generate_jwt(
    ec_keypair: dict[str, Any], rsa_keypair: dict[str, Any]
) -> Callable[..., str]:
    """Return a function that mints a signed JWT with custom claims.

    Usage:
        token = generate_jwt(sub="user-1", email="x@y.com")
        token = generate_jwt(alg="RS256", audience="wrong")
        token = generate_jwt(exp_offset=-60)  # expired token

    The default algorithm is ES256 (Supabase's default). ``wrong_key=True``
    signs with a freshly generated, unpublished key to simulate forged
    tokens.
    """

    def _make(
        sub: str = "test-user-id",
        email: str | None = "test@example.com",
        role: str | None = "authenticated",
        audience: str = TEST_AUDIENCE,
        alg: str = "ES256",
        exp_offset: int = 3600,
        wrong_key: bool = False,
        extra_claims: dict | None = None,
    ) -> str:
        keypair = ec_keypair if alg == "ES256" else rsa_keypair
        if wrong_key:
            if alg == "ES256":
                rogue = ec.generate_private_key(ec.SECP256R1())
            else:
                rogue = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            private_pem = rogue.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        else:
            private_pem = keypair["private_pem"]

        now = int(time.time())
        claims = {
            "sub": sub,
            "iss": f"{TEST_SUPABASE_URL}/auth/v1",
            "aud": audience,
            "iat": now,
            "exp": now + exp_offset,
            "role": role,
        }
        if email is not None:
            claims["email"] = email
        if extra_claims:
            claims.update(extra_claims)

        return jwt.encode(
            claims,
            private_pem,
            algorithm=alg,
            headers={"kid": keypair["kid"]},
        )

    return _make


# ---------------------------------------------------------------------------
# JWKS endpoint mock
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_jwks_server(
    ec_keypair: dict[str, Any],
    rsa_keypair: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[dict[str, Any]]:
    """Patch ``PyJWKClient.fetch_data`` to return a canned JWK set.

    We don't go through the wire at all. ``PyJWKClient`` normally calls
    ``urllib.request.urlopen`` directly so respx cannot intercept it.
    Patching the method keeps tests hermetic and fast.
    """
    jwks_body = {"keys": [ec_keypair["jwk"], rsa_keypair["jwk"]]}

    def _fake_fetch(self):
        # Honour the PyJWKClient cache contract the real method does.
        if getattr(self, "jwk_set_cache", None) is not None:
            self.jwk_set_cache.put(jwks_body)
        return jwks_body

    import jwt as _jwt

    monkeypatch.setattr(_jwt.PyJWKClient, "fetch_data", _fake_fetch)
    yield {"jwks_body": jwks_body}


# ---------------------------------------------------------------------------
# Orthogonal + Precip + CAISO mocks
# ---------------------------------------------------------------------------


def _orth_success(data: dict) -> dict:
    """Envelope Orthogonal returns for a successful partner call."""
    return {"success": True, "priceCents": 1, "data": data, "requestId": "test-req"}


@pytest.fixture
def mock_orthogonal(
    ec_keypair: dict[str, Any], rsa_keypair: dict[str, Any]
) -> Iterator[respx.MockRouter]:
    """Mock every Orthogonal partner endpoint with canned responses.

    Keyed on the partner slug in the POST body so one route handles all
    ``/v1/run`` calls. Route tests depend on this so they never hit real
    network.
    """
    from config import settings as _settings

    # Ensure the orthogonal_client treats auth as configured.
    _settings.orthogonal_api_key = "orth_test_key"

    jwks_body = {"keys": [ec_keypair["jwk"], rsa_keypair["jwk"]]}
    jwks_url = f"{TEST_SUPABASE_URL}/auth/v1/.well-known/jwks.json"

    def _run_handler(request: httpx.Request) -> httpx.Response:
        try:
            payload = json.loads(request.content or b"{}")
        except json.JSONDecodeError:
            payload = {}
        api = payload.get("api")
        body = payload.get("body") or {}

        if api == "precip":
            hours = []
            # 48h of W/m^2, midday peak around noon UTC.
            for i in range(48):
                hour = i % 24
                watts = 0
                if 6 <= hour <= 19:
                    watts = int(900 * max(0, 1 - ((hour - 13) / 7) ** 2))
                hours.append({"DSWRF": watts, "startTime": f"h{i}"})
            return httpx.Response(200, json=_orth_success({"hours": hours}))

        if api == "linkup":
            output_type = body.get("outputType")
            if output_type == "structured":
                # Flexible — return something valid for each schema variant.
                return httpx.Response(
                    200,
                    json=_orth_success(
                        {
                            "apr_low": 0.069,
                            "apr_high": 0.099,
                            "lenders": ["GoodLeap", "Sunlight Financial"],
                            "usd_per_watt_low": 3.2,
                            "usd_per_watt_high": 4.5,
                            "estimated_value_usd": 950_000.0,
                            "source": "linkup",
                            "usd_per_ton_co2": 185.0,
                            "source_note": "EPA 2023 mock",
                            "peak_usd_per_kwh": 0.55,
                            "offpeak_usd_per_kwh": 0.26,
                            "peak_hours": "4pm-9pm",
                            "plan_name": "EV-TOU-5",
                        }
                    ),
                )
            return httpx.Response(
                200,
                json=_orth_success(
                    {
                        "results": [
                            {
                                "name": "CA solar rebate update",
                                "url": "https://example.com/r1",
                                "content": "Rebate details here.",
                            }
                        ]
                    }
                ),
            )

        if api == "aviato":
            return httpx.Response(
                200,
                json=_orth_success(
                    {
                        "id": "aviato-123",
                        "URLs": {"linkedin": "https://linkedin.com/company/sunrun"},
                    }
                ),
            )

        if api == "peopledatalabs":
            return httpx.Response(
                200,
                json=_orth_success(
                    {
                        "employee_count": 24000,
                        "industry": "utilities",
                        "size": "10001+",
                    }
                ),
            )

        # Unknown partner — return an empty data envelope.
        return httpx.Response(200, json=_orth_success({}))

    with respx.mock(assert_all_mocked=False, assert_all_called=False) as mock:
        # JWKS (so auth tests in a combined run still work even without
        # explicitly opting into mock_jwks_server).
        mock.get(jwks_url).mock(return_value=httpx.Response(200, json=jwks_body))
        # Orthogonal gateway
        mock.post("https://api.orthogonal.com/v1/run").mock(side_effect=_run_handler)
        # CAISO OASIS — default to 500 so live route doesn't actually fetch
        mock.get("https://oasis.caiso.com/oasisapi/SingleZip").mock(
            return_value=httpx.Response(500, text="oasis unavailable")
        )
        yield mock


# ---------------------------------------------------------------------------
# FastAPI TestClient
# ---------------------------------------------------------------------------


@pytest.fixture
def test_client(mock_orthogonal: respx.MockRouter) -> Iterator[Any]:
    """TestClient for the FastAPI app with lifespan (ZenPower load) active.

    TestClient as a context manager triggers startup/shutdown so
    ``app.state.zenpower`` is populated before the first request.
    """
    from fastapi.testclient import TestClient

    from main import app

    with TestClient(app) as client:
        yield client


# ---------------------------------------------------------------------------
# Small utilities
# ---------------------------------------------------------------------------


def make_minimal_pdf_bytes() -> bytes:
    """Return a tiny but valid single-page PDF.

    Small enough (~300 bytes) to embed in tests. Used by the parse-bill
    route test; the content is inconsequential because Anthropic is
    mocked.
    """
    try:
        import io

        from reportlab.pdfgen import canvas

        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 750, "Test utility bill - 650 kWh - PG&E")
        c.showPage()
        c.save()
        return buf.getvalue()
    except Exception:  # pragma: no cover - reportlab import guard
        # Minimal hand-rolled PDF (1 page, no content); enough to be
        # detectable as a PDF by naive readers.
        return (
            b"%PDF-1.4\n"
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n"
            b"xref\n0 4\n0000000000 65535 f \n"
            b"0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \n"
            b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n153\n%%EOF"
        )


@pytest.fixture
def minimal_pdf() -> bytes:
    return make_minimal_pdf_bytes()


__all__ = [
    "TEST_AUDIENCE",
    "TEST_SUPABASE_URL",
    "ec_keypair",
    "generate_jwt",
    "make_minimal_pdf_bytes",
    "minimal_pdf",
    "mock_jwks_server",
    "mock_orthogonal",
    "rsa_keypair",
    "test_client",
]
