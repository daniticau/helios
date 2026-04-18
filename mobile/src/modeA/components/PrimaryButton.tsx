// Reusable primary button with a subtle press feedback.

import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PressableProps } from 'react-native';

import { colors, fontSizes, radius, spacing } from '../theme';

interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const PrimaryButton = forwardRef<View, PrimaryButtonProps>(
  ({ label, loading, variant = 'primary', style, disabled, ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        style={(state) => [
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          state.pressed && styles.pressed,
          isDisabled && styles.disabled,
          typeof style === 'function' ? style(state) : style,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.accent} />
        ) : (
          <Text
            style={[
              styles.label,
              variant === 'primary' && styles.labelPrimary,
              variant === 'secondary' && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
);

PrimaryButton.displayName = 'PrimaryButton';

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelPrimary: {
    color: colors.bg,
  },
  labelSecondary: {
    color: colors.text,
  },
  labelGhost: {
    color: colors.accent,
  },
});
