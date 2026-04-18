"""Supabase JWT verification — OPTIONAL auth for Helios endpoints.

Uses the NEW Supabase API key model (publishable + secret keys with
asymmetric JWT signing). JWTs are verified against Supabase's JWKS
endpoint — no shared HS256 secret to ship.

Design intent:
- All endpoints continue to accept anonymous requests (200 OK, no token).
- When a valid Supabase-issued JWT is present in the Authorization
  header, we expose a ``User`` object via ``Depends(get_optional_user)``.
- If ``SUPABASE_URL`` is unset, every request is anonymous — no crashes,
  no warnings. The demo flow works without provisioning anything.

JWKS endpoint: ``{SUPABASE_URL}/auth/v1/.well-known/jwks.json``

Supported algorithms: ``ES256`` (Supabase's default) and ``RS256``
(alternate option in Project Settings → API Keys → JWT Signing Keys).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import jwt
from fastapi import Header
from jwt import PyJWKClient, PyJWKClientError

from config import settings

logger = logging.getLogger("helios.auth")

_SUPPORTED_ALGS = ["ES256", "RS256"]

# Lazy JWKS client — first-use fetches keys, then caches them per
# PyJWKClient's built-in cache (max 16 keys, refreshed on kid miss).
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    """Return a cached JWKS client, or None if auth isn't configured."""
    global _jwks_client
    if not settings.supabase_url:
        return None
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(
            jwks_url,
            cache_keys=True,
            max_cached_keys=16,
            lifespan=3600,  # refresh key cache hourly
        )
    return _jwks_client


@dataclass(frozen=True)
class User:
    """Minimal authenticated user context."""

    id: str
    email: str | None
    role: str | None = None


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def _verify_token(token: str) -> User | None:
    """Verify a Supabase-issued JWT via JWKS and return the user, or None."""
    jwks = _get_jwks_client()
    if jwks is None:
        # Auth not configured — treat everything as anonymous.
        return None
    try:
        signing_key = jwks.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=_SUPPORTED_ALGS,
            audience=settings.supabase_jwt_audience,
            options={"require": ["exp", "sub"]},
        )
    except PyJWKClientError as e:
        logger.info("auth: jwks lookup failed (%s)", e)
        return None
    except jwt.ExpiredSignatureError:
        logger.info("auth: token expired")
        return None
    except jwt.InvalidAudienceError:
        logger.info("auth: invalid audience")
        return None
    except jwt.InvalidTokenError as e:
        logger.info("auth: invalid token (%s)", type(e).__name__)
        return None
    sub = claims.get("sub")
    if not isinstance(sub, str):
        return None
    email = claims.get("email")
    role = claims.get("role")
    return User(
        id=sub,
        email=email if isinstance(email, str) else None,
        role=role if isinstance(role, str) else None,
    )


async def get_optional_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> User | None:
    """FastAPI dependency. Returns the user if a valid Bearer JWT is present.

    Never raises — invalid tokens simply resolve to None so that the caller
    can decide whether to gate behavior. Anonymous-first by design.
    """
    token = _extract_bearer(authorization)
    if token is None:
        return None
    user = _verify_token(token)
    if user is not None:
        logger.info("auth: user_id=%s email=%s", user.id, user.email or "-")
    return user
