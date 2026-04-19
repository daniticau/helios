// Pulsing placeholder shape. Use while we wait on network state — geocode,
// prefetches, etc. — so the slot doesn't collapse and re-flow.

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius as radiusTokens } from '../theme';

interface Props {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: View['props']['style'];
}

export function Skeleton({ width = '100%', height, radius = radiusTokens.card, style }: Props) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.55, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius },
        animated,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardElevated,
  },
});
