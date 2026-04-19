# VIDEO_SCRIPT.md — Helios Devpost demo (3:00)

Shooting script for the 3-minute Devpost video. Primary prize: **Best Use of
Orthogonal**. Secondary: **ZenPower dataset**. Tertiary supporting beats:
**AWS** (deploy) and **Marimo** (analysis).

Format notes:
- Two voices on screen: **[VO]** voiceover over product footage, **[ON-CAM]**
  presenter looking into the camera.
- Every **[B-ROLL]** line is the shot the VO plays over — film these first,
  VO in post.
- Word counts assume ~155 words per minute of natural delivery.
- Total: ~460 words over 3:00. Budget is tight — cut a word before a shot.

---

## 00:00–00:15 — The hook

**[B-ROLL]** Fast cut: a PG&E bill with three highlighter-yellow line items.
Cut to a California rooftop on a hot summer afternoon. Cut to a phone
showing the NEM 3.0 export-rate curve spiking from 5¢ to $1.80/kWh.

**[VO]**
> Home solar in California has a six-to-ten-year payback. The math
> lives in ten different places — your utility's time-of-use plan, NEM 3.0
> export rates, installer pricing, financing APRs, rebate news, your
> property value, local permit velocity. Ten paid APIs. Nobody ships the
> tool, because nobody wants to sign up for ten billing dashboards.

---

## 00:15–00:50 — Mode A, the Orthogonal ticker (THE hero moment)

**[B-ROLL]** Phone screen. User types a San Diego address, taps **Go**.
Hold on the "Agent working" screen. Ten rows stream in live — each row is
one Orthogonal call, each with a spinner that resolves into a latency
counter. The latency numbers are real, not canned.

On-screen rows as they pop:
- `tariff lookup` → 1.2s
- `solar irradiance` → 0.9s
- `installer pricing` → 2.1s
- `solar loan APRs` → 1.8s
- `rebate & policy news` → 1.4s
- `property value` → 1.7s
- `demographics` → 1.1s
- `installer reviews` → 2.3s
- `carbon price` → 0.8s
- `ZenPower permits` → 0.3s

All ten resolve in under 20 seconds. Screen flips to the result card:
**Break-even: 6.8 years. 25-yr NPV: +$48,200. 11% of your home value.
CO₂ avoided: 12.4 tons — $2,100 at the current social cost of carbon.**

**[VO]**
> One tap. Ten paid APIs fire in parallel through **Orthogonal**.
> Every row you're watching is a real call, a real latency, real data —
> streamed back to the UI as it resolves. Twenty seconds of research that
> used to take homeowners three hours.

---

## 00:50–01:05 — The Orthogonal pitch, on camera

**[ON-CAM]** Presenter, one-shot.

> Here's the thing. Building this integration layer against ten paid
> APIs the normal way is a week of signups, keys, and billing. Property
> data, demographics, review scrapers, a carbon price feed, financing
> lookups. We wrote **one Orthogonal SDK integration instead of ten.**
> Metered pay-per-use, zero keys, zero billing dashboards. That ticker
> you just saw? That's the whole value prop of Orthogonal in thirty seconds.

---

## 01:05–01:25 — ZenPower credibility + Marimo

**[B-ROLL 1]** Mode A result card. Scroll to the credibility line:
**"We see 1,247 recent installs in your ZIP averaging 7.2 kW — median
permit turnaround 8 days."** ZenPower logo subtle in the corner.

**[B-ROLL 2]** Cut to a desktop browser showing
`analysis/helios_analysis.py` open in **Marimo**. Scroll fast past the
monthly-permits chart with the NEM 3.0 April-2023 spike annotation —
677 permits in the deadline month, then the 14% collapse — then land
on the NPV sensitivity panel. Drag the discount-rate slider from 5% to 8%;
the NPV re-renders live from $85k down to $62k.

**[VO]**
> The sizing recommendation on the result card comes from the **ZenPower
> solar permit dataset** — 37,901 real residential permits. The analysis
> isn't buried in a PDF: it's a **Marimo** reactive notebook that imports
> our production NPV code directly, so every assumption judges care
> about — discount rate, panel degradation, rate escalation — is a live
> slider. Same math, same numbers as the app.

---

## 01:25–02:15 — Mode B: live arbitrage

