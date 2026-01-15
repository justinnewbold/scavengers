import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Challenge } from '@/types';

interface MysteryChallengeProps {
  challenge: Challenge;
  isRevealed: boolean;
  distance?: number | null;
  intensity?: 'far' | 'medium' | 'close' | 'arrived';
  onPress?: () => void;
}

export function MysteryChallenge({
  challenge,
  isRevealed,
  distance,
  intensity = 'far',
  onPress,
}: MysteryChallengeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation based on proximity
  useEffect(() => {
    if (!isRevealed && intensity !== 'far') {
      const duration = intensity === 'close' ? 500 : intensity === 'medium' ? 800 : 1200;

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [intensity, isRevealed, pulseAnim]);

  // Reveal animation
  useEffect(() => {
    if (isRevealed) {
      Animated.parallel([
        Animated.spring(revealAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isRevealed, revealAnim, glowAnim]);

  const getIntensityColor = () => {
    switch (intensity) {
      case 'arrived': return Colors.success;
      case 'close': return Colors.warning;
      case 'medium': return Colors.secondary;
      default: return Colors.primary;
    }
  };

  const formatDistance = (dist: number): string => {
    if (dist < 1000) return `${Math.round(dist)}m`;
    return `${(dist / 1000).toFixed(1)}km`;
  };

  if (!challenge.is_mystery || isRevealed) {
    // Show revealed challenge
    return (
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: revealAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            }) }],
            opacity: revealAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <Card style={styles.revealedCard} onPress={onPress}>
          {challenge.is_mystery && (
            <View style={styles.revealedBadge}>
              <Ionicons name="sparkles" size={14} color={Colors.warning} />
              <Text style={styles.revealedBadgeText}>Mystery Revealed!</Text>
            </View>
          )}
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.description}>{challenge.description}</Text>
          <View style={styles.pointsBadge}>
            <Ionicons name="trophy" size={16} color={Colors.primary} />
            <Text style={styles.points}>{challenge.points} pts</Text>
          </View>
        </Card>
      </Animated.View>
    );
  }

  // Show mystery card
  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Card style={[styles.mysteryCard, { borderColor: getIntensityColor() }]} onPress={onPress}>
        <View style={styles.mysteryContent}>
          <Animated.View
            style={[
              styles.mysteryIconContainer,
              { backgroundColor: getIntensityColor() + '30' },
            ]}
          >
            <Ionicons name="help" size={48} color={getIntensityColor()} />
          </Animated.View>

          <Text style={styles.mysteryTitle}>Mystery Challenge</Text>
          <Text style={styles.mysterySubtitle}>
            Get closer to reveal this challenge
          </Text>

          {distance !== null && distance !== undefined && (
            <View style={[styles.distanceBadge, { backgroundColor: getIntensityColor() + '20' }]}>
              <Ionicons name="location" size={16} color={getIntensityColor()} />
              <Text style={[styles.distanceText, { color: getIntensityColor() }]}>
                {formatDistance(distance)} away
              </Text>
            </View>
          )}

          {/* Proximity indicator */}
          <View style={styles.proximityIndicator}>
            {['far', 'medium', 'close', 'arrived'].map((level, index) => (
              <View
                key={level}
                style={[
                  styles.proximityDot,
                  {
                    backgroundColor:
                      ['far', 'medium', 'close', 'arrived'].indexOf(intensity) >= index
                        ? getIntensityColor()
                        : Colors.border,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.proximityHint}>
            {intensity === 'arrived' && 'You\'re here!'}
            {intensity === 'close' && 'Very close!'}
            {intensity === 'medium' && 'Getting warmer...'}
            {intensity === 'far' && 'Keep exploring'}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  mysteryCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  mysteryContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  mysteryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  mysteryTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  mysterySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  distanceText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  proximityIndicator: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  proximityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  proximityHint: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  revealedCard: {
    borderWidth: 2,
    borderColor: Colors.success,
  },
  revealedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  revealedBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.warning,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  points: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
});
