import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, TouchTargets } from '@/constants/theme';

interface TextPromptModalProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  submitLabel?: string;
  /** Disables input and shows a spinner while an async submit is in flight. */
  isSubmitting?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

/**
 * Cross-platform replacement for `Alert.prompt`, which exists only on iOS -
 * calling it on Android throws, so any screen using it crashed on tap.
 */
export function TextPromptModal({
  visible,
  title,
  message,
  placeholder,
  submitLabel = 'Submit',
  isSubmitting = false,
  onSubmit,
  onCancel,
}: TextPromptModalProps) {
  const [value, setValue] = useState('');

  // Clear between openings so a previous answer never carries over.
  useEffect(() => {
    if (visible) setValue('');
  }, [visible]);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={Colors.textTertiary}
            autoFocus
            editable={!isSubmitting}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && onSubmit(trimmed)}
            accessibilityLabel={title}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              onPress={onCancel}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.action, styles.submitAction, !canSubmit && styles.disabled]}
              onPress={() => canSubmit && onSubmit(trimmed)}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled: !canSubmit }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.md,
    minHeight: TouchTargets.minimum,
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  action: {
    minHeight: TouchTargets.minimum,
    minWidth: 100,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitAction: {
    backgroundColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  submitText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
});

export default TextPromptModal;
