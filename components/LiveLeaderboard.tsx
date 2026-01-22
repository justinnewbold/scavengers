import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useRealtimeStore } from '@/store/realtimeStore';
import type { LeaderboardEntry, RealtimeEvent, ChallengeCompletedEvent } from '@/types/realtime';

interface LiveLeaderboardProps {
  huntId: string;
  currentPlayerId: string;
  compact?: boolean;
  showEvents?: boolean;
  maxEntries?: number;
}

export function LiveLeaderboard({
  huntId,
  currentPlayerId,
  compact = false,
  showEvents = true,
  maxEntries = 10,
}: LiveLeaderboardProps) {
  const {
    connectionState,
    leaderboard,
    recentEvents,
    connect,
    disconnect,
  } = useRealtimeStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    connect(huntId);
    return () => disconnect();
  }, [huntId]);

  // Pulse animation for live indicator
  useEffect(() => {
    if (connectionState === 'connected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
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
    }
  }, [connectionState, pulseAnim]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Text style={styles.medalEmoji}>🥇</Text>;
      case 2:
        return <Text style={styles.medalEmoji}>🥈</Text>;
      case 3:
        return <Text style={styles.medalEmoji}>🥉</Text>;
      default:
        return <Text style={styles.rankNumber}>{rank}</Text>;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        );
      case 'connecting':
      case 'reconnecting':
        return (
          <View style={styles.connectingIndicator}>
            <Ionicons name="sync" size={12} color={Colors.warning} />
            <Text style={styles.connectingText}>Connecting...</Text>
          </View>
        );
      default:
        return (
          <View style={styles.disconnectedIndicator}>
            <Ionicons name="cloud-offline" size={12} color={Colors.error} />
            <Text style={styles.disconnectedText}>Offline</Text>
          </View>
        );
    }
  };

  const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentPlayer = item.playerId === currentPlayerId;
    const displayedRank = item.rank || index + 1;

    return (
      <View
        style={[
          styles.entry,
          isCurrentPlayer && styles.currentPlayerEntry,
          compact && styles.entryCompact,
        ]}
      >
        <View style={styles.rankContainer}>{getRankIcon(displayedRank)}</View>

        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={compact ? 14 : 18} color={Colors.textSecondary} />
          </View>
        )}

        <View style={styles.playerInfo}>
          <Text
            style={[styles.playerName, isCurrentPlayer && styles.currentPlayerName]}
            numberOfLines={1}
          >
            {item.displayName}
            {isCurrentPlayer && ' (You)'}
          </Text>
          {!compact && (
            <View style={styles.playerStats}>
              <Text style={styles.statText}>
                {item.challengesCompleted} challenges
              </Text>
              {item.currentStreak > 1 && (
                <Text style={styles.streakText}>🔥 {item.currentStreak}x</Text>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.score, isCurrentPlayer && styles.currentPlayerScore]}>
          {item.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  const renderEvent = ({ item }: { item: RealtimeEvent }) => {
    if (item.type !== 'challenge_completed') return null;

    const data = item.data as ChallengeCompletedEvent;
    const isCurrentPlayer = data.playerId === currentPlayerId;

    return (
      <View style={[styles.eventItem, isCurrentPlayer && styles.currentPlayerEvent]}>
        <Ionicons
          name="checkmark-circle"
          size={16}
          color={isCurrentPlayer ? Colors.primary : Colors.success}
        />
        <Text style={styles.eventText} numberOfLines={1}>
          <Text style={styles.eventPlayerName}>{data.displayName}</Text>
          {' completed '}
          <Text style={styles.eventChallenge}>{data.challengeTitle}</Text>
          {' +'}
          <Text style={styles.eventPoints}>{data.points}</Text>
        </Text>
      </View>
    );
  };

  const displayedLeaderboard = leaderboard.slice(0, maxEntries);
  const challengeEvents = recentEvents.filter(e => e.type === 'challenge_completed').slice(0, 5);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="podium" size={20} color={Colors.primary} />
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        {getConnectionIcon()}
      </View>

      {displayedLeaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {connectionState === 'connected'
              ? 'No players yet...'
              : 'Connecting to live scores...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedLeaderboard}
          keyExtractor={(item) => item.playerId}
          renderItem={renderLeaderboardEntry}
          scrollEnabled={false}
        />
      )}

      {showEvents && challengeEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>Recent Activity</Text>
          <FlatList
            data={challengeEvents}
            keyExtractor={(item) => `${item.timestamp}-${item.userId}`}
            renderItem={renderEvent}
            scrollEnabled={false}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 1,
  },
  connectingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectingText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
  },
  disconnectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  disconnectedText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  entryCompact: {
    paddingVertical: Spacing.xs,
  },
  currentPlayerEntry: {
    backgroundColor: Colors.primary + '10',
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  medalEmoji: {
    fontSize: 18,
  },
  rankNumber: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  currentPlayerName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  streakText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
  },
  score: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
  currentPlayerScore: {
    color: Colors.primary,
  },
  emptyState: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  eventsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  eventsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  currentPlayerEvent: {
    backgroundColor: Colors.primary + '10',
    marginHorizontal: -Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: 4,
  },
  eventText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  eventPlayerName: {
    fontWeight: '600',
    color: Colors.text,
  },
  eventChallenge: {
    fontStyle: 'italic',
  },
  eventPoints: {
    color: Colors.success,
    fontWeight: '600',
  },
});

export default LiveLeaderboard;
