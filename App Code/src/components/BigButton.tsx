import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSizes, radii, spacing, minTouch } from '@/theme';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityHint,
}: BigButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch * 1.4,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: fontSizes.lg, fontWeight: '600' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },

  primary: { backgroundColor: colors.primary },
  primaryLabel: { color: '#FFFFFF' },

  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryLabel: { color: colors.text },

  success: { backgroundColor: colors.success },
  successLabel: { color: '#FFFFFF' },

  danger: { backgroundColor: colors.danger },
  dangerLabel: { color: '#FFFFFF' },

  ghost: { backgroundColor: 'transparent' },
  ghostLabel: { color: colors.primary },
});
