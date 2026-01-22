import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import SkeletonLoader from '@/components/SkeletonLoader';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { HuntAnalytics, ChallengeAnalytics } from '@/types/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HuntAnalyticsScreen() {
  const { huntId } = useLocalSearchParams<{ huntId: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<HuntAnalytics | null>(null);
  const [challenges, setChallenges] = useState<ChallengeAnalytics[]>([]);

  const {
    fetchHuntAnalytics,
    fetchChallengeAnalytics,
    isLoading,
    error,
  } = useAnalyticsStore();

  useEffect(() => {
    if (huntId) {
      loadAnalytics();
    }
  }, [huntId]);

  const loadAnalytics = async () => {
    if (!huntId) return;

    const [huntData, challengeData] = await Promise.all([
      fetchHuntAnalytics(huntId),
      fetchChallengeAnalytics(huntId),
    ]);

    if (huntData) setAnalytics(huntData);
    if (challengeData) setChallenges(challengeData);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return Colors.success;
    if (rate >= 50) return Colors.warning;
    return Colors.error;
  };

  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
      <View style={styles.ratingRow} key={rating}>
        <Text style={styles.ratingLabel}>{rating}★</Text>
        <View style={styles.ratingBarContainer}>
          <View
            style={[
              styles.ratingBar,
              { width: `${percentage}%`, backgroundColor: Colors.warning },
            ]}
          />
        </View>
        <Text style={styles.ratingCount}>{count}</Text>
      </View>
    );
  };

  const renderChallengeRow = (challenge: ChallengeAnalytics, index: number) => {
    const completionColor = getCompletionColor(challenge.completionRate);
    const hasIssue = challenge.completionRate < 50 || challenge.skipCount > challenge.successfulCompletions;

    return (
      <View
        key={challenge.challengeId}
        style={[styles.challengeRow, hasIssue && styles.challengeRowIssue]}
      >
        <View style={styles.challengeNumber}>
          <Text style={styles.challengeNumberText}>{index + 1}</Text>
        </View>

        <View style={styles.challengeInfo}>
          <Text style={styles.challengeTitle} numberOfLines={1}>
            {challenge.challengeTitle}
          </Text>

          <View style={styles.challengeStats}>
            <View style={styles.challengeStat}>
              <Text style={[styles.challengeStatValue, { color: completionColor }]}>
                {challenge.completionRate.toFixed(0)}%
              </Text>
              <Text style={styles.challengeStatLabel}>complete</Text>
            </View>

            <View style={styles.challengeStat}>
              <Text style={styles.challengeStatValue}>
                {formatTime(challenge.averageTime)}
              </Text>
              <Text style={styles.challengeStatLabel}>avg time</Text>
            </View>

            <View style={styles.challengeStat}>
              <Text style={styles.challengeStatValue}>
                {challenge.skipCount}
              </Text>
              <Text style={styles.challengeStatLabel}>skips</Text>
            </View>

            <View style={styles.challengeStat}>
              <Text style={[styles.challengeStatValue, challenge.abandonCount > 0 && { color: Colors.error }]}>
                {challenge.abandonCount}
              </Text>
              <Text style={styles.challengeStatLabel}>drop-off</Text>
            </View>
          </View>
        </View>

        {hasIssue && (
          <Ionicons name="alert-circle" size={20} color={Colors.warning} />
        )}
      </View>
    );
  };

  if (isLoading && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Hunt Analytics' }} />
        <View style={styles.loadingContainer}>
          <SkeletonLoader width={SCREEN_WIDTH - 32} height={200} />
          <SkeletonLoader width={SCREEN_WIDTH - 32} height={150} />
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Hunt Analytics' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Failed to load analytics'}</Text>
          <Button title="Retry" onPress={loadAnalytics} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: analytics.huntTitle }} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        {/* Overview */}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewValue}>{analytics.totalPlays}</Text>
              <Text style={styles.overviewLabel}>Total Plays</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewValue}>{analytics.uniquePlayers}</Text>
              <Text style={styles.overviewLabel}>Players</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewValue, { color: getCompletionColor(Number(analytics.completionRate)) }]}>
                {analytics.completionRate}%
              </Text>
              <Text style={styles.overviewLabel}>Completion</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.overviewRow}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewValue}>{Math.round(analytics.averageScore)}</Text>
              <Text style={styles.overviewLabel}>Avg Score</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewValue}>{formatTime(analytics.averageTime)}</Text>
              <Text style={styles.overviewLabel}>Avg Time</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewValue}>{analytics.shareCount}</Text>
              <Text style={styles.overviewLabel}>Shares</Text>
            </View>
          </View>
        </Card>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard}>
          <View style={styles.activityRow}>
            <View style={[styles.activityIndicator, { backgroundColor: Colors.primary }]} />
            <Text style={styles.activityLabel}>Today</Text>
            <Text style={styles.activityValue}>{analytics.playsToday} plays</Text>
          </View>
          <View style={styles.activityRow}>
            <View style={[styles.activityIndicator, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.activityLabel}>This Week</Text>
            <Text style={styles.activityValue}>{analytics.playsThisWeek} plays</Text>
          </View>
          <View style={styles.activityRow}>
            <View style={[styles.activityIndicator, { backgroundColor: Colors.success }]} />
            <Text style={styles.activityLabel}>This Month</Text>
            <Text style={styles.activityValue}>{analytics.playsThisMonth} plays</Text>
          </View>
        </Card>

        {/* Ratings */}
        {analytics.totalRatings > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ratings</Text>
            <Card style={styles.ratingsCard}>
              <View style={styles.ratingsHeader}>
                <View style={styles.averageRating}>
                  <Ionicons name="star" size={32} color={Colors.warning} />
                  <Text style={styles.averageRatingValue}>
                    {analytics.averageRating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.totalRatings}>
                  {analytics.totalRatings} ratings
                </Text>
              </View>

              <View style={styles.ratingBars}>
                {[5, 4, 3, 2, 1].map((rating) =>
                  renderRatingBar(
                    rating,
                    analytics.ratingDistribution[rating.toString() as keyof typeof analytics.ratingDistribution],
                    analytics.totalRatings
                  )
                )}
              </View>
            </Card>
          </>
        )}

        {/* Challenge Performance */}
        <Text style={styles.sectionTitle}>Challenge Performance</Text>
        <Card style={styles.challengesCard}>
          {challenges.length === 0 ? (
            <Text style={styles.noChallenges}>No challenge data yet</Text>
          ) : (
            challenges.map((c, i) => renderChallengeRow(c, i))
          )}
        </Card>

        {/* Problem Areas */}
        {challenges.some(c => c.completionRate < 50 || c.abandonCount > 5) && (
          <>
            <Text style={styles.sectionTitle}>Areas to Improve</Text>
            <Card style={styles.improvementCard}>
              {challenges
                .filter(c => c.completionRate < 50 || c.abandonCount > 5)
                .map((c, i) => (
                  <View key={c.challengeId} style={styles.improvementRow}>
                    <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                    <View style={styles.improvementInfo}>
                      <Text style={styles.improvementTitle}>{c.challengeTitle}</Text>
                      <Text style={styles.improvementText}>
                        {c.completionRate < 50
                          ? `Low completion rate (${c.completionRate.toFixed(0)}%) - consider making easier`
                          : `High drop-off (${c.abandonCount} players quit here)`}
                      </Text>
                    </View>
                  </View>
                ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  overviewCard: {
    padding: Spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  overviewLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  activityCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  activityLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  activityValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  ratingsCard: {
    padding: Spacing.md,
  },
  ratingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  averageRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  averageRatingValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  totalRatings: {
    marginLeft: 'auto',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  ratingBars: {
    gap: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingLabel: {
    width: 30,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    borderRadius: 4,
  },
  ratingCount: {
    width: 30,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  challengesCard: {
    padding: 0,
    overflow: 'hidden',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  challengeRowIssue: {
    backgroundColor: Colors.warning + '10',
  },
  challengeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  challengeNumberText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  challengeStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  challengeStat: {
    alignItems: 'center',
  },
  challengeStatValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  challengeStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  noChallenges: {
    padding: Spacing.lg,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  improvementCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  improvementRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  improvementInfo: {
    flex: 1,
  },
  improvementTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  improvementText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
