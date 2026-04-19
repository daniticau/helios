// Address entry. Users type an address or tap "use demo address" which
// pre-fills the La Jolla SDGE demo profile. Advances to OnboardUtility.

import { useState } from 'react';
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

import { PrimaryButton } from '../components/PrimaryButton';
import type { ModeAScreenProps } from '../navigation';
import { colors, fontSizes, mono, radius, spacing } from '../theme';

export function OnboardAddress({ navigation }: ModeAScreenProps<'OnboardAddress'>) {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [address, setAddress] = useState(profile?.address ?? '');

  const canContinue = address.trim().length > 3;

  const goNext = () => {
    Keyboard.dismiss();
    // Preserve lat/lng if already geocoded; otherwise leave 0s for the demo
    // and let the backend fall back to profile defaults if needed.
    const base = profile ?? DEMO_PROFILE;
    setProfile({ ...base, address: address.trim() });
    navigation.navigate('OnboardUtility');
  };

  const fillDemo = () => {
    setAddress(DEMO_PROFILE.address);
    setProfile(DEMO_PROFILE);
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
            <Text style={styles.brand}>helios</Text>
            <Text style={styles.step}>STEP 1 OF 2</Text>
            <Text style={styles.headline}>
              Where are we running the numbers?
            </Text>
            <Text style={styles.subhead}>
              Address resolves to your utility, irradiance, permit velocity, and
              local installer pricing. All ten lookups fan out in parallel. Tap
              continue to see it.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>street address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="9500 Gilman Dr, La Jolla, CA"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={canContinue ? goNext : undefined}
            />
          </View>

          <Pressable onPress={fillDemo} style={({ pressed }) => [styles.demoChip, pressed && styles.chipPressed]}>
            <View style={styles.demoDot} />
            <Text style={styles.demoText}>use the demo address (La Jolla · SDGE)</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="continue"
            onPress={goNext}
            disabled={!canContinue}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.xs,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  step: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: mono,
    marginTop: spacing.sm,
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
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: mono,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSizes.base,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPressed: {
    opacity: 0.75,
  },
  demoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  demoText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: mono,
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
