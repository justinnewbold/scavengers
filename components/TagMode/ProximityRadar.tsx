import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { ProximityAlert, TagPlayer } from '@/types/tagMode';

interface ProximityRadarProps {
  players: TagPlayer[];
  currentPlayerId: string;
  alerts: ProximityAlert[];
  isHunter: boolean;
  onTagPlayer?: (targetId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 300);

export function ProximityRadar({
  players,
  currentPlayerId,
  alerts,
  isHunter,
}: ProximityRadarProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Sweep animation
    const sweep = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    sweep.start();

    return () => {
      pulse.stop();
      sweep.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  const sweepRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Convert direction to angle
  const directionToAngle = (direction?: string): number => {
    const directions: Record<string, number> = {
      north: 0,
      northeast: 45,
      east: 90,
      southeast: 135,
      south: 180,
      southwest: 225,
      west: 270,
      northwest: 315,
    };
    return directions[direction || 'north'] || 0;
  };

  // Get dot position based on distance category
  const getDistanceRadius = (category: string): number => {
    switch (category) {
      case 'danger_close':
        return RADAR_SIZE * 0.2;
      case 'nearby':
        return RADAR_SIZE * 0.35;
      case 'approaching':
        return RADAR_SIZE * 0.45;
      default:
        return RADAR_SIZE * 0.4;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isHunter ? 'Hunter Radar' : 'Proximity Radar'}
      </Text>

      <View style={[styles.radar, { width: RADAR_SIZE, height: RADAR_SIZE }]}>
        {/* Background circles */}
        <View style={[styles.ring, styles.ringOuter, { width: RADAR_SIZE, height: RADAR_SIZE }]} />
        <View style={[styles.ring, styles.ringMiddle, { width: RADAR_SIZE * 0.66, height: RADAR_SIZE * 0.66 }]} />
        <View style={[styles.ring, styles.ringInner, { width: RADAR_SIZE * 0.33, height: RADAR_SIZE * 0.33 }]} />

        {/* Pulse effect */}
        <Animated.View
          style={[
            styles.pulse,
            {
              width: RADAR_SIZE,
              height: RADAR_SIZE,
              borderRadius: RADAR_SIZE / 2,
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Sweep line */}
        <Animated.View
          style={[
            styles.sweep,
            {
              height: RADAR_SIZE / 2,
              transform: [
                { translateY: -RADAR_SIZE / 4 },
                { rotate: sweepRotation },
                { translateY: RADAR_SIZE / 4 },
              ],
            },
          ]}
        />

        {/* Center dot (you) */}
        <View style={styles.centerDot}>
          <Ionicons name="person" size={16} color={Colors.primary} />
        </View>

        {/* Player dots */}
        {alerts.map((alert) => {
          const angle = directionToAngle(alert.direction);
          const radius = getDistanceRadius(alert.distanceCategory);
          const radian = (angle - 90) * (Math.PI / 180);
          const x = Math.cos(radian) * radius;
          const y = Math.sin(radian) * radius;

          return (
            <View
              key={alert.playerId}
              style={[
                styles.playerDot,
                {
                  transform: [
                    { translateX: x },
                    { translateY: y },
                  ],
                  backgroundColor: alert.isHunter ? Colors.error : Colors.warning,
                },
                alert.distanceCategory === 'danger_close' && styles.playerDotDanger,
              ]}
            >
              <Ionicons
                name={alert.isHunter ? 'skull' : 'person'}
                size={12}
                color="#fff"
              />
            </View>
          );
        })}

        {/* Direction labels */}
        <Text style={[styles.directionLabel, styles.directionN]}>N</Text>
        <Text style={[styles.directionLabel, styles.directionE]}>E</Text>
        <Text style={[styles.directionLabel, styles.directionS]}>S</Text>
        <Text style={[styles.directionLabel, styles.directionW]}>W</Text>
      </View>

      {/* Alert list */}
      {alerts.length > 0 && (
        <View style={styles.alertList}>
          {alerts.map((alert) => (
            <View
              key={alert.playerId}
              style={[
                styles.alertItem,
                alert.distanceCategory === 'danger_close' && styles.alertItemDanger,
              ]}
            >
              <Ionicons
                name={alert.isHunter ? 'warning' : 'location'}
                size={16}
                color={alert.distanceCategory === 'danger_close' ? Colors.error : Colors.warning}
              />
              <Text style={styles.alertText}>
                <Text style={styles.alertName}>{alert.playerName}</Text>
                {' '}is {Math.round(alert.distance)}m away
                {alert.direction && ` to the ${alert.direction}`}
                {alert.isHunter && ' (HUNTER!)'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {alerts.length === 0 && (
        <Text style={styles.noAlerts}>No players nearby</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  radar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  ringOuter: {},
  ringMiddle: {},
  ringInner: {},
  pulse: {
    position: 'absolute',
    backgroundColor: Colors.primary + '20',
  },
  sweep: {
    position: 'absolute',
    width: 2,
    backgroundColor: Colors.primary + '60',
    transformOrigin: 'bottom',
  },
  centerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    zIndex: 10,
  },
  playerDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  playerDotDanger: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  directionLabel: {
    position: 'absolute',
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  directionN: {
    top: 8,
  },
  directionE: {
    right: 8,
  },
  directionS: {
    bottom: 8,
  },
  directionW: {
    left: 8,
  },
  alertList: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  alertItemDanger: {
    backgroundColor: Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  alertText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  alertName: {
    fontWeight: '600',
    color: Colors.text,
  },
  noAlerts: {
    marginTop: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
  },
});

export default ProximityRadar;
