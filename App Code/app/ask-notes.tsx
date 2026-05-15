import React, { useEffect, useRef, useState } from 'react';
import {
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
import { colors, fontSizes, radii, spacing } from '@/theme';
import { BigButton } from '@/components/BigButton';
import {
  searchNotesForMemory,
  formatRecordedAt,
  type NoteSearchResult,
} from '@/services/noteRetrieval';
import { speak, stopSpeech } from '@/lib/tts';

type Status = 'idle' | 'searching' | 'done' | 'error';

const NO_MATCH_MESSAGE = 'I could not find a saved note about that.';
const ERROR_MESSAGE = 'I could not search your notes right now. Please try again.';
const STRONG_HEADER = 'I found this saved note:';
const POSSIBLE_HEADER = 'This might be related:';

function quoteOf(result: NoteSearchResult): string {
  return (result.note.transcript ?? result.note.title ?? '').trim();
}

function spokenAnswerFor(result: NoteSearchResult): string {
  const header = result.confidence === 'strong' ? STRONG_HEADER : POSSIBLE_HEADER;
  const quote = quoteOf(result);
  const recordedAt = formatRecordedAt(result.note.createdAt);
  return `${header} ${quote ? `"${quote}". ` : ''}Recorded ${recordedAt}.`;
}

export default function AskNotesScreen() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
  }, []);

  const onSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    stopSpeech();
    setStatus('searching');
    try {
      const found = await searchNotesForMemory(trimmed);
      setResults(found);
      setStatus('done');
    } catch {
      setResults([]);
      setStatus('error');
    }
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    if (status === 'error') {
      setStatus('idle');
    }
  };

  const top = results[0];
  const others = results.slice(1, 4);
  const header = top ? (top.confidence === 'strong' ? STRONG_HEADER : POSSIBLE_HEADER) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Your question</Text>
          <Text style={styles.hint}>
            Tap the microphone on your keyboard to speak instead of type.
          </Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={onQueryChange}
            placeholder="Ask about something you saved"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={onSearch}
            autoCapitalize="sentences"
            multiline
          />

          <View style={styles.searchButton}>
            <BigButton
              label={status === 'searching' ? 'Searching…' : 'Search Notes'}
              onPress={onSearch}
              disabled={status === 'searching' || !query.trim()}
              variant="primary"
            />
          </View>

          {status === 'done' && top && header && (
            <View style={styles.answerBlock}>
              <Text style={styles.answerHeader}>{header}</Text>
              <Text style={styles.quote}>“{quoteOf(top)}”</Text>
              <Text style={styles.recordedAt}>Recorded {formatRecordedAt(top.note.createdAt)}.</Text>

              <Pressable
                onPress={() => speak(spokenAnswerFor(top))}
                accessibilityRole="button"
                accessibilityLabel="Read the answer aloud"
                style={({ pressed }) => [styles.readAloud, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.readAloudLabel}>Read aloud</Text>
              </Pressable>

              {others.length > 0 && (
                <View style={styles.otherBlock}>
                  <Text style={styles.othersHeader}>Other matching notes</Text>
                  {others.map((r) => (
                    <View key={r.note.id} style={styles.otherCard}>
                      <Text style={styles.otherQuote}>“{quoteOf(r)}”</Text>
                      <Text style={styles.otherRecorded}>
                        Recorded {formatRecordedAt(r.note.createdAt)}.
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {status === 'done' && !top && (
            <View style={styles.answerBlock}>
              <Text style={styles.noMatch}>{NO_MATCH_MESSAGE}</Text>
              <Pressable
                onPress={() => speak(NO_MATCH_MESSAGE)}
                accessibilityRole="button"
                accessibilityLabel="Read the answer aloud"
                style={({ pressed }) => [styles.readAloud, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.readAloudLabel}>Read aloud</Text>
              </Pressable>
            </View>
          )}

          {status === 'error' && (
            <View style={[styles.answerBlock, styles.errorBlock]}>
              <Text style={styles.errorText}>{ERROR_MESSAGE}</Text>
              <Pressable
                onPress={() => speak(ERROR_MESSAGE)}
                accessibilityRole="button"
                accessibilityLabel="Read the message aloud"
                style={({ pressed }) => [styles.readAloud, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.readAloudLabel}>Read aloud</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.4,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: fontSizes.lg,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 96,
    lineHeight: fontSizes.lg * 1.4,
    textAlignVertical: 'top',
  },
  searchButton: {
    marginTop: spacing.lg,
  },
  answerBlock: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBlock: {
    borderColor: colors.danger,
  },
  answerHeader: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quote: {
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: fontSizes.lg * 1.35,
    marginBottom: spacing.sm,
  },
  recordedAt: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  readAloud: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  readAloudLabel: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  otherBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  othersHeader: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },
  otherCard: {
    paddingVertical: spacing.sm,
  },
  otherQuote: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  otherRecorded: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  noMatch: {
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: fontSizes.lg * 1.35,
  },
  errorText: {
    fontSize: fontSizes.lg,
    color: colors.text,
    lineHeight: fontSizes.lg * 1.35,
  },
});
