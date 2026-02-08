import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface RatingModalProps {
  visible: boolean;
  huntId: string;
  huntTitle: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function RatingModal({ visible, huntId, huntTitle, onClose, onSubmitted }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    const result = await apiFetch(`/hunts/${huntId}/reviews`, {
      method: 'POST',
      body: { rating, content: review.trim() || undefined },
    });
    setIsSubmitting(false);

    if (result.ok) {
      useToastStore.getState().show('Thanks for your review!', 'success');
      setRating(0);
      setReview('');
      onSubmitted?.();
      onClose();
    }
  };

  const handleSkip = () => {
    setRating(0);
    setReview('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.title}>How was it?</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{huntTitle}</Text>

          {/* Star Rating */}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
                accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                accessibilityRole="button"
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? '#FFC107' : Colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'][rating]}
            </Text>
          )}

          {/* Optional Review */}
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your thoughts (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={review}
            onChangeText={setReview}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <Button
              title={isSubmitting ? 'Submitting...' : 'Submit'}
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  stars: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingLabel: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  reviewInput: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  skipText: {
    color: Colors.textTertiary,
    fontSize: FontSizes.md,
  },
  submitButton: {
    flex: 1,
  },
});
