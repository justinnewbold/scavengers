import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import type {
  LeaderboardScope,
  LeaderboardPeriod,
  LeaderboardMetric,
} from '@/types/events';
import { METRIC_LABELS, PERIOD_LABELS } from '@/types/events';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { LeaderboardPodium } from '@/components/leaderboard/LeaderboardPodium';

interface GlobalLeaderboardProps {
  initialScope?: LeaderboardScope;
  eventId?: string;
  compact?: boolean;
  maxEntries?: number;
}

const SCOPE_OPTIONS: { value: LeaderboardScope; label: string; icon: string }[] = [
  { value: 'global', label: 'Global', icon: 'globe' },
  { value: 'regional', label: 'Regional', icon: 'location' },
  { value: 'friends', label: 'Friends', icon: 'people' },
];

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'all_time', label: 'All Time' },
];

export function GlobalLeaderboard({
  initialScope = 'global',
  eventId,
  compact = false,
  maxEntries,
}: GlobalLeaderboardProps) {
  const {
    globalLeaderboard,
    regionalLeaderboard,
    friendsLeaderboard,
    eventLeaderboard,
    userGlobalRank,
    isLoadingLeaderboard,
    selectedLeaderboardScope,
    selectedLeaderboardPeriod,
    selectedLeaderboardMetric,
    fetchLeaderboard,
    fetchUserRank,
    setLeaderboardFilters,
    loadMoreLeaderboardEntries,
  } = useEventsStore();

  const [scope, setScope] = useState<LeaderboardScope>(initialScope);
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [metric, setMetric] = useState<LeaderboardMetric>('total_score');

  useEffect(() => {
    fetchLeaderboard(scope, eventId ? 'event' : period, metric);
    fetchUserRank();
  }, [scope, period, metric, eventId]);

  const getCurrentLeaderboard = () => {
    switch (scope) {
      case 'global': return globalLeaderboard;
      case 'regional': return regionalLeaderboard;
      case 'friends': return friendsLeaderboard;
      default: return eventId ? eventLeaderboard : globalLeaderboard;
    }
  };

  const leaderboard = getCurrentLeaderboard();
  const entries = useMemo(
    () => maxEntries
      ? leaderboard?.entries.slice(0, maxEntries)
      : leaderboard?.entries,
    [leaderboard?.entries, maxEntries]
  );

  const handleScopeChange = (newScope: LeaderboardScope) => {
    setScope(newScope);
    setLeaderboardFilters(newScope, period, metric);
  };

  const handlePeriodChange = (newPeriod: LeaderboardPeriod) => {
    setPeriod(newPeriod);
    setLeaderboardFilters(scope, newPeriod, metric);
  };

  const renderFilters = () => {
    if (compact) return null;

    return (
      <View style={styles.filtersContainer}>
        {/* Scope tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scopeTabs}
        >
          {SCOPE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.scopeTab, scope === option.value && styles.scopeTabActive]}
              onPress={() => handleScopeChange(option.value)}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={scope === option.value ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[styles.scopeTabText, scope === option.value && styles.scopeTabTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Period selector */}
        {!eventId && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.periodTabs}
          >
            {PERIOD_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.periodTab, period === option.value && styles.periodTabActive]}
                onPress={() => handlePeriodChange(option.value)}
              >
                <Text
                  style={[styles.periodTabText, period === option.value && styles.periodTabTextActive]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderUserPosition = () => {
    if (!leaderboard?.userEntry || compact) return null;

    return (
      <Card style={styles.userPositionCard}>
        <Text style={styles.userPositionLabel}>Your Position</Text>
        <LeaderboardRow
          entry={leaderboard.userEntry}
          isCurrentUser={true}
          metric={metric}
        />
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {!compact && (
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <View style={styles.metricSelector}>
            <Ionicons
              name={METRIC_LABELS[metric].icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.metricText}>{METRIC_LABELS[metric].label}</Text>
          </View>
        </View>
      )}

      {renderFilters()}
      <LeaderboardPodium entries={entries} compact={compact} />
      {renderUserPosition()}

      <FlatList
        data={entries?.slice(compact ? 0 : 3)}
        keyExtractor={(item) => `${item.userId}-${item.rank}`}
        renderItem={({ item }) => (
          <LeaderboardRow
            entry={item}
            isCurrentUser={leaderboard?.userEntry?.userId === item.userId}
            metric={metric}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="podium-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No rankings yet</Text>
          </View>
        }
        onEndReached={() => {
          if (leaderboard && entries && entries.length < leaderboard.totalEntries) {
            loadMoreLeaderboardEntries(leaderboard.id);
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  metricSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
  },
  metricText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  scopeTabs: {
    flexDirection: 'row',
  },
  scopeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  scopeTabActive: {
    backgroundColor: Colors.primary,
  },
  scopeTabText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scopeTabTextActive: {
    color: '#fff',
  },
  periodTabs: {
    flexDirection: 'row',
  },
  periodTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: Spacing.xs,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  periodTabActive: {
    backgroundColor: Colors.primary + '20',
  },
  periodTabText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  periodTabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  userPositionCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  userPositionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});

export default GlobalLeaderboard;
