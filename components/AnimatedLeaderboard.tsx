import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { triggerHaptic } from '@/hooks/useHaptics';

interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  previousRank?: number;
  challengesCompleted: number;
  isCurrentUser?: boolean;
}

interface AnimatedLeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  showAnimation?: boolean;
  maxVisible?: number;
}

function RankChangeIndicator({ current, previous }: { current: number; previous?: number }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (previous !== undefined && previous !== current) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [current, previous, scaleAnim, opacityAnim]);

  if (previous === undefined || previous === current) return null;

  const improved = current < previous;
  const diff = Math.abs(previous - current);

  return (
    <Animated.View
      style={[
        styles.rankChange,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Ionicons
        name={improved ? 'arrow-up' : 'arrow-down'}
        size={12}
        color={improved ? Colors.success : Colors.error}
      />
      <Text
        style={[
          styles.rankChangeText,
          { color: improved ? Colors.success : Colors.error },
        ]}
      >
        {diff}
      </Text>
    </Animated.View>
  );
}

function LeaderboardRow({
  entry,
  index,
  showAnimation,
}: {
  entry: LeaderboardEntry;
  index: number;
  showAnimation: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const { playRankUp } = useSoundEffects();

  useEffect(() => {
    if (showAnimation) {
      // Staggered entrance animation
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Glow animation for top 3
      if (entry.rank <= 3) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      // Play sound and haptic for rank improvements
      if (entry.isCurrentUser && entry.previousRank && entry.rank < entry.previousRank) {
        triggerHaptic('success');
        playRankUp();
      }
    }
  }, [showAnimation, index, entry, slideAnim, opacityAnim, scaleAnim, glowAnim, playRankUp]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return { icon: '🥇', color: '#FFD700' };
      case 2:
        return { icon: '🥈', color: '#C0C0C0' };
      case 3:
        return { icon: '🥉', color: '#CD7F32' };
      default:
        return null;
    }
  };

  const rankIcon = getRankIcon(entry.rank);
  const isTopThree = entry.rank <= 3;

  return (
    <Animated.View
      style={[
        styles.row,
        entry.isCurrentUser && styles.currentUserRow,
        isTopThree && styles.topThreeRow,
        {
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Glow effect for top 3 */}
      {isTopThree && (
        <Animated.View
          style={[
            styles.glowOverlay,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
              backgroundColor: rankIcon?.color,
            },
          ]}
        />
      )}

      {/* Rank */}
      <View style={styles.rankContainer}>
        {rankIcon ? (
          <Text style={styles.rankEmoji}>{rankIcon.icon}</Text>
        ) : (
          <Text style={styles.rankNumber}>{entry.rank}</Text>
        )}
        <RankChangeIndicator current={entry.rank} previous={entry.previousRank} />
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, isTopThree && { borderColor: rankIcon?.color }]}>
        <Text style={styles.avatarText}>
          {entry.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, entry.isCurrentUser && styles.currentUserName]}>
          {entry.displayName}
          {entry.isCurrentUser && ' (You)'}
        </Text>
        <Text style={styles.challenges}>
          {entry.challengesCompleted} challenges
        </Text>
      </View>

      {/* Score */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, isTopThree && { color: rankIcon?.color }]}>
          {entry.score.toLocaleString()}
        </Text>
        <Text style={styles.scoreLabel}>pts</Text>
      </View>
    </Animated.View>
  );
}

export function AnimatedLeaderboard({
  entries,
  title = 'Leaderboard',
  showAnimation = true,
  maxVisible = 10,
}: AnimatedLeaderboardProps) {
  const [visibleEntries, setVisibleEntries] = useState<LeaderboardEntry[]>([]);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sort and limit entries
    const sorted = [...entries]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, maxVisible);
    setVisibleEntries(sorted);

    // Header animation
    if (showAnimation) {
      Animated.spring(headerAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [entries, maxVisible, showAnimation, headerAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            transform: [
              {
                scale: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: headerAnim,
          },
        ]}
      >
        <Ionicons name="trophy" size={24} color={Colors.warning} />
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {visibleEntries.map((entry, index) => (
          <LeaderboardRow
            key={entry.id}
            entry={entry}
            index={index}
            showAnimation={showAnimation}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  currentUserRow: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  topThreeRow: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    flexDirection: 'row',
  },
  rankEmoji: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  rankChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  rankChangeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  currentUserName: {
    color: Colors.primary,
  },
  challenges: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  scoreLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});

export default AnimatedLeaderboard;
