import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface LeaderboardEntry {
  rank: number;
  participant_id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  score: number;
  challenges_completed: number;
  status: string;
}

interface LeaderboardProps {
  huntId: string;
  currentUserId?: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

export function Leaderboard({ huntId, currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard?hunt_id=${huntId}`);
      const data = await res.json();
      setEntries(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [huntId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [huntId, fetchLeaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return { color: '#FFD700', icon: 'trophy' }; // Gold
      case 2: return { color: '#C0C0C0', icon: 'medal' }; // Silver
      case 3: return { color: '#CD7F32', icon: 'medal' }; // Bronze
      default: return { color: Colors.textSecondary, icon: null };
    }
  };

  const renderEntry = ({ item }: { item: LeaderboardEntry; index: number }) => {
    const rankStyle = getRankStyle(item.rank);
    const isCurrentUser = item.user_id === currentUserId;

    return (
      <View style={[
        styles.entryContainer,
        isCurrentUser && styles.currentUserEntry,
      ]}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          {rankStyle.icon ? (
            <Ionicons name={rankStyle.icon as any} size={24} color={rankStyle.color} />
          ) : (
            <Text style={[styles.rankText, { color: rankStyle.color }]}>
              {item.rank}
            </Text>
          )}
        </View>

        {/* Avatar & Name */}
        <View style={styles.userInfo}>
          <View style={[
            styles.avatar,
            isCurrentUser && styles.currentUserAvatar,
          ]}>
            <Text style={styles.avatarText}>
              {item.display_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={[
              styles.displayName,
              isCurrentUser && styles.currentUserName,
            ]}>
              {item.display_name}
              {isCurrentUser && ' (You)'}
            </Text>
            <Text style={styles.challengesText}>
              {item.challenges_completed} challenges
            </Text>
          </View>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[
            styles.scoreText,
            item.rank <= 3 && { color: rankStyle.color },
          ]}>
            {item.score}
          </Text>
          <Text style={styles.ptsText}>pts</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>No players yet</Text>
        <Text style={styles.emptySubtext}>Be the first to complete this hunt!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={24} color={Colors.primary} />
        <Text style={styles.title}>Leaderboard</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.participant_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
  },
  entryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  currentUserEntry: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserAvatar: {
    backgroundColor: Colors.primary,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  nameContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  currentUserName: {
    color: Colors.primary,
  },
  challengesText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  ptsText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});

export default Leaderboard;
