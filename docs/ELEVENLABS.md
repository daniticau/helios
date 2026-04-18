# ElevenLabs setup — Helios

Optional. Helios runs fine without it; when enabled you get:

- a "speak my result" button on the Mode A ROI result screen
- pre-rendered voice-over audio for the 3-minute demo video

Target sponsor prize: **Best Use of ElevenLabs** (MLH).

---

## 1. Create an account + grab an API key

1. Sign up at https://elevenlabs.io. Free tier is 10,000 characters per month — our full demo narration is ~3,300 chars, so one render lands well under the cap.
2. Go to your profile in the top-right, then **Profile → API Keys**.
3. Create a new key, label it "helios". Copy the value. It looks like `xi-api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

## 2. Pick a voice (or use the default)

The backend defaults to **Rachel** (`21m00Tcm4TlvDq8ikWAM`) — a clean American-female voice that ships with every free account. It matches the tone we want for the ROI narration.

To use a different voice:

1. Visit https://elevenlabs.io/app/voice-library and preview voices.
2. Clone one into your workspace.
3. Copy the voice ID (visible in the URL of the voice's page).

## 3. Add the key to `.env`

Edit the repo-root `.env` (copy from `.env.example` if it doesn't exist):

```
ELEVENLABS_API_KEY=xi-api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

The backend reads both via pydantic-settings — no restart env wiring needed beyond reloading the FastAPI server.

## 4. Verify the endpoint

Start the backend:

```bash
cd backend
uv run uvicorn main:app --reload
```

In another terminal:

```bash
curl -X POST http://localhost:8000/api/narrate \
  -H 'Content-Type: application/json' \
  -d '{"script":"Hello from Helios."}' \
  --output /tmp/helios-test.mp3

file /tmp/helios-test.mp3
# expected: /tmp/helios-test.mp3: Audio file with ID3 version ... MPEG ADTS, layer III
```

You can also hit it with an `ROIResult` body and the backend will render a 40–60 word summary automatically. See `backend/routes/narrate.py` for the template.

## 5. Regenerate the demo narration

```bash
uv run --project backend python demo/narration/generate.py
```

This reads `demo/narration/script.txt`, walks each `--- SEGMENT ---` block, and writes:

- `demo/narration/segments/<name>.mp3` — one mp3 per scene (easier to edit in Premiere/DaVinci)
- `demo/narration/out.mp3` — concatenated full track (~3 minutes)

Drop `out.mp3` into your video timeline as the primary audio track, or trim per-segment files to the beats in HELIOS.md §11.

## 6. Mobile UX

The "speak my result" button on `ROIResult.tsx` calls `POST /api/narrate` with the current `ROIResult` and plays the returned mp3 via `expo-av` `Audio.Sound`. If the backend returns 503 (no key), the button surfaces "narration unavailable — add ELEVENLABS_API_KEY" inline without crashing.

## 7. For the Devpost submission

Reference **Best Use of ElevenLabs** in the challenge list. Key phrasing for the submission copy:

> Helios integrates ElevenLabs voice synthesis to narrate the 25-year ROI result at a single tap. The agent speaks back the payback period, NPV, and CO2 avoided — letting users "hear" the outcome without reading. The 3-minute demo video is narrated end-to-end via ElevenLabs Turbo v2.5 with the Rachel voice.

## Troubleshooting

- **503 from `/api/narrate`**: `ELEVENLABS_API_KEY` is not set. Double-check `.env` is at the repo root (not inside `backend/`) and that your backend was restarted after editing it.
- **401 from ElevenLabs**: key is invalid or revoked. Regenerate on the dashboard.
- **quota exceeded**: free tier resets monthly. Upgrade or switch accounts for the demo.
- **mobile button says "narration unavailable"**: backend returned 503. Check the backend logs and `.env`.
- **audio plays silently on iOS**: check that the phone's ringer isn't on silent — actually we set `playsInSilentModeIOS: true` so this shouldn't happen; if it still does, verify `expo-av` is installed and rebuild the dev client.
