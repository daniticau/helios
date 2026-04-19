// "What it returns" — the payoff side. Year-1 bill savings, net benefit
// vs. home value, CO2 avoided over 25 yrs, and the dollar value of that
// CO2 at the social cost of carbon.

interface Props {
  annualSavingsYr1Usd: number;
  co2AvoidedTons25yr: number;
  socialCostOfCarbonUsd?: number;
  roiPctOfHomeValue?: number;
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
  sign,
  fallback,
}: {
  label: string;
  value: string;
  sub?: string;
  sign?: '+' | '-' | null;
  fallback?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-2">
      <div className="min-w-0">
        <div className="text-[14.5px] text-[color:var(--color-text)]">
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
        {sign && (
          <span
            className="text-[11px] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {sign}
          </span>
        )}
        <span
          className="tabular-nums text-[15px] font-medium text-[color:var(--color-text)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export function ImpactCard({
  annualSavingsYr1Usd,
  co2AvoidedTons25yr,
  socialCostOfCarbonUsd,
  roiPctOfHomeValue,
  fallbacksUsed,
}: Props) {
  const carbonDollar =
    socialCostOfCarbonUsd != null
      ? co2AvoidedTons25yr * socialCostOfCarbonUsd
      : null;
  const monthlySavings = annualSavingsYr1Usd / 12;
  const propertyFallback = fallbacksUsed?.includes('property_value');
  const carbonFallback = fallbacksUsed?.includes('carbon_price');

  return (
    <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 px-5 py-6 space-y-1">
      <div className="type-eyebrow mb-2">what it returns</div>
      <Row
        label="Year-1 bill savings"
        sub={`about ${fmt0(monthlySavings)} less per month`}
        value={fmt0(annualSavingsYr1Usd)}
        sign="+"
      />
      {roiPctOfHomeValue != null && (
        <Row
          label="Net benefit vs. home value"
          sub="25-yr NPV as a percentage of your home's current value"
          value={`${roiPctOfHomeValue.toFixed(1)}%`}
          fallback={propertyFallback}
        />
      )}
      <div className="my-2 h-px bg-[color:var(--color-border)]" />
      <Row
        label="CO₂ avoided over 25 yrs"
        value={`${co2AvoidedTons25yr.toFixed(1)} tons`}
      />
      {carbonDollar != null && (
        <Row
          label="At the social cost of carbon"
          sub={`priced at ${fmt0(socialCostOfCarbonUsd!)}/ton`}
          value={fmt0(carbonDollar)}
          sign="+"
          fallback={carbonFallback}
        />
      )}
    </div>
  );
}
