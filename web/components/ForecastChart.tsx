// 24-hour forecast chart. Retail rate (dashed, white), export rate
// (solid, accent), solar production (soft blue area). Peak window is
// shaded. Hand-rolled SVG — same shape as mobile's ForecastChart but
// with responsive width via `preserveAspectRatio`.

import { useMemo } from 'react';

import type { ForecastPoint, PeakWindow } from '@/lib/types';

interface Props {
  forecast: ForecastPoint[];
  peak?: PeakWindow;
  currentTime?: Date;
  height?: number;
}

const PADDING = { top: 16, right: 16, bottom: 28, left: 46 };
const CHART_HEIGHT = 220;
const VIEW_WIDTH = 720; // logical viewBox; scales to container

export function ForecastChart({
  forecast,
  peak,
  currentTime,
  height = CHART_HEIGHT,
}: Props) {
  const plot = useMemo(() => {
    if (forecast.length === 0) return null;

    const innerW = VIEW_WIDTH - PADDING.left - PADDING.right;
    const innerH = height - PADDING.top - PADDING.bottom;

    const maxRate = Math.max(
      1.6,
      ...forecast.map((p) => Math.max(p.retail_rate, p.export_rate))
    );
    const maxSolar = Math.max(1, ...forecast.map((p) => p.solar_kw_forecast));

    const xFor = (hour: number) => PADDING.left + (hour / 23) * innerW;
    const yForRate = (r: number) =>
      PADDING.top + innerH - (r / maxRate) * innerH;
    const yForSolar = (s: number) =>
      PADDING.top + innerH - (s / maxSolar) * innerH;

    const linePath = (pts: { x: number; y: number }[]) =>
      pts
        .map(
          (p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
        )
        .join(' ');

    const retailPath = linePath(
      forecast.map((p) => ({
        x: xFor(p.hour_offset),
        y: yForRate(p.retail_rate),
      }))
    );
    const exportPath = linePath(
      forecast.map((p) => ({
        x: xFor(p.hour_offset),
        y: yForRate(p.export_rate),
      }))
    );
    const solarPath = linePath(
      forecast.map((p) => ({
        x: xFor(p.hour_offset),
        y: yForSolar(p.solar_kw_forecast),
      }))
    );
    const solarArea = `${solarPath} L${xFor(23).toFixed(1)},${(
      PADDING.top + innerH
    ).toFixed(1)} L${xFor(0).toFixed(1)},${(PADDING.top + innerH).toFixed(1)} Z`;

    let peakBand: { x: number; w: number } | null = null;
    if (peak && currentTime) {
      const hoursUntil =
        (new Date(peak.start_iso).getTime() - currentTime.getTime()) /
        3_600_000;
      if (hoursUntil >= 0 && hoursUntil < 24) {
        peakBand = {
          x: xFor(hoursUntil),
          w: Math.min(xFor(23) - xFor(hoursUntil), (3 / 23) * innerW),
        };
      }
    }

    const yTicks = [0, maxRate / 2, maxRate].map((v) => ({
      y: yForRate(v),
      label: `$${v.toFixed(2)}`,
    }));

    const xTicks = [0, 6, 12, 18, 23].map((h) => ({
      x: xFor(h),
      label: `+${h}h`,
    }));

    return {
      retailPath,
      exportPath,
      solarPath,
      solarArea,
      peakBand,
      yTicks,
      xTicks,
      innerH,
      maxRate,
    };
  }, [forecast, peak, currentTime, height]);

  if (!plot) {
    return (
      <div
        className="flex items-center justify-center rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 p-4 text-[color:var(--color-text-dim)]"
        style={{ height }}
      >
        No forecast yet.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/70 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="type-eyebrow">24 hour forecast</div>
        <div
          className="flex items-center gap-4 text-[11px] text-[color:var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <LegendDot color="var(--color-accent)" label="Export" solid />
          <LegendDot color="var(--color-text)" label="Retail" dashed />
          <LegendDot color="#60a5fa" label="Solar" solid />
        </div>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="24 hour forecast"
      >
        {/* Peak window shade */}
        {plot.peakBand && (
          <rect
            x={plot.peakBand.x}
            y={PADDING.top}
            width={plot.peakBand.w}
            height={plot.innerH}
            fill="rgba(245, 215, 110, 0.18)"
          />
        )}

        {/* Y grid */}
        {plot.yTicks.map((t, i) => (
          <line
            key={`gy-${i}`}
            x1={PADDING.left}
            y1={t.y}
            x2={VIEW_WIDTH - PADDING.right}
            y2={t.y}
            stroke="var(--color-border)"
            strokeWidth={0.5}
            strokeDasharray="2,3"
          />
        ))}

        {/* Solar area */}
        <path d={plot.solarArea} fill="#60a5fa" fillOpacity={0.15} />
        <path
          d={plot.solarPath}
          stroke="#60a5fa"
          strokeWidth={1.6}
          fill="none"
        />

        {/* Retail rate */}
        <path
          d={plot.retailPath}
          stroke="var(--color-text)"
          strokeWidth={1.8}
          fill="none"
          strokeDasharray="4,2"
        />

        {/* Export rate (hero) */}
        <path
          d={plot.exportPath}
          stroke="var(--color-accent)"
          strokeWidth={2.4}
          fill="none"
        />

        {/* Current time dot at hour 0 */}
        <circle
          cx={PADDING.left}
          cy={PADDING.top + plot.innerH}
          r={3.5}
          fill="var(--color-text)"
        />

        {/* Y labels */}
        {plot.yTicks.map((t, i) => (
          <text
            key={`yt-${i}`}
            x={PADDING.left - 8}
            y={t.y + 3}
            fill="var(--color-text-dim)"
            fontSize={10}
            textAnchor="end"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.label}
          </text>
        ))}

        {/* X labels */}
        {plot.xTicks.map((t, i) => (
          <text
            key={`xt-${i}`}
            x={t.x}
            y={height - 10}
            fill="var(--color-text-dim)"
            fontSize={10}
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.label}
          </text>
        ))}
      </svg>

      {plot.peakBand && (
        <div
          className="mt-2 text-[11px] text-[color:var(--color-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Shaded band = next peak export window (~${plot.maxRate.toFixed(2)}/kWh
          max).
        </div>
      )}
    </div>
  );
}

function LegendDot({
  color,
  label,
  solid,
  dashed,
}: {
  color: string;
  label: string;
  solid?: boolean;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 14,
          height: 2,
          backgroundColor: dashed ? 'transparent' : color,
          borderTop: dashed ? `2px dashed ${color}` : 'none',
          opacity: solid ? 1 : 0.9,
        }}
      />
      {label}
    </span>
  );
}
