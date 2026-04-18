// Landing page. Server component (static) with client components embedded.
// Hero tagline + "10 APIs, 1 SDK" pitch + animated ticker visualization
// that loops on CSS keyframes. No fetch on render.

import Link from 'next/link';
import { Header } from '@/components/Header';

const LANDING_APIS = [
  { name: 'tariff', latency: 612 },
  { name: 'weather', latency: 428 },
  { name: 'pricing', latency: 1340 },
  { name: 'finance', latency: 806 },
  { name: 'news', latency: 1960 },
  { name: 'permits', latency: 14 },
  { name: 'property_value', latency: 1132 },
  { name: 'demographics', latency: 774 },
  { name: 'reviews', latency: 1542 },
  { name: 'carbon_price', latency: 518 },
];

export default function LandingPage() {
  // Longest latency in the set, used to normalize bar widths in the hero viz.
  const maxLatency = Math.max(...LANDING_APIS.map((a) => a.latency));

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)]">
      <Header />

      <main className="mx-auto max-w-6xl px-6">
        {/* HERO */}
        <section className="grid gap-12 py-14 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16 lg:py-32">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
              datahacks 2026 · orthogonal
            </div>

            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--color-text)] sm:text-5xl md:text-6xl">
              Solar economics,
              <br />
              <span className="text-[color:var(--color-accent)]">in 20 seconds.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[color:var(--color-text-muted)] sm:text-lg">
              Enter an address. Get a 25-year NPV, payback period, and recommended
              system. Helios fans out <b className="text-[color:var(--color-text)]">10 paid APIs</b> in
              parallel through <b className="text-[color:var(--color-text)]">one Orthogonal SDK</b> —
              tariffs, weather, permits, pricing, financing, news, property value,
              demographics, reviews, carbon price.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/install"
                className="rounded-xl bg-[color:var(--color-accent)] px-6 py-3.5 text-base font-semibold text-[color:var(--color-bg)] transition hover:brightness-105"
              >
                run it on your address →
              </Link>
              <a
                href="https://github.com/daniticau/helios"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-6 py-3.5 text-base font-semibold text-[color:var(--color-text)] hover:border-[color:var(--color-text-muted)]"
              >
                view source
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 text-sm">
              <StatBlock value="10" label="paid APIs" />
              <StatBlock value="1" label="SDK" accent />
              <StatBlock value="<20s" label="end to end" />
            </div>
          </div>

          {/* Orthogonal ticker viz — static SVG + CSS animated bars. */}
          <TickerViz apis={LANDING_APIS} maxLatency={maxLatency} />
        </section>

        {/* PITCH BAND */}
        <section className="border-y border-[color:var(--color-border)] py-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
                the pitch
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
                Building this the normal way is a week.
              </h2>
              <p className="text-base leading-relaxed text-[color:var(--color-text-muted)]">
                Ten API signups, ten API keys, ten billing dashboards, ten response
                shapes. We wrote one SDK integration. Orthogonal is metered pay-per-use,
                zero key management, zero billing setup. The product didn&apos;t exist
                last quarter.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {LANDING_APIS.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center justify-between rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2.5"
                >
                  <span className="font-mono text-xs text-[color:var(--color-text)]">
                    {a.name}
                  </span>
                  <span className="font-mono text-[10px] text-[color:var(--color-text-dim)]">
                    {a.latency}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="py-16">
          <div className="max-w-3xl space-y-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
              how it runs
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-4xl">
              Address in. NPV out.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <StepCard
              num="01"
              title="Tap an address"
              body="Your address resolves to a utility, a climate zone, a permit history, and a median home value."
            />
            <StepCard
              num="02"
              title="Ten APIs fan out"
              body="Orthogonal orchestrates the parallel calls. A live ticker streams real latencies — not a loading spinner."
            />
            <StepCard
              num="03"
              title="A number you can quote"
              body="25-year NPV, payback period, CO₂ avoided, and the social cost of carbon converted into dollars."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-gradient-to-b from-[color:var(--color-card)] to-[color:var(--color-bg-elevated)] p-10 text-center sm:p-16">
            <h2 className="text-3xl font-bold tracking-tight text-[color:var(--color-text)] sm:text-5xl">
              Run it on your house.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-[color:var(--color-text-muted)]">
              20 seconds, no signup required. Sign in if you want to save runs.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/install"
                className="rounded-xl bg-[color:var(--color-accent)] px-8 py-4 text-base font-semibold text-[color:var(--color-bg)] hover:brightness-105"
              >
                start an estimate →
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)] px-8 py-4 text-base font-semibold text-[color:var(--color-text)]"
              >
                sign in to save
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--color-border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 font-mono text-xs text-[color:var(--color-text-dim)]">
          <div>helios · datahacks 2026 · best use of orthogonal</div>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/daniticau/helios"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--color-text)]"
            >
              github
            </a>
            <a
              href="https://orthogonal.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--color-text)]"
            >
              orthogonal
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBlock({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="border-l-2 border-[color:var(--color-border)] pl-3">
      <div
        className={`tabular-nums text-2xl font-bold ${
          accent ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text)]'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
        {label}
      </div>
    </div>
  );
}

function StepCard({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
        {num}
      </div>
      <h3 className="mt-3 text-xl font-bold text-[color:var(--color-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-text-muted)]">
        {body}
      </p>
    </div>
  );
}

function TickerViz({
  apis,
  maxLatency,
}: {
  apis: Array<{ name: string; latency: number }>;
  maxLatency: number;
}) {
  // Animation: each row's bar scales from 0→1 over a duration proportional to
  // its latency, then the whole block loops. Pure CSS keyframes; no JS.
  return (
    <div className="relative self-start rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.6)]">
      <div className="mb-3 flex items-center justify-between border-b border-[color:var(--color-border)] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs tracking-wider text-[color:var(--color-accent)]">
            orthogonal &gt;
          </span>
          <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
            fan-out in flight
          </span>
          <span className="caret-blink font-mono text-xs text-[color:var(--color-accent)]">
            ▌
          </span>
        </div>
        <div className="font-mono text-[10px] text-[color:var(--color-text-muted)]">
          10/10 · 14ms min · 1960ms max
        </div>
      </div>
      <div className="space-y-2.5">
        {apis.map((a, i) => {
          const widthPct = (a.latency / maxLatency) * 100;
          const duration = Math.max(0.6, (a.latency / maxLatency) * 1.8);
          const delay = i * 0.12;
          return (
            <div key={a.name} className="flex items-center gap-3">
              <span
                className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[color:var(--color-success)]"
                style={{
                  animation: `pulse-dot 2.2s ease-in-out ${delay}s infinite`,
                }}
              />
              <span className="w-28 flex-shrink-0 font-mono text-[11px] text-[color:var(--color-text)]">
                {a.name}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--color-bg-elevated)]">
                <div
                  className="absolute left-0 top-0 h-full origin-left rounded-full bg-gradient-to-r from-[color:var(--color-accent-dim)] to-[color:var(--color-accent)]"
                  style={{
                    width: `${widthPct}%`,
                    animation: `latency-bar ${duration}s cubic-bezier(0.22, 0.75, 0.25, 1) ${delay}s infinite alternate`,
                  }}
                />
              </div>
              <span
                className="w-14 flex-shrink-0 text-right font-mono text-[10px] tabular-nums text-[color:var(--color-text-muted)]"
                style={{
                  animation: `latency-cycle ${duration * 2}s ease-in-out ${delay}s infinite`,
                }}
              >
                {a.latency}ms
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-[color:var(--color-border)] pt-3 font-mono text-[10px] text-[color:var(--color-text-dim)]">
        $ 10 paid APIs, 1 SDK. Every latency here is real on a live run.
      </div>
    </div>
  );
}
