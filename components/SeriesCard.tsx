import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { HuntSeries } from '@/types/series';
import { GENRE_CONFIG } from '@/types/series';

interface SeriesCardProps {
  series: HuntSeries;
  variant?: 'default' | 'compact' | 'featured';
  onPress?: () => void;
}

export function SeriesCard({ series, variant = 'default', onPress }: SeriesCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/series/${series.id}`);
    }
  };

  const genreConfig = GENRE_CONFIG[series.genre];
  const progress = series.userProgress;
  const isStarted = progress && progress.status !== 'not_started';
  const isCompleted = progress?.status === 'completed';

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: series.bannerImageUrl || series.coverImageUrl }}
          style={styles.featuredBanner}
          imageStyle={styles.featuredBannerImage}
        >
          <View style={styles.featuredOverlay}>
            {series.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}

            <View style={styles.featuredContent}>
              <View style={[styles.genreBadge, { backgroundColor: genreConfig.color }]}>
                <Ionicons
                  name={genreConfig.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color="#fff"
                />
                <Text style={styles.genreBadgeText}>{genreConfig.label}</Text>
              </View>

              <Text style={styles.featuredTitle}>{series.title}</Text>
              <Text style={styles.featuredTagline} numberOfLines={2}>
                {series.tagline}
              </Text>

              <View style={styles.featuredMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="book" size={14} color="#fff" />
                  <Text style={styles.metaTextLight}>{series.totalChapters} chapters</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="star" size={14} color={Colors.warning} />
                  <Text style={styles.metaTextLight}>{series.averageRating.toFixed(1)}</Text>
                </View>
                {series.hasMultipleEndings && (
                  <View style={styles.metaItem}>
                    <Ionicons name="git-branch" size={14} color="#fff" />
                    <Text style={styles.metaTextLight}>{series.endingCount} endings</Text>
                  </View>
                )}
              </View>

              {isStarted && !isCompleted && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress.percentComplete}%` },
                    ]}
                  />
                  <Text style={styles.progressText}>
                    {progress.chaptersCompleted}/{series.totalChapters} completed
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.featuredButton} onPress={handlePress}>
                <Text style={styles.featuredButtonText}>
                  {isCompleted ? 'Play Again' : isStarted ? 'Continue' : 'Start Series'}
                </Text>
                <Ionicons name="play" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: series.coverImageUrl }}
          style={styles.compactImage}
        />

        <View style={styles.compactContent}>
          <View style={[styles.genreDot, { backgroundColor: genreConfig.color }]} />
          <Text style={styles.compactTitle} numberOfLines={1}>{series.title}</Text>
          <Text style={styles.compactChapters}>
            {series.totalChapters} chapters
          </Text>
        </View>

        {isStarted && !isCompleted && (
          <View style={styles.compactProgress}>
            <View
              style={[
                styles.compactProgressFill,
                { width: `${progress.percentComplete}%` },
              ]}
            />
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Default variant
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: series.coverImageUrl }}
        style={styles.coverImage}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.genreBadge, { backgroundColor: genreConfig.color }]}>
            <Ionicons
              name={genreConfig.icon as keyof typeof Ionicons.glyphMap}
              size={12}
              color="#fff"
            />
            <Text style={styles.genreBadgeText}>{genreConfig.label}</Text>
          </View>

          {series.isNew && (
            <View style={styles.newBadgeSmall}>
              <Text style={styles.newBadgeTextSmall}>NEW</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{series.title}</Text>
        <Text style={styles.tagline} numberOfLines={2}>{series.tagline}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="book-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{series.totalChapters} chapters</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.metaText}>{series.averageRating.toFixed(1)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{series.estimatedTotalDuration}min</Text>
          </View>
        </View>

        {/* Features badges */}
        <View style={styles.features}>
          {series.hasBranchingPaths && (
            <View style={styles.featureBadge}>
              <Ionicons name="git-branch" size={12} color={Colors.primary} />
              <Text style={styles.featureText}>Branching</Text>
            </View>
          )}
          {series.hasMultipleEndings && (
            <View style={styles.featureBadge}>
              <Ionicons name="flag" size={12} color={Colors.primary} />
              <Text style={styles.featureText}>{series.endingCount} Endings</Text>
            </View>
          )}
          {series.hasCharacterProgression && (
            <View style={styles.featureBadge}>
              <Ionicons name="trending-up" size={12} color={Colors.primary} />
              <Text style={styles.featureText}>RPG</Text>
            </View>
          )}
        </View>

        {/* Progress indicator */}
        {isStarted && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress.percentComplete}%` },
                  isCompleted && styles.progressComplete,
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {isCompleted
                ? 'Completed'
                : `${progress.chaptersCompleted}/${series.totalChapters}`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Default variant
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  coverImage: {
    width: 100,
    height: 140,
  },
  content: {
    flex: 1,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  genreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  genreBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#fff',
  },
  genreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  newBadgeSmall: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  tagline: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  metaTextLight: {
    fontSize: FontSizes.xs,
    color: '#fff',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressComplete: {
    backgroundColor: Colors.success,
  },
  progressLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  progressText: {
    position: 'absolute',
    right: 8,
    fontSize: FontSizes.xs,
    color: '#fff',
    fontWeight: '500',
  },

  // Compact variant
  compactContainer: {
    width: 140,
    marginRight: Spacing.sm,
  },
  compactImage: {
    width: 140,
    height: 190,
    borderRadius: 8,
  },
  compactContent: {
    paddingTop: Spacing.xs,
  },
  compactTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  compactChapters: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  compactProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.border,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  completedBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },

  // Featured variant
  featuredContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredBanner: {
    height: 280,
  },
  featuredBannerImage: {
    borderRadius: 16,
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  newBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fff',
  },
  featuredContent: {
    gap: Spacing.xs,
  },
  featuredTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: '#fff',
  },
  featuredTagline: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
    marginTop: Spacing.sm,
  },
  featuredButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SeriesCard;
