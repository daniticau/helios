# Devpost Submission Copy — Helios

> paste-ready. rewrite anything that feels off in your voice. lowercase style matches how you write; capitalize if you want it more formal for judges.

---

## Project name
**Helios**

> alternatives if helios feels generic:
> - **Noon** (clean, one word, works with "peak noon" solar imagery)
> - **Arc** (electric arc + solar arc)
> - **Solstice**
> - **Peak** (ties directly to peak pricing, probably too generic though)

## Tagline (one line, shows on project card)
Home solar economics, decided in 20 seconds.

> alternates:
> - "the line items your solar installer forgot"
> - "your home battery's financial copilot"
> - "NEM 3.0 arbitrage, in your pocket"

## Short description (2 sentences, shows under the project name)
Helios collapses the full economics of home solar + battery into a single tap. Enter an address, get a 25-year NPV. Already have solar? Get live charge, discharge, and sell-back recommendations that arbitrage California's NEM 3.0 export rates.

---

## Inspiration

Home solar in California has a 6 to 10 year payback. The math behind that number is buried across almost a dozen different places: your utility's time-of-use plan, current NEM 3.0 export rates, local permit velocity, system sizing, installer pricing variance, installer review quality, financing APRs, your home's property value, neighborhood demographics, and the social cost of the carbon you'd avoid. Each one lives behind a different paid API, a different developer signup, a different billing dashboard. The research layer alone is a week of infrastructure work, which is why nobody ships this tool.

Orthogonal collapsed that week into one SDK. Ten paid APIs behind a single integration, metered pay-per-use, zero keys to rotate, zero billing relationships to open. The moment that became available, the product we'd been sketching for months became a weekend of work: tap an address, watch eight to ten live API calls resolve in parallel, get a real number.

For existing solar owners, NEM 3.0 made timing the new variable. Export rates swing from 5 cents per kWh at noon to over a dollar per kWh on hot summer evenings. Most batteries run dumb schedules and leave real money on the table every day. The same Orthogonal orchestration layer that powers Mode A — weather forecasts, live rate feeds, tariff lookups — drives the real-time arbitrage engine in Mode B.

**Helios genuinely could not exist without Orthogonal.** The product is a thin layer over a single SDK integration; the magic is that the SDK is standing in for ten.

## What it does

Helios has two modes in one mobile app.

**Mode A — "Should I?"**
Enter an address and your monthly electric bill. In 20 seconds the agent returns a 25-year NPV, payback period, optimal system size, and a full line-item upfront cost breakdown — plus context no online quote tool shows you: ROI as a percentage of your home value, neighborhood installer review scores, income-adjusted system sizing, and the dollar value of the CO2 you'd avoid at the current social cost of carbon. You can also share a PG&E bill PDF directly from the iOS share sheet and have it auto-parsed.

**Mode B — "Right Now?"**
For households that already have solar plus battery. A live dashboard and iOS home-screen widget show the current recommended action: charge from solar, discharge to house, discharge to grid, or hold. Push notifications fire 10 minutes before peak export windows open. Under the hood, a greedy arbitrage solver evaluates the next 24 hours against live CAISO wholesale prices, retail TOU rates, and a solar production forecast.

Both modes are powered by the same orchestrator that fires **eight to ten APIs in parallel through Orthogonal** per user action.

## How we built it

**Orthogonal as the agentic gateway — the reason this project exists.** Per ROI request, the backend fires **eight to ten APIs in parallel through Orthogonal** via asyncio.gather: tariff lookup, installer pricing via ScrapeGraph on EnergySage, solar loan APR lookups, rebate news via Linkup, OpenWeather irradiance, property value via Aviato (or ScrapeGraph on Zillow), demographics via People Data Labs, installer review scores via ScrapeGraph on Yelp/EnergySage, carbon pricing via Linkup, and a ZenPower permit summary. Ten paid data sources, **one SDK integration instead of ten.** No API keys to manage, no ten separate billing dashboards, no ten developer signup forms. Without Orthogonal this integration layer alone would have been the entire hackathon.

**Backend:** FastAPI (Python 3.11), pydantic for typed contracts, async fan-out via asyncio.gather so a full ROI call fires eight to ten APIs in parallel and returns in under 20 seconds. In-memory LRU cache with per-source TTLs.

**Mobile:** Expo (React Native), NativeWind for styling, Zustand for client state, TanStack Query for server sync, Victory Native for charts, expo-notifications for push alerts, custom iOS share extension for the utility bill flow, and a home-screen widget for the live recommendation. The live "Orthogonal ticker" animation — rows popping in as each API call resolves, with real latencies streamed from the backend — is the hero moment of the demo.

**Dataset:**
- **ZenPower solar permit records** — loaded as an indexed pandas DataFrame on backend boot. Used for per-ZIP system sizing suggestions and a credibility line in the UI ("we see N recent installs in your ZIP averaging K kW").

**Direct integrations:** CAISO OASIS for real-time wholesale LMP prices, used to value export decisions minute by minute in Mode B.

**Econ engine:** pure numpy implementation of the NPV with panel degradation and rate escalation. Arbitrage solver is a 24-hour greedy lookahead with priority rules for the six possible battery actions. Pure-Python, unit tested, zero network I/O.

