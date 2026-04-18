// Terminal-table line items — upfront, ITC, net, savings, CO2, ROI % of home.

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
  sign,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  strike?: boolean;
  sign?: '+' | '-' | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-6 py-2.5">
      <div className="min-w-0">
        <div className="text-[14px] text-[color:var(--color-text)]">{label}</div>
        {sub && (
          <div
            className="mt-1 text-[10.5px] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
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
          className={`tabular-nums text-[15px] ${
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

function SectionHeader({ n, label }: { n: string; label: string }) {
  return (
    <div
      className="flex items-center gap-3 border-b border-[color:var(--color-hairline)] pb-2 pt-4 text-[9.5px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <span className="text-[color:var(--color-accent)]">{n}</span>
      {label}
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
    <div className="overflow-hidden rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60">
      <div
        className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/40 px-5 py-2.5 text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className="text-[color:var(--color-accent)]">▸ the numbers</span>
        <span>line · items</span>
      </div>

      <div className="px-5 pb-4">
        <SectionHeader n="01" label="upfront · installation" />
        <Row
          label="Installer quote (estimated)"
          sub={`market range ${fmt0(quoteMin)} – ${fmt0(quoteMax)}`}
          value={fmt0(upfrontCostUsd)}
          strike
        />
        <Row
          label="Federal ITC (30%)"
          value={fmt0(federalItcUsd)}
          sign="-"
        />
        <div className="my-2 h-px bg-[color:var(--color-border)]" />
        <Row label="Net upfront" value={fmt0(netUpfrontUsd)} accent />

        <SectionHeader n="02" label="operating · year 1" />
        <Row label="Year 1 savings" value={fmt0(annualSavingsYr1Usd)} sign="+" />
        <Row
          label="Financing APR range"
          value={`${(financeMin * 100).toFixed(1)} – ${(financeMax * 100).toFixed(1)}%`}
          sub="solar loan market"
        />
        {roiPctOfHomeValue != null && (
          <Row
            label="NPV as % of home value"
            value={`${roiPctOfHomeValue.toFixed(1)}%`}
          />
        )}

        <SectionHeader n="03" label="carbon · 25 yr" />
        <Row
          label="CO₂ avoided over 25 yrs"
          value={`${co2AvoidedTons25yr.toFixed(1)} tons`}
        />
        {carbonDollar != null && (
          <Row
            label="At social cost of carbon"
            sub={`${fmt0(socialCostOfCarbonUsd!)}/ton`}
            value={fmt0(carbonDollar)}
            sign="+"
          />
        )}
      </div>
    </div>
  );
}
