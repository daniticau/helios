"""Supabase JWT verification — OPTIONAL auth for Helios endpoints.

Design intent (see agent spec):
- All endpoints continue to accept anonymous requests (200 OK, no token).
- When a valid Supabase-issued JWT is present in the Authorization header,
  we expose a `User` object to route handlers via `Depends(get_optional_user)`.
- Hackathon setup uses Supabase's legacy HS256 secret. JWKS/RS256 is a
  stretch goal but the verification code is kept tight so swapping later
  is a one-file change.
- If SUPABASE_JWT_SECRET is unset, every request is anonymous — no crashes,
  no warnings, demo flow just works.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import jwt
from fastapi import Header

from config import settings

logger = logging.getLogger("helios.auth")


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
    """Verify a Supabase-issued HS256 JWT and return the user, or None."""
    secret = settings.supabase_jwt_secret
    if not secret:
        # Auth not configured — treat everything as anonymous.
        return None
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
            options={"require": ["exp", "sub"]},
        )
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
