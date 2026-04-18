// Line items: upfront, ITC, net, savings, CO2, ROI-of-home. Mirrors mobile.

interface BreakdownCardProps {
  upfrontCostUsd: number;
  federalItcUsd: number;
  netUpfrontUsd: number;
  annualSavingsYr1Usd: number;
  co2AvoidedTons25yr: number;
  socialCostOfCarbonUsd?: number;
  roiPctOfHomeValue?: number;
  installerQuotesRange: [number, number];
  financingAprRange: [number, number];
}

function fmt0(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function Row({
  label,
  value,
  sub,
  accent,
  strike,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  strike?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-[color:var(--color-text)]">{label}</div>
        {sub && (
          <div className="mt-0.5 font-mono text-[11px] text-[color:var(--color-text-dim)]">
            {sub}
          </div>
        )}
      </div>
      <div
        className={`tabular-nums text-sm font-semibold ${
          accent
            ? 'text-[color:var(--color-accent)]'
            : strike
              ? 'text-[color:var(--color-text-dim)] line-through'
              : 'text-[color:var(--color-text)]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function BreakdownCard({
  upfrontCostUsd,
  federalItcUsd,
  netUpfrontUsd,
  annualSavingsYr1Usd,
  co2AvoidedTons25yr,
  socialCostOfCarbonUsd,
  roiPctOfHomeValue,
  installerQuotesRange,
  financingAprRange,
}: BreakdownCardProps) {
  const [quoteMin, quoteMax] = installerQuotesRange;
  const [financeMin, financeMax] = financingAprRange;
  const carbonDollar =
    socialCostOfCarbonUsd != null ? co2AvoidedTons25yr * socialCostOfCarbonUsd : null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
        the numbers
      </div>

      <div className="py-1">
        <Row
          label="Installer quote (est.)"
          sub={`range ${fmt0(quoteMin)} – ${fmt0(quoteMax)}`}
          value={fmt0(upfrontCostUsd)}
          strike
        />
        <Row label="Federal ITC (30%)" value={`-${fmt0(federalItcUsd)}`} />
        <div className="my-1 h-px bg-[color:var(--color-border)]" />
        <Row label="Net upfront" value={fmt0(netUpfrontUsd)} accent />
      </div>

      <div className="py-1">
        <Row label="Year 1 savings" value={`+${fmt0(annualSavingsYr1Usd)}`} />
        <Row
          label="Financing APR"
          value={`${(financeMin * 100).toFixed(1)} – ${(financeMax * 100).toFixed(1)}%`}
          sub="solar loan market range"
        />
        {roiPctOfHomeValue != null && (
          <Row
            label="NPV as % of home value"
            value={`${roiPctOfHomeValue.toFixed(1)}%`}
          />
        )}
      </div>

      <div className="py-1">
        <Row
          label="CO₂ avoided over 25 yrs"
          value={`${co2AvoidedTons25yr.toFixed(1)} tons`}
        />
        {carbonDollar != null && (
          <Row
            label="At social cost of carbon"
            sub={`${fmt0(socialCostOfCarbonUsd!)}/ton`}
            value={`+${fmt0(carbonDollar)}`}
          />
        )}
      </div>
    </div>
  );
}
