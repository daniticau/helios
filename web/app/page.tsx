// Landing page. Solar observation terminal aesthetic — oversized variable
// serif hero number, live Orthogonal instrument panel as the centerpiece,
// editorial pitch sections, and a dossier-style methods block.

import Link from 'next/link';
import { Header } from '@/components/Header';
import { SiteFooter } from '@/components/SiteFooter';

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
  const totalMs = LANDING_APIS.reduce((a, b) => Math.max(a, b.latency), 0);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-[1280px] px-6">
        {/* HERO */}
        <section className="relative pt-12 pb-10 sm:pt-20 lg:pt-28">
          {/* top coordinate line */}
          <div
            className="flex items-center justify-between border-b border-[color:var(--color-hairline)] pb-3 text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span>
              // mission <span className="text-[color:var(--color-text-muted)]">helios</span>
            </span>
            <span className="hidden sm:inline">
              mode A · install decision
            </span>
            <span>
              rev <span className="text-[color:var(--color-accent)]">0.1.0</span>
            </span>
          </div>

          <div className="grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)] lg:gap-16 lg:pt-16">
            {/* LEFT — editorial hero */}
            <div className="space-y-9">
              <div className="space-y-4">
                <div
                  className="text-[10.5px] uppercase tracking-[0.35em] text-[color:var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  · solar · net present value · 25yr
                </div>
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
              </div>

              <p
                className="max-w-[36rem] text-[17px] leading-[1.65] text-[color:var(--color-text-muted)]"
              >
                Enter an address. Helios fans out{' '}
                <span className="text-[color:var(--color-text)]">ten paid APIs</span>{' '}
                in parallel through{' '}
                <span className="text-[color:var(--color-accent)]">a single Orthogonal SDK</span>
                {' '}— tariff, weather, permits, installer pricing, financing, news,
                property value, demographics, reviews, carbon price — and returns a
                25-year net present value, payback period, and recommended system.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href="/install"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-7 py-4 text-[13.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-bg)] transition"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <span className="relative z-10">run on your address</span>
                  <span className="relative z-10 text-base">→</span>
                  <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-hover:translate-x-0" />
                </Link>
                <a
                  href="https://github.com/daniticau/helios"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ↗ view source
                </a>
              </div>

              {/* meta strip */}
              <div
                className="grid max-w-xl grid-cols-3 gap-6 border-t border-[color:var(--color-hairline)] pt-7"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <MetaStat value="10" label="paid APIs" />
                <MetaStat value="1" label="SDK integration" accent />
                <MetaStat value="<20s" label="end to end" />
              </div>
            </div>

            {/* RIGHT — instrument panel */}
            <div className="relative self-start">
              <InstrumentPanel apis={LANDING_APIS} maxLatency={maxLatency} totalMs={totalMs} />
            </div>
          </div>
        </section>

        {/* DIVIDER STRIP — ticker */}
        <div className="relative my-14 overflow-hidden border-y border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/40 py-4">
          <MarqueeStrip />
        </div>

        {/* EDITORIAL PITCH */}
        <section className="grid gap-10 py-14 lg:grid-cols-[1fr_minmax(0,1.2fr)] lg:gap-20 lg:py-24">
          <div className="space-y-5 lg:pt-6">
            <div
              className="text-[10.5px] uppercase tracking-[0.35em] text-[color:var(--color-accent)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              // the pitch
            </div>
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
              {' '}and a single Orthogonal bill. Metered pay-per-use, zero key
              management, zero onboarding. The product genuinely did not exist
              last quarter.
            </p>
          </div>

          <div className="space-y-3">
            <div
              className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-2 text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span>▸ partner manifest</span>
              <span>10 / 10 · live</span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {LANDING_APIS.map((a, i) => (
                <div
                  key={a.name}
                  className="group relative flex items-center justify-between gap-3 border-l border-[color:var(--color-hairline)] bg-[color:var(--color-card)]/40 px-3 py-2.5 transition hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-card)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <div className="flex items-center gap-3 text-[11.5px]">
                    <span className="w-5 text-[10px] text-[color:var(--color-text-dim)] tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[color:var(--color-text)]">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[color:var(--color-text-dim)]">
                    <span className="hidden sm:inline">{a.partner}</span>
                    <span className="tabular-nums text-[color:var(--color-accent)]/80">
                      {a.latency}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="border-t border-[color:var(--color-border)] pt-14 pb-10 lg:pt-24">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div
                className="text-[10.5px] uppercase tracking-[0.35em] text-[color:var(--color-accent)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                // method · address-to-NPV
              </div>
              <h2
                className="mt-3 type-display-soft text-[color:var(--color-text)]"
                style={{ fontSize: 'clamp(36px, 4.6vw, 68px)', lineHeight: 1.02 }}
              >
                Address in. <span className="text-[color:var(--color-accent)]">NPV out.</span>
              </h2>
            </div>
            <div
              className="text-[10.5px] uppercase tracking-[0.25em] text-[color:var(--color-text-dim)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              t<sub className="mx-0.5 text-[8px]">0</sub> → t<sub className="mx-0.5 text-[8px]">+20s</sub>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <StepCard
              n="01"
              title="Drop an address"
              body="Geocoded to a utility, irradiance value, permit history, and median home value. La Jolla or wherever."
            />
            <StepCard
              n="02"
              title="Ten APIs fan out"
              body="One asyncio.gather call, one Orthogonal SDK. The ticker you see above is the real thing, streaming real latencies."
            />
            <StepCard
              n="03"
              title="A number you can quote"
              body="25-year NPV, payback period, CO₂ avoided · priced at the social cost of carbon · ROI as a % of your home value."
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
            <div
              className="text-[10.5px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ▸ ready when you are
            </div>
            <h2
              className="mt-4 type-display-soft text-[color:var(--color-text)]"
              style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: 0.98 }}
            >
              Run it on <span className="type-display-italic text-[color:var(--color-accent)]">your house.</span>
            </h2>
            <p className="mt-5 max-w-lg text-[15.5px] text-[color:var(--color-text-muted)]">
              Twenty seconds, no signup. Sign in with GitHub or magic link if you
              want to save runs across web and mobile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/install"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-sm bg-[color:var(--color-accent)] px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-bg)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="relative z-10">start estimate →</span>
                <span className="absolute inset-0 -translate-x-full bg-[color:var(--color-accent-warm)] transition-transform duration-500 group-hover:translate-x-0" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card-elevated)]/80 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                sign in to save
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
    <div className="space-y-1">
      <div
        className={`tabular-nums text-[28px] font-semibold leading-none ${
          accent ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text)]'
        }`}
        style={{ fontFamily: 'var(--font-display)', fontVariationSettings: '"opsz" 144' }}
      >
        {value}
      </div>
      <div className="text-[9.5px] uppercase tracking-[0.25em] text-[color:var(--color-text-dim)]">
        {label}
      </div>
    </div>
  );
}

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="group relative overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 p-6 transition hover:border-[color:var(--color-accent)]/60 hover:bg-[color:var(--color-card)]">
      <div
        className="absolute -right-3 -top-4 select-none text-[140px] font-bold leading-none text-[color:var(--color-accent)]/5 transition group-hover:text-[color:var(--color-accent)]/10"
        style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: '"opsz" 144',
        }}
      >
        {n}
      </div>
      <div
        className="relative text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        step · {n}
      </div>
      <h3 className="relative mt-3 text-[22px] font-semibold leading-tight text-[color:var(--color-text)]">
        {title}
      </h3>
      <p className="relative mt-3 text-[14px] leading-[1.55] text-[color:var(--color-text-muted)]">
        {body}
      </p>
    </div>
  );
}

