// Peak export window banner. Tells the user "peak opens in 2h 15m" so
// the arbitrage opportunity is visible at a glance. Mirrors the mobile
// PeakWindowBanner with tighter typography for the web design language.

import type { PeakWindow } from '@/lib/types';

interface Props {
  peak: PeakWindow;
}

function formatRelative(iso: string): { label: string; abs: string } {
  const when = new Date(iso);
  const diffMs = when.getTime() - Date.now();
  const mins = Math.round(diffMs / 60_000);

  const hour = when.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = ((hour + 11) % 12) + 1;
  const abs = `${h12}:${String(when.getMinutes()).padStart(2, '0')} ${ampm}`;

  if (mins <= 0) return { label: 'Peak is open now', abs };
  if (mins < 60) return { label: `Peak opens in ${mins} min`, abs };
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return { label: `Peak opens in ${hrs}h ${rem}m`, abs };
}

export function PeakWindowBanner({ peak }: Props) {
  const { label, abs } = formatRelative(peak.start_iso);

  return (
    <div
      className="flex items-center gap-4 rounded-sm border px-4 py-3"
      style={{
        borderColor: 'var(--color-accent)',
        backgroundColor: 'rgba(245, 215, 110, 0.08)',
      }}
    >
      <span
        className="flex h-8 items-center justify-center rounded-sm px-2 text-[10px] uppercase tracking-[0.14em]"
        style={{
          backgroundColor: 'rgba(245, 215, 110, 0.18)',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}
        aria-hidden
      >
        peak
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[color:var(--color-accent)]">
          {label}
        </div>
        <div
          className="text-[12px] text-[color:var(--color-text)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          At {abs} · ${peak.expected_rate.toFixed(2)}/kWh export rate
        </div>
      </div>
    </div>
  );
}
