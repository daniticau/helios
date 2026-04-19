// Address entry. Users type an address, tap "use my location" to auto-fill
// from GPS (with reverse-geocoding), or tap "demo" to load the La Jolla SDGE
// demo profile. Advances to OnboardUtility.

import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { api } from '@/shared/api';
import { getCurrentAddress, explainReason } from '@/shared/location';
import { DEMO_PROFILE, useProfileStore } from '@/shared/store';

import { PrimaryButton } from '../components/PrimaryButton';
import { Skeleton } from '../components/Skeleton';
import type { ModeAScreenProps } from '../navigation';
import { colors, fontSizes, mono, radius, spacing } from '../theme';

export function OnboardAddress({ navigation }: ModeAScreenProps<'OnboardAddress'>) {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [address, setAddress] = useState(profile?.address ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const canContinue = address.trim().length > 3 && !locLoading && !resolving;

  const onChangeAddress = (next: string) => {
    setAddress(next);
    if (coords) setCoords(null);
    if (locError) setLocError(null);
  };

  const goNext = async () => {
    Keyboard.dismiss();
    const trimmed = address.trim();
    const base = profile ?? DEMO_PROFILE;

    if (coords) {
      setProfile({ ...base, address: trimmed, lat: coords.lat, lng: coords.lng });
      navigation.navigate('OnboardUtility');
      return;
    }

    setResolving(true);
    setLocError(null);
    try {
      const g = await api.geocode(trimmed);
      setProfile({
        ...base,
        address: g.display_name || trimmed,
        lat: g.lat,
        lng: g.lng,
      });
      navigation.navigate('OnboardUtility');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLocError(
        msg.startsWith('404')
          ? "We couldn't find that address. Check it or use the demo."
          : 'Address lookup failed - try again or use the demo address.'
      );
    } finally {
      setResolving(false);
    }
  };

  const fillDemo = () => {
    setLocError(null);
    setAddress(DEMO_PROFILE.address);
    setCoords({ lat: DEMO_PROFILE.lat, lng: DEMO_PROFILE.lng });
    setProfile(DEMO_PROFILE);
  };

  const useMyLocation = async () => {
    setLocError(null);
    setLocLoading(true);
    const result = await getCurrentAddress();
    setLocLoading(false);
    if (!result.ok) {
      setLocError(explainReason(result.reason));
      return;
    }
    setAddress(result.address);
    setCoords({ lat: result.lat, lng: result.lng });
    const base = profile ?? DEMO_PROFILE;
    setProfile({
      ...base,
      address: result.address,
      lat: result.lat,
      lng: result.lng,
    });
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
            <Text style={styles.hint}>
              street, city, state — or tap "use my location"
            </Text>
            {resolving ? (
              <Skeleton height={58} />
            ) : (
              <TextInput
                value={address}
                onChangeText={onChangeAddress}
                placeholder="9500 Gilman Dr, La Jolla, CA"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={canContinue ? goNext : undefined}
              />
            )}
            {address.trim().length === 0 && !locLoading && !resolving ? (
              <Text style={styles.emptyHint}>enter your address to get started</Text>
            ) : null}
          </View>

          <View style={styles.assistRow}>
            <PrimaryButton
              label="use my location"
              variant="secondary"
              loading={locLoading}
              onPress={useMyLocation}
              leadingIcon={
                <Feather name="crosshair" size={16} color={colors.accent} />
              }
              style={styles.assistBtn}
            />
            <PrimaryButton
              label="demo"
              variant="ghost"
              onPress={fillDemo}
              style={styles.assistBtn}
            />
          </View>

          {locError ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{locError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={resolving ? 'resolving address…' : 'continue'}
            onPress={goNext}
            disabled={!canContinue}
            loading={resolving}
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
    marginTop: spacing.md,
  },
  headline: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  subhead: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  inputGroup: {
    gap: spacing.sm,
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
    paddingVertical: 18,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSizes.base,
  },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyHint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  assistRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  assistBtn: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#2a1818',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: fontSizes.sm,
    lineHeight: 18,
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
