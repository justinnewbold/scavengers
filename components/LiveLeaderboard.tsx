import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface Player {
  id: string;
  name: string;
  score: number;
  currentChallenge: number;
  completedChallenges: number[];
}

interface LiveLeaderboardProps {
  players: Player[];
  currentUserId: string;
  totalChallenges: number;
}

export function LiveLeaderboard({ players, currentUserId, totalChallenges }: LiveLeaderboardProps) {
  const [animations] = useState(() =>
    players.reduce((acc, player) => {
      acc[player.id] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  useEffect(() => {
    // Animate position changes
    sortedPlayers.forEach((player, index) => {
      if (animations[player.id]) {
        Animated.spring(animations[player.id], {
          toValue: index,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }
    });
  }, [sortedPlayers, animations]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return { icon: 'trophy', color: '#FFD700' };
      case 1:
        return { icon: 'medal', color: '#C0C0C0' };
      case 2:
        return { icon: 'medal', color: '#CD7F32' };
      default:
        return { icon: 'person', color: Colors.textSecondary };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="podium" size={20} color={Colors.primary} />
        <Text style={styles.title}>Live Leaderboard</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {sortedPlayers.map((player, index) => {
          const { icon, color } = getRankIcon(index);
          const isCurrentUser = player.id === currentUserId;
          const progress = (player.completedChallenges.length / totalChallenges) * 100;

          return (
            <View
              key={player.id}
              style={[styles.playerRow, isCurrentUser && styles.currentUserRow]}
            >
              <View style={styles.rankContainer}>
                <Ionicons name={icon as any} size={18} color={color} />
                <Text style={styles.rank}>#{index + 1}</Text>
              </View>

              <View style={styles.playerInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.playerName, isCurrentUser && styles.currentUserName]}>
                    {player.name}
                    {isCurrentUser && ' (You)'}
                  </Text>
                  {player.completedChallenges.length === totalChallenges && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  )}
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {player.completedChallenges.length}/{totalChallenges}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <Text style={styles.score}>{player.score}</Text>
                <Text style={styles.scoreLabel}>pts</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#EF4444',
  },
  list: {
    maxHeight: 200,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  currentUserRow: {
    backgroundColor: Colors.primaryMuted,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 50,
  },
  rank: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  playerInfo: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  playerName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  currentUserName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  progressText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    minWidth: 30,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  scoreLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
});

export default LiveLeaderboard;
