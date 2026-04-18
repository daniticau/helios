# mobile/

Expo + React Native + TypeScript.

## Quick start

```bash
cd mobile
cp .env.example .env  # fill in Supabase URL + publishable key
npm install
npm start
# scan the QR with Expo Go, or press 'i' for iOS simulator
```

Config is resolved at runtime by `app.config.js`, which merges `app.json` with env vars from `mobile/.env`:

| Env var | Purpose |
|---------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend URL (laptop LAN IP or ngrok if running on a physical device). |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (client) key. |

`.env` is gitignored — never commit real keys.

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
