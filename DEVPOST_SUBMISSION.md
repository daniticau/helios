# Devpost Submission Copy - Helios

## Project name
**Helios**

## Tagline
Home solar economics, decided in 20 seconds - powered by 10 paid APIs through one Orthogonal SDK.

## Short description
Helios is a mobile-first AI agent that collapses the full economics of home solar + battery into a single tap. It fans out eight to ten paid APIs in parallel through Orthogonal to return a 25-year NPV, payback period, and a live NEM 3.0 arbitrage recommendation - an integration layer that would be a week of API signups built as a single SDK call.

---

## Inspiration

Home solar in California has a 6 to 10 year payback. The number depends on a dozen inputs that each live behind a different paid API: your utility's TOU plan, current NEM 3.0 export rates, local permit velocity, installer pricing variance, review scores, financing APRs, property value, neighborhood demographics, and the social cost of the carbon you would avoid. Ten paid data sources means ten developer signups, ten API keys to rotate, ten billing dashboards. The integration layer alone is a week of plumbing, which is why nobody ships this tool.

Orthogonal collapses that week into a single SDK. Ten paid APIs behind one integration, metered pay-per-use, zero credentials to manage. The moment that existed, the product i had been sketching for months became a weekend of work: tap an address, watch ten live API calls resolve in parallel, get a real number.

**Helios genuinely could not exist without Orthogonal.** The product is a thin layer over one SDK integration; the magic is that the SDK is standing in for ten.

## What it does

Two modes in one mobile app, sharing one backend.

**Mode A - "Should I?"**
Enter an address and monthly bill. In under 20 seconds the agent returns a 25-year NPV, payback period, recommended system size, and a full line-item upfront cost breakdown, plus context no online quote tool shows: ROI as a percentage of home value, installer credibility signals, income-adjusted sizing, and the dollarized CO2 you would avoid at the current social cost of carbon. Paste a PG&E bill PDF from the iOS share sheet and the app auto-parses kWh + tariff.

**Mode B - "Right Now?"**
For households that already have solar + battery. A live dashboard and iOS home-screen widget show the current recommended action across six choices (charge from solar, discharge to house, discharge to grid, charge from grid, export, hold). Push notifications fire 10 minutes before peak export windows. A 24-hour greedy arbitrage solver evaluates live CAISO wholesale LMPs against retail TOU rates and a solar production forecast.

Both modes are powered by the same orchestrator that fires **eight to ten APIs in parallel through Orthogonal** per user action.

## Technical architecture

### The orchestrator - why this project exists

`backend/orchestrator.py` is the whole pitch. Per ROI request, the service fires ten parallel fetches via `asyncio.gather` against a single Orthogonal gateway. Each adapter normalizes its partner-specific response into a shared `ExternalInputs` TypedDict that the pure-Python econ engine consumes.

| # | Partner (via Orthogonal) | What i extract | Why it matters |
|---|---|---|---|
| 1 | **Linkup** (tariff structured search) | `peak_usd_per_kwh`, `offpeak_usd_per_kwh`, `peak_hours` string for the user's utility + plan (PG&E EV2-A, SCE TOU-D-PRIME, SDGE EV-TOU-5) | Drives the retail-rate side of the NPV savings equation and populates the tariff summary copy shown on the result card |
| 2 | **Precip AI** (solar radiation hourly) | Hourly DSWRF (W/m²) over a 48h window, integrated into a best-rolling-24h `irradiance_kwh_m2_day` + the hourly curve | Feeds the production model (`P₀ = kW × kWh/yr per kW`) - a SoCal hour of 5.8 kWh/m²/day vs a Seattle 3.2 moves payback by years |
| 3 | **Linkup** (EnergySage aggregate) | `usd_per_watt_low`, `usd_per_watt_high` for the ZIP, sanity-bounded to $1.50-$7.00/W | Sets `C₀`, the upfront install cost. The dominant single variable in NPV - a $0.50/W swing on a 10kW system is $5k |
| 4 | **Linkup** (GoodLeap / Sunlight / Mosaic) | `apr_low`, `apr_high` as decimals, normalized across decimal/percent encoding variance, bounded to 2-22% | Powers the "finance vs cash" comparison card. A 6.9% vs 9.9% APR on a 20-year loan changes monthly payment by ~$80 |
| 5 | **Linkup** (rebate news search) | Top 5 headlines with title, URL, snippet for "{state} residential solar rebate 2026 SGIP NEM 3.0" | Surfaces active state/utility incentives a homeowner would otherwise miss (SGIP battery rebates run $150-$1000/kWh) |
| 6 | **Linkup** (Zillow/Redfin structured) | `estimated_value_usd` for the home near the supplied address | Lets me frame NPV as "X% of your home value" - a $48k 25-year NPV reads very differently on an $800k home vs a $2M home |
| 7 | **People Data Labs** (company enrich) | Utility company firmographics - `employee_count`, `industry`, `size` for PG&E/SCE/SDGE/LADWP | Populates the utility credibility line ("your utility serves N million customers") and keeps PDL live on the ticker as a distinct partner |
| 8 | **Aviato** (company enrich) | Firmographic trust signal on a reference CA installer (Sunrun by default) - company ID, LinkedIn URL, size | Installer trust chip on the result card - thin slice of a much richer enrichment payload, cheap (<2s) |
| 9 | **Linkup** (EPA / CARB structured) | `usd_per_ton_co2` current social cost of carbon, with EPA 2023 default ($185/ton) as fallback | Converts the CO2-avoided number into dollars. A 25-year install avoids ~150 tons, so at $185/ton that's a $27k externality line |
| 10 | **ZenPower** (local 37.9k-permit CSV) | Per-ZIP `installs_count`, `avg_system_kw`, `median_permit_days` | Credibility line ("N recent installs in your ZIP averaging K kW") + anchors my system sizing recommendation against real local builds |
| + | **CAISO OASIS** (direct, Mode B) | 24h of hourly LMPs at `TH_SP15_GEN-APND` for Southern California | Prices every export/discharge decision minute-by-minute in the arbitrage solver. Not an Orthogonal call - CAISO is public - but routed through the same fan-out so the ticker shows it |

