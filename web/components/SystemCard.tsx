// "Recommended system" card with an optional tariff summary folded in as
// a secondary row. Shared between the ROI result screen and the /live
// dashboard so the composition stays consistent.

import type { ProposedSystem } from '@/lib/types';

interface Props {
  system: ProposedSystem;
  /** Optional tariff summary, rendered as a divider'd sub-row. */
  tariffSummary?: string;
  /** If provided, shown as a "covers X kWh per month" hint under the figures. */
  monthlyKwh?: number;
}

function SystemFigure({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex items-end gap-2">
      <span
        className="tabular-nums text-[color:var(--color-text)]"
        style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: '"opsz" 144',
          fontSize: 56,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
        }}
      >
        {value}
      </span>
      <span
        className="mb-2 text-[15px] text-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {unit}
      </span>
    </div>
  );
}

export function SystemCard({ system, tariffSummary, monthlyKwh }: Props) {
  return (
    <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-5 py-6">
      <div className="type-eyebrow">recommended system</div>
      <div className="mt-5 flex flex-wrap items-end gap-5">
        <SystemFigure value={system.solar_kw.toFixed(1)} unit="kW" />
        <span
          className="mb-3 text-[color:var(--color-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}
        >
          +
        </span>
        <SystemFigure value={system.battery_kwh.toFixed(1)} unit="kWh" />
      </div>

      {monthlyKwh != null && (
        <div
          className="mt-5 text-[13px] leading-6 text-[color:var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Covers{' '}
          <span className="text-[color:var(--color-text)]">
            {monthlyKwh.toFixed(0)} kWh
          </span>{' '}
          per month. Battery sized for peak-hour NEM 3.0 arbitrage.
        </div>
      )}

      {tariffSummary && (
        <div className="mt-5 border-t border-[color:var(--color-border)] pt-4">
          <div className="type-eyebrow">tariff</div>
          <div
            className="mt-2 text-[13px] leading-[1.6] text-[color:var(--color-text)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {tariffSummary}
          </div>
        </div>
      )}
    </div>
  );
}
