import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSizes, radii, spacing, minTouch } from '@/theme';
import { BigButton } from '@/components/BigButton';
import {
  getRoutineCard,
  updateRoutineCard,
  deactivateRoutineCard,
} from '@/services/routineCards';
import type { RoutineCard } from '@/db/schema';

const SECTIONS: { key: string; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
  { key: 'leaving_home', label: 'Before leaving' },
  { key: 'bedtime', label: 'Bedtime' },
  { key: 'custom', label: 'Custom' },
];

export default function EditRoutineCard() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<RoutineCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [context, setContext] = useState('');
  const [safetyNote, setSafetyNote] = useState('');
  const [readAloudText, setReadAloudText] = useState('');
  const [section, setSection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getRoutineCard(id).then((c) => {
      if (c) {
        setCard(c);
        setTitle(c.title);
        setInstruction(c.instruction);
        setContext(c.context ?? '');
        setSafetyNote(c.safetyNote ?? '');
        setReadAloudText(c.readAloudText ?? '');
        setSection(c.section ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  const save = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!instruction.trim()) {
      setError('Instruction is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updateRoutineCard(id!, {
        title: title.trim(),
        instruction: instruction.trim(),
        context: context.trim() || null,
        safetyNote: safetyNote.trim() || null,
        readAloudText: readAloudText.trim() || null,
        section: section || null,
      });
      router.back();
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  };

  const confirmRemove = () => {
    Alert.alert(
      'Remove routine card?',
      'This card will be hidden from your routine. Your past completion records are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deactivateRoutineCard(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnLabel}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Routine card not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topbar}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.cancelBtnLabel}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>Edit routine</Text>

          <FieldGroup label="Title" required hint="What is this routine step called?">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              returnKeyType="next"
            />
          </FieldGroup>

          <FieldGroup label="Instruction" required hint="Short step to follow.">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={instruction}
              onChangeText={setInstruction}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
          </FieldGroup>

          <FieldGroup label="Where to find it" hint="Optional — location of item needed.">
            <TextInput
              style={styles.input}
              value={context}
              onChangeText={setContext}
              maxLength={120}
            />
          </FieldGroup>

          <FieldGroup label="If unsure" hint="Optional — what to do if something seems wrong.">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={safetyNote}
              onChangeText={setSafetyNote}
              multiline
              numberOfLines={2}
              maxLength={200}
              textAlignVertical="top"
            />
          </FieldGroup>

          <FieldGroup label="Read-aloud wording" hint="Optional — leave blank to use title + instruction.">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={readAloudText}
              onChangeText={setReadAloudText}
              multiline
              numberOfLines={2}
              maxLength={300}
              textAlignVertical="top"
            />
          </FieldGroup>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Part of day</Text>
            <Text style={styles.hint}>Optional</Text>
            <View style={styles.sectionPicker}>
              {SECTIONS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => setSection(section === key ? '' : key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: section === key }}
                  accessibilityLabel={label}
                  style={({ pressed }) => [
                    styles.sectionChip,
                    section === key && styles.sectionChipActive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.sectionChipLabel, section === key && styles.sectionChipLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <BigButton
            label={saving ? 'Saving…' : 'Save changes'}
            onPress={save}
            disabled={saving}
            style={styles.saveBtn}
          />

          <Pressable
            onPress={confirmRemove}
            accessibilityRole="button"
            accessibilityLabel="Remove this routine card"
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.removeBtnLabel}>Remove card</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    minHeight: minTouch,
    justifyContent: 'center',
  },
  cancelBtnLabel: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  screenTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  requiredMark: {
    color: colors.danger,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  input: {
    minHeight: minTouch * 1.1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  multiline: {
    minHeight: minTouch * 1.8,
    paddingTop: spacing.sm,
  },
  sectionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectionChipLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  sectionChipLabelActive: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  removeBtn: {
    alignSelf: 'center',
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  removeBtnLabel: {
    color: colors.danger,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
});
