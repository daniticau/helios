// LoginScreen — email magic link + GitHub OAuth. Minimal UI, matches the
// Mode A dark theme. Not part of the onboarding flow by design —
// DEMO_PROFILE continues to work without ever touching this screen.

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/modeA/components/PrimaryButton';
import { colors, fontSizes, mono, radius, spacing } from '@/modeA/theme';

import { getSupabase, isSupabaseConfigured } from './client';
import { useAuth } from './AuthProvider';

type Status = 'idle' | 'sending' | 'sent' | 'error';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Auth not configured. Set SUPABASE_* in app.json.extra.');
      setStatus('error');
      return;
    }
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    try {
      // Deep link back into the Expo Go / standalone app after the user
      // taps the link in their email. For Expo Go the scheme is expo-dev;
      // for standalone it's the app slug. expo-linking picks the right one.
      const redirectTo = Linking.createURL('auth-callback');
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const signInWithGithub = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Auth not configured. Set SUPABASE_* in app.json.extra.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('no oauth url from supabase');
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success' || !res.url) {
        setStatus('idle');
        return;
      }
      // Supabase returns session params in the URL hash fragment after the
      // OAuth callback; @supabase/supabase-js exposes `setSession` which
      // takes access + refresh tokens directly.
      const urlObj = new URL(res.url);
      const access = urlObj.searchParams.get('access_token')
        ?? new URLSearchParams(urlObj.hash.replace(/^#/, '')).get('access_token');
      const refresh = urlObj.searchParams.get('refresh_token')
        ?? new URLSearchParams(urlObj.hash.replace(/^#/, '')).get('refresh_token');
      if (access && refresh) {
        await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
      }
      setStatus('idle');
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  if (user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.signedInWrap}>
          <Text style={styles.brand}>helios · signed in</Text>
          <Text style={styles.signedInEmail}>{user.email ?? user.id}</Text>
          {onDone && (
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton label="back to app" onPress={onDone} />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.brand}>helios</Text>
            <Text style={styles.eyebrow}>sign in</Text>
            <Text style={styles.headline}>Save your estimates.</Text>
            <Text style={styles.sub}>
              Anonymous runs work without signing in. Sign in to keep a history on
              web + mobile.
            </Text>
          </View>

          {!isSupabaseConfigured && (
            <View style={styles.warn}>
              <Text style={styles.warnText}>
                auth placeholder. SUPABASE env vars not set.
              </Text>
            </View>
          )}

          <Pressable
            onPress={signInWithGithub}
            disabled={status === 'sending'}
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && { opacity: 0.85 },
              status === 'sending' && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.ghostLabel}>continue with github</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {status === 'sent' ? (
            <View style={styles.sent}>
              <Text style={styles.sentTitle}>magic link sent</Text>
              <Text style={styles.sentBody}>
                Check <Text style={styles.emailSent}>{email}</Text> for a sign-in
                link.
              </Text>
            </View>
          ) : (
            <View style={styles.formGroup}>
              <Text style={styles.label}>email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@domain.com"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <PrimaryButton
                label={status === 'sending' ? 'sending…' : 'send magic link'}
                onPress={sendMagicLink}
                disabled={status === 'sending' || email.trim().length === 0}
              />
            </View>
          )}

          {status === 'sending' && (
            <View style={{ alignItems: 'center', marginTop: spacing.md }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}

          {error && (
            <View style={styles.err}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          )}

          {onDone && (
            <Pressable onPress={onDone} style={styles.cancel}>
              <Text style={styles.cancelText}>continue without signing in →</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  eyebrow: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: mono,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  headline: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  sub: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  warn: {
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  warnText: {
    color: colors.warning,
    fontFamily: mono,
    fontSize: 12,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ghostLabel: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textDim,
    fontFamily: mono,
    fontSize: 11.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  formGroup: {
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSizes.base,
  },
  sent: {
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    gap: 4,
  },
  sentTitle: {
    color: colors.success,
    fontFamily: mono,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sentBody: {
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  emailSent: {
    fontFamily: mono,
    color: colors.text,
  },
  err: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  errText: {
    color: colors.error,
    fontFamily: mono,
    fontSize: fontSizes.xs,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.textDim,
    fontFamily: mono,
    fontSize: 12,
  },
  signedInWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  signedInEmail: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontFamily: mono,
  },
});
