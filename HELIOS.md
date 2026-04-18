# HELIOS — North Star

> Project codename is a placeholder. Rename before submission if a better one lands.

---

## 0. TL;DR

**What:** Mobile-first AI agent for home solar economics. Two modes in one app:
- **Mode A — "Should I?"** Enter an address, get a 25-year NPV and payback period for installing solar + battery. 20 seconds, not 3 hours of research.
- **Mode B — "Right Now?"** For existing owners. Live recommendation on whether to charge, discharge, or sell back to the grid. iOS home screen widget + push notifs during peak price windows.

**Why it wins DataHacks 2026:**
- Theme fit is direct (energy sciences).
- **Orthogonal is the hero.** 8–10 distinct paid APIs fired in parallel per user action: tariffs, wholesale prices, weather, permits, financing, rebate news, property value, demographics, installer reviews, carbon pricing. Building this integration layer the normal way is a week of signups, API keys, and billing setups. We wrote one SDK integration instead of ten. That is the pitch.
- Tracks entered for credibility scaffolding: **Economics** (tight NPV + tariff arbitrage math) and **Product/Entrepreneurship** (clear ICP, real business model).
- **Dataset (one, for eligibility):** ZenPower solar permit records. Per-ZIP system size suggestion + a credibility line in the UI. Clears the "must use at least one dataset" requirement at minimum engineering cost.
- Two mobile "wow" moments: the live Orthogonal orchestration ticker (8–10 APIs firing in parallel, real latencies) + iOS widget showing real-time arbitrage P&L.

**Target prize — single focus:**
**Best Use of Orthogonal — $1k + Meta Ray-Bans.** DataHacks lets a team win one prize total, so we stop optimizing for stacks and aim everything at Orthogonal. Tracks and the ZenPower dataset are scaffolding to make the Orthogonal win more credible. They are **not** independent targets.
**Realistic ceiling: ~$1k + Meta Ray-Bans.**

---

## 1. Context

**Event:** DataHacks 2026, DS3 @ UCSD. 36-hour hackathon.
**Theme:** Environment, Climate, & Energy Sciences.
**Deadline:** 19 Apr 2026 @ 1:00pm PDT.
**Hard requirement:** Must use at least one provided dataset. We use **ZenPower solar permit records** — minimum-viable integration to clear the eligibility bar so we can focus engineering effort on the Orthogonal story.
**Deliverables:**
- 3-min demo video
- Public GitHub repo
- Deployed demo (the mobile app runs on Expo Go + a backend on Render/Railway)
- Pitch deck

---

## 2. Product Thesis

### The problem
Installing home solar has a 6–10 year payback in California. That math is buried under 5 variables most homeowners never research: their utility's time-of-use plan, current export rates under NEM 3.0, system sizing, installer pricing variance, and financing APRs. Solar adoption stalls on the research step, not the economics.

For existing solar + battery owners, NEM 3.0 made timing the new variable. Export rates can swing from $0.05/kWh at noon to $1.80/kWh on a hot summer evening. Manually optimizing charge/discharge decisions is impractical. Most batteries run on simple schedules and leave money on the table.

### The product
An agent that collapses both problems to a single tap.

**Mode A — install decision:**
User enters address + monthly electric bill. Agent fetches utility tariff, local solar production estimate, permit data, installer quotes, financing rates, and recent rebate news via Orthogonal. Returns a 25-year NPV, payback period, and CO2 avoided. 20 seconds end to end.

**Mode B — real-time arbitrage:**
For households that already have solar + battery. Agent continuously evaluates 6 possible actions against current wholesale export rates, retail TOU rates, and tomorrow's solar forecast. Pushes a recommendation to the user via home screen widget and notifications at peak windows.

### The business
- **Lead gen to installers.** $1–3k per converted install lead. Current solar installer customer acquisition cost in CA is $2–4k, so we're undercutting by building the demand side.
- **SaaS for battery owners.** $5–10/month for optimization + alerts. ~1M residential batteries in CA alone. Grows with NEM 3.0 adoption.
- **Affiliate on financing.** Kickback from solar loan lenders on originated loans.

---

## 3. The Economics (the math that has to be right)

### 3.1 Mode A — install NPV

Net Present Value of a solar + battery install over $T$ years:

$$
\text{NPV} = -C_0 + \sum_{t=1}^{T} \frac{S_t - M_t}{(1+r)^t}
$$

Where:
- $C_0$ = net upfront cost = system cost − federal ITC (30%) − state/utility rebates
- $S_t$ = annual savings in year $t$ (defined below)
- $M_t$ = annual maintenance ($100–300/yr typical)
- $r$ = discount rate (use 5%)
- $T$ = system lifetime (25 years)

