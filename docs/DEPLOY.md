# Deploying Helios — web at `helios.daniticau.com`

End-to-end walkthrough to take the web app from zero to a custom subdomain
with Supabase auth wired up. Estimated time: ~30 minutes.

Pre-req: you already own the domain `daniticau.com` and have a GitHub repo
pushed for this project.

---

## Overview

```
helios.daniticau.com  →  Vercel (Next.js @ web/)
                           │
                           ▼
                    BACKEND_URL (Render, FastAPI @ backend/)
                           │
                           ▼
                 Supabase (auth JWTs, no DB required)
```

Three control planes:

1. **Supabase** — issues JWTs, hosts the sign-in UI (magic link, GitHub).
2. **Vercel** — serves the Next.js app, owns the domain, runs the `/api/roi` proxy.
3. **DNS registrar (or Cloudflare)** — points `helios.daniticau.com` at Vercel.

---

## Step 1 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **Sign up / Sign in** (use GitHub).
2. Click **New project**.
   - Organization: your personal org.
   - Name: `helios`.
   - Database password: generate and save (we don't use the DB but it's required).
   - Region: pick the one closest to your users — `West US (North California)` is
     fine for a US demo.
   - Plan: **Free** tier is enough.
3. Wait ~2 minutes for the project to provision.

### Step 1a — Enable the new key model + copy three values

Helios uses Supabase's **new API key model** (publishable + secret keys with
asymmetric JWT signing). The legacy `anon` / `service_role` / shared JWT
secret model is not used.

Once the project is ready:

1. Click **Project Settings** (gear icon, bottom-left) → **API Keys**.
2. If not already enabled, click **Enable new API keys** (or **Migrate to
   new API keys**). This also enables asymmetric JWT signing (ES256) and
   exposes a JWKS endpoint that the backend uses to verify tokens.
3. Copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`) → `SUPABASE_URL`
   - **Publishable key** (starts with `sb_publishable_`) →
     `SUPABASE_PUBLISHABLE_KEY` (this is safe to expose to browser/mobile)
   - **Secret key** (starts with `sb_secret_`) → `SUPABASE_SECRET_KEY`
     (backend-only; never ship to clients)

No separate JWT secret needed — the backend verifies JWTs against the
public JWKS at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`.

Save these — you will paste them into Vercel and Render (or App Runner)
in Step 3 and Step 2.

### Step 1b — Configure auth providers

1. Sidebar → **Authentication** → **Providers**.
2. **Email** provider is on by default — leave it. Magic link flows out of the box.
3. **GitHub** provider:
   - Toggle **Enable**.
   - You now need a GitHub OAuth App. Open a new tab:
     [GitHub → Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/developers).
     - Application name: `Helios`
     - Homepage URL: `https://helios.daniticau.com`
     - Authorization callback URL: **exactly** the value Supabase shows under the
       GitHub provider's `Callback URL (for OAuth)` — something like
       `https://abcxyz.supabase.co/auth/v1/callback`.
     - Click **Register application**.
     - Copy the **Client ID** and generate a **Client Secret**.
   - Back in Supabase, paste **Client ID** and **Client Secret** → **Save**.

### Step 1c — Add the redirect URLs Supabase trusts

Authentication → URL Configuration.

- **Site URL**: `https://helios.daniticau.com`
- **Additional Redirect URLs** (comma or newline separated):
  - `https://helios.daniticau.com/install`
  - `https://helios.daniticau.com/install?from=login`
  - `http://localhost:3000/install?from=login` (for local dev)
  - `helios://auth-callback` (mobile deep link)
  - `exp://*` (Expo Go during development)

Save.

---

## Step 2 — Deploy the FastAPI backend to Render

If you already have a Render deployment, skip to 2c (just add the Supabase env vars).

### 2a — Create the service

