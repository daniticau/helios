// 24-hour forecast chart: retail rate, export rate, and solar production
// overlaid on one x-axis (hour offset). Peak window shaded in accent color.
//
// Implementation note: victory-native 41 requires RN 0.78+/React 19, which
// this project can't satisfy on Expo SDK 52. Hand-rolled on react-native-svg
// which gives total visual control anyway.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { ForecastPoint, PeakWindow } from '@/shared/types';

import { radius } from '../../modeA/theme';
import { COLORS } from '../constants';

interface Props {
  forecast: ForecastPoint[];
  peak?: PeakWindow;
  currentTime?: Date;
  height?: number;
}

const PADDING = { top: 16, right: 12, bottom: 28, left: 42 };
const CHART_HEIGHT = 180;

export function ForecastChart({ forecast, peak, currentTime, height = CHART_HEIGHT }: Props) {
  const width = 340; // Fixed viewport width — SVG scales to container.

  const plot = useMemo(() => {
    if (forecast.length === 0) return null;

    const innerW = width - PADDING.left - PADDING.right;
    const innerH = height - PADDING.top - PADDING.bottom;

    const maxRate = Math.max(
      1.6,
      ...forecast.map((p) => Math.max(p.retail_rate, p.export_rate)),
    );
    const maxSolar = Math.max(1, ...forecast.map((p) => p.solar_kw_forecast));

    const xFor = (hour: number) => PADDING.left + (hour / 23) * innerW;
    const yForRate = (r: number) => PADDING.top + innerH - (r / maxRate) * innerH;
    const yForSolar = (s: number) => PADDING.top + innerH - (s / maxSolar) * innerH;

    const linePath = (pts: { x: number; y: number }[]) =>
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const retailPath = linePath(
      forecast.map((p) => ({ x: xFor(p.hour_offset), y: yForRate(p.retail_rate) })),
    );
    const exportPath = linePath(
      forecast.map((p) => ({ x: xFor(p.hour_offset), y: yForRate(p.export_rate) })),
    );
    const solarPath = linePath(
      forecast.map((p) => ({ x: xFor(p.hour_offset), y: yForSolar(p.solar_kw_forecast) })),
    );
    // Solar area fill: close the path back to baseline.
    const solarArea = `${solarPath} L${xFor(23)},${PADDING.top + innerH} L${xFor(0)},${PADDING.top + innerH} Z`;

    // Peak window band.
    let peakBand: { x: number; w: number } | null = null;
    if (peak && currentTime) {
      const hoursUntil = (new Date(peak.start_iso).getTime() - currentTime.getTime()) / 3_600_000;
      if (hoursUntil >= 0 && hoursUntil < 24) {
        peakBand = {
          x: xFor(hoursUntil),
          w: Math.min(xFor(23) - xFor(hoursUntil), (3 / 23) * innerW),
        };
      }
    }

    // Y-axis ticks: 0, maxRate/2, maxRate.
    const yTicks = [0, maxRate / 2, maxRate].map((v) => ({
      y: yForRate(v),
      label: `$${v.toFixed(2)}`,
    }));

    // X-axis ticks every 6h.
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
      maxSolar,
    };
  }, [forecast, peak, currentTime, width, height]);

  if (!plot) {
    return (
      <View style={[styles.card, { height }]}>
        <Text style={styles.empty}>No forecast yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>24 hour forecast</Text>
        <View style={styles.legend}>
          <LegendDot color={COLORS.accent} label="Export" />
          <LegendDot color={COLORS.text} label="Retail" />
          <LegendDot color={COLORS.blue} label="Solar" />
        </View>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Peak window shade */}
        {plot.peakBand && (
          <Rect
            x={plot.peakBand.x}
            y={PADDING.top}
            width={plot.peakBand.w}
            height={plot.innerH}
            fill={COLORS.peak}
          />
        )}

        {/* Grid lines */}
        <G>
          {plot.yTicks.map((t, i) => (
            <Line
              key={`gy-${i}`}
              x1={PADDING.left}
              y1={t.y}
              x2={width - PADDING.right}
              y2={t.y}
              stroke={COLORS.border}
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
          ))}
        </G>

        {/* Solar area fill */}
        <Path d={plot.solarArea} fill={COLORS.blue} fillOpacity={0.15} />
        <Path d={plot.solarPath} stroke={COLORS.blue} strokeWidth={1.6} fill="none" />

        {/* Retail rate line */}
        <Path
          d={plot.retailPath}
          stroke={COLORS.text}
          strokeWidth={1.8}
          fill="none"
          strokeDasharray="4,2"
        />

        {/* Export rate line (hero) */}
        <Path d={plot.exportPath} stroke={COLORS.accent} strokeWidth={2.5} fill="none" />

        {/* Current-time dot at hour 0 */}
        <Circle cx={PADDING.left} cy={PADDING.top + plot.innerH} r={3} fill={COLORS.text} />

        {/* Y axis labels */}
        {plot.yTicks.map((t, i) => (
          <SvgText
            key={`yt-${i}`}
            x={PADDING.left - 6}
            y={t.y + 3}
            fill={COLORS.textDim}
            fontSize={9}
            textAnchor="end"
          >
            {t.label}
          </SvgText>
        ))}

        {/* X axis labels */}
        {plot.xTicks.map((t, i) => (
          <SvgText
            key={`xt-${i}`}
            x={t.x}
            y={height - 8}
            fill={COLORS.textDim}
            fontSize={9}
            textAnchor="middle"
          >
            {t.label}
          </SvgText>
        ))}
      </Svg>

      {plot.peakBand && (
        <Text style={styles.caption}>
          Shaded band = next peak export window (~{plot.maxRate.toFixed(2)}/kWh max).
        </Text>
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: radius.card,
    padding: 16,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  legend: { flexDirection: 'row', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: COLORS.textMuted, fontSize: 10 },
  empty: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', paddingTop: 40 },
  caption: { color: COLORS.textDim, fontSize: 10, marginTop: 4 },
});
