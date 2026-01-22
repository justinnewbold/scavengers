import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useDiscoveryStore } from '@/store/discoveryStore';
import type { HuntReview } from '@/types/discovery';

interface HuntReviewsProps {
  huntId: string;
  initialReviews?: HuntReview[];
  averageRating?: number;
  totalReviews?: number;
  showWriteReview?: boolean;
  compact?: boolean;
  maxVisible?: number;
}

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

function StarRating({ rating, size = 16, interactive = false, onRatingChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.starContainer}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!interactive}
          onPress={() => onRatingChange?.(star)}
          style={styles.starButton}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? Colors.warning : Colors.textTertiary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewCard({ review, onHelpful }: { review: HuntReview; onHelpful: () => void }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {review.userAvatar ? (
          <Image source={{ uri: review.userAvatar }} style={styles.reviewAvatar} />
        ) : (
          <View style={[styles.reviewAvatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={18} color={Colors.textSecondary} />
          </View>
        )}

        <View style={styles.reviewUserInfo}>
          <Text style={styles.reviewUserName}>{review.userName}</Text>
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        </View>

        <View style={styles.reviewRating}>
          <StarRating rating={review.rating} size={14} />
        </View>
      </View>

      {review.title && (
        <Text style={styles.reviewTitle}>{review.title}</Text>
      )}

      <Text style={styles.reviewContent}>{review.content}</Text>

      {review.photos && review.photos.length > 0 && (
        <View style={styles.reviewPhotos}>
          {review.photos.slice(0, 3).map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.reviewPhoto}
            />
          ))}
          {review.photos.length > 3 && (
            <View style={styles.morePhotos}>
              <Text style={styles.morePhotosText}>+{review.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.reviewFooter}>
        <TouchableOpacity style={styles.helpfulButton} onPress={onHelpful}>
          <Ionicons
            name={review.markedHelpful ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={review.markedHelpful ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[
            styles.helpfulText,
            review.markedHelpful && styles.helpfulTextActive
          ]}>
            Helpful ({review.helpfulCount})
          </Text>
        </TouchableOpacity>

        {review.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

export function HuntReviews({
  huntId,
  initialReviews,
  averageRating = 0,
  totalReviews = 0,
  showWriteReview = true,
  compact = false,
  maxVisible = 5,
}: HuntReviewsProps) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const {
    reviews,
    fetchReviews,
    submitReview,
    markReviewHelpful,
  } = useDiscoveryStore();

  useEffect(() => {
    if (!initialReviews) {
      fetchReviews(huntId);
    }
  }, [huntId, initialReviews]);

  const displayReviews = initialReviews || reviews;
  const visibleReviews = showAllReviews
    ? displayReviews
    : displayReviews.slice(0, maxVisible);

  const handleSubmitReview = async () => {
    if (newRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (newContent.trim().length < 10) {
      Alert.alert('Review Too Short', 'Please write at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview(huntId, newRating, newContent.trim(), newTitle.trim() || undefined);
      setShowWriteModal(false);
      setNewRating(0);
      setNewTitle('');
      setNewContent('');
      Alert.alert('Success', 'Your review has been submitted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingDistribution = () => {
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    displayReviews.forEach(r => {
      const roundedRating = Math.round(r.rating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        distribution[roundedRating]++;
      }
    });
    return distribution;
  };

  const renderRatingSummary = () => {
    const distribution = getRatingDistribution();

    return (
      <Card style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <StarRating rating={Math.round(averageRating)} size={18} />
          <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
        </View>

        <View style={styles.summaryRight}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = distribution[star];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <View key={star} style={styles.distributionRow}>
                <Text style={styles.distributionStar}>{star}</Text>
                <View style={styles.distributionBarContainer}>
                  <View
                    style={[
                      styles.distributionBar,
                      { width: `${percentage}%` }
                    ]}
                  />
                </View>
                <Text style={styles.distributionCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  const renderWriteReviewModal = () => (
    <Modal
      visible={showWriteModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowWriteModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowWriteModal(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Write a Review</Text>
          <TouchableOpacity
            onPress={handleSubmitReview}
            disabled={isSubmitting || newRating === 0}
          >
            <Text style={[
              styles.modalSubmit,
              (isSubmitting || newRating === 0) && styles.modalSubmitDisabled
            ]}>
              {isSubmitting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.ratingSection}>
            <Text style={styles.ratingPrompt}>How would you rate this hunt?</Text>
            <StarRating
              rating={newRating}
              size={36}
              interactive
              onRatingChange={setNewRating}
            />
            {newRating > 0 && (
              <Text style={styles.ratingLabel}>
                {newRating === 1 && 'Poor'}
                {newRating === 2 && 'Fair'}
                {newRating === 3 && 'Good'}
                {newRating === 4 && 'Very Good'}
                {newRating === 5 && 'Excellent'}
              </Text>
            )}
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Review title (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={100}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Share your experience with this hunt..."
            placeholderTextColor={Colors.textTertiary}
            value={newContent}
            onChangeText={setNewContent}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          <Text style={styles.charCount}>
            {newContent.length}/1000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <StarRating rating={Math.round(averageRating)} size={14} />
          <Text style={styles.compactRating}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.compactCount}>({totalReviews})</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {totalReviews > 0 && renderRatingSummary()}

      {showWriteReview && (
        <TouchableOpacity
          style={styles.writeButton}
          onPress={() => setShowWriteModal(true)}
        >
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
          <Text style={styles.writeButtonText}>Write a Review</Text>
        </TouchableOpacity>
      )}

      {visibleReviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first to review this hunt!</Text>
        </View>
      ) : (
        <>
          {visibleReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={() => markReviewHelpful(review.id)}
            />
          ))}

          {displayReviews.length > maxVisible && !showAllReviews && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAllReviews(true)}
            >
              <Text style={styles.showMoreText}>
                Show all {displayReviews.length} reviews
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </>
      )}

      {renderWriteReviewModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactRating: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 4,
  },
  compactCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryCard: {
    flexDirection: 'row',
    padding: Spacing.md,
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  averageRating: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.text,
  },
  totalReviews: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryRight: {
    flex: 1,
    paddingLeft: Spacing.md,
    justifyContent: 'center',
    gap: 4,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  distributionStar: {
    width: 16,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 4,
  },
  distributionCount: {
    width: 24,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  writeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  reviewCard: {
    padding: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewUserInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  reviewUserName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  reviewRating: {
    marginLeft: Spacing.sm,
  },
  reviewTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reviewContent: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  reviewPhotos: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  reviewPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  helpfulText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  helpfulTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  verifiedText: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontWeight: '500',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: Spacing.md,
  },
  showMoreText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  starContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  modalSubmit: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalSubmitDisabled: {
    color: Colors.textTertiary,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ratingPrompt: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  ratingLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  titleInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  contentInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 150,
    flex: 1,
  },
  charCount: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});

export default HuntReviews;