**Annual savings:**

$$
S_t = E_{\text{self},t} \cdot R_{\text{retail},t} + E_{\text{export},t} \cdot R_{\text{export},t}
$$

- $E_{\text{self},t}$ = kWh self-consumed (avoids buying at retail)
- $E_{\text{export},t}$ = kWh exported to grid (earns wholesale avoided cost)
- $R_{\text{retail},t}$ = retail rate (TOU-weighted average)
- $R_{\text{export},t}$ = export rate (NEM 3.0 avoided cost average)

**Panel degradation:**

$$
\text{Production}_t = P_0 \cdot (1 - d)^t \quad \text{where } d \approx 0.005
$$

**Rate escalation (retail rates climb over time):**

$$
R_{\text{retail},t} = R_{\text{retail},0} \cdot (1 + g)^t \quad \text{where } g \approx 0.04
$$

**Payback period:** smallest $T^*$ such that

$$
\sum_{t=1}^{T^*} (S_t - M_t) \geq C_0
$$

**Initial production estimate** (SoCal average):

$$
P_0 = \text{System}_{\text{kW}} \times 1500 \; \text{kWh/yr per kW}
$$

Adjust per location using weather API (NREL PVWatts if we can access, else OpenWeather irradiance as proxy).

**CO2 avoided (for marketing copy):**

$$
\text{CO2}_{\text{tons}} = \sum_{t=1}^{T} P_t \cdot 0.000395 \; \text{tons/kWh (CA grid intensity)}
$$

### 3.2 Mode B — real-time arbitrage

At each hour $t$, the household has 6 possible actions:

| Action | Description | Immediate $/hr |
|---|---|---|
| A1 | Solar → house | saves $p_t \cdot r_{\text{buy},t}$ (always taken first) |
| A2 | Excess solar → battery | 0 now, future option value |
| A3 | Excess solar → grid | $\max(0, p_t - l_t) \cdot r_{\text{sell},t}$ |
| A4 | Battery → house | $d_t \cdot r_{\text{buy},t}$ |
| A5 | Battery → grid | $d_t \cdot r_{\text{sell},t}$ |
| A6 | Grid → battery | $-c_t \cdot r_{\text{buy},t}$ now, future value |

Where:
- $s_t$ = battery State of Charge (0 to $S_{\max}$)
- $p_t$ = current solar production (kW)
- $l_t$ = current house load (kW)
- $c_t$ = grid-to-battery charge rate (kW)
- $d_t$ = battery discharge rate (kW)
- $r_{\text{buy},t}$ = current retail rate
- $r_{\text{sell},t}$ = current export rate

