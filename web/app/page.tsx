// Landing page. Solar observation terminal aesthetic — oversized variable
// serif hero number, live Orthogonal instrument panel as the centerpiece,
// editorial pitch sections, and a dossier-style methods block.

import Link from 'next/link';
import { Header } from '@/components/Header';
import { SiteFooter } from '@/components/SiteFooter';
import { SignInToSaveLink } from '@/components/SignInToSaveLink';

const LANDING_APIS = [
  { name: 'tariff', latency: 612, purpose: 'time-of-use plan resolution', partner: 'scrapegraph' },
  { name: 'weather', latency: 428, purpose: 'irradiance · 24h forecast', partner: 'precip.ai' },
  { name: 'pricing', latency: 1340, purpose: 'installer $/W quotes', partner: 'scrapegraph' },
  { name: 'finance', latency: 806, purpose: 'solar loan APR range', partner: 'linkup' },
  { name: 'news', latency: 1960, purpose: 'active rebates · NEM 3.0', partner: 'linkup' },
  { name: 'permits', latency: 14, purpose: 'zenpower permit records', partner: 'local index' },
  { name: 'property_value', latency: 1132, purpose: 'home value · ROI %', partner: 'aviato' },
  { name: 'demographics', latency: 774, purpose: 'income-aware sizing', partner: 'pdl' },
  { name: 'reviews', latency: 1542, purpose: 'yelp · energysage signal', partner: 'scrapegraph' },
  { name: 'carbon_price', latency: 518, purpose: 'social cost of carbon', partner: 'linkup' },
];

export default function LandingPage() {
  const maxLatency = Math.max(...LANDING_APIS.map((a) => a.latency));

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1280px] px-6">
        {/* HERO */}
        <section className="relative pt-12 pb-10 sm:pt-20 lg:pt-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)] lg:gap-16">
            {/* LEFT — editorial hero */}
            <div className="space-y-9">
              <h1
                className="type-display text-[color:var(--color-text)]"
                style={{
                  fontSize: 'clamp(52px, 8vw, 112px)',
                  lineHeight: 0.92,
                  letterSpacing: '-0.035em',
                }}
              >
                Home solar,<br />
                <span
                  className="type-display-italic text-[color:var(--color-accent)]"
                  style={{ fontWeight: 500 }}
                >
                  calculated
                </span>
                <br />
                in twenty seconds.
              </h1>

              <p
                className="max-w-[36rem] text-[17px] leading-[1.65] text-[color:var(--color-text-muted)]"
              >
                Enter an address. Helios fans out{' '}
                <span className="text-[color:var(--color-text)]">ten paid APIs</span>{' '}
                in parallel through{' '}
                <span className="text-[color:var(--color-accent)]">a single unified API</span>
                : tariff, weather, permits, installer pricing, financing, news,
                property value, demographics, reviews, carbon price. Out comes a
                25-year net present value, payback period, and recommended system.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href="/install"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-7 py-4 text-[13.5px] font-semibold text-[color:var(--color-bg)] transition"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <span className="relative z-10">run on your address</span>
                  <span className="relative z-10 text-base">→</span>
                  <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-hover:translate-x-0" />
                </Link>
              </div>

              {/* meta strip */}
              <div
                className="grid max-w-xl grid-cols-3 gap-6 border-t border-[color:var(--color-hairline)] pt-7"
              >
                <MetaStat value="10" label="paid APIs" />
                <MetaStat value="1" label="SDK integration" accent />
                <MetaStat value="<20s" label="end to end" />
              </div>
            </div>

            {/* RIGHT — instrument panel */}
            <div className="relative self-start">
              <InstrumentPanel apis={LANDING_APIS} maxLatency={maxLatency} />
            </div>
          </div>
        </section>

        {/* EDITORIAL PITCH */}
        <section className="grid gap-10 pt-20 pb-14 lg:grid-cols-[1fr_minmax(0,1.2fr)] lg:gap-20 lg:pt-32 lg:pb-24">
          <div className="space-y-5 lg:pt-6">
            <h2
              className="type-display-soft text-[color:var(--color-text)]"
              style={{
                fontSize: 'clamp(36px, 4.6vw, 68px)',
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
              }}
            >
              Normally this integration layer is{' '}
              <span className="type-display-italic text-[color:var(--color-accent-warm)]">
                a week of work.
              </span>
            </h2>
            <p className="text-[16.5px] leading-[1.65] text-[color:var(--color-text-muted)]">
              Ten API signups. Ten billing dashboards. Ten response shapes to
              normalize. Ten keys to rotate. We did it with{' '}
              <span className="text-[color:var(--color-text)]">one SDK integration</span>
              {' '}and a single bill. Metered pay-per-use, zero key
              management, zero onboarding.
            </p>
          </div>

          <div
            className="grid gap-x-8 gap-y-3 sm:grid-cols-2"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {LANDING_APIS.map((a) => (
              <div
                key={a.name}
                className="flex items-baseline justify-between gap-4 border-b border-[color:var(--color-hairline)] pb-2"
              >
                <span className="text-[14px] text-[color:var(--color-text)]">{a.name}</span>
                <span className="tabular-nums text-[12px] text-[color:var(--color-accent)]/80">
                  {a.latency}ms
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* HOW */}
        <section className="border-t border-[color:var(--color-border)] pt-14 pb-10 lg:pt-24">
          <h2
            className="mb-12 type-display-soft text-[color:var(--color-text)]"
            style={{ fontSize: 'clamp(36px, 4.6vw, 68px)', lineHeight: 1.02 }}
          >
            Address in. <span className="text-[color:var(--color-accent)]">NPV out.</span>
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            <StepCard
              title="Drop an address"
              body="Geocoded to a utility, irradiance value, permit history, and median home value. La Jolla or wherever."
            />
            <StepCard
              title="Ten APIs fan out"
              body="One asyncio.gather call, one unified SDK. The ticker you see above is the real thing, streaming real latencies."
            />
            <StepCard
              title="A number you can quote"
              body="25-year NPV, payback period, CO₂ avoided priced at the social cost of carbon, ROI as a percent of your home value."
            />
          </div>
        </section>

        {/* CTA slab */}
        <section className="py-20">
          <div
            className="relative overflow-hidden rounded-[2px] border border-[color:var(--color-border)] bg-gradient-to-br from-[color:var(--color-card)] via-[color:var(--color-card-elevated)] to-[color:var(--color-bg-elevated)] p-10 sm:p-16"
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--color-card) 0%, var(--color-card-elevated) 55%, var(--color-bg-elevated) 100%), radial-gradient(circle at 90% -10%, rgba(245,215,110,0.12), transparent 60%)',
            }}
          >
            <div
              className="absolute right-8 top-8 h-20 w-20 rounded-full border border-dashed border-[color:var(--color-accent)]/30 anim-sunbeam"
              style={{ animationDuration: '30s' }}
            />
            <h2
              className="type-display-soft text-[color:var(--color-text)]"
              style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: 0.98 }}
            >
              Run it on <span className="type-display-italic text-[color:var(--color-accent)]">your house.</span>
            </h2>
            <p className="mt-5 max-w-lg text-[15.5px] text-[color:var(--color-text-muted)]">
              Twenty seconds, no signup. Create an account if you want to save
              runs across web and mobile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/install"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-7 py-3.5 text-[13px] font-semibold text-[color:var(--color-bg)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="relative z-10">start estimate →</span>
                <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-hover:translate-x-0" />
              </Link>
              <SignInToSaveLink />
            </div>
            <div className="mt-5">
              <Link
                href="/live"
                className="inline-flex items-center gap-2 text-[12.5px] text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-accent)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-success)]"
                  style={{ boxShadow: '0 0 5px rgba(135,214,125,0.8)' }}
                />
                already have solar? see the live arbitrage dashboard →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// ---------- subcomponents ----------

function MetaStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={`tabular-nums text-[28px] font-semibold leading-none ${
          accent ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text)]'
        }`}
        style={{ fontFamily: 'var(--font-display)', fontVariationSettings: '"opsz" 144' }}
      >
        {value}
      </div>
      <div
        className="text-[12px] text-[color:var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </div>
    </div>
  );
}

function StepCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="group relative border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 p-7 transition hover:border-[color:var(--color-accent)]/60 hover:bg-[color:var(--color-card)]">
      <h3 className="text-[22px] font-semibold leading-tight text-[color:var(--color-text)]">
        {title}
      </h3>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-[color:var(--color-text-muted)]">
        {body}
      </p>
    </div>
  );
}

function InstrumentPanel({
  apis,
  maxLatency,
}: {
  apis: Array<{ name: string; latency: number; purpose: string; partner: string }>;
  maxLatency: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[2px] border border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/90 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* top chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-[color:var(--color-success)]"
            style={{ boxShadow: '0 0 6px rgba(135,214,125,0.7)' }}
          />
          <span className="text-[11px] text-[color:var(--color-accent)]">
            parallel · fan-out
          </span>
          <span className="caret-blink text-[color:var(--color-accent)]">▌</span>
        </div>
        <div className="text-[11px] text-[color:var(--color-text-dim)]">
          10/10
        </div>
      </div>

      {/* scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-0 right-0 h-[140px] -translate-y-full bg-gradient-to-b from-transparent via-[color:var(--color-accent)]/6 to-transparent"
          style={{ animation: 'scan-line 8s ease-in-out infinite' }}
        />
      </div>

      {/* rows */}
      <div className="relative px-2 py-3">
        {apis.map((a, i) => {
          const widthPct = (a.latency / maxLatency) * 100;
          const duration = Math.max(0.7, (a.latency / maxLatency) * 1.9);
          const delay = i * 0.12;
          return (
            <div
              key={a.name}
              className="group flex items-center gap-3 border-b border-[color:var(--color-hairline)] px-2 py-2 last:border-0"
            >
              <span className="w-5 text-[11px] tabular-nums text-[color:var(--color-text-dim)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--color-success)]"
                style={{ animation: `pulse-dot 2.4s ease-in-out ${delay}s infinite` }}
              />
              <span className="w-[104px] shrink-0 text-[11px] text-[color:var(--color-text)]">
                {a.name}
              </span>
              <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[color:var(--color-bg-elevated)]/70">
                <div
                  className="absolute left-0 top-0 h-full origin-left rounded-full bg-gradient-to-r from-[color:var(--color-accent-dim)] via-[color:var(--color-accent)] to-[color:var(--color-accent-warm)]"
                  style={{
                    width: `${widthPct}%`,
                    animation: `latency-bar ${duration}s cubic-bezier(0.22, 0.75, 0.25, 1) ${delay}s infinite alternate`,
                  }}
                />
              </div>
              <span
                className="w-[64px] shrink-0 text-right text-[11px] tabular-nums text-[color:var(--color-text-muted)]"
                style={{ animation: `latency-cycle ${duration * 2}s ease-in-out ${delay}s infinite` }}
              >
                {a.latency}ms
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
