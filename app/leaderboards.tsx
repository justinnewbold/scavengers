import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedControl } from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { LeaderboardEntry } from '@/types';

type Scope = 'global' | 'friends' | 'weekly';

const SCOPES: { label: string; value: Scope }[] = [
  { label: 'Global', value: 'global' },
  { label: 'Friends', value: 'friends' },
  { label: 'Weekly', value: 'weekly' },
];

export default function LeaderboardsScreen() {
  const { user } = useAuthStore();
  const [scope, setScope] = useState<Scope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setIsLoading(true);

    const result = await apiFetch<{ entries: LeaderboardEntry[] }>(
      `/leaderboards?scope=${scope}`,
      { showErrorToast: true },
    );

    if (result.ok) {
      setEntries(result.data.entries);
    }

    setIsLoading(false);
    setRefreshing(false);
  }, [scope]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return Colors.textTertiary;
    }
  };

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.user_id === user?.id;

    return (
      <View style={[styles.entry, isCurrentUser && styles.currentUserEntry]}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          {item.rank <= 3 ? (
            <Ionicons name="medal" size={24} color={getMedalColor(item.rank)} />
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, isCurrentUser && styles.currentUserAvatar]}>
          <Text style={styles.avatarText}>
            {item.display_name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.entryInfo}>
          <Text style={[styles.entryName, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
            {item.display_name}{isCurrentUser ? ' (You)' : ''}
          </Text>
          <Text style={styles.entryMeta}>
            {item.challenges_completed} challenges
            {item.time_elapsed ? ` · ${Math.round(item.time_elapsed / 60)}m` : ''}
          </Text>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.entryScore, isCurrentUser && styles.currentUserScore]}>
            {item.score.toLocaleString()}
          </Text>
          <Text style={styles.scoreLabel}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Leaderboards' }} />

      <View style={styles.container}>
        <View style={styles.segmentContainer}>
          <SegmentedControl
            values={SCOPES.map(s => s.label)}
            selectedIndex={SCOPES.findIndex(s => s.value === scope)}
            onValueChange={(index) => setScope(SCOPES[index].value)}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="podium-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No rankings yet</Text>
            <Text style={styles.emptySubtitle}>
              {scope === 'friends'
                ? 'Add friends to see how you compare!'
                : 'Complete hunts to appear on the leaderboard.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.participant_id}
            renderItem={renderEntry}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLeaderboard(true)}
                tintColor={Colors.primary}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentContainer: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  currentUserEntry: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserAvatar: {
    backgroundColor: Colors.primary,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  currentUserName: {
    color: Colors.primary,
  },
  entryMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  entryScore: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  currentUserScore: {
    color: Colors.primary,
  },
  scoreLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
