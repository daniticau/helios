// LoginScreen — email + password auth with a sign-in / sign-up toggle.
// Minimal UI, matches the Mode A dark theme. Not part of the onboarding
// flow by design — DEMO_PROFILE continues to work without ever touching
// this screen.

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
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/modeA/components/PrimaryButton';
import { colors, fontSizes, mono, radius, spacing } from '@/modeA/theme';

import { getSupabase, isSupabaseConfigured } from './client';
import { useAuth } from './AuthProvider';

type Mode = 'signin' | 'signup';
type Status = 'idle' | 'submitting' | 'confirm' | 'error';

export function LoginScreen({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Auth not configured. Set SUPABASE_* in app.json.extra.');
      setStatus('error');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed || !password) return;
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setError(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) throw error;
        setStatus('idle');
        onDone?.();
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
      });
      if (error) throw error;
      if (data.session) {
        setStatus('idle');
        onDone?.();
      } else {
        setStatus('confirm');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setStatus('idle');
    setError(null);
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

  const submitting = status === 'submitting';
  const submitLabel = mode === 'signin' ? 'sign in' : 'create account';

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

          <View style={styles.tabs}>
            <Pressable
              onPress={() => switchMode('signin')}
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
            >
              <Text
                style={[styles.tabLabel, mode === 'signin' && styles.tabLabelActive]}
              >
                sign in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode('signup')}
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
            >
              <Text
                style={[styles.tabLabel, mode === 'signup' && styles.tabLabelActive]}
              >
                create account
              </Text>
            </Pressable>
          </View>

          {status === 'confirm' ? (
            <View style={styles.sent}>
              <Text style={styles.sentTitle}>confirm your email</Text>
              <Text style={styles.sentBody}>
                Check <Text style={styles.emailSent}>{email}</Text> for a
                confirmation link, then sign in.
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
              <Text style={[styles.label, { marginTop: spacing.sm }]}>password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? 'min 8 characters' : '••••••••'}
                placeholderTextColor={colors.textDim}
                style={styles.input}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <PrimaryButton
                label={submitting ? 'working…' : submitLabel}
                onPress={submit}
                disabled={
                  submitting || email.trim().length === 0 || password.length === 0
                }
              />
            </View>
          )}

          {submitting && (
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
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
    backgroundColor: colors.card,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.bg,
  },
  tabLabel: {
    color: colors.textMuted,
    fontFamily: mono,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  tabLabelActive: {
    color: colors.accent,
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