function MarqueeStrip() {
  const items = [
    'ORTHOGONAL',
    'TEN APIs',
    'ONE SDK',
    'NEM 3.0',
    'ZENPOWER',
    'PRECIP.AI',
    'LINKUP',
    'SCRAPEGRAPH',
    'AVIATO',
    'PDL',
    'CAISO OASIS',
    'DATAHACKS 2026',
  ];
  return (
    <div
      className="flex w-max items-center whitespace-nowrap"
      style={{
        animation: 'ticker-scroll 50s linear infinite',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {[0, 1].map((pass) => (
        <div key={pass} className="flex items-center">
          {items.map((t, i) => (
            <span
              key={`${pass}-${i}`}
              className="flex items-center gap-4 px-6 text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-text-dim)]"
            >
              <span
                className="h-1 w-1 rounded-full bg-[color:var(--color-accent)]/70"
                style={{ boxShadow: '0 0 6px rgba(245,215,110,0.6)' }}
              />
              {t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function InstrumentPanel({
  apis,
  maxLatency,
  totalMs,
}: {
  apis: Array<{ name: string; latency: number; purpose: string; partner: string }>;
  maxLatency: number;
  totalMs: number;
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
          <span className="text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--color-accent)]">
            orthogonal · fan-out
          </span>
          <span className="caret-blink text-[color:var(--color-accent)]">▌</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">
          10/10 · 14ms min · <span className="text-[color:var(--color-text-muted)]">{totalMs}ms</span> max
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
              <span className="w-5 text-[9.5px] tabular-nums text-[color:var(--color-text-dim)]">
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
                className="w-[64px] shrink-0 text-right text-[10px] tabular-nums text-[color:var(--color-text-muted)]"
                style={{ animation: `latency-cycle ${duration * 2}s ease-in-out ${delay}s infinite` }}
              >
                {a.latency}ms
              </span>
            </div>
          );
        })}
      </div>

      {/* bottom chrome */}
      <div className="flex items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]/60 px-4 py-2 text-[10px] text-[color:var(--color-text-dim)]">
        <span>$ helios fanout --live</span>
        <span>
          <span className="text-[color:var(--color-accent)]">·</span> every latency is real
        </span>
      </div>
    </div>
  );
}
