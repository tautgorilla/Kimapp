import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing, shadow } from '@/theme';
import type { Note } from '@/db/schema';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export function NoteCard({ note, onPress }: NoteCardProps) {
  const when = formatTimestamp(note.createdAt);
  const title = (note.title ?? '').trim();
  const body = (note.transcript ?? '').trim();
  const displayTitle = title || (body ? firstLine(body) : 'Untitled note');
  const showPreview = !!body && (!!title || body.length > displayTitle.length + 8);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${displayTitle}, ${when}`}
    >
      <Text style={styles.title} numberOfLines={2}>
        {displayTitle}
      </Text>
      <Text style={styles.time}>{when}</Text>
      {showPreview && (
        <Text style={styles.preview} numberOfLines={2}>
          {body}
        </Text>
      )}
      {note.needsReview && (
        <View style={styles.flag}>
          <Text style={styles.flagText}>Needs caregiver review</Text>
        </View>
      )}
    </Pressable>
  );
}

function firstLine(s: string): string {
  const line = s.split('\n')[0]?.trim() ?? '';
  return line.length > 60 ? `${line.slice(0, 60).trim()}…` : line;
}

function formatTimestamp(ts: Date | number): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  pressed: { opacity: 0.9 },
  title: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  preview: {
    marginTop: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textMuted,
    lineHeight: fontSizes.md * 1.35,
  },
  flag: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E5',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flagText: {
    color: colors.warn,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
});
