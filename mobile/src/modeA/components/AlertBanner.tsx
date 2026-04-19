// Warning/info banner. Used to flag fallback-data scenarios on the ROI
// result screen (e.g., "installer pricing API timed out — numbers below use
// the regional median").

import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius, spacing } from '../theme';

type Variant = 'warning' | 'info';

interface Props {
  variant?: Variant;
  title: string;
  detail?: string;
}

export function AlertBanner({ variant = 'warning', title, detail }: Props) {
  const tone = variant === 'warning' ? warning : info;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      <Feather name={tone.icon} size={14} color={tone.fg} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: tone.fg }]}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

// Tinted-overlay backgrounds echo the web's `bg-[color:var(--color-accent)]/10`
// pattern — 10% alpha on the accent/info color over the dark bg, so the
// border and icon still read as the semantic tone without a heavy fill.
const warning = {
  bg: 'rgba(224, 169, 58, 0.1)', // colors.warning @ 10%
  border: colors.warning,
  fg: colors.warning,
  icon: 'alert-triangle' as const,
};

const info = {
  bg: 'rgba(111, 159, 211, 0.1)', // colors.info @ 10%
  border: colors.info,
  fg: colors.info,
  icon: 'info' as const,
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  icon: {
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
