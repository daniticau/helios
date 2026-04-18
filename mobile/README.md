# mobile/

Expo + React Native + TypeScript.

## Quick start

```bash
cd mobile
pnpm install
pnpm start
# scan the QR with Expo Go, or press 'i' for iOS simulator
```

Backend URL is set in `app.json → expo.extra.apiBaseUrl` (defaults to `http://localhost:8000`). If you're running the backend on a laptop and mobile on a physical device, change it to the laptop's LAN IP or ngrok URL.

## Files

| File | Purpose |
|------|---------|
| `App.tsx` | Phase 0 smoke test — fires `POST /api/roi` |
| `src/shared/config.ts` | API base URL |
| `src/shared/api.ts` | Typed HTTP client |
| `src/shared/store.ts` | Zustand profile store + demo profile |
| `src/shared/types.ts` | TS wire types — mirror of `backend/schemas.py` |
| `src/modeA/` | Install ROI flow (WS3 owns) |
| `src/modeB/` | Live arbitrage flow (WS4 owns) |

## Phase 1 TODO

- WS3 replaces the Phase 0 `App.tsx` with a real navigator (Onboard → AgentRunning → ROIResult). The `OrthogonalTicker` animation in `AgentRunning` is the demo hero; polish beyond everything else.
- WS4 builds the live dashboard + widget preview + push notif.
