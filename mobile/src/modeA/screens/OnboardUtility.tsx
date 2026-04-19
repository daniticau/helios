// Utility segment + monthly bill + monthly kWh entry. "Compute ROI" fires
// the backend fan-out and navigates to AgentRunning.

import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEMO_PROFILE, useProfileStore } from '@/shared/store';
import type { UtilityCode } from '@/shared/types';

import { PrimaryButton } from '../components/PrimaryButton';
import type { ModeAScreenProps } from '../navigation';
import { colors, fontSizes, mono, radius, spacing } from '../theme';

const UTILITIES: ReadonlyArray<{ code: UtilityCode; label: string }> = [
  { code: 'PGE', label: 'PG&E' },
  { code: 'SCE', label: 'SCE' },
  { code: 'SDGE', label: 'SDG&E' },
  { code: 'LADWP', label: 'LADWP' },
];

function parsePositiveNumber(input: string): number | null {
  const trimmed = input.trim().replace(/[^0-9.]/g, '');
  if (trimmed === '' || trimmed === '.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function OnboardUtility({ navigation }: ModeAScreenProps<'OnboardUtility'>) {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [utility, setUtility] = useState<UtilityCode>(
    profile?.utility ?? DEMO_PROFILE.utility
  );
  const [billText, setBillText] = useState<string>(
    profile ? String(profile.monthly_bill_usd) : String(DEMO_PROFILE.monthly_bill_usd)
  );
  const [kwhText, setKwhText] = useState<string>(
    profile ? String(profile.monthly_kwh) : String(DEMO_PROFILE.monthly_kwh)
  );

  const kwhRef = useRef<TextInput>(null);

  useEffect(() => {
    // Ensure profile exists so next screen can fire the mutation immediately.
    if (!profile) setProfile(DEMO_PROFILE);
  }, [profile, setProfile]);

  const bill = parsePositiveNumber(billText);
  const kwh = parsePositiveNumber(kwhText);
  const canCompute = bill !== null && kwh !== null;

  const goCompute = () => {
    if (!canCompute) return;
    Keyboard.dismiss();
    const base = profile ?? DEMO_PROFILE;
    setProfile({
      ...base,
      utility,
      monthly_bill_usd: bill,
      monthly_kwh: kwh,
    });
    navigation.navigate('AgentRunning');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerBlock}>
            <Text style={styles.step}>STEP 2 OF 2</Text>
            <Text style={styles.headline}>Your utility + last bill</Text>
            <Text style={styles.subhead}>
              We match you to a time-of-use plan, then anchor year-one savings on
              your real usage.
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>utility</Text>
            <View style={styles.segmentRow}>
              {UTILITIES.map(({ code, label }) => {
                const active = utility === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setUtility(code)}
                    style={({ pressed }) => [
                      styles.segment,
                      active && styles.segmentActive,
                      pressed && styles.segmentPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>monthly bill ($)</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                value={billText}
                onChangeText={setBillText}
                keyboardType="decimal-pad"
                placeholder="240"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={() => kwhRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>monthly kWh</Text>
            <View style={styles.inputWrap}>
              <TextInput
                ref={kwhRef}
                value={kwhText}
                onChangeText={setKwhText}
                keyboardType="decimal-pad"
                placeholder="650"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={canCompute ? goCompute : undefined}
              />
              <Text style={styles.suffix}>kWh</Text>
            </View>
            <Text style={styles.hint}>
              A rough number is fine. We extrapolate from monthly on the backend.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="compute ROI"
            onPress={goCompute}
            disabled={!canCompute}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.xs,
  },
  step: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: mono,
  },
  headline: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: spacing.xs,
  },
  subhead: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  block: { gap: spacing.xs },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: mono,
    textTransform: 'uppercase',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentPressed: { opacity: 0.85 },
  segmentText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.bg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSizes.md,
    fontVariant: ['tabular-nums'],
  },
  prefix: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    marginRight: 6,
  },
  suffix: {
    color: colors.textDim,
    fontSize: fontSizes.sm,
    marginLeft: spacing.sm,
    fontFamily: mono,
  },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
