import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HuntCard, Button, DiscoverSkeleton, HuntCardSkeleton } from '@/components';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useI18n } from '@/hooks/useI18n';

// ─── Mock Data (replace with real API data later) ────────────────────────────

const TRENDING_HUNTS = [
  {
    id: 'trending-1',
    title: 'City Explorer',
    playCount: 1243,
    trendDelta: 34,
    rating: 4.8,
    difficulty: 'medium' as const,
    imageColor: Colors.primary,
  },
  {
    id: 'trending-2',
    title: 'Nature Walk',
    playCount: 987,
    trendDelta: 21,
    rating: 4.6,
    difficulty: 'easy' as const,
    imageColor: Colors.success,
  },
  {
    id: 'trending-3',
    title: 'Campus Mystery',
    playCount: 756,
    trendDelta: 45,
    rating: 4.9,
    difficulty: 'hard' as const,
    imageColor: Colors.accent,
  },
  {
    id: 'trending-4',
    title: 'Food Tour Quest',
    playCount: 632,
    trendDelta: 18,
    rating: 4.5,
    difficulty: 'easy' as const,
    imageColor: Colors.warning,
  },
  {
    id: 'trending-5',
    title: 'Historic Downtown',
    playCount: 528,
    trendDelta: 27,
    rating: 4.7,
    difficulty: 'medium' as const,
    imageColor: Colors.secondary,
  },
];

const RECENT_COMPLETIONS = [
  {
    id: 'completion-1',
    playerName: 'Sarah',
    playerInitial: 'S',
    avatarColor: '#FF6B6B',
    huntTitle: 'City Explorer',
    timeAgo: '2h ago',
    points: 850,
  },
  {
    id: 'completion-2',
    playerName: 'Marcus',
    playerInitial: 'M',
    avatarColor: '#6C63FF',
    huntTitle: 'Nature Walk',
    timeAgo: '3h ago',
    points: 720,
  },
  {
    id: 'completion-3',
    playerName: 'Aisha',
    playerInitial: 'A',
    avatarColor: '#00D9FF',
    huntTitle: 'Campus Mystery',
    timeAgo: '5h ago',
    points: 1100,
  },
  {
    id: 'completion-4',
    playerName: 'Jake',
    playerInitial: 'J',
    avatarColor: '#4CAF50',
    huntTitle: 'Food Tour Quest',
    timeAgo: '6h ago',
    points: 640,
  },
];

const GLOBAL_STATS = [
  { label: 'Hunts Created', value: 15000, display: '15K+' },
  { label: 'Challenges Completed', value: 50000, display: '50K+' },
  { label: 'Countries', value: 120, display: '120+' },
];

// ─── Difficulty badge helper ─────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: Colors.success,
  medium: Colors.warning,
  hard: Colors.accent,
};

// ─── Animated counter hook ───────────────────────────────────────────────────

function useAnimatedCount(target: number, duration: number = 1500) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listener = animValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    Animated.timing(animValue, {
      toValue: target,
      duration,
      useNativeDriver: false,
    }).start();

    return () => {
      animValue.removeListener(listener);
    };
  }, [target, duration]);

  return displayValue;
}

