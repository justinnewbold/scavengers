import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { triggerHaptic } from '@/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StreakMilestoneProps {
  streak: number;
  multiplier: number;
  visible: boolean;
  onDismiss: () => void;
}

// Milestone thresholds and their messages
const MILESTONES: Record<number, { emoji: string; title: string; subtitle: string }> = {
  3: {
    emoji: '🔥',
    title: 'Hot Streak!',
    subtitle: '3 in a row - 1.5x bonus activated!',
  },
  5: {
    emoji: '⚡',
    title: 'Lightning Fast!',
    subtitle: '5 in a row - 2x bonus activated!',
  },
  7: {
    emoji: '🌟',
    title: 'Superstar!',
    subtitle: '7 in a row - 2.5x bonus activated!',
  },
  10: {
    emoji: '🏆',
    title: 'LEGENDARY!',
    subtitle: '10 in a row - Maximum 3x bonus!',
  },
};

// Get the appropriate milestone for a streak count
export function getMilestoneForStreak(streak: number): (typeof MILESTONES)[number] | null {
  // Return the highest applicable milestone
  const milestoneKeys = Object.keys(MILESTONES)
    .map(Number)
    .sort((a, b) => b - a);

  for (const key of milestoneKeys) {
    if (streak === key) {
      return MILESTONES[key];
    }
  }
  return null;
}

export function StreakMilestone({ streak, multiplier, visible, onDismiss }: StreakMilestoneProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const milestone = getMilestoneForStreak(streak);

  useEffect(() => {
    if (visible && milestone) {
      // Trigger haptic
      triggerHaptic('success');

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Bounce animation for emoji
      const bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      );
      bounceAnimation.start();

      // Auto dismiss after 2 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, 2000);

      return () => {
        clearTimeout(timer);
        bounceAnimation.stop();
      };
    }
  }, [visible, milestone, scaleAnim, opacityAnim, bounceAnim, onDismiss]);

  if (!visible || !milestone) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.emoji,
              { transform: [{ scale: bounceAnim }] },
            ]}
          >
            {milestone.emoji}
          </Animated.Text>

          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.subtitle}>{milestone.subtitle}</Text>

          <View style={styles.multiplierBadge}>
            <Ionicons name="flash" size={16} color={Colors.warning} />
            <Text style={styles.multiplierText}>{multiplier}x Bonus Active</Text>
          </View>

          <View style={styles.streakCount}>
            <Ionicons name="flame" size={20} color={Colors.error} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  multiplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  multiplierText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.warning,
  },
  streakCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  streakText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.error,
  },
});

export default StreakMilestone;
