// Retail vs. export rate comparison — the arbitrage signal that drives
// "is now a good time to export?". Mirrors the widget logic: we show
// whichever side is the current earning rate large, and the other side
// as a lagging comparator with the spread called out.

import type { LiveAction } from '@/lib/types';

interface Props {
  retailRate: number;
  exportRate: number;
  action: LiveAction;
}

// Actions where export is the earning leg.
const EXPORT_ACTIONS = new Set<LiveAction>([
  'EXPORT_SOLAR',
  'DISCHARGE_BATTERY_TO_GRID',
]);

function fmtRate(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function RateCompare({ retailRate, exportRate, action }: Props) {
  const exportLeads = EXPORT_ACTIONS.has(action);
  const hero = exportLeads ? exportRate : retailRate;
  const compare = exportLeads ? retailRate : exportRate;
  const heroLabel = exportLeads ? 'export now' : 'retail now';
  const compareLabel = exportLeads ? 'vs. retail' : 'vs. export';

  // Spread: positive number = hero beats compare. Percent relative to hero.
  const spread = hero - compare;
  const spreadPct = hero > 0 ? (spread / hero) * 100 : 0;
  const arrow = spread >= 0 ? '↗' : '↘';
  const arrowColor = spread >= 0
    ? 'var(--color-accent)'
    : 'var(--color-text-muted)';

  // Visual bar: where does `compare` sit relative to `hero`?
  // 0% = compare is 0 against hero. 100% = compare equals hero.
  const barPct = Math.max(
    0,
    Math.min(100, hero > 0 ? (compare / hero) * 100 : 0)
  );

  return (
    <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-5 py-6">
      <div className="type-eyebrow">rate compare</div>

      <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-6">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {heroLabel}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="tabular-nums text-[color:var(--color-text)]"
              style={{
                fontFamily: 'var(--font-display)',
                fontVariationSettings: '"opsz" 144',
                fontSize: 'clamp(56px, 7vw, 88px)',
                fontWeight: 600,
                letterSpacing: '-0.04em',
                lineHeight: 0.9,
              }}
            >
              {fmtRate(hero)}
            </span>
            <span
              className="text-[14px] text-[color:var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              /kWh
            </span>
          </div>
        </div>

        <div className="mb-2 flex flex-col items-end gap-1 text-right">
          <div
            className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {compareLabel}
          </div>
          <div
            className="tabular-nums text-[20px] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {fmtRate(compare)}
          </div>
          <div
            className="flex items-center gap-1 text-[12px]"
            style={{ fontFamily: 'var(--font-mono)', color: arrowColor }}
          >
            <span>{arrow}</span>
            <span className="tabular-nums">
              {spread >= 0 ? '+' : '−'}
              {fmtRate(Math.abs(spread))}
              {' · '}
              {spread >= 0 ? '+' : '−'}
              {Math.abs(spreadPct).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Visual bar: hero full-width; compare as a fraction underneath. */}
      <div className="mt-6 space-y-2">
        <div className="relative h-2 rounded-sm bg-[color:var(--color-border)]/40">
          <div
            className="absolute left-0 top-0 h-full rounded-sm"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-accent)',
              opacity: 0.9,
            }}
            aria-hidden
          />
        </div>
        <div className="relative h-2 rounded-sm bg-[color:var(--color-border)]/40">
          <div
            className="absolute left-0 top-0 h-full rounded-sm"
            style={{
              width: `${barPct}%`,
              backgroundColor: 'var(--color-text-muted)',
              opacity: 0.8,
            }}
            aria-hidden
          />
        </div>
        <div
          className="flex justify-between text-[11px] text-[color:var(--color-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>{heroLabel}</span>
          <span>{compareLabel}</span>
        </div>
      </div>
    </div>
  );
}