Each fetch is wrapped in `_timed_call`, which records latency, enforces a per-call timeout, captures errors as structured `OrthogonalCallLog` entries, and stamps every response with a cache TTL. Any single call failing never breaks the response - the econ engine fills missing inputs with documented defaults and surfaces which sources fell back so the UI can flag the affected numbers with a `via fallback` chip.

The ten `OrthogonalCallLog` entries stream back to the mobile client, where the **Orthogonal ticker** renders each row as it resolves with its real partner name, purpose string, and measured latency. The animation is not a canned sequence. Every tick is one of ten paid APIs actually returning. This is the demo.

### Backend

Python 3.11, FastAPI, Pydantic v2 typed contracts, `httpx` for outbound. `POST /api/roi` returns under 20s for a cold request, under 5s warm. A Server-Sent Events variant streams each `OrthogonalCallLog` the instant it resolves so the ticker pops rows live rather than waiting on the slowest call.

`backend/econ/` is a pure-Python module with zero network I/O: numpy NPV with panel degradation and rate escalation, a greedy 24-hour battery arbitrage solver with priority rules over the six possible actions, and a system sizing recommender. Unit tested independently of the rest of the backend.

Deployed on **AWS App Runner** from ECR (`infra/aws/apprunner.yaml`), region `us-west-2`, 1 vCPU / 2 GB, always-warm for the demo.

### Mobile

Expo / React Native / TypeScript. `mobile/src/modeA/` owns the install flow - the onboarding screens, the ticker, and the result card. `mobile/src/modeB/` owns the live dashboard, the forecast chart, the home-screen widget, and the push-notification scheduler. All HTTP goes through a single typed fetch layer (`mobile/src/shared/api.ts`) that mirrors the Pydantic schemas via `mobile/src/shared/types.ts`.

### Web companion

A Next.js companion at `web/` talks to the same backend. Address autocomplete, a live web version of the ticker, and number provenance chips that flag every result value with its source and whether it came from a live Orthogonal call or a documented fallback.

### Analysis notebook

`analysis/helios_analysis.py` is a Marimo reactive notebook over the 37.9k-permit ZenPower dataset. It imports `backend/econ/npv.py` directly - the same module the production backend runs - so sensitivity sliders over discount rate, degradation, and rate escalation recompute NPV live. Static HTML export committed at `analysis/html/helios_analysis.html` so judges can open it without installing anything.

### Wire contracts

`backend/schemas.py` and `mobile/src/shared/types.ts` are kept in lockstep. Every change to one requires the matching change to the other. The econ engine and orchestrator communicate through a single normalized `ExternalInputs` TypedDict; adding an Orthogonal partner is one adapter function and one entry in `_build_roi_source_specs`.

## How i used Orthogonal

The core claim: **one SDK integration instead of ten.** 

Without Orthogonal, shipping the current feature set would require:

- 10 developer signups (ScrapeGraph, Linkup, Precip, Aviato, PDL, OpenWeather, and per-aggregator accounts)
- 10 API keys to provision, rotate, and secure
- 10 billing relationships and separate invoices
- 10 partner-specific SDKs or hand-rolled HTTP clients
- 10 rate-limit regimes to respect

With Orthogonal, the same surface is one SDK, one credential, and one `orthogonal_client.run(partner, path, body=...)` call. The ten per-source adapters in `orchestrator.py` are 20-40 lines each - just response-shape normalization into the `ExternalInputs` dict. The concurrency pattern is literally:

