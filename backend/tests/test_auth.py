"""Tests for backend.auth — Supabase JWT verification.

Everything stays offline: JWTs are signed with a throw-away keypair and
the JWKS endpoint is mocked with respx.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

import pytest


def _run(coro):
    """Run a coroutine in a fresh event loop — avoids async-mode fixture wrangling."""
    return asyncio.new_event_loop().run_until_complete(coro)


def test_no_authorization_header_returns_none(mock_jwks_server: dict[str, Any]) -> None:
    from auth import get_optional_user

    result = _run(get_optional_user(authorization=None))
    assert result is None


def test_non_bearer_header_returns_none(mock_jwks_server: dict[str, Any]) -> None:
    from auth import get_optional_user

    result = _run(get_optional_user(authorization="Basic abc123"))
    assert result is None


def test_bearer_without_token_returns_none(mock_jwks_server: dict[str, Any]) -> None:
    from auth import get_optional_user

    result = _run(get_optional_user(authorization="Bearer "))
    assert result is None


def test_malformed_header_no_space_returns_none(mock_jwks_server: dict[str, Any]) -> None:
    from auth import get_optional_user

    result = _run(get_optional_user(authorization="Bearertokenonly"))
    assert result is None


def test_valid_es256_token_returns_user(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    from auth import get_optional_user

    token = generate_jwt(sub="user-es256", email="a@b.com", role="authenticated")
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is not None
    assert user.id == "user-es256"
    assert user.email == "a@b.com"
    assert user.role == "authenticated"


def test_valid_rs256_token_returns_user(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    from auth import get_optional_user

    token = generate_jwt(sub="user-rs256", email="c@d.com", alg="RS256")
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is not None
    assert user.id == "user-rs256"
    assert user.email == "c@d.com"


def test_expired_token_returns_none(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    from auth import get_optional_user

    token = generate_jwt(exp_offset=-120)
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is None


def test_wrong_audience_returns_none(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    from auth import get_optional_user

    token = generate_jwt(audience="some-other-audience")
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is None


def test_wrong_signing_key_returns_none(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    from auth import get_optional_user

    token = generate_jwt(wrong_key=True)
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is None


def test_empty_supabase_url_always_returns_none(
    monkeypatch: pytest.MonkeyPatch,
    generate_jwt: Callable[..., str],
    mock_jwks_server: dict[str, Any],
) -> None:
    import auth
    from auth import get_optional_user
    from config import settings as _settings

    # Pretend auth is not configured.
    monkeypatch.setattr(_settings, "supabase_url", "")
    auth._jwks_client = None

    token = generate_jwt()
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is None


def test_jwks_fetch_error_returns_none(
    generate_jwt: Callable[..., str], monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the JWKS endpoint is unreachable, we must not crash."""
    import jwt as _jwt

    from auth import get_optional_user

    def _boom(self):
        raise _jwt.PyJWKClientError("boom — jwks unreachable")

    monkeypatch.setattr(_jwt.PyJWKClient, "fetch_data", _boom)

    token = generate_jwt()
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is None


def test_extract_bearer_variations() -> None:
    """Unit-level coverage of the bearer-token tokenizer."""
    from auth import _extract_bearer

    assert _extract_bearer(None) is None
    assert _extract_bearer("") is None
    assert _extract_bearer("Bearer abc") == "abc"
    assert _extract_bearer("bearer   abc   ") == "abc"
    assert _extract_bearer("BEARER abc") == "abc"
    assert _extract_bearer("Bearer") is None
    assert _extract_bearer("Basic xyz") is None


def test_garbage_token_returns_none(mock_jwks_server: dict[str, Any]) -> None:
    from auth import get_optional_user

    user = _run(get_optional_user(authorization="Bearer not.a.real.jwt"))
    assert user is None


def test_valid_token_without_email_still_returns_user(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    """email is optional in our User dataclass — make sure that path works."""
    from auth import get_optional_user

    token = generate_jwt(sub="no-email-user", email=None)
    user = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert user is not None
    assert user.id == "no-email-user"
    assert user.email is None


def test_jwks_client_is_cached_between_calls(
    generate_jwt: Callable[..., str], mock_jwks_server: dict[str, Any]
) -> None:
    """Second call should reuse the PyJWKClient singleton (no extra JWKS fetch)."""
    import auth
    from auth import get_optional_user

    token = generate_jwt()
    _ = _run(get_optional_user(authorization=f"Bearer {token}"))
    first_client = auth._jwks_client
    _ = _run(get_optional_user(authorization=f"Bearer {token}"))
    assert auth._jwks_client is first_client
    assert first_client is not None