## Challenges we ran into

- **Parallelizing ten Orthogonal calls.** The naive sequential implementation took 40+ seconds per ROI request. Moving to asyncio.gather with per-source timeouts cut it under 20 even with the full eight-to-ten call fan-out.
- **NEM 3.0 export rate math.** The ACC tables are non-trivial and vary by hour, month, and utility. We ended up sampling a subset and interpolating.
- **iOS share extension in Expo managed workflow.** Had to switch to a dev client build to get the share target to compile.
- **Making the agent orchestration feel magical without faking it.** The Orthogonal ticker animation in the UI shows real API calls with real latencies streamed from the backend, not a canned sequence. Tuning the pacing, the stagger between rows, and the latency counters took real iteration — this was the animation we spent the most time on because it is the demo.

## Accomplishments we're proud of

- A live Orthogonal orchestration animation that is unambiguously real: every tick is one of the eight to ten APIs firing, with an actual latency streamed back from the backend. No mocks, no canned sequences.
- A share extension from the iOS share sheet that pulls a PG&E bill PDF into the app and recomputes ROI in 20 seconds. Nobody else at this hackathon has a flow like that.
- An arbitrage recommendation engine that consistently recovers non-obvious plays (briefly buying from grid while discharging battery to grid when the spread justifies it).
- Ten paid data sources behind one SDK integration instead of ten, with a per-call latency log we can show on screen. Orthogonal is the hero.

## What we learned

- Orthogonal is genuinely a force multiplier. Building the same integration layer across ten paid APIs — property data, demographics, review scrapers, carbon pricing, installer pricing, financing, tariff, weather, permits, news — in 36 hours would have been the whole hackathon, if it was possible at all.
- NEM 3.0 changed residential solar economics more than most homeowners realize. Timing has gone from a non-issue to a several-thousand-dollars-a-year question.
- Once you have ten paid data sources behind one SDK, the product you build changes shape. The ROI screen now shows percentage-of-home-value, neighborhood installer reviews, income-adjusted sizing, and a dollarized CO2 line — things no solar quote tool surfaces, enabled entirely by the fact that adding an API costs us one asyncio.gather entry instead of a week of billing signup.

## What's next for Helios

- Direct integration with Tesla Powerwall, Enphase IQ, Franklin, and SolarEdge battery APIs to actually execute the recommendation, not just surface it.
- Installer marketplace: route ready-to-buy users to vetted local installers for a referral fee.
- Expand beyond California to other NEM-reformed markets (Nevada, Hawaii, parts of the Northeast).
- Replace the greedy 24-hour arbitrage solver with a rolling LP that optimizes over the full 25-year horizon and accounts for battery cycle degradation.
- Shipping the iOS widget + live activity to TestFlight for real households within a month.

---

## Built with (tech stack list for the Built With field)

```
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
numpy
scipy
pandas
orthogonal
scrapegraph
linkup
openweather
caiso-oasis
claude-api
render
```

---

## Video description (YouTube unlisted, paste under video)

Helios is a mobile AI agent for home solar economics, built at DataHacks 2026.

Mode A answers "should I install solar?" in 20 seconds by firing **eight to ten APIs in parallel through Orthogonal** — tariff, installer pricing, financing, rebate news, weather, property value, demographics, installer reviews, carbon pricing, and ZenPower permit records — with real latencies streamed to a live orchestration ticker in the UI.

Mode B answers "what should my battery do right now?" with a live iOS widget and push notifications, arbitraging California's NEM 3.0 export rates.

Tracks: Economics + Product & Entrepreneurship.
Dataset used: ZenPower solar permit records.
Target prize: Best Use of Orthogonal.

GitHub: [link]
Live demo: [link]

---

## Submission fields checklist at upload time

- [ ] Project name: Helios (or final pick)
- [ ] Tagline: one line from section above
- [ ] Short description: 2 sentences above
- [ ] Video URL: unlisted YouTube, 3 minutes, matches the demo script in HELIOS.md section 11
- [ ] "Try it out" links: Expo Go QR or TestFlight link + deployed backend URL
- [ ] Public repo: GitHub link (README + MIT license)
- [ ] Built with: paste the list above
- [ ] Tracks: Economics, Product & Entrepreneurship (scaffolding, not the target)
- [ ] Challenges opted into: Best Use of Orthogonal (single target — DataHacks is one-prize-per-team)
- [ ] Screenshots (upload 3–5): Mode A result screen, Orthogonal ticker animation mid-flight, share extension in action, Mode B live dashboard, home screen widget
- [ ] Team members: all added with correct Devpost handles

---

## Notes on tone

this copy is a draft. feel free to strip formality where it reads stiff. judges skim. the first two sentences of each section do 80% of the work. everything else is supporting material.

the phrases to keep no matter what you rewrite:
- "eight to ten APIs in parallel through Orthogonal" (orthogonal judges will grep for this — it's the prize pitch)
- "one SDK integration instead of ten" (the line that summarizes why Orthogonal wins)
- "ZenPower solar permit records" (eligibility dataset — must be named)
- "NEM 3.0" (signals you actually understand CA solar)

the phrases to probably cut if tight on length:
- the "what we learned" section can be dropped entirely if needed
- the "challenges we ran into" is judge fodder but not essential
