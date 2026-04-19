// Vertical battery gauge with SoC + flow callout. Port of mobile
// BatteryGauge, rebuilt in HTML+SVG for the web. Infers the current flow
// from the LiveAction + instantaneous solar/load readings.

import { ACTION_META } from '@/lib/demoProfile';
import type { HouseholdState, LiveAction } from '@/lib/types';

interface Props {
  state: HouseholdState;
  action: LiveAction;
  batteryKwh: number;
}

function primaryFlow(
  action: LiveAction,
  solar: number,
  load: number
): { label: string; color: string } {
  switch (action) {
    case 'CHARGE_BATTERY_FROM_SOLAR':
      return { label: 'Solar → Battery', color: '#60a5fa' };
    case 'EXPORT_SOLAR':
      return { label: 'Solar → Grid', color: '#60a5fa' };
    case 'DISCHARGE_BATTERY_TO_HOUSE':
      return { label: 'Battery → House', color: '#4ade80' };
    case 'DISCHARGE_BATTERY_TO_GRID':
      return { label: 'Battery → Grid', color: '#4ade80' };
    case 'CHARGE_BATTERY_FROM_GRID':
      return { label: 'Grid → Battery', color: '#fbbf24' };
    case 'HOLD':
      if (load > solar + 0.1) return { label: 'Grid → House', color: '#fbbf24' };
      if (solar > 0.1) return { label: 'Solar → House', color: '#60a5fa' };
      return { label: 'Idle', color: 'var(--color-text-muted)' };
  }
}

export function BatteryGauge({ state, action, batteryKwh }: Props) {
  const soc = Math.max(0, Math.min(100, state.battery_soc_pct));
  const meta = ACTION_META[action];
  const flow = primaryFlow(action, state.solar_kw_now, state.load_kw_now);
  const kwhStored = (batteryKwh * soc) / 100;

  return (
    <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-5 py-5">
      <div className="type-eyebrow">battery</div>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-6">
        {/* Vertical gauge */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-4 rounded-t-sm"
            style={{ height: 6, backgroundColor: 'var(--color-border)' }}
            aria-hidden
          />
          <div
            className="relative w-12 overflow-hidden rounded-sm border-2"
            style={{
              height: 132,
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card-elevated)',
            }}
            role="img"
            aria-label={`Battery ${soc.toFixed(0)} percent`}
          >
            <div
              className="absolute bottom-0 left-0 w-full transition-all"
              style={{
                height: `${soc}%`,
                backgroundColor: meta.color,
                opacity: 0.9,
              }}
            />
          </div>
          <div
            className="tabular-nums text-[22px] font-semibold"
            style={{ color: meta.color }}
          >
            {soc.toFixed(0)}%
          </div>
          <div
            className="text-[11px] text-[color:var(--color-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {kwhStored.toFixed(1)} / {batteryKwh} kWh
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <div className="type-eyebrow">flow</div>
            <div
              className="mt-1 text-[20px] font-medium"
              style={{ color: flow.color, letterSpacing: '-0.01em' }}
            >
              {flow.label}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-[color:var(--color-border)] pt-3">
            <Stat label="Solar" value={`${state.solar_kw_now.toFixed(1)} kW`} color="#60a5fa" />
            <Stat
              label="Load"
              value={`${state.load_kw_now.toFixed(1)} kW`}
              color="var(--color-text)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div
        className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-dim)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </div>
      <div
        className="mt-1 tabular-nums text-[18px] font-semibold"
        style={{ color, fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </div>
    </div>
  );
}
