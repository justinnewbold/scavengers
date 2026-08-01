import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
import { HuntCard, Button, DiscoverSkeleton } from '@/components';
import { useHuntStore, useAuthStore } from '@/store';
import { useDailyHuntStore } from '@/store/dailyHuntStore';
import { apiFetch } from '@/lib/api';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useI18n } from '@/hooks/useI18n';
import type { Hunt } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum number of public hunts before a "Popular" ranking is meaningful. */
const MIN_HUNTS_FOR_POPULAR = 3;
const POPULAR_LIMIT = 10;
const ACTIVITY_LIMIT = 5;

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: Colors.success,
  medium: Colors.warning,
  hard: Colors.accent,
};

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A78BFA', '#6BCB77'];

// ─── Recent activity (real submissions from /api/feed) ───────────────────────

interface FeedRow {
  submission_id: string;
  user_id: string;
  display_name: string | null;
  hunt_title: string | null;
  points_awarded: number | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  playerName: string;
  playerInitial: string;
  avatarColor: string;
  huntTitle: string;
  timeAgo: string;
  points: number;
}

/** Stable colour per user so the same person keeps the same avatar tint. */
function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Loads real recent completions. Returns an empty list (never placeholder
 * content) when the user is signed out, the feed is empty, or the request
 * fails — the section simply hides itself rather than inventing activity.
 */
