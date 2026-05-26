import React, { useState } from 'react';
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
import { colors, fontSizes, radii, spacing, minTouch } from '@/theme';
import { BigButton } from '@/components/BigButton';
import { createRoutineCard } from '@/services/routineCards';

const SECTIONS: { key: string; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
  { key: 'leaving_home', label: 'Before leaving' },
  { key: 'bedtime', label: 'Bedtime' },
  { key: 'custom', label: 'Custom' },
];

export default function NewRoutineCard() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [context, setContext] = useState('');
  const [safetyNote, setSafetyNote] = useState('');
  const [readAloudText, setReadAloudText] = useState('');
  const [section, setSection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      await createRoutineCard({
        title: title.trim(),
        instruction: instruction.trim(),
        context: context.trim() || undefined,
        safetyNote: safetyNote.trim() || undefined,
        readAloudText: readAloudText.trim() || undefined,
        section: section || undefined,
      });
      router.back();
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  };

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
          <Text style={styles.screenTitle}>Add routine</Text>

          <FieldGroup label="Title" required hint="What is this routine step called?">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Morning water"
              maxLength={80}
              autoFocus
              returnKeyType="next"
            />
          </FieldGroup>

          <FieldGroup label="Instruction" required hint="Short step to follow.">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={instruction}
              onChangeText={setInstruction}
              placeholder="e.g. Drink one glass of water."
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
              placeholder="e.g. Your cup is next to the sink."
              maxLength={120}
            />
          </FieldGroup>

          <FieldGroup label="If unsure" hint="Optional — what to do if something seems wrong.">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={safetyNote}
              onChangeText={setSafetyNote}
              placeholder="e.g. Call the person you trust."
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
              placeholder="Custom text for read aloud"
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
            label={saving ? 'Saving…' : 'Save'}
            onPress={save}
            disabled={saving}
            style={styles.saveBtn}
          />
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
});
