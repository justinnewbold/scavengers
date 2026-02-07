import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import type {
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardPeriod,
  LeaderboardMetric,
} from '@/types/events';
import { METRIC_LABELS, PERIOD_LABELS } from '@/types/events';

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

function RankBadge({ rank }: { rank: number }) {
  const getMedalColor = () => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return null;
    }
  };

  const medalColor = getMedalColor();

  if (medalColor) {
    return (
      <View style={[styles.medalBadge, { backgroundColor: medalColor }]}>
        <Ionicons name="trophy" size={14} color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

function RankChange({ change }: { change?: number }) {
  if (!change || change === 0) return null;

  const isUp = change > 0;
  return (
    <View style={[styles.rankChange, isUp ? styles.rankUp : styles.rankDown]}>
      <Ionicons
        name={isUp ? 'arrow-up' : 'arrow-down'}
        size={10}
        color={isUp ? Colors.success : Colors.error}
      />
      <Text style={[styles.rankChangeText, isUp ? styles.rankUpText : styles.rankDownText]}>
        {Math.abs(change)}
      </Text>
    </View>
  );
}

const LeaderboardRow = memo(function LeaderboardRow({
  entry,
  isCurrentUser,
  metric,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  metric: LeaderboardMetric;
}) {
  const formatValue = (value: number) => {
    const config = METRIC_LABELS[metric];
    if (metric === 'distance') {
      return `${value.toFixed(1)} ${config.unit}`;
    }
    if (metric === 'speed') {
      return `${Math.round(value)} ${config.unit}`;
    }
    return `${value.toLocaleString()} ${config.unit}`;
  };

  return (
    <View style={[styles.leaderboardRow, isCurrentUser && styles.currentUserRow]}>
      <RankBadge rank={entry.rank} />
      <RankChange change={entry.rankChange} />

      {entry.avatarUrl ? (
        <Image source={{ uri: entry.avatarUrl }} style={styles.rowAvatar} />
      ) : (
        <View style={[styles.rowAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={16} color={Colors.textSecondary} />
        </View>
      )}

      <View style={styles.rowInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.rowName, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
            {entry.displayName}
          </Text>
          {entry.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
          )}
          {entry.isFriend && (
            <Ionicons name="people" size={14} color={Colors.success} />
          )}
        </View>
        {entry.title && (
          <Text style={styles.rowTitle}>{entry.title}</Text>
        )}
      </View>

      <View style={styles.valueContainer}>
        <Text style={styles.rowValue}>{formatValue(entry.value)}</Text>
      </View>
    </View>
  );
});

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

  const renderPodium = () => {
    if (!entries || entries.length < 3 || compact) return null;

    const top3 = entries.slice(0, 3);
    const [first, second, third] = top3;

    return (
      <View style={styles.podium}>
        {/* Second place */}
        <View style={styles.podiumSpot}>
          <View style={[styles.podiumAvatarContainer, styles.silverBorder]}>
            {second?.avatarUrl ? (
              <Image source={{ uri: second.avatarUrl }} style={styles.podiumAvatar} />
            ) : (
              <View style={[styles.podiumAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color={Colors.textSecondary} />
              </View>
            )}
          </View>
          <View style={[styles.podiumPillar, styles.silverPillar]}>
            <Text style={styles.podiumRank}>2</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{second?.displayName}</Text>
          <Text style={styles.podiumScore}>{second?.value.toLocaleString()}</Text>
        </View>

        {/* First place */}
        <View style={styles.podiumSpot}>
          <Ionicons name="trophy" size={24} color="#FFD700" style={styles.crownIcon} />
          <View style={[styles.podiumAvatarContainer, styles.goldBorder]}>
            {first?.avatarUrl ? (
              <Image source={{ uri: first.avatarUrl }} style={styles.podiumAvatarLarge} />
            ) : (
              <View style={[styles.podiumAvatarLarge, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color={Colors.textSecondary} />
              </View>
            )}
          </View>
          <View style={[styles.podiumPillar, styles.goldPillar]}>
            <Text style={styles.podiumRank}>1</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{first?.displayName}</Text>
          <Text style={styles.podiumScore}>{first?.value.toLocaleString()}</Text>
        </View>

        {/* Third place */}
        <View style={styles.podiumSpot}>
          <View style={[styles.podiumAvatarContainer, styles.bronzeBorder]}>
            {third?.avatarUrl ? (
              <Image source={{ uri: third.avatarUrl }} style={styles.podiumAvatar} />
            ) : (
              <View style={[styles.podiumAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color={Colors.textSecondary} />
              </View>
            )}
          </View>
          <View style={[styles.podiumPillar, styles.bronzePillar]}>
            <Text style={styles.podiumRank}>3</Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>{third?.displayName}</Text>
          <Text style={styles.podiumScore}>{third?.value.toLocaleString()}</Text>
        </View>
      </View>
    );
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
      {renderPodium()}
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
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  podiumSpot: {
    alignItems: 'center',
    width: 100,
  },
  crownIcon: {
    marginBottom: 4,
  },
  podiumAvatarContainer: {
    borderRadius: 30,
    borderWidth: 3,
    marginBottom: 8,
  },
  goldBorder: {
    borderColor: '#FFD700',
  },
  silverBorder: {
    borderColor: '#C0C0C0',
  },
  bronzeBorder: {
    borderColor: '#CD7F32',
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  podiumAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumPillar: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 4,
  },
  goldPillar: {
    height: 80,
    backgroundColor: '#FFD700',
  },
  silverPillar: {
    height: 60,
    backgroundColor: '#C0C0C0',
  },
  bronzePillar: {
    height: 40,
    backgroundColor: '#CD7F32',
  },
  podiumRank: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  podiumName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: 90,
  },
  podiumScore: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
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
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currentUserRow: {
    backgroundColor: Colors.primary + '10',
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  rankText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  rankChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.xs,
    width: 24,
  },
  rankUp: {},
  rankDown: {},
  rankChangeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  rankUpText: {
    color: Colors.success,
  },
  rankDownText: {
    color: Colors.error,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.sm,
  },
  rowInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  currentUserName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  rowTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  rowValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
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