**[B-ROLL]** Switch profile on device: existing owner, 8 kW rooftop +
13.5 kWh Powerwall, La Jolla. Live dashboard loads:
**"Charge battery now — peak export window opens in 42 minutes.
Expected gain: $18.40 over the next 4 hours."** Battery gauge at 42%.

Cut to the iOS home screen. The Helios widget reads **"Sell Now:
+$1.42/hr"** with a green dot.

A pre-scheduled push notif slides in: **"Peak export opening 5:00 PM.
Battery at 87%. Discharge to grid earns $18.40."** Tap it — deep-links
into the hourly plan, showing a minute-by-minute recommendation against
the live CAISO wholesale price curve.

**[VO]**
> Mode B is for owners who already have solar plus battery. Under NEM
> 3.0, export rates swing from five cents to over a dollar per kilowatt-hour
> in the same day — most batteries run dumb schedules and leave money on
> the table every single evening. Helios runs the same Orthogonal fan-out
> every minute against the live CAISO wholesale feed, and tells your
> battery what to do.

---

## 02:15–02:35 — AWS + architecture beat

**[B-ROLL]** Cut to a terminal. `curl https://helios.us-west-2.awsapprunner.com/api/health`
returns `{"status":"ok"}`. Zoom out — architecture diagram animates:
Expo + Next.js clients → App Runner container → Orthogonal fan-out →
ten API providers in parallel.

**[VO]**
> The backend is a FastAPI container running on **AWS App Runner**,
> always-warm on one vCPU in `us-west-2`. One Dockerfile, one
> `apprunner.yaml`, push to ECR, done. The mobile app hits it, the web
> app hits it, the Marimo notebook imports from it. Everything you saw
> in the last three minutes is one deployed backend.

---

## 02:35–02:55 — Callback to Orthogonal

**[B-ROLL]** Quick cut back to the ten-row ticker from 00:15. Slow it
down 50%, numbers still ticking.

**[ON-CAM]**
> Everything you watched — the twenty-second ROI, the live rate feeds,
> the battery recommendation — is ten APIs, one SDK, one bill.
> That's why we built Helios on **Orthogonal**.

---

## 02:55–03:00 — The business close

**[B-ROLL]** End card. Helios logo. Three lines:
- Lead gen for installers · replaces $2–4k CAC
- $10/mo SaaS for 1M+ CA battery owners
- 12 tons CO₂ avoided per converted household

**[VO]**
> Residential solar CAC is $2–4k per customer. Helios is the lead-gen
> layer at a fraction of that, plus a SaaS for a million battery owners
> in California alone. Every flipped household: twelve tons of CO₂.

**FADE OUT.**

---

## Shot list (for capture day)

1. Phone: typing SD address + hitting Go (00:15)
2. Phone: ten-row Orthogonal ticker, full 20-second take (00:20–00:40) — **this must be real, not mocked**
3. Phone: result card landing (00:40)
4. Presenter one-shot, 15s delivery (00:50–01:05)
5. Phone: scroll to ZenPower credibility line (01:05)
6. Desktop: Marimo NEM 3.0 chart + discount-rate slider drag (01:10–01:25)
7. Phone: Mode B dashboard load (01:25)
8. Home screen: widget state (01:35)
9. Home screen: notif slide-in + tap-through to hourly plan (01:45)
10. Terminal: `curl` + architecture diagram animation (02:15)
11. Slow-motion recall of ticker (02:35)
12. Presenter one-shot closing line (02:45)
13. End card (02:55)

## Non-negotiable phrases (Orthogonal judges will grep)

- "eight to ten APIs in parallel through Orthogonal"
- "one SDK integration instead of ten"
- "ZenPower solar permit records" (eligibility dataset — name it)
- "NEM 3.0" (proves you understand CA solar)
- "AWS App Runner" (AWS challenge track)
- "Marimo reactive notebook" (MLH Marimo prize)

## Delivery notes

- **Pace:** brisk but not rushed. The ticker sequence (00:15–00:40) is the
  one moment to **slow down** — let every row resolve on screen.
- **Voice:** low, flat, confident. No hype words ("amazing", "incredible").
  The ten-API ticker sells itself.
- **Music:** low-key electronic under VO. Duck it entirely for the
  on-camera beats (00:50, 02:45).
- **Captions:** burn in captions for every VO line. Judges watch on mute.