**Constraints:**
- $c_t \cdot d_t = 0$ (can't charge and discharge simultaneously)
- $s_{t+1} = s_t + c_t \cdot \eta_c - d_t / \eta_d$ (roundtrip efficiency $\approx 0.9$)
- $0 \leq s_t \leq S_{\max}$
- $c_t, d_t \leq P_{\max}$ (inverter power limit)

**Objective — minimize 24hr cost:**

$$
\min \sum_{t=1}^{24} \left[ \max(g_t, 0) \cdot r_{\text{buy},t} - \max(-g_t, 0) \cdot r_{\text{sell},t} \right]
$$

where $g_t = l_t - p_t + c_t - d_t$ is net flow from grid (positive = buying).

**MVP solver:** greedy with forecast lookahead. Formal LP is a stretch goal.

**Greedy rules (priority order):**
1. Serve house load from solar first.
2. If $r_{\text{sell},t} > r_{\text{buy},t}$ (rare but happens at peak): discharge battery to grid aggressively.
3. If $\max(r_{\text{sell},\tau}) > r_{\text{sell},t} + \epsilon$ for $\tau$ within next 12hr: charge battery now, discharge at $\tau^*$.
4. If battery full AND excess solar: export now.
5. If house load > solar AND $r_{\text{buy},t}$ high AND battery has charge: discharge to house.
6. If off-peak AND battery low AND expected peak high: charge from grid overnight.

---

## 4. Architecture

```
+----------------------------------------------------------+
|                     MOBILE (Expo)                        |
|                                                          |
|   +----------------+       +----------------+            |
|   |   Mode A UI    |       |   Mode B UI    |            |
|   |  (Install ROI) |       | (Live Dashboard)|           |
|   +----------------+       +----------------+            |
|          |                         |                     |
|          |     Share Extension     |   iOS Widget        |
|          |     (utility bill PDF)  |   Push Notifs       |
|          |                         |                     |
|          +-----------+-------------+                     |
|                      |                                   |
|                      v                                   |
|              Shared API Client                           |
+----------------------|-----------------------------------+
                       | HTTPS
                       v
+----------------------------------------------------------+
|                BACKEND (FastAPI, Python)                 |
|                                                          |
|   +--------------------+      +----------------------+   |
|   | API Route Handlers |----->|   Econ Engine        |   |
|   |   /roi             |      |   - NPV calculator   |   |
|   |   /live            |      |   - Arbitrage solver |   |
|   |   /parse-bill      |      |   - Solar prod model |   |
|   +---------|----------+      +----------------------+   |
|             |                                            |
|             v                                            |
|   +--------------------------------------------+         |
|   |     Orthogonal Orchestrator (8-10 parallel)|         |
|   |     - tariff lookup                        |         |
|   |     - weather/solar forecast               |         |
|   |     - installer pricing scrape             |         |
|   |     - financing rate lookup                |         |
|   |     - news / rebate scan (Linkup)          |         |
|   |     - property value (Aviato/Zillow)       |         |
|   |     - demographics (PDL)                   |         |
|   |     - installer reviews (Yelp/EnergySage)  |         |
|   |     - carbon pricing (Linkup)              |         |
|   |     - permit records (ZenPower dataset)    |         |
|   +-------------------|------------------------+         |
|                       |                                  |
|                       v                                  |
|          Cache (in-memory, TTL-based)                    |
+----------------------|-----------------------------------+
                       |
                       v
          Orthogonal SDK → 8-10 external APIs
          ZenPower CSV (loaded on boot)
          CAISO OASIS (direct, realtime)
```

### Key architectural decisions

- **No user accounts for the hackathon.** Device ID identifies users. Keeps auth out of scope.
- **State is ephemeral on backend.** Each request is stateless; mobile caches user profile locally.
- **Orthogonal is the single outbound gateway for third-party data.** Exception: ZenPower dataset is loaded as a CSV on backend boot for fast lookup. CAISO wholesale feed may go direct if Orthogonal doesn't have it.
- **Econ engine is a pure Python module.** Imported by backend. No external deps beyond numpy / scipy. Can be unit tested independently.

---

## 5. Tech Stack

### Mobile
- **Expo SDK 52+** (managed workflow; use dev client for native modules)
- **React Native 0.76+**
- **NativeWind v4** for Tailwind styling
- **Zustand** for client state (user profile, preferences)
- **TanStack Query** for server state + caching
- **Victory Native** for charts (production forecast, hourly P&L)
- **expo-notifications** for push
- **expo-sharing** + custom intent handler for share extension
- **react-native-reanimated** for the agent-orchestration animation
- **iOS widget:** use `expo-apple-widgets` (still experimental — fallback is a "widget preview" screen in-app that looks like the widget, for demo purposes)

### Backend
- **Python 3.11+**
- **FastAPI** + uvicorn
- **Pydantic v2** for request/response schemas
- **numpy + scipy** for econ math
- **httpx** for any direct HTTP (CAISO)
- **orthogonal-sdk** (their Python SDK — install from docs)
- **pandas** for ZenPower CSV lookup
- Deployment: **Render** (free tier, fast deploy from GitHub)

### Dev tooling
- **uv** for Python dep management (faster than pip)
- **pnpm** for mobile
- **ngrok** for exposing local backend during dev (before deploy)

---

## 6. Shared Contracts (lock these early)

Define these **once** at hour 0–1 and paste into every Claude Code session.

### 6.1 TypeScript types (mobile)

```typescript
// types.ts — shared across mobile

export interface UserProfile {
  address: string;
  lat: number;
  lng: number;
  utility: 'PGE' | 'SCE' | 'SDGE' | 'LADWP' | 'OTHER';
  tariff_plan?: string;  // e.g. "EV2-A", "E-TOU-C"
  monthly_bill_usd: number;
  monthly_kwh: number;
  has_solar: boolean;
  solar_kw?: number;
  has_battery: boolean;
  battery_kwh?: number;
  battery_max_kw?: number;
}

export interface ROIRequest {
  profile: UserProfile;
  proposed_system?: {
    solar_kw: number;
    battery_kwh: number;
  };  // if absent, backend recommends
}

export interface ROIResult {
  recommended_system: { solar_kw: number; battery_kwh: number };
  upfront_cost_usd: number;
  federal_itc_usd: number;
  net_upfront_usd: number;
  npv_25yr_usd: number;
  payback_years: number;
  annual_savings_yr1_usd: number;
  co2_avoided_tons_25yr: number;
  installer_quotes_range: [number, number];
  financing_apr_range: [number, number];
  tariff_summary: string;
  orthogonal_calls_made: OrthogonalCallLog[];
}

export interface OrthogonalCallLog {
  api: string;
  purpose: string;
  latency_ms: number;
  status: 'success' | 'cached' | 'error';
}

export interface LiveStateRequest {
  profile: UserProfile;
  current_state: {
    battery_soc_pct: number;
    solar_kw_now: number;
    load_kw_now: number;
    timestamp: string;  // ISO
  };
}

export interface LiveRecommendation {
  action: 'CHARGE_BATTERY_FROM_SOLAR' |
          'EXPORT_SOLAR' |
          'DISCHARGE_BATTERY_TO_HOUSE' |
          'DISCHARGE_BATTERY_TO_GRID' |
          'CHARGE_BATTERY_FROM_GRID' |
          'HOLD';
  reasoning: string;  // one-line human explanation
  expected_hourly_gain_usd: number;
  retail_rate_now: number;
  export_rate_now: number;
  next_peak_window?: { start_iso: string; expected_rate: number };
  forecast_24h: Array<{
    hour_offset: number;
    retail_rate: number;
    export_rate: number;
    solar_kw_forecast: number;
  }>;
  orthogonal_calls_made: OrthogonalCallLog[];
}
```

### 6.2 Backend endpoints

```
POST /api/roi
  body: ROIRequest
  returns: ROIResult
  target latency: <20 seconds (parallelize Orthogonal calls)

POST /api/live
  body: LiveStateRequest
  returns: LiveRecommendation
  target latency: <5 seconds

POST /api/parse-bill
  body: multipart (PDF)
  returns: { monthly_kwh: number, utility: string, tariff_guess?: string }

GET /api/zenpower/summary?zip=92093
  returns: { avg_system_kw, median_permit_days, installs_count }
```

All endpoints return `orthogonal_calls_made` so the UI can render the live orchestration animation.

---

## 7. Data Sources

### 7.1 ZenPower solar permit records (eligibility dataset)
- **What's in it:** permit records with system capacity, location, processing time.
- **How we use it:** per-ZIP system size suggestion + a single credibility line in the UI: "we see N recent installs in your ZIP averaging K kW." That's it. Minimum engineering cost to clear the "must use at least one dataset" eligibility bar.
- **Load pattern:** CSV on backend boot, indexed by ZIP code. In-memory pandas DataFrame.

### 7.2 CAISO OASIS (real-time wholesale prices)
- Direct access (no Orthogonal needed for this one — it's public and live).
- Endpoint: `https://oasis.caiso.com/oasisapi/SingleZip`
- Pull LMP (Locational Marginal Prices) every 5 min.
- Used in Mode B to value export decisions.

### 7.3 Utility tariff rules (for CA)
Hardcode the big 4 for the hackathon (API lookup as stretch):
- **PG&E EV2-A:** 3–4pm + 9pm–12am $0.35; 4–9pm $0.50; rest $0.25
- **PG&E E-TOU-C:** similar structure, different bands
- **SCE TOU-D-PRIME:** 4–9pm peak, rest off-peak
- **SDG&E EV-TOU-5:** 4–9pm peak, midnight–6am super-off-peak
Export rates under NEM 3.0: use published ACC tables (hourly values per month per utility). Approximate with a function of hour and month.

### 7.4 Solar irradiance / weather
Via Orthogonal → OpenWeather or NREL PVWatts if available. Used for production forecasting in Mode B and annual production estimate in Mode A.

### 7.5 Installer pricing
Via Orthogonal → ScrapeGraph on EnergySage or similar aggregators. Returns $/W installed for the ZIP.

### 7.6 Financing rates
Via Orthogonal → ScrapeGraph on solar loan providers (GoodLeap, Sunlight Financial). Returns APR range.

### 7.7 News / rebates
Via Orthogonal → Linkup. Query: "{state} solar rebate 2026 OR SGIP OR NEM 3.0 update". Used to surface any active state/utility incentives the user might miss.

---

## 8. Orthogonal Integration

### 8.1 The narrative
Per user action, the backend orchestrates **8–10 Orthogonal API calls in parallel**. Each one is metered pay-per-use, zero API key management, zero billing setup. Building this integration layer against ten paid APIs the normal way is a week of signups and billing dashboards. We wrote **one SDK integration instead of ten**. This is the live orchestration that makes Orthogonal the hero of the demo.

### 8.2 APIs used (via Orthogonal SDK)
| API (likely partner) | Purpose | Mode |
|---|---|---|
| ScrapeGraph | Utility tariff scrape (if not hardcoded) | A |
| ScrapeGraph | Installer pricing from EnergySage | A |
| ScrapeGraph | Solar loan APR lookup | A |
| Linkup | Current rebate / policy news | A |
| OpenWeather (via Orth) | Solar irradiance + 24h forecast | A, B |
| Aviato | Installer company credibility signal | A |
| Aviato (or ScrapeGraph on Zillow) | Property value lookup — frame ROI as % of home value | A |
| PDL (People Data Labs) | Demographics at address — income-aware system sizing | A |
| ScrapeGraph (Yelp / EnergySage reviews) | Local installer review quality | A |
| Linkup | Carbon pricing / social cost of carbon — translate CO2 avoided into $ | A |

### 8.3 Concurrency pattern
```python
# in orchestrator.py
async def gather_for_roi(profile: UserProfile) -> dict:
    tasks = [
        fetch_tariff(profile),
        fetch_weather(profile.lat, profile.lng),
        fetch_installer_pricing(profile.zip),
        fetch_financing(profile),
        fetch_news(profile.state),
        fetch_zenpower_summary(profile.zip),
        fetch_property_value(profile.address),        # Aviato / ScrapeGraph Zillow
        fetch_demographics(profile.lat, profile.lng), # PDL
        fetch_installer_reviews(profile.zip),         # ScrapeGraph Yelp/EnergySage
        fetch_carbon_price(profile.state),            # Linkup social cost of carbon
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return dict(zip(
        ['tariff','weather','pricing','finance','news','permits',
         'property_value','demographics','reviews','carbon_price'],
        results,
    ))
```

### 8.4 Caching
In-memory LRU with TTL per source:
- Tariff rules: 24hr
- Weather: 1hr
- Installer pricing: 6hr
- Financing: 24hr
- News: 6hr
- ZenPower: forever (static CSV)

### 8.5 Failure mode
Any single Orthogonal call failing must not break the ROI computation. The econ engine fills missing inputs with documented defaults and surfaces a warning in `orthogonal_calls_made` so the UI can show it.

---

## 9. The Four Parallel Workstreams

Each workstream has a self-contained section you can paste into a fresh Claude Code session along with sections 0, 4, 5, 6, and 8 of this doc. They communicate only through the contracts in section 6.

### WORKSTREAM 1 — Backend + Orthogonal Orchestrator

**Directory:** `backend/`
**Owner session name:** "helios-backend"

**Responsibilities:**
- FastAPI service exposing the four endpoints in 6.2
- Orthogonal SDK setup, per-call instrumentation, error handling
- Parallel fan-out orchestrator for ROI and Live endpoints — **must fire 8–10 Orthogonal calls in parallel via asyncio.gather** (tariff, weather, installer pricing, financing, rebate news, property value, demographics, installer reviews, carbon pricing, ZenPower summary)
- In-memory cache layer
- ZenPower CSV ingestion on boot (used for per-ZIP system size suggestion)
- CAISO direct client for wholesale prices
- Utility bill PDF parsing (claude vision or pdfplumber — whichever is faster)
- Deploy to Render

**Acceptance criteria:**
- `/api/roi` returns a valid ROIResult in <20s for any CA address
- `/api/live` returns a LiveRecommendation in <5s
- Every response includes `orthogonal_calls_made` with real latency data
- If any single external API fails, response still succeeds with partial data

**Imports from Workstream 2:**
```python
from econ import compute_roi, recommend_action, forecast_production
```

**Does NOT touch:** mobile code, econ math internals

**Key files:**
```
backend/
  main.py              # FastAPI app
  routes/
    roi.py
    live.py
    parse_bill.py
  orchestrator.py      # Orthogonal fan-out
  cache.py
  caiso.py             # direct CAISO client
  zenpower.py          # CSV lookup
  tariffs.py           # hardcoded CA tariff definitions
  schemas.py           # Pydantic (mirror TS types)
  config.py
  data/
    zenpower_permits.csv
```

---

### WORKSTREAM 2 — Econ Engine

**Directory:** `backend/econ/`
**Owner session name:** "helios-econ"

**Responsibilities:**
- Pure Python module (no network I/O, no FastAPI, no Orthogonal)
- NPV computation per section 3.1
- Greedy arbitrage solver per section 3.2
- Solar production estimator (annual + hourly)
- System sizing recommender given monthly kWh + roof assumptions
- Unit tests for each pricing scenario

**Acceptance criteria:**
- `compute_roi(profile, system, inputs)` returns an ROIResult (Pydantic-compatible dict)
- `recommend_action(state, forecast_24h, tariff, battery_specs)` returns an action + reasoning string
- `forecast_production(lat, lng, weather_24h, system_kw)` returns hourly kWh array
- Unit tests cover: zero solar baseline, PG&E EV2-A peak scenario, battery empty at peak, battery full overnight
- Zero external dependencies beyond numpy, scipy, pydantic

**Exports:**
```python
def compute_roi(
    profile: UserProfile,
    system: ProposedSystem,
    inputs: ExternalInputs,  # tariff, pricing, weather, financing
) -> ROIResult: ...

def recommend_action(
    current_state: HouseholdState,
    forecast: Forecast24h,
    tariff: Tariff,
    battery: BatterySpecs,
) -> Recommendation: ...

def forecast_production(
    lat: float, lng: float, weather_24h: Weather24h, system_kw: float,
) -> np.ndarray: ...  # shape (24,)

def recommend_system_size(
    monthly_kwh: float, roof_constraint_kw: float = 12.0,
) -> ProposedSystem: ...
```

**Does NOT touch:** API routes, Orthogonal client, mobile code

**Key files:**
```
backend/econ/
  __init__.py
  npv.py
  arbitrage.py
  production.py
  sizing.py
  tariffs.py           # tariff evaluation helpers
  types.py             # internal dataclasses
  tests/
    test_npv.py
    test_arbitrage.py
```

---

### WORKSTREAM 3 — Mobile: Mode A (Install ROI)

**Directory:** `mobile/src/modeA/`
**Owner session name:** "helios-mobile-a"

**Responsibilities:**
- Onboarding flow (3 screens: address → utility + bill → "go")
- Utility bill PDF share-extension handler (iOS share target)
- Results screen with NPV breakdown, payback, CO2, system recommendation
- The live "Agent working" animation — shows each Orthogonal call ticking in real time as the POST /api/roi request streams back
- Comparison card: "25 year net: +$48,200"

**Acceptance criteria:**
- From cold open to ROI result in <30s user time (including 20s backend compute)
- Animation matches actual `orthogonal_calls_made` returned by backend
- Share extension: tap share on any PDF (e.g. PG&E bill), app opens pre-filled
- Results screen has a single-screen hero number: payback years + NPV. Everything else is below the fold.
- Screenshot-able: the results screen must look clean in a vertical phone screenshot

**API contract:** consumes `POST /api/roi` per section 6.2. Never touches Orthogonal directly.

**Key screens:**
```
mobile/src/modeA/
  screens/
    OnboardAddress.tsx
    OnboardUtility.tsx
    AgentRunning.tsx    # the magic animation
    ROIResult.tsx
  components/
    NPVHeroCard.tsx
    PaybackChart.tsx
    OrthogonalTicker.tsx  # renders orthogonal_calls_made live
    SystemSizeCard.tsx
  hooks/
    useROI.ts
  shareExtension/
    BillShareHandler.tsx
```

---

### WORKSTREAM 4 — Mobile: Mode B (Live Arbitrage + Widget + Notifs)

**Directory:** `mobile/src/modeB/`
**Owner session name:** "helios-mobile-b"

**Responsibilities:**
- Live dashboard: current action recommendation, $/hr yield, battery SoC, forecast graph
- iOS home screen widget (or a faithful widget mockup screen if expo-apple-widgets can't compile in time)
- Push notifications at peak window openings
- Today's P&L history chart
- Settings (battery specs, system config)

**Acceptance criteria:**
- Dashboard auto-refreshes recommendation every 60s via `POST /api/live`
- Widget shows "Sell Now: +$X.XX/hr" with a colored state dot (green/yellow/red)
- Push notification fires 10 min before any forecasted peak window with expected_rate > $0.80
- Forecast chart shows next 24hr retail + export rate overlaid with predicted solar production
- Tapping a notif deep-links to a detailed hourly plan screen

**API contract:** consumes `POST /api/live` per section 6.2.

**Key screens:**
```
mobile/src/modeB/
  screens/
    LiveDashboard.tsx
    HourlyPlan.tsx
    TodayPL.tsx
    Settings.tsx
  components/
    ActionHeroCard.tsx
    ForecastChart.tsx
    BatteryGauge.tsx
    PeakWindowBanner.tsx
  widgets/
    HomeScreenWidget.tsx  # or WidgetKit bridge
  services/
    notifications.ts
    liveSync.ts
```

---

## 10. Build Timeline (36 hours)

### Phase 0 — Kickoff (hour 0–1)
- Lock repo, scaffold four directories
- Paste shared contracts into each session as system context
- Agree on mock data shapes
- Workstream 2 writes stub functions returning dummy data so Workstream 1 can integrate immediately

### Phase 1 — Parallel build (hour 1–12)
All four workstreams run in separate Claude Code sessions.
- **WS1:** routes + orchestrator with real Orthogonal calls
- **WS2:** NPV + arbitrage logic with unit tests
- **WS3:** onboarding + results UI against mocked API
- **WS4:** dashboard + widget against mocked API

Checkpoint at hour 6: each workstream demos its isolated output.
Checkpoint at hour 12: end-to-end wire-up for Mode A.

### Phase 2 — Integration (hour 12–20)
- Mode A works end-to-end with live backend
- Deploy backend to Render
- Start Mode B integration
- iOS widget build attempt

### Phase 3 — Mode B + polish (hour 20–28)
- Mode B live dashboard working against deployed backend
- Widget or widget-preview screen
- Push notifs wired
- Share extension tested with real utility bill PDF

### Phase 4 — Polish + demo prep (hour 28–32)
- Animation timing tuned (the Orthogonal ticker must feel good)
- Demo script rehearsed
- Screenshots for Devpost submission
- README + GitHub cleanup
- Deploy check: backend up, mobile builds clean

### Phase 5 — Submission buffer (hour 32–36)
- Record 3-min demo video
- Submit Devpost
- Prep pitch deck
- Final rehearsal

---

## 11. Demo Script (3 min)

**00:00–00:15 — The hook**
"Installing home solar has a 6–10 year payback in California. The math behind that number lives in 5 different places — your utility's time-of-use plan, current export rates under NEM 3.0, system sizing, installer quotes, financing APRs — and none of them talk to each other. So people don't install. Meanwhile, existing solar owners are leaving $40 a day on the table because they can't time their battery."

**00:15–00:45 — Mode A, with the Orthogonal ticker as the hero**
Open app. Enter a San Diego address. Tap go.
Camera holds on the "Agent working" screen. The Orthogonal ticker runs live: tariff lookup… weather forecast… installer pricing… financing rates… rebate news… property value… demographics… installer reviews… carbon pricing… ZenPower permits. **Eight to ten APIs firing in parallel, real endpoints, real latencies, all streaming back in under 20 seconds.** The pacing is the point — rows pop in as each call resolves, latencies tick up live.
Result lands: "Break even: 6.8 years. 25-year NPV: +$48,200. That's 11% of your home value. CO2 avoided: 12.4 tons — worth $2,100 at the current social cost of carbon."

**00:45–01:00 — The Orthogonal value prop, on camera**
Cut to the presenter. "Building this integration layer against ten paid APIs the normal way would take a week of signups, API key rotation, and billing dashboards — property data vendors, people data, review scrapers, a carbon price feed, financing lookups. We wrote **one SDK integration** instead of ten. Orthogonal is metered pay-per-use, no keys to manage, no billing to set up. This product genuinely didn't exist last quarter."

**01:00–01:30 — The share extension**
Quit app. Open a real PG&E bill PDF in Safari. Tap share. Helios appears in the sheet. Tap it. App opens, bill is auto-parsed, address pre-filled, ROI recomputes in 20 seconds — and the ticker runs again. "This is an actual iOS share extension, not a mock."

**01:30–02:30 — Mode B**
Switch to a pre-configured "existing owner" profile in Tijuana hills with an 8kW system and Powerwall.
Show the live dashboard. Action card says "Charge battery — peak window opens in 42 minutes."
Show the home screen (or widget preview): "Sell Now: +$1.42/hr" with a green dot.
A push notif fires (pre-scheduled): "Peak export window opening at 5:00 PM. Battery at 87%. Expected earnings $18.40 over next 4 hours."
Tap notif → hourly plan view. Show the exact minute-by-minute recommendation for the next 24hr.

**02:30–02:45 — Back to Orthogonal, one more time**
Quick cut back to the ticker from the intro. "Everything you just saw — the ROI in Mode A, the live rate feeds in Mode B — is eight to ten APIs, one SDK, one bill. That's why we built this on Orthogonal."

**02:45–03:00 — The business**
"Residential solar CAC is $2,000 to $4,000 per customer. We're a lead gen layer for installers at a fraction of that, plus a $10/month SaaS for existing battery owners in California alone — a million homes and growing. And every flipped household is 12 tons of CO2 over 25 years."

---

## 12. Scope Cuts (if we're behind at hour 20)

In priority order — cut from the **bottom** first:

1. **LP arbitrage solver** → fall back to pure greedy rules. (already baseline)
2. **Financing APR lookup** → hardcode a 7.5% rate. (saves 1 Orthogonal call)
3. **Installer pricing scrape** → use ZenPower-derived $/kW as proxy. (saves 1 Orthogonal call — but we want to keep this for the demo!)
4. **Today's P&L history chart** (Mode B) → drop, keep only current action + forecast
5. **Utility bill PDF parsing** → user enters monthly kWh manually. Cuts the share extension wow but keeps the core.
6. **iOS home screen widget** → replace with in-app "widget preview" screen that looks like the widget for the demo. (already planned as fallback)
7. **Share extension** → demo via paste-address only
8. **Push notifications** → schedule a single faked notif for the demo via expo-notifications local schedule

**Things we never cut:**
- Mode A end-to-end (ROI input → live Orthogonal orchestration → result)
- Mode B live recommendation card
- **At least 8 distinct Orthogonal API calls visible in the UI ticker.** This is the prize. Everything else bends around it.
- The Orthogonal ticker animation, polished to the second.
- ZenPower "N recent installs in your ZIP averaging K kW" credibility line — the eligibility-bar dataset must be visible somewhere on the result screen.

---

## 13. Risks & Mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| Orthogonal SDK auth flakes mid-demo | medium | cache last successful response locally; rehearse with cached path |
| CAISO API rate-limits or blips | medium | cache last 5 min of LMP data; fall back to synthesized TOU rates |
| Expo widget build fails | high | use in-app widget preview for demo; widget is stretch |
| iOS share extension doesn't compile in Expo managed | medium | eject to dev client; if still fails, demo paste-URL flow |
| ZenPower CSV too large to load | low | index by ZIP, lazy-load |
| Econ math has a silly bug | medium | unit tests in Workstream 2 catch the big ones; test PG&E EV2-A scenarios explicitly |
| 36hr is too short for 4 parallel workstreams | medium | aggressive scope cuts per section 12 |

---

## 14. Open Questions (resolve at kickoff)

1. Final name — Helios or something else?
2. Does Orthogonal's current API partner list cover everything we need? Audit at hour 0 against section 8.2.
3. Do we have an Orthogonal account + $10 credit already, or sign up at kickoff?
4. Do we need a paid ngrok for backend tunneling or is the free tier fine until we deploy?
5. Any SDx connections to Orthogonal for mentor support during the hackathon?

---

## 15. Submission Checklist (Devpost)

- [ ] Project name + tagline
- [ ] Inspiration paragraph
- [ ] What it does
- [ ] How we built it (Orthogonal named first; ZenPower dataset named explicitly for eligibility)
- [ ] Challenges we ran into
- [ ] Accomplishments we're proud of
- [ ] What's next
- [ ] 3-min demo video (unlisted YouTube)
- [ ] Public GitHub repo link
- [ ] Deployed URL (backend) + Expo Go link or TestFlight link
- [ ] Tech stack list
- [ ] Track selection: **Economics** + **Product & Entrepreneurship** (scaffolding, not the target)
- [ ] Challenges opted into: **Best Use of Orthogonal** (single target — DataHacks is one-prize-per-team)
- [ ] Dataset used (name explicitly): ZenPower solar permit records

---

## 16. Session Bootstrap Template

When starting a new Claude Code session for a workstream, paste this header:

```
# Session context

I'm building HELIOS — a mobile solar economics agent for DataHacks 2026.
Theme: Environment, Climate, Energy Sciences.
Tracks: Economics + Product/Entrepreneurship.
Required integrations: Orthogonal SDK, ZenPower dataset.

I'm working on **[WORKSTREAM N — NAME]**. My responsibilities and acceptance
criteria are in section 9 of HELIOS.md (pasted below).

I communicate with other workstreams only through the contracts in section 6
of HELIOS.md. Please never touch code outside my workstream directory.

[paste HELIOS.md sections 0, 4, 5, 6, 8, 9.N, 10]
```

---

## 17. Final note

DataHacks lets a team win one prize total. Ours is **Best Use of Orthogonal**. Everything in this doc bends around that.

**The Orthogonal ticker animation is THE demo moment.** Not a demo moment — the one. The 30 seconds from 00:15 to 00:45 — watching 8–10 real paid APIs fire in parallel, rows popping in with live latencies — is the single frame a judge will remember. Then 00:45–01:00, the presenter says "one SDK integration instead of ten" to camera, and the claim lands because the judge just watched ten calls resolve.

Every second of animation polish pays. Every microinteraction on that ticker — the ease curves, the staggered reveals, the tiny latency counters — is worth an hour on the econ math. If the ticker doesn't feel magical, the pitch doesn't land and we don't win the prize. If it does, everything else is supporting material.

Go.
