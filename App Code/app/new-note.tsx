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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fontSizes, radii, spacing } from '@/theme';
import { BigButton } from '@/components/BigButton';
import { createNote } from '@/services/note';

export default function NewNoteScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => bodyRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const onSave = async () => {
    if (saving) return;
    if (!title.trim() && !body.trim()) {
      setError('Add a name or some content before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createNote({ title, body, sourceUser: 'patient' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Could not save the note.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New note</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Note name</Text>
          <TextInput
            ref={titleRef}
            value={title}
            onChangeText={setTitle}
            placeholder="What's this note about?"
            placeholderTextColor={colors.textMuted}
            style={styles.titleInput}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
            autoCapitalize="sentences"
            maxLength={120}
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>What you want to remember</Text>
          <Text style={styles.hint}>
            Tap the microphone on your keyboard to speak instead of type.
          </Text>
          <TextInput
            ref={bodyRef}
            value={body}
            onChangeText={setBody}
            placeholder="Start typing or tap the mic on the keyboard…"
            placeholderTextColor={colors.textMuted}
            style={styles.bodyInput}
            multiline
            scrollEnabled
            textAlignVertical="top"
            autoCapitalize="sentences"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <BigButton
            label={saving ? 'Saving…' : 'Save note'}
            onPress={onSave}
            disabled={saving}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    minWidth: 80,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  cancelText: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: '600',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
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
  titleInput: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 60,
  },
  bodyInput: {
    fontSize: fontSizes.lg,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 240,
    lineHeight: fontSizes.lg * 1.4,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
