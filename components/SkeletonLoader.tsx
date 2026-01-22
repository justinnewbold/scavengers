import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function HuntCardSkeleton() {
  return (
    <View style={styles.huntCard}>
      <Skeleton height={120} borderRadius={12} style={styles.huntImage} />
      <View style={styles.huntContent}>
        <Skeleton width="70%" height={20} style={styles.marginBottom} />
        <Skeleton width="100%" height={14} style={styles.marginBottomSm} />
        <Skeleton width="60%" height={14} style={styles.marginBottom} />
        <View style={styles.huntMeta}>
          <Skeleton width={60} height={24} borderRadius={12} />
          <Skeleton width={80} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function FeedItemSkeleton() {
  return (
    <View style={styles.feedItem}>
      <View style={styles.feedHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.feedHeaderText}>
          <Skeleton width={120} height={16} style={styles.marginBottomSm} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton height={200} borderRadius={12} style={styles.feedImage} />
      <View style={styles.feedActions}>
        <Skeleton width={100} height={32} borderRadius={16} />
        <Skeleton width={60} height={32} borderRadius={16} />
      </View>
    </View>
  );
}

export function ProfileStatsSkeleton() {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.statCard}>
          <Skeleton width={40} height={32} style={styles.marginBottomSm} />
          <Skeleton width={60} height={14} />
        </View>
      ))}
    </View>
  );
}

export function DiscoverSkeleton() {
  return (
    <View style={styles.discoverContainer}>
      {/* Hero skeleton */}
      <View style={styles.heroSkeleton}>
        <Skeleton width={200} height={36} style={styles.marginBottom} />
        <Skeleton width={250} height={20} style={styles.marginBottomSm} />
        <Skeleton width={180} height={20} style={styles.marginBottom} />
        <View style={styles.heroButtons}>
          <Skeleton width="48%" height={48} borderRadius={24} />
          <Skeleton width="48%" height={48} borderRadius={24} />
        </View>
      </View>

      {/* Stats skeleton */}
      <View style={styles.statsSkeleton}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statItem}>
            <Skeleton width={50} height={28} style={styles.marginBottomSm} />
            <Skeleton width={70} height={14} />
          </View>
        ))}
      </View>

      {/* Hunt cards skeleton */}
      <View style={styles.sectionSkeleton}>
        <Skeleton width={150} height={24} style={styles.marginBottom} />
        <HuntCardSkeleton />
        <HuntCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
  },
  marginBottom: {
    marginBottom: Spacing.md,
  },
  marginBottomSm: {
    marginBottom: Spacing.sm,
  },
  huntCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  huntImage: {
    marginBottom: 0,
  },
  huntContent: {
    padding: Spacing.md,
  },
  huntMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  feedItem: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  feedHeaderText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  feedImage: {
    marginBottom: Spacing.md,
  },
  feedActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  discoverContainer: {
    padding: Spacing.md,
  },
  heroSkeleton: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.md,
  },
  statsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  sectionSkeleton: {
    marginBottom: Spacing.xl,
  },
});

export default Skeleton;
