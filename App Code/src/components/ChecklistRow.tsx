import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing, minTouch } from '@/theme';
import type { ChecklistEntry } from '@/services/checklist';

interface ChecklistRowProps {
  entry: ChecklistEntry;
  onToggle: () => void;
}

export function ChecklistRow({ entry, onToggle }: ChecklistRowProps) {
  const isDone = entry.status === 'done';
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isDone }}
      accessibilityLabel={entry.item.text}
      style={({ pressed }) => [styles.row, isDone && styles.rowDone, pressed && styles.pressed]}
    >
      <View style={[styles.check, isDone && styles.checkDone]}>
        {isDone && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={[styles.label, isDone && styles.labelDone]} numberOfLines={2}>
        {entry.item.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouch * 1.3,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowDone: {
    backgroundColor: colors.doneSurface,
    borderColor: colors.done,
  },
  pressed: { opacity: 0.85 },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkDone: {
    backgroundColor: colors.done,
    borderColor: colors.done,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginTop: -2,
  },
  label: {
    flex: 1,
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: '500',
  },
  labelDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
