"""Render the 3-minute demo narration via ElevenLabs.

Reads `demo/narration/script.txt`, splits it into per-scene segments
(delimited by ``--- SEGMENT <name> ---`` markers), synthesizes each
segment against the configured voice, and writes:

    demo/narration/segments/<name>.mp3    one file per scene
    demo/narration/out.mp3                concatenated full track

The concatenation is a naive byte append of the mp3 streams. That
actually works for frame-aligned MPEG-1 Layer 3 audio from ElevenLabs —
players handle sequential frame headers fine. If you need a clean
container boundary for a video editor, import the per-scene files
from ``segments/`` instead.

Usage:

    # from the repo root:
    uv run python demo/narration/generate.py

Env:

    ELEVENLABS_API_KEY    required
    ELEVENLABS_VOICE_ID   optional (default Rachel 21m00Tcm4TlvDq8ikWAM)
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Make the backend package importable so we can reuse eleven_client.
HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
BACKEND = REPO_ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

# Load .env at repo root — the backend config does this automatically
# via pydantic-settings, but this script runs outside FastAPI.
try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]

    load_dotenv(REPO_ROOT / ".env")
except ImportError:
    # python-dotenv is not a backend dep; fall back to manual parse.
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from eleven_client import (  # noqa: E402
    DEFAULT_VOICE_ID,
    ElevenLabsError,
    close,
    synthesize,
)

SCRIPT = HERE / "script.txt"
SEGMENTS_DIR = HERE / "segments"
FULL_OUT = HERE / "out.mp3"


def parse_segments(text: str) -> list[tuple[str, str]]:
    """Split script.txt into (name, body) pairs.

    A segment starts at ``--- SEGMENT <name> ---`` and runs until the
    next such marker or end of file. Comment-only segments (no spoken
    lines) are skipped. Blank lines and ``#`` comments inside a segment
    are stripped from the synthesized body.
    """
    segments: list[tuple[str, str]] = []
    current_name: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        if current_name is None:
            return
        body = "\n".join(
            ln for ln in current_lines if ln.strip() and not ln.lstrip().startswith("#")
        ).strip()
        if body:
            segments.append((current_name, body))

    for raw in text.splitlines():
        stripped = raw.strip()
        if stripped.startswith("--- SEGMENT ") and stripped.endswith("---"):
            flush()
            current_name = stripped[len("--- SEGMENT "):-3].strip()
            current_lines = []
        else:
            current_lines.append(raw)

    flush()
    return segments


async def main() -> int:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        print(
            "ELEVENLABS_API_KEY is not set. Copy .env.example to .env, add your key\n"
            "from https://elevenlabs.io, then rerun this script.",
            file=sys.stderr,
        )
        return 1

    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "").strip() or DEFAULT_VOICE_ID
    print(f"voice: {voice_id}")

    if not SCRIPT.exists():
        print(f"missing: {SCRIPT}", file=sys.stderr)
        return 1

    SEGMENTS_DIR.mkdir(parents=True, exist_ok=True)

    segments = parse_segments(SCRIPT.read_text(encoding="utf-8"))
    if not segments:
        print("no spoken segments found in script.txt", file=sys.stderr)
        return 1

    total_chars = sum(len(body) for _, body in segments)
    print(f"rendering {len(segments)} segments, {total_chars} chars total")

    all_bytes = bytearray()
    try:
        for i, (name, body) in enumerate(segments, start=1):
            print(f"  [{i}/{len(segments)}] {name}  ({len(body)} chars)")
            mp3 = await synthesize(body, voice_id=voice_id)
            out = SEGMENTS_DIR / f"{name}.mp3"
            out.write_bytes(mp3)
            all_bytes.extend(mp3)
    except ElevenLabsError as e:
        print(f"ElevenLabs error: {e}", file=sys.stderr)
        return 2
    finally:
        await close()

    FULL_OUT.write_bytes(bytes(all_bytes))
    print(f"wrote {FULL_OUT}  ({len(all_bytes)} bytes)")
    print(f"segments in {SEGMENTS_DIR}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