// ─── Star rating component ───────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [];

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Ionicons key={`full-${i}`} name="star" size={12} color={Colors.warning} />
    );
  }
  if (hasHalf) {
    stars.push(
      <Ionicons key="half" name="star-half" size={12} color={Colors.warning} />
    );
  }

  return (
    <View style={starStyles.container}>
      {stars}
      <Text style={starStyles.text}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 3,
  },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const router = useRouter();
  const { publicHunts, isLoading, fetchPublicHunts } = useHuntStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const { t } = useI18n();

  // Animated values
  const happeningNowCount = useAnimatedCount(127, 1800);
  const nearbyPlayersCount = useAnimatedCount(23, 1400);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const statsBarOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPublicHunts().finally(() => setHasLoaded(true));
  }, []);

  // Pulsing glow effect for the fire emoji
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Fade in the banner and stats bar on mount
  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(statsBarOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Show full skeleton on initial load
  if (!hasLoaded && isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DiscoverSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchPublicHunts}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>🎯 Scavengers</Text>
        <Text style={styles.heroSubtitle}>
          {t('home.subtitleFull')}
        </Text>

        <View style={styles.heroButtons}>
          <Button
            title={t('home.soloMode')}
            onPress={() => router.push('/solo')}
            variant="outline"
            style={styles.heroButtonHalf}
            icon={<Ionicons name="person" size={18} color={Colors.primary} />}
          />
          <Button
            title={t('home.createHunt')}
            onPress={() => router.push('/hunt/ai-create')}
            style={styles.heroButtonHalf}
            icon={<Ionicons name="sparkles" size={18} color="#fff" />}
          />
        </View>
      </View>

      {/* ── Happening Now Banner ──────────────────────────────────────── */}
      <Animated.View style={{ opacity: bannerOpacity }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/index')}
          style={styles.happeningNowBanner}
        >
          <View style={styles.happeningNowLeft}>
            <Animated.Text
              style={[
                styles.happeningNowEmoji,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              🔥
            </Animated.Text>
          </View>
          <View style={styles.happeningNowContent}>
            <Text style={styles.happeningNowTitle}>
              <Text style={styles.happeningNowCount}>{happeningNowCount}</Text> hunts happening right now
            </Text>
            <View style={styles.happeningNowNearby}>
              <Ionicons name="location" size={12} color={Colors.secondary} />
              <Text style={styles.happeningNowNearbyText}>
                {nearbyPlayersCount} players hunting near you
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Quick Stats Bar (Social Proof) ────────────────────────────── */}
      <Animated.View style={[styles.quickStatsBar, { opacity: statsBarOpacity }]}>
        {GLOBAL_STATS.map((stat, index) => (
          <React.Fragment key={stat.label}>
            {index > 0 && <Text style={styles.quickStatsSeparator}>{'\u2022'}</Text>}
            <Text style={styles.quickStatsText}>
              <Text style={styles.quickStatsValue}>{stat.display}</Text> {stat.label}
            </Text>
          </React.Fragment>
        ))}
      </Animated.View>

      {/* Solo Mode Promo Card */}
      <View style={styles.soloPromo}>
        <View style={styles.soloPromoContent}>
          <View style={styles.soloPromoIcon}>
            <Ionicons name="flash" size={24} color={Colors.warning} />
          </View>
          <View style={styles.soloPromoText}>
            <Text style={styles.soloPromoTitle}>{t('home.playSolo')}</Text>
            <Text style={styles.soloPromoSubtitle}>
              {t('home.playSoloSubtitle')}
            </Text>
          </View>
        </View>
        <Button
          title={t('home.start')}
          size="sm"
          onPress={() => router.push('/solo')}
          style={styles.soloPromoButton}
        />
      </View>

      {/* ── Trending This Week Section ────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending This Week 🔥</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/index')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={TRENDING_HUNTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.trendingList}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.trendingCard}
              onPress={() => router.push(`/hunt/${item.id}`)}
            >
              {/* Card color header */}
              <View
                style={[
                  styles.trendingCardHeader,
                  { backgroundColor: item.imageColor + '25' },
                ]}
              >
                <Ionicons name="flame" size={28} color={item.imageColor} />
              </View>

              <View style={styles.trendingCardBody}>
                <Text style={styles.trendingCardTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                {/* Play count with trend arrow */}
                <View style={styles.trendingCardStat}>
                  <Ionicons name="play-circle-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.trendingCardStatText}>
                    {item.playCount.toLocaleString()}
                  </Text>
                  <Text style={styles.trendingCardTrendArrow}>
                    {'\u2191'}{item.trendDelta}%
                  </Text>
                </View>

                {/* Rating */}
                <StarRating rating={item.rating} />

                {/* Difficulty badge */}
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: DIFFICULTY_COLORS[item.difficulty] + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyBadgeText,
                      { color: DIFFICULTY_COLORS[item.difficulty] },
                    ]}
                  >
                    {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Recently Completed Nearby Section ─────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="location-sharp" size={18} color={Colors.secondary} />
            <Text style={[styles.sectionTitle, { marginLeft: Spacing.sm }]}>
              Completed Nearby
            </Text>
          </View>
        </View>

        <View style={styles.completionsContainer}>
          {RECENT_COMPLETIONS.map((completion) => (
            <View key={completion.id} style={styles.completionItem}>
              {/* Avatar */}
              <View
                style={[
                  styles.completionAvatar,
                  { backgroundColor: completion.avatarColor + '30' },
                ]}
              >
                <Text
                  style={[
                    styles.completionAvatarText,
                    { color: completion.avatarColor },
                  ]}
                >
                  {completion.playerInitial}
                </Text>
              </View>

              {/* Details */}
              <View style={styles.completionDetails}>
                <Text style={styles.completionText} numberOfLines={1}>
                  <Text style={styles.completionPlayerName}>
                    {completion.playerName}
                  </Text>
                  {' completed '}
                  <Text style={styles.completionHuntName}>
                    '{completion.huntTitle}'
                  </Text>
                </Text>
                <View style={styles.completionMeta}>
                  <Text style={styles.completionTimeAgo}>{completion.timeAgo}</Text>
                  <Text style={styles.completionMetaSep}>{'\u2022'}</Text>
                  <Text style={styles.completionPoints}>
                    {'\u2B50'} {completion.points}pts
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Stats (existing) */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{publicHunts.length}</Text>
          <Text style={styles.statLabel}>{t('home.publicHunts')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>Free</Text>
          <Text style={styles.statLabel}>{t('home.upTo15Players')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>🔒</Text>
          <Text style={styles.statLabel}>{t('home.worksOffline')}</Text>
        </View>
      </View>

      {/* Public Hunts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.discoverHunts')}</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} />
        </View>

        {publicHunts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>{t('home.noPublicHunts')}</Text>
            <Text style={styles.emptySubtext}>{t('home.beFirstToCreate')}</Text>
          </View>
        ) : (
          publicHunts.map((hunt) => (
            <HuntCard
              key={hunt.id}
              hunt={hunt}
              onPress={() => router.push(`/hunt/${hunt.id}`)}
            />
          ))
        )}
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.whyScavengers')}</Text>

        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="sparkles" size={24} color={Colors.primary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t('home.aiPoweredCreation')}</Text>
            <Text style={styles.featureText}>
              {t('home.aiPoweredDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="camera" size={24} color={Colors.secondary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t('home.smartVerification')}</Text>
            <Text style={styles.featureText}>
              {t('home.smartVerificationDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="wallet-outline" size={24} color={Colors.success} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t('home.affordableAndFair')}</Text>
            <Text style={styles.featureText}>
              {t('home.affordableDesc')}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  heroButtonHalf: {
    flex: 1,
  },

  // ── Happening Now Banner ─────────────────────────────────────────
  happeningNowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '18',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  happeningNowLeft: {
    marginRight: Spacing.md,
  },
  happeningNowEmoji: {
    fontSize: 28,
  },
  happeningNowContent: {
    flex: 1,
  },
  happeningNowTitle: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  happeningNowCount: {
    fontWeight: '800',
    color: Colors.primary,
    fontSize: FontSizes.lg,
  },
  happeningNowNearby: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  happeningNowNearbyText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  // ── Quick Stats Bar (Social Proof) ────────────────────────────────
  quickStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickStatsText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  quickStatsValue: {
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickStatsSeparator: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.sm,
  },

  // ── Solo Promo (existing) ─────────────────────────────────────────
  soloPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warning + '15',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  soloPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  soloPromoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warning + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  soloPromoText: {
    flex: 1,
  },
  soloPromoTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  soloPromoSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  soloPromoButton: {
    minWidth: 70,
  },

  // ── Trending This Week ────────────────────────────────────────────
  trendingList: {
    gap: Spacing.sm,
  },
  trendingCard: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  trendingCardHeader: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingCardBody: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  trendingCardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  trendingCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingCardStatText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  trendingCardTrendArrow: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontWeight: '700',
    marginLeft: 2,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  difficultyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Recently Completed Nearby ─────────────────────────────────────
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.sm,
    gap: 2,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  completionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  completionAvatarText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  completionDetails: {
    flex: 1,
  },
  completionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  completionPlayerName: {
    fontWeight: '700',
    color: Colors.text,
  },
  completionHuntName: {
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  completionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  completionTimeAgo: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  completionMetaSep: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  completionPoints: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: '600',
  },

  // ── See All link ──────────────────────────────────────────────────
  seeAllText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },

  // ── Existing stats / sections / features ──────────────────────────
  stats: {
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
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
