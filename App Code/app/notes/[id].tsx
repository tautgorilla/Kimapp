import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { colors, fontSizes, spacing, radii } from '@/theme';
import { BigButton } from '@/components/BigButton';
import { getNote } from '@/services/note';
import type { Note } from '@/db/schema';
import { speak, stopSpeech } from '@/lib/tts';

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [readingAloud, setReadingAloud] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const n = await getNote(id);
    setNote(n ?? null);
  }, [id]);

  useEffect(() => {
    refresh();
    return () => {
      stopSpeech();
    };
  }, [refresh]);

  if (!note) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Loading note…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = (note.title ?? '').trim();
  const body = (note.transcript ?? '').trim();
  const created = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);

  const onReadAloud = () => {
    const speech = [title, body].filter(Boolean).join('. ');
    if (!speech) return;
    if (readingAloud) {
      stopSpeech();
      setReadingAloud(false);
      return;
    }
    setReadingAloud(true);
    speak(speech);
    setTimeout(() => setReadingAloud(false), Math.max(2000, speech.length * 80));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.time}>{formatFull(created)}</Text>

        {body ? (
          <Text style={styles.body}>{body}</Text>
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>This note is empty.</Text>
          </View>
        )}

        {note.needsReview && (
          <View style={styles.reviewBanner}>
            <Text style={styles.reviewText}>Flagged for caregiver review</Text>
          </View>
        )}

        {(title || body) && (
          <View style={styles.actions}>
            <BigButton
              label={readingAloud ? 'Stop reading' : 'Read aloud'}
              onPress={onReadAloud}
              variant="secondary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatFull(d: Date): string {
  const date = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: fontSizes.md },
  title: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  body: {
    color: colors.text,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.4,
    marginBottom: spacing.xl,
  },
  placeholderBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderText: { color: colors.textMuted, fontSize: fontSizes.md },
  reviewBanner: {
    backgroundColor: '#FFF4E5',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  reviewText: { color: colors.warn, fontWeight: '700', fontSize: fontSizes.sm },
  actions: { marginTop: spacing.lg },
});