```python
tasks = [
    fetch_tariff(profile), fetch_weather(lat, lng),
    fetch_installer_pricing(zip), fetch_financing(state),
    fetch_news(state), fetch_property_value(address, zip),
    fetch_demographics(zip, utility), fetch_installer_reviews(zip),
    fetch_carbon_price(state), fetch_zenpower_summary(zip, index),
]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

Ten paid APIs, one `asyncio.gather`, one SDK. That is the whole story.

## Challenges i ran into

- **Parallelizing ten calls under a 20s budget.** Naive sequential was 40+ seconds. `asyncio.gather` with per-source timeouts, partial-failure capture, and TTL caching cut it to 12-18s cold. I also built an SSE variant so the mobile ticker renders each row the instant it resolves rather than waiting on the slowest.
- **Response-shape variance.** Linkup structured search returns APRs inconsistently - sometimes decimals, sometimes percents, occasionally integer-as-percent. Every adapter has a guarded normalizer + sanity bounds with an explicit `fell_back=True` flag so the UI can surface which numbers came from real data vs documented defaults.
- **NEM 3.0 export math.** The ACC tables vary by hour, month, and utility. I sampled and interpolated, and committed the methodology to the Marimo notebook so judges can audit it.
- **Making orchestration feel magical without faking it.** Every tick on the ticker is a real `OrthogonalCallLog` with real latency streamed from the backend. Tuning the pacing, stagger, and latency counters took real iteration.

## Accomplishments i'm proud of

- **A live Orthogonal orchestration ticker that is unambiguously real.** Every row is one of ten paid APIs firing, with its real partner name, its real purpose, and its real latency.
- **Ten paid data sources behind one SDK integration instead of ten.** This is the whole pitch and it is demonstrably true in the code.
- **AWS App Runner deploy from day one.** Backend on `*.awsapprunner.com`, not a dev tunnel, reachable from the mobile app during the live demo.
- **A Marimo notebook that imports the production econ module directly** - 37.9k permits indexed by ZIP and live NPV sensitivity sliders, all over the same Python that ships.
- **An iOS share extension** that pulls a PG&E bill PDF from the share sheet and recomputes ROI in 20 seconds.

## What i learned

Once ten paid data sources sit behind one SDK, the product you build changes shape. The ROI screen surfaces percentage-of-home-value, installer credibility, income-adjusted sizing, and a dollarized CO2 line - things no solar quote tool shows, enabled entirely by the fact that adding an API costs me one adapter function instead of a week of billing plumbing.

## What's next for Helios

- Direct control integration with Tesla Powerwall, Enphase IQ, Franklin, and SolarEdge to execute recommendations, not just surface them.
- Installer referral marketplace routing ready-to-buy users to vetted local installers.
- Replace the greedy 24-hour arbitrage solver with a rolling LP over the 25-year horizon that accounts for battery cycle degradation.
- Expand beyond California to Nevada, Hawaii, and the reformed Northeast markets.

---

## Built with

```
orthogonal
react-native
expo
typescript
nativewind
zustand
tanstack-query
victory-native
expo-notifications
python
fastapi
pydantic
asyncio
httpx
numpy
scipy
pandas
marimo
nextjs
tailwindcss
caiso-oasis
scrapegraph
linkup
precip-ai
aviato
people-data-labs
aws-app-runner
aws-ecr
docker
```

---

## Video description

Helios is a mobile AI agent for home solar economics, built at DataHacks 2026.

Mode A answers "should I install solar?" in 20 seconds by firing **eight to ten APIs in parallel through Orthogonal** - tariff, installer pricing, financing, rebate news, solar irradiance, property value, utility firmographics, installer credibility, social cost of carbon, and ZenPower permit records - with real partner names and real latencies streamed to a live orchestration ticker.

Mode B answers "what should my battery do right now?" with a live iOS widget and push notifications, arbitraging California's NEM 3.0 export rates against live CAISO LMPs.

Backend deployed on AWS App Runner. Reactive analysis in a committed Marimo notebook over the 37.9k-permit ZenPower dataset.

Target prize: Best Use of Orthogonal.

GitHub: [link]
Live demo: [link]

---

## Submission fields checklist

- [ ] Project name: Helios
- [ ] Tagline: one line from above
- [ ] Short description: above
- [ ] Video URL: unlisted YouTube, 3 minutes, matches the demo script
- [ ] Try-it-out links: Expo Go QR + AWS App Runner backend URL
- [ ] Public repo + MIT license
- [ ] Built with: paste the list above
- [ ] Challenges opted into: Best Use of Orthogonal (primary), ZenPower dataset, AWS, Marimo
- [ ] Screenshots: Mode A result screen, Orthogonal ticker mid-flight, share extension, Mode B dashboard, home screen widget, Marimo notebook

---

## Phrases that must survive any rewrite

- "eight to ten APIs in parallel through Orthogonal"
- "one SDK integration instead of ten"
- "ZenPower solar permit records"
- "NEM 3.0"
