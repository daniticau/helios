#!/usr/bin/env bash
# Full-stack dev loop: sync the current LAN/Tailscale IP into mobile/.env,
# start the FastAPI backend, then start Metro for the mobile dev client.
# Ctrl+C stops both cleanly.
#
# Usage (from any directory):
#   bash scripts/dev.sh

set -euo pipefail

# Resolve repo root regardless of invocation path.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "→ syncing mobile/.env with current Tailscale/LAN IP…"
(cd mobile && node scripts/sync-dev-ip.mjs)

echo "→ starting backend (uvicorn) on :8000…"
(cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "→ shutting down backend (pid $BACKEND_PID)…"
  kill "$BACKEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ starting Metro (--dev-client). open Helios on your phone."
cd mobile
npx expo start --dev-client
