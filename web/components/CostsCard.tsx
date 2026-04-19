// "What it costs" — the money side of the ROI. Installer quote (market
// range as a strikethrough), federal ITC, net upfront (the number you
// actually pay), and the financing APR range for a solar loan.

interface Props {
  upfrontCostUsd: number;
  federalItcUsd: number;
  netUpfrontUsd: number;
  installerQuotesRange: [number, number];
  financingAprRange: [number, number];
  fallbacksUsed?: string[];
}

function fmt0(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function FallbackChip() {
  return (
    <span
      title="Live Orthogonal parse failed — using documented default."
      className="ml-2 inline-flex items-center rounded-sm border border-[color:var(--color-hairline)] bg-[color:var(--color-card-elevated)]/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[color:var(--color-text-dim)]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      via fallback
    </span>
  );
}

function Row({
  label,
  value,
  sub,
  accent,
  strike,
  sign,
  emphasis,
  fallback,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  strike?: boolean;
  sign?: '+' | '-' | null;
  emphasis?: boolean;
  fallback?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-2">
      <div className="min-w-0">
        <div
          className={`${
            emphasis ? 'text-[15.5px] font-medium' : 'text-[14.5px]'
          } text-[color:var(--color-text)]`}
        >
          {label}
          {fallback && <FallbackChip />}
        </div>
        {sub && (
          <div className="mt-1 text-[12px] text-[color:var(--color-text-muted)]">
            {sub}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        {sign && !strike && (
          <span
            className={`text-[11px] ${
              accent ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text-dim)]'
            }`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {sign}
          </span>
        )}
        <span
          className={`tabular-nums ${
            emphasis ? 'text-[17px]' : 'text-[15px]'
          } ${
            accent
              ? 'font-semibold text-[color:var(--color-accent)]'
              : strike
                ? 'text-[color:var(--color-text-dim)] line-through'
                : 'font-medium text-[color:var(--color-text)]'
          }`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export function CostsCard({
  upfrontCostUsd,
  federalItcUsd,
  netUpfrontUsd,
  installerQuotesRange,
  financingAprRange,
  fallbacksUsed,
}: Props) {
  const [quoteMin, quoteMax] = installerQuotesRange;
  const [financeMin, financeMax] = financingAprRange;
  const pricingFallback = fallbacksUsed?.includes('installer_pricing');
  const financingFallback = fallbacksUsed?.includes('financing');

  return (
    <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 px-5 py-6 space-y-1">
      <div className="type-eyebrow mb-2">what it costs</div>
      <Row
        label="Installer quote"
        sub={`market range ${fmt0(quoteMin)} – ${fmt0(quoteMax)}`}
        value={fmt0(upfrontCostUsd)}
        strike
        fallback={pricingFallback}
      />
      <Row
        label="Federal tax credit"
        sub="30% off your federal taxes the year you install"
        value={fmt0(federalItcUsd)}
        sign="-"
      />
      <div className="my-2 h-px bg-[color:var(--color-border)]" />
      <Row label="Net you'll pay" value={fmt0(netUpfrontUsd)} accent emphasis />
      <Row
        label="Financing APR"
        sub="if you take a solar loan instead of paying cash"
        value={`${(financeMin * 100).toFixed(1)} – ${(financeMax * 100).toFixed(1)}%`}
        fallback={financingFallback}
      />
    </div>
  );
}
