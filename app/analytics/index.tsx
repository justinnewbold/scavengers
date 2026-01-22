import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import SkeletonLoader from '@/components/SkeletonLoader';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useAnalyticsStore } from '@/store/analyticsStore';
import type { HuntAnalytics } from '@/types/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AnalyticsDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  const {
    huntAnalytics,
    isLoading,
    error,
    fetchCreatorDashboard,
  } = useAnalyticsStore();

  const [dashboardData, setDashboardData] = useState<{
    hunts: HuntAnalytics[];
    totals: { totalHunts: number; totalPlays: number; totalPlayers: number; averageRating: number };
    trend: { date: string; plays: number; completions: number }[];
  } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const hunts = await fetchCreatorDashboard();
    if (hunts.length > 0) {
      // Calculate totals from hunts
      const totals = hunts.reduce(
        (acc, hunt) => ({
          totalHunts: acc.totalHunts + 1,
          totalPlays: acc.totalPlays + hunt.totalPlays,
          totalPlayers: acc.totalPlayers + hunt.uniquePlayers,
          ratingSum: acc.ratingSum + (hunt.averageRating * hunt.totalRatings),
          totalRatings: acc.totalRatings + hunt.totalRatings,
        }),
        { totalHunts: 0, totalPlays: 0, totalPlayers: 0, ratingSum: 0, totalRatings: 0 }
      );

      setDashboardData({
        hunts,
        totals: {
          totalHunts: totals.totalHunts,
          totalPlays: totals.totalPlays,
          totalPlayers: totals.totalPlayers,
          averageRating: totals.totalRatings > 0 ? totals.ratingSum / totals.totalRatings : 0,
        },
        trend: [], // Would come from API
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const renderStatCard = (
    label: string,
    value: string | number,
    icon: string,
    color: string,
    subtitle?: string
  ) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </Card>
  );

  const renderHuntRow = (hunt: HuntAnalytics) => (
    <TouchableOpacity
      key={hunt.huntId}
      style={styles.huntRow}
      onPress={() => router.push(`/analytics/${hunt.huntId}`)}
    >
      <View style={styles.huntInfo}>
        <Text style={styles.huntTitle} numberOfLines={1}>
          {hunt.huntTitle}
        </Text>
        <View style={styles.huntStats}>
          <View style={styles.huntStat}>
            <Ionicons name="play" size={12} color={Colors.textSecondary} />
            <Text style={styles.huntStatText}>{hunt.totalPlays}</Text>
          </View>
          <View style={styles.huntStat}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
            <Text style={styles.huntStatText}>{hunt.completionRate.toFixed(0)}%</Text>
          </View>
          {hunt.averageRating > 0 && (
            <View style={styles.huntStat}>
              <Ionicons name="star" size={12} color={Colors.warning} />
              <Text style={styles.huntStatText}>{hunt.averageRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );

  if (isLoading && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Analytics' }} />
        <View style={styles.loadingContainer}>
          <SkeletonLoader width={SCREEN_WIDTH - 32} height={120} />
          <View style={styles.statsGrid}>
            <SkeletonLoader width={(SCREEN_WIDTH - 48) / 2} height={100} />
            <SkeletonLoader width={(SCREEN_WIDTH - 48) / 2} height={100} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Analytics' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={loadDashboard} />
        </View>
      </SafeAreaView>
    );
  }

  const hunts = dashboardData?.hunts || [];
  const totals = dashboardData?.totals || { totalHunts: 0, totalPlays: 0, totalPlayers: 0, averageRating: 0 };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Creator Analytics',
          headerRight: () => (
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="refresh" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

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
        {/* Overview Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Plays',
            totals.totalPlays.toLocaleString(),
            'play-circle',
            Colors.primary
          )}
          {renderStatCard(
            'Unique Players',
            totals.totalPlayers.toLocaleString(),
            'people',
            Colors.secondary
          )}
          {renderStatCard(
            'Hunts Created',
            totals.totalHunts,
            'map',
            Colors.success
          )}
          {renderStatCard(
            'Avg Rating',
            totals.averageRating > 0 ? totals.averageRating.toFixed(1) : '-',
            'star',
            Colors.warning
          )}
        </View>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {(['day', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Your Hunts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Hunts</Text>
          <Text style={styles.sectionCount}>{hunts.length} hunts</Text>
        </View>

        {hunts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No hunts created yet</Text>
            <Button
              title="Create Your First Hunt"
              onPress={() => router.push('/create')}
              style={styles.createButton}
            />
          </Card>
        ) : (
          <Card style={styles.huntListCard}>
            {hunts.map(renderHuntRow)}
          </Card>
        )}

        {/* Quick insights */}
        {hunts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Insights</Text>
            <Card style={styles.insightCard}>
              <View style={styles.insightRow}>
                <Ionicons name="trending-up" size={20} color={Colors.success} />
                <Text style={styles.insightText}>
                  Your most popular hunt is{' '}
                  <Text style={styles.insightHighlight}>
                    {hunts[0]?.huntTitle}
                  </Text>{' '}
                  with {hunts[0]?.totalPlays} plays
                </Text>
              </View>

              {hunts.some(h => h.completionRate < 50) && (
                <View style={styles.insightRow}>
                  <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                  <Text style={styles.insightText}>
                    Some hunts have low completion rates. Consider reviewing challenge difficulty.
                  </Text>
                </View>
              )}

              {totals.averageRating >= 4 && (
                <View style={styles.insightRow}>
                  <Ionicons name="star" size={20} color={Colors.warning} />
                  <Text style={styles.insightText}>
                    Great job! Your average rating is {totals.averageRating.toFixed(1)} stars!
                  </Text>
                </View>
              )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
  },
  huntListCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  huntRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  huntInfo: {
    flex: 1,
  },
  huntTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  huntStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  huntStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  huntStatText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  createButton: {
    marginTop: Spacing.sm,
  },
  insightCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  insightText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  insightHighlight: {
    fontWeight: '600',
    color: Colors.text,
  },
});
