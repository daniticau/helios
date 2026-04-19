// Custom animated bottom tab bar. Three things it does that the default can't:
//   1. Sliding accent "pill" highlight that springs between tabs.
//   2. Per-tab icon scale/opacity animation on focus.
//   3. Light haptic tap on press.
// Uses Feather icons (@expo/vector-icons ships with Expo SDK).

import { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors, mono, spacing, tabBarHeight } from '@/modeA/theme';

const PILL_WIDTH = 32;
const PILL_HEIGHT = 3;

const SPRING = { damping: 14, stiffness: 180 } as const;

type FeatherName = keyof typeof Feather.glyphMap;

type TabMeta = {
  icon: FeatherName;
  label: string;
};

// Keyed by Tabs.Screen name in App.tsx.
const TAB_META: Record<string, TabMeta> = {
  Install: { icon: 'sun', label: 'install' },
  Live: { icon: 'activity', label: 'live' },
  Account: { icon: 'user', label: 'account' },
};

export function AnimatedTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabCount = state.routes.length;
  const tabWidth = width / tabCount;

  const pillX = useSharedValue(
    state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2
  );

  useEffect(() => {
    pillX.value = withSpring(
      state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2,
      SPRING
    );
  }, [state.index, tabWidth, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom,
          height: tabBarHeight + insets.bottom,
        },
      ]}
    >
      <Animated.View style={[styles.pill, pillStyle]} />
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] ?? {
          icon: 'circle' as FeatherName,
          label: route.name.toLowerCase(),
        };
        const focused = state.index === index;
        return (
          <TabButton
            key={route.key}
            focused={focused}
            icon={meta.icon}
            label={meta.label}
            tabWidth={tabWidth}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => {}
                );
                navigation.navigate(route.name as never);
              }
            }}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  focused,
  icon,
  label,
  tabWidth,
  onPress,
}: {
  focused: boolean;
  icon: FeatherName;
  label: string;
  tabWidth: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  const opacity = useSharedValue(focused ? 1 : 0.55);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, SPRING);
    opacity.value = withTiming(focused ? 1 : 0.55, { duration: 180 });
  }, [focused, scale, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const iconColor = focused ? colors.accent : colors.textDim;
  const labelColor = focused ? colors.accent : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, { width: tabWidth }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={iconStyle}>
        <Feather name={icon} size={22} color={iconColor} />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle, { color: labelColor }]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    backgroundColor: colors.accent,
    borderRadius: PILL_HEIGHT,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: mono,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
