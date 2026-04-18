"""Thin async wrapper around the ElevenLabs REST text-to-speech API.

ElevenLabs ships an official Python SDK, but we deliberately keep this
integration to raw httpx calls to avoid adding a dependency: the only
thing we need is one POST that streams mp3 bytes back. See
https://elevenlabs.io/docs/api-reference/text-to-speech for the spec.

Usage:

    mp3 = await synthesize("hello from helios", voice_id="21m00Tcm4TlvDq8ikWAM")

Configuration is read from environment variables via ``config.Settings``:

    ELEVENLABS_API_KEY   — required; returns a 503-style error if missing
    ELEVENLABS_VOICE_ID  — default voice (Rachel)

The module exposes ``synthesize()`` plus a ``close()`` coroutine that the
FastAPI lifespan calls on shutdown to release the connection pool. An
``ElevenLabsError`` is raised on any HTTP/API failure; route handlers
translate that to a 502/503 for the client.
"""

from __future__ import annotations

import asyncio
import os

import httpx

BASE_URL = "https://api.elevenlabs.io/v1"

# Rachel — clean American female voice that ships with every free account.
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# Low-latency model that still sounds human. See:
# https://elevenlabs.io/docs/models#eleven-turbo-v2-5
DEFAULT_MODEL_ID = "eleven_turbo_v2_5"


class ElevenLabsError(RuntimeError):
    """Raised when the ElevenLabs API returns an HTTP error or bad payload."""


_client: httpx.AsyncClient | None = None
_client_lock = asyncio.Lock()


def _get_api_key() -> str | None:
    """Return the ElevenLabs API key from env, or ``None`` if unset.

    We read at call time (not import time) so the env loading order works
    whether the backend is invoked through uvicorn, pytest, or the demo
    script in ``demo/narration/generate.py``.
    """
    return os.getenv("ELEVENLABS_API_KEY") or None


def _get_voice_id() -> str:
    return os.getenv("ELEVENLABS_VOICE_ID") or DEFAULT_VOICE_ID


async def get_client() -> httpx.AsyncClient:
    """Return a shared async httpx client. Created lazily on first use."""
    global _client
    if _client is None:
        async with _client_lock:
            if _client is None:
                _client = httpx.AsyncClient(
                    base_url=BASE_URL,
                    timeout=httpx.Timeout(30.0),
                    headers={
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "User-Agent": "helios-backend/0.1",
                    },
                    limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
                )
    return _client


async def synthesize(
    text: str,
    *,
    voice_id: str | None = None,
    model_id: str = DEFAULT_MODEL_ID,
    stability: float = 0.55,
    similarity_boost: float = 0.75,
    style: float = 0.0,
    use_speaker_boost: bool = True,
) -> bytes:
    """Synthesize narration and return raw mp3 bytes.

    Args:
        text: narration text. Roughly 2.5 chars/second at natural pace; keep
            under 2500 chars per call (ElevenLabs free-tier request cap).
        voice_id: ElevenLabs voice ID. Defaults to env ``ELEVENLABS_VOICE_ID``
            or the Rachel voice (``21m00Tcm4TlvDq8ikWAM``).
        model_id: ``eleven_turbo_v2_5`` is a good default — fast, human.
        stability: 0–1. Lower = more expressive, higher = more consistent.
        similarity_boost: 0–1. Higher = closer to the voice clone baseline.
        style: 0–1. Higher = more stylistic exaggeration. Keep near 0 for news.
        use_speaker_boost: boost perceived speaker similarity (small quality hit).

    Returns:
        Raw ``audio/mpeg`` bytes suitable for streaming to a client.

    Raises:
        ElevenLabsError: if the API key is unset, or the request fails.
    """
    api_key = _get_api_key()
    if not api_key:
        raise ElevenLabsError(
            "ELEVENLABS_API_KEY is not configured. "
            "Sign up at https://elevenlabs.io and add your key to .env."
        )

    voice = voice_id or _get_voice_id()
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": style,
            "use_speaker_boost": use_speaker_boost,
        },
    }

    client = await get_client()
    resp = await client.post(
        f"/text-to-speech/{voice}",
        json=payload,
        headers={"xi-api-key": api_key},
    )
    if resp.status_code >= 400:
        # Surface the API's error body verbatim for easier debugging.
        try:
            err = resp.json()
        except ValueError:
            err = {"error": resp.text[:300]}
        raise ElevenLabsError(
            f"ElevenLabs TTS HTTP {resp.status_code}: {err}"
        )

    content = resp.content
    if not content:
        raise ElevenLabsError("ElevenLabs returned an empty audio payload")
    return content


async def close() -> None:
    """Release the shared httpx client. Called from FastAPI lifespan exit."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


__all__ = [
    "DEFAULT_MODEL_ID",
    "DEFAULT_VOICE_ID",
    "ElevenLabsError",
    "close",
    "get_client",
    "synthesize",
]
