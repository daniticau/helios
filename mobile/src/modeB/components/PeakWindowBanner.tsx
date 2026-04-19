// Banner shown at top of the live dashboard when a peak export window is
// within the next few hours. Makes the "opportunity" visible at a glance.

import { StyleSheet, Text, View } from 'react-native';

import type { PeakWindow } from '@/shared/types';

import { COLORS } from '../constants';

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
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconLabel}>peak</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.subtitle}>
          At {abs} · ${peak.expected_rate.toFixed(2)}/kWh export rate
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(245, 215, 110, 0.1)',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  iconWrap: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 215, 110, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  content: { flex: 1 },
  title: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  subtitle: { color: COLORS.text, fontSize: 13, marginTop: 2 },
});