function useRecentActivity(isAuthenticated: boolean) {
  const [items, setItems] = useState<ActivityItem[]>([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    const result = await apiFetch<{ feed?: FeedRow[]; items?: FeedRow[] }>(
      `/feed?limit=${ACTIVITY_LIMIT}`,
      { showErrorToast: false },
    );

    if (!result.ok) {
      setItems([]);
      return;
    }

    const rows = result.data.feed ?? result.data.items ?? [];
    setItems(
      rows.slice(0, ACTIVITY_LIMIT).map((row) => {
        const name = row.display_name?.trim() || 'Someone';
        return {
          id: row.submission_id,
          playerName: name,
          playerInitial: name.charAt(0).toUpperCase(),
          avatarColor: colorForId(row.user_id || row.submission_id),
          huntTitle: row.hunt_title?.trim() || 'a hunt',
          timeAgo: formatTimeAgo(row.created_at),
          points: row.points_awarded ?? 0,
        };
      }),
    );
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  return { activity: items, reloadActivity: load };
}

// ─── Animated counter hook ───────────────────────────────────────────────────

function useAnimatedCount(target: number, duration: number = 1500) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listener = animValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    const animation = Animated.timing(animValue, {
      toValue: target,
      duration,
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
      animValue.removeListener(listener);
    };
  }, [target, duration]);

  return displayValue;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const router = useRouter();
  const { publicHunts, isLoading, error, fetchPublicHunts } = useHuntStore();
  const { dailyHunt, fetchDailyHunt, isDailyCompleted } = useDailyHuntStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { activity, reloadActivity } = useRecentActivity(isAuthenticated);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { t } = useI18n();

  const huntCount = publicHunts.length;
  const hasError = !!error;

  /** Real ranking: most-joined public hunts first. No invented play counts. */
  const popularHunts = useMemo<Hunt[]>(() => {
    if (huntCount < MIN_HUNTS_FOR_POPULAR) return [];
    return [...publicHunts]
      .sort((a, b) => (b.participant_count ?? 0) - (a.participant_count ?? 0))
      .slice(0, POPULAR_LIMIT);
  }, [publicHunts, huntCount]);

  // Animated values
  const availableCount = useAnimatedCount(huntCount, 1200);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const handleRefresh = useCallback(() => {
    fetchPublicHunts();
    reloadActivity();
  }, [fetchPublicHunts, reloadActivity]);

  useEffect(() => {
    Promise.all([fetchPublicHunts(), fetchDailyHunt()]).finally(() => setHasLoaded(true));
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

  // Fade in the banner on mount
  useEffect(() => {
    const fadeIn = Animated.timing(bannerOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    });
    fadeIn.start();
    return () => fadeIn.stop();
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
          onRefresh={handleRefresh}
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

      {/* ── Connection problem notice ─────────────────────────────────── */}
      {hasError && (
        <View style={styles.errorCard} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={22} color={Colors.warning} />
          <View style={styles.errorCardText}>
            <Text style={styles.errorCardTitle}>{t('home.cantReachServer')}</Text>
            <Text style={styles.errorCardSubtitle}>{t('home.pullToRetry')}</Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('home.retry')}
          >
            <Text style={styles.errorCardRetry}>{t('home.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Hunts available right now (real count) ────────────────────── */}
      {!hasError && huntCount > 0 && (
        <Animated.View style={{ opacity: bannerOpacity }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/discover')}
            style={styles.happeningNowBanner}
            accessibilityRole="button"
            accessibilityLabel={t('home.huntsReady', { count: huntCount })}
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
                <Text style={styles.happeningNowCount}>{availableCount}</Text>{' '}
                {t('home.huntsReadyToPlay')}
              </Text>
              <Text style={styles.happeningNowNearbyText}>
                {t('home.tapToBrowse')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      )}

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

      {/* ── Daily Hunt ────────────────────────────────────────────────── */}
      {dailyHunt && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.dailyHuntCard}
          onPress={() => router.push(`/hunt/${dailyHunt.id}`)}
        >
          <View style={styles.dailyHuntBadge}>
            <Ionicons name="calendar" size={14} color="#fff" />
            <Text style={styles.dailyHuntBadgeText}>DAILY HUNT</Text>
          </View>
          <Text style={styles.dailyHuntTitle}>{dailyHunt.title}</Text>
          <Text style={styles.dailyHuntDescription} numberOfLines={2}>
            {dailyHunt.description}
          </Text>
          <View style={styles.dailyHuntMeta}>
            <View style={styles.dailyHuntMetaItem}>
              <Ionicons name="fitness" size={14} color={Colors.textSecondary} />
              <Text style={styles.dailyHuntMetaText}>{dailyHunt.difficulty}</Text>
            </View>
            <View style={styles.dailyHuntMetaItem}>
              <Ionicons name="list" size={14} color={Colors.textSecondary} />
              <Text style={styles.dailyHuntMetaText}>
                {dailyHunt.challenges?.length || 0} challenges
              </Text>
            </View>
            {isDailyCompleted() && (
              <View style={styles.dailyCompletedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.dailyCompletedText}>Completed</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* ── Most Played Section (real join counts) ────────────────────── */}
      {popularHunts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.mostPlayed')} 🔥</Text>
            <TouchableOpacity
              onPress={() => router.push('/discover')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
            >
              <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={popularHunts}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.trendingList}
            renderItem={({ item }) => {
              const plays = item.participant_count ?? 0;
              const accent = DIFFICULTY_COLORS[item.difficulty] ?? Colors.primary;
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.trendingCard}
                  onPress={() => router.push(`/hunt/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View
                    style={[
                      styles.trendingCardHeader,
                      { backgroundColor: accent + '25' },
                    ]}
                  >
                    <Ionicons name="flame" size={28} color={accent} />
                  </View>

                  <View style={styles.trendingCardBody}>
                    <Text style={styles.trendingCardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>

                    {/* Real participant count from the API */}
                    <View style={styles.trendingCardStat}>
                      <Ionicons
                        name="people-outline"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.trendingCardStatText}>
                        {plays === 1
                          ? t('home.onePlayer')
                          : t('home.playerCount', { count: plays })}
                      </Text>
                    </View>

                    <View style={styles.trendingCardStat}>
                      <Ionicons
                        name="list-outline"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.trendingCardStatText}>
                        {item.challenges?.length ?? 0} {t('home.challenges')}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: accent + '20' },
                      ]}
                    >
                      <Text style={[styles.difficultyBadgeText, { color: accent }]}>
                        {item.difficulty.charAt(0).toUpperCase() +
                          item.difficulty.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── Recent Activity (real completions, hidden when empty) ─────── */}
      {activity.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="pulse" size={18} color={Colors.secondary} />
              <Text style={[styles.sectionTitle, { marginLeft: Spacing.sm }]}>
                {t('home.recentActivity')}
              </Text>
            </View>
          </View>

          <View style={styles.completionsContainer}>
            {activity.map((completion) => (
              <View key={completion.id} style={styles.completionItem}>
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

                <View style={styles.completionDetails}>
                  <Text style={styles.completionText} numberOfLines={1}>
                    <Text style={styles.completionPlayerName}>
                      {completion.playerName}
                    </Text>
                    {' completed '}
                    <Text style={styles.completionHuntName}>
                      {completion.huntTitle}
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
      )}

      {/* Quick Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{huntCount}</Text>
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

        {huntCount === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name={hasError ? 'cloud-offline-outline' : 'search-outline'}
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyText}>
              {hasError ? t('home.cantReachServer') : t('home.noPublicHunts')}
            </Text>
            <Text style={styles.emptySubtext}>
              {hasError ? t('home.pullToRetry') : t('home.beFirstToCreate')}
            </Text>
            {!hasError && (
              <Button
                title={t('home.createHunt')}
                size="sm"
                onPress={() => router.push('/hunt/ai-create')}
                style={styles.emptyButton}
              />
            )}
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
  happeningNowNearbyText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },

  // ── Quick Stats Bar (Social Proof) ────────────────────────────────

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

  // ── Daily Hunt ───────────────────────────────────────────────────
  dailyHuntCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  dailyHuntBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dailyHuntBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  dailyHuntTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  dailyHuntDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  dailyHuntMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dailyHuntMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dailyHuntMetaText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  dailyCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dailyCompletedText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.success,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '15',
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorCardText: {
    flex: 1,
  },
  errorCardTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  errorCardSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  errorCardRetry: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyButton: {
    marginTop: Spacing.md,
  },
});
