import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { STREAK_CONFIG } from '@/types';

interface StreakDisplayProps {
  streak: number;
  multiplier: number;
  timeRemaining: number | null;
  timeRemainingFormatted: string;
  isActive: boolean;
  compact?: boolean;
}

export function StreakDisplay({
  streak,
  multiplier,
  timeRemaining,
  timeRemainingFormatted,
  isActive,
  compact = false,
}: StreakDisplayProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fireAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fire animation when streak is active
  useEffect(() => {
    if (isActive && streak >= 2) {
      const fire = Animated.loop(
        Animated.sequence([
          Animated.timing(fireAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fireAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      fire.start();
      return () => fire.stop();
    }
  }, [isActive, streak, fireAnim]);

  // Pulse when time is running out
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining <= 10 && isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timeRemaining, isActive, pulseAnim]);

  // Pop animation when multiplier changes
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [multiplier, scaleAnim]);

  const getStreakColor = () => {
    if (multiplier >= 3) return '#FF4500'; // Orange-red for max
    if (multiplier >= 2) return Colors.warning;
    if (multiplier >= 1.5) return Colors.secondary;
    return Colors.primary;
  };

  const getFireIcon = () => {
    if (multiplier >= 3) return 'flame';
    if (multiplier >= 2) return 'flame';
    if (multiplier >= 1.5) return 'flash';
    return 'flash-outline';
  };

  if (!isActive || streak === 0) {
    return null;
  }

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { backgroundColor: getStreakColor() + '20', transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: fireAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          }}
        >
          <Ionicons name={getFireIcon()} size={16} color={getStreakColor()} />
        </Animated.View>
        <Text style={[styles.compactMultiplier, { color: getStreakColor() }]}>
          {multiplier}x
        </Text>
        {timeRemaining !== null && timeRemaining <= 30 && (
          <Animated.Text
            style={[
              styles.compactTimer,
              { color: getStreakColor(), transform: [{ scale: pulseAnim }] },
            ]}
          >
            {timeRemainingFormatted}
          </Animated.Text>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { borderColor: getStreakColor(), transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.header}>
        <Animated.View
          style={{
            transform: [
              {
                translateY: fireAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -3],
                }),
              },
              {
                scale: fireAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              },
            ],
          }}
        >
          <Ionicons name={getFireIcon()} size={28} color={getStreakColor()} />
        </Animated.View>
        <View style={styles.headerText}>
          <Text style={styles.streakLabel}>STREAK</Text>
          <Text style={[styles.streakCount, { color: getStreakColor() }]}>
            {streak} in a row!
          </Text>
        </View>
        <View style={[styles.multiplierBadge, { backgroundColor: getStreakColor() }]}>
          <Text style={styles.multiplierText}>{multiplier}x</Text>
        </View>
      </View>

      {/* Progress to next multiplier */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {STREAK_CONFIG.STREAK_THRESHOLDS.map((threshold, index) => {
            const isActive = streak >= threshold;
            const mult = STREAK_CONFIG.MULTIPLIERS[index];
            return (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  {
                    flex: 1,
                    backgroundColor: isActive ? getStreakColor() : Colors.border,
                    opacity: isActive ? 1 : 0.3,
                  },
                ]}
              >
                {index < STREAK_CONFIG.MULTIPLIERS.length - 1 && (
                  <Text style={styles.progressLabel}>{mult}x</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Timer */}
      {timeRemaining !== null && (
        <Animated.View
          style={[
            styles.timerContainer,
            {
              backgroundColor:
                timeRemaining <= 10 ? Colors.error + '20' : Colors.background,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons
            name="timer-outline"
            size={16}
            color={timeRemaining <= 10 ? Colors.error : Colors.textSecondary}
          />
          <Text
            style={[
              styles.timerText,
              { color: timeRemaining <= 10 ? Colors.error : Colors.textSecondary },
            ]}
          >
            {timeRemainingFormatted}
          </Text>
          <Text style={styles.timerHint}>to keep streak</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  streakLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  streakCount: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  multiplierBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  multiplierText: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#fff',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  progressSegment: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  timerText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  timerHint: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  compactMultiplier: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  compactTimer: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
