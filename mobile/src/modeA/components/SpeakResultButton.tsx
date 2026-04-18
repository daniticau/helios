// SpeakResultButton — optional "narrate this result" button on ROIResult.
// Plays an ElevenLabs-synthesized mp3 streamed from POST /api/narrate.
// Kept small and screenshot-optional; the ROI hero card must still land
// on its own without this element on screen.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';

import { api, NarrateUnavailableError } from '@/shared/api';
import type { ROIResult } from '@/shared/types';

import { colors, fontSizes, mono, radius, spacing } from '../theme';

interface SpeakResultButtonProps {
  result: ROIResult;
}

type State = 'idle' | 'loading' | 'playing' | 'unavailable' | 'error';

export function SpeakResultButton({ result }: SpeakResultButtonProps) {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Unload the sound object on unmount to free native audio resources.
  // Required by expo-av — otherwise the player hangs on in memory.
  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  const stop = useCallback(async () => {
    const snd = soundRef.current;
    if (snd) {
      try {
        await snd.stopAsync();
        await snd.unloadAsync();
      } catch {
        // best-effort; unload can race with finished-playing callbacks.
      }
      soundRef.current = null;
    }
    setState('idle');
  }, []);

  const speak = useCallback(async () => {
    if (state === 'loading') return;
    if (state === 'playing') {
      await stop();
      return;
    }

    setState('loading');
    setErrorMsg(null);
    try {
      // Allow playback even in iOS silent-ringer mode — the button is a
      // deliberate user action, so honoring the mute switch feels wrong.
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const { uri } = await api.narrate({ roi_result: result });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setState('playing');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          void sound.unloadAsync();
          soundRef.current = null;
          setState('idle');
        }
      });
    } catch (e) {
      if (e instanceof NarrateUnavailableError) {
        setState('unavailable');
        setErrorMsg('narration unavailable — add ELEVENLABS_API_KEY');
      } else {
        setState('error');
        setErrorMsg((e as Error).message.slice(0, 120));
      }
      soundRef.current = null;
    }
  }, [result, state, stop]);

  const label =
    state === 'playing' ? 'stop' :
    state === 'loading' ? 'synthesizing…' :
    state === 'unavailable' ? 'narration unavailable' :
    state === 'error' ? 'retry' :
    'speak my result';

  const glyph =
    state === 'playing' ? '■' :
    state === 'loading' ? '' :
    state === 'unavailable' ? '🔇' :
    '🔊';

  const disabled = state === 'unavailable';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={speak}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          state === 'playing' && styles.playing,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {state === 'loading' ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Text style={styles.glyph}>{glyph}</Text>
        )}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  playing: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  disabled: {
    opacity: 0.6,
  },
  glyph: {
    color: colors.accent,
    fontSize: fontSizes.md,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontFamily: mono,
    letterSpacing: 0.5,
  },
  error: {
    color: colors.textDim,
    fontSize: fontSizes.xs,
    fontFamily: mono,
    textAlign: 'center',
  },
});
