import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing, minTouch } from '@/theme';
import { speak } from '@/lib/tts';
import type { RoutineCardEntry } from '@/services/routineCards';

interface RoutineCardProps {
  entry: RoutineCardEntry;
  expanded: boolean;
  onToggleExpand: () => void;
  onMarkDone: () => void;
  onUndoDone: () => void;
  onEdit: () => void;
}

export function RoutineCard({
  entry,
  expanded,
  onToggleExpand,
  onMarkDone,
  onUndoDone,
  onEdit,
}: RoutineCardProps) {
  const { card, status } = entry;
  const isDone = status === 'done';
  const readAloudText =
    card.readAloudText ??
    [card.title, card.instruction, card.context, card.safetyNote].filter(Boolean).join('. ');

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Header row — tapping toggles expand/collapse */}
      <Pressable
        onPress={onToggleExpand}
        accessibilityRole="button"
        accessibilityLabel={`${card.title}. ${expanded ? 'Tap to collapse.' : 'Tap to expand.'}`}
        style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}
      >
        {/* Check circle — nested pressable handles done toggle independently */}
        <Pressable
          onPress={isDone ? onUndoDone : onMarkDone}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
          accessibilityLabel={isDone ? 'Done. Tap to undo.' : `Mark ${card.title} as done`}
          hitSlop={8}
          style={[styles.check, isDone && styles.checkDone]}
        >
          {isDone && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={expanded ? undefined : 2}>
            {card.title}
          </Text>
          {!expanded && card.context ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {card.context}
            </Text>
          ) : null}
        </View>

        <Text style={styles.chevron}>
          {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Expanded body */}
      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.instruction}>{card.instruction}</Text>

          {card.context ? (
            <Text style={styles.contextText}>{card.context}</Text>
          ) : null}

          {card.safetyNote ? (
            <View style={styles.safetyBox}>
              <Text style={styles.safetyLabel}>If unsure:</Text>
              <Text style={styles.safetyText}>{card.safetyNote}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={() => speak(readAloudText)}
              accessibilityRole="button"
              accessibilityLabel="Read aloud"
              style={({ pressed }) => [styles.readBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.readBtnLabel}>Read aloud</Text>
            </Pressable>

            <Pressable
              onPress={isDone ? onUndoDone : onMarkDone}
              accessibilityRole="button"
              accessibilityLabel={isDone ? 'Undo done' : 'Mark done'}
              style={({ pressed }) => [
                styles.doneBtn,
                isDone ? styles.doneBtnUndo : styles.doneBtnMark,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.doneBtnLabel, isDone ? styles.doneBtnUndoText : styles.doneBtnMarkText]}>
                {isDone ? 'Undo done' : 'Mark done'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit this routine card"
            style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.editLinkLabel}>Edit</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardDone: {
    backgroundColor: colors.doneSurface,
    borderColor: colors.done,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouch * 1.3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    flexShrink: 0,
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
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  titleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  instruction: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 30,
  },
  contextText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 26,
  },
  safetyBox: {
    backgroundColor: '#FFF4E5',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#F0C070',
    padding: spacing.md,
    gap: spacing.xs,
  },
  safetyLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.warn,
  },
  safetyText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  readBtn: {
    minHeight: minTouch,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readBtnLabel: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    minHeight: minTouch,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  doneBtnMark: {
    backgroundColor: colors.primary,
  },
  doneBtnUndo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtnLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  doneBtnMarkText: {
    color: '#FFFFFF',
  },
  doneBtnUndoText: {
    color: colors.text,
  },
  editLink: {
    alignSelf: 'flex-start',
    minHeight: minTouch,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  editLinkLabel: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
});