1. Go to [render.com](https://render.com) → **New +** → **Web Service**.
2. Connect your GitHub repo, pick `helios`.
3. Branch: `main`.
4. Root directory: `backend`.
5. Environment: **Docker** (the repo has a `backend/Dockerfile`).
6. Instance type: **Free**.

### 2b — Set build / start

If prompted (the Dockerfile already handles it):

- Build command: *(leave blank for Docker)*
- Start command: *(leave blank for Docker)*

### 2c — Environment variables

Render → Service → **Environment** tab. Add these:

| Key | Value |
|---|---|
| `ORTHOGONAL_API_KEY` | from `.env` |
| `ANTHROPIC_API_KEY` | from `.env` |
| `ELEVENLABS_API_KEY` | *(optional)* from `.env` |
| `SUPABASE_URL` | step 1a |
| `SUPABASE_PUBLISHABLE_KEY` | step 1a |
| `SUPABASE_SECRET_KEY` | step 1a (backend-only) |
| `BACKEND_ALLOWED_ORIGINS` | `https://helios.daniticau.com,https://helios-daniticau.vercel.app` |

Click **Save Changes**. Render redeploys.

Grab the service URL (e.g. `https://helios-backend.onrender.com`). You'll paste
this as `BACKEND_URL` into Vercel next.

---

## Step 3 — Deploy the web app to Vercel

### 3a — Import the project

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → pick `helios`.
3. **Root Directory**: click **Edit** → select `web/` → **Continue**.
4. Framework preset: **Next.js** (auto-detected).
5. Build and output settings: leave defaults (Vercel reads `web/next.config.mjs`).

### 3b — Environment variables

Before clicking Deploy, expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | step 1a |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | step 1a |
| `BACKEND_URL` | step 2c (Render / App Runner URL) |

> The `NEXT_PUBLIC_` prefix means the value is exposed to the browser. That's
> correct for the publishable key — never paste the secret key into
> Vercel, it stays on the backend only.

Click **Deploy**. First deploy takes ~90 seconds.

### 3c — Verify the default deploy

Vercel gives you a `*.vercel.app` URL. Open it and:

- Landing renders the ticker animation + hero.
- `/install` loads the address form.
- `/login` shows magic link + GitHub buttons.

---

## Step 4 — Point `helios.daniticau.com` at Vercel

### 4a — Add the custom domain in Vercel

1. Vercel → Project → **Settings** → **Domains**.
2. Input: `helios.daniticau.com` → **Add**.
3. Vercel shows you a DNS record to add. It will be one of:
   - **CNAME** → `cname.vercel-dns.com` (typical), OR
   - **A record** → `76.76.21.21` (if CNAME on the apex is not allowed).
   - For a subdomain like `helios.`, you'll always get a **CNAME**.

Leave this tab open — we need it in 4b.

### 4b — Add the DNS record

Pick the path that matches where your DNS lives.

#### Path A — Cloudflare (recommended if `daniticau.com` is already on Cloudflare)

1. [Cloudflare dashboard](https://dash.cloudflare.com) → pick `daniticau.com`.
2. **DNS** → **Records** → **Add record**.
   - Type: **CNAME**
   - Name: `helios`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (gray cloud) — Vercel handles SSL, keeping
     Cloudflare's proxy on can cause redirect loops.
   - TTL: Auto.
3. **Save**.

#### Path B — Generic registrar (Namecheap, GoDaddy, Porkbun, etc.)

1. Open your registrar's DNS panel for `daniticau.com`.
2. Add a record:
   - Type: **CNAME**
   - Host / Name: `helios` (not `helios.daniticau.com` — the registrar appends)
   - Value / Target: `cname.vercel-dns.com`
   - TTL: 3600 (or whatever's default).
3. Save.

### 4c — Wait for propagation + verify SSL

- Back in Vercel → **Domains** → `helios.daniticau.com` will flip from **Invalid**
  to **Valid Configuration** within 1–10 minutes.
- Vercel auto-provisions SSL via Let's Encrypt — no cert install needed.

Open https://helios.daniticau.com and verify.

---

## Step 5 — Sanity check the full loop

1. https://helios.daniticau.com → landing page renders.
2. Click **sign in** → **continue with github** → OAuth round trip.
   You end up back on `/install?from=login` signed in.
3. Click the demo address chip → fill in utility → **run the numbers**.
4. Ticker resolves all 10 APIs within ~20s.
5. Result card shows NPV, payback, system size.

Check logs on Render: you should see `user_id=<uuid>` on authed requests,
`user_id=-` on anonymous ones.

---

## Step 6 — Mobile: point Expo at your values

Edit `mobile/app.json`:

```json
"extra": {
  "apiBaseUrl": "https://helios-backend.onrender.com",
  "supabaseUrl": "https://abcxyz.supabase.co",
  "supabasePublishableKey": "sb_publishable_..."
}
```

Then:

```bash
cd mobile
pnpm start
# scan QR with Expo Go
```

Tap the **Account** tab → sign in with magic link or GitHub. After signing in,
the Install/Live tabs now attach the Bearer token to `/api/roi` and `/api/live`.
The DEMO_PROFILE flow on the Install tab continues to work anonymously.

---

## Environment variables cheat sheet

### Web (Vercel)

| Var | Where to get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys → URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys → publishable (`sb_publishable_…`) |
| `BACKEND_URL` | Render / App Runner service URL |

### Backend (Render or AWS App Runner)

| Var | Where to get |
|---|---|
| `ORTHOGONAL_API_KEY` | local `.env` |
| `ANTHROPIC_API_KEY` | local `.env` |
| `ELEVENLABS_API_KEY` | local `.env` (optional — narration) |
| `SUPABASE_URL` | same as web |
| `SUPABASE_PUBLISHABLE_KEY` | same as web |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → secret (`sb_secret_…`) (**backend only!**) |
| `BACKEND_ALLOWED_ORIGINS` | `https://helios.daniticau.com,https://*.vercel.app` |

### Mobile (mobile/app.json `extra`)

| Key | Value |
|---|---|
| `apiBaseUrl` | Render / App Runner service URL |
| `supabaseUrl` | Supabase project URL |
| `supabasePublishableKey` | Supabase publishable key (`sb_publishable_…`) |

---

## Troubleshooting

**Vercel build fails with `useSearchParams must be wrapped in Suspense`**
→ Already fixed — both `/install` and `/login` wrap the hook consumer in
`<Suspense>`. If you see it again, it's a new page you added; wrap it.

**Supabase GitHub callback returns 404**
→ The GitHub OAuth app's callback URL must **exactly** match Supabase's
  `https://<project>.supabase.co/auth/v1/callback`. Common mistake: pasting
  the Vercel URL there instead.

**Backend 401s on authed requests**
→ `SUPABASE_URL` on the backend doesn't match the project that issued the
  JWT. The backend fetches the JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  — if that URL doesn't match, signature verification fails. Double-check
  the URL is the exact project the web/mobile client is logging in to.

**`helios.daniticau.com` not resolving after 1h**
→ Your CNAME value is wrong, or (Cloudflare) the proxy is on. In Cloudflare,
  set the record to **DNS only** (gray cloud).

**Mobile GitHub OAuth opens browser but app doesn't reopen**
→ Your `scheme` in `mobile/app.json` is not registered as a Supabase redirect.
  Add `helios://auth-callback` under Supabase → Auth → URL Configuration →
  Additional Redirect URLs.
