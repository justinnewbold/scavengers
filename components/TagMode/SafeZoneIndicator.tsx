import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { SafeZone } from '@/types/tagMode';

interface SafeZoneIndicatorProps {
  nearestSafeZone: SafeZone | null;
  distanceMeters: number | null;
  isInSafeZone: boolean;
  immuneUntil: string | null;
}

export function SafeZoneIndicator({
  nearestSafeZone,
  distanceMeters,
  isInSafeZone,
  immuneUntil,
}: SafeZoneIndicatorProps) {
  const getImmunityRemaining = () => {
    if (!immuneUntil) return null;
    const remaining = new Date(immuneUntil).getTime() - Date.now();
    if (remaining <= 0) return null;
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const immunityRemaining = getImmunityRemaining();

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // In safe zone
  if (isInSafeZone && nearestSafeZone) {
    return (
      <Card style={[styles.container, styles.safeContainer]}>
        <View style={styles.iconContainer}>
          <View style={styles.safeIcon}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.success} />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.safeTitle}>Safe Zone Active</Text>
          <Text style={styles.zoneName}>{nearestSafeZone.name}</Text>
          <Text style={styles.safeDescription}>
            You cannot be tagged while in this zone
          </Text>
        </View>
      </Card>
    );
  }

  // Has immunity
  if (immunityRemaining) {
    return (
      <Card style={[styles.container, styles.immuneContainer]}>
        <View style={styles.iconContainer}>
          <View style={styles.immuneIcon}>
            <Ionicons name="shield" size={28} color={Colors.secondary} />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.immuneTitle}>Immunity Active</Text>
          <Text style={styles.immuneTime}>{immunityRemaining}</Text>
          <Text style={styles.immuneDescription}>
            You cannot be tagged until immunity expires
          </Text>
        </View>
      </Card>
    );
  }

  // No protection, show nearest safe zone
  if (nearestSafeZone && distanceMeters !== null) {
    const isClose = distanceMeters < 100;

    return (
      <Card style={[styles.container, isClose && styles.nearbyContainer]}>
        <View style={styles.iconContainer}>
          <View style={[styles.zoneIcon, isClose && styles.zoneIconNearby]}>
            <Ionicons
              name="location"
              size={24}
              color={isClose ? Colors.success : Colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={[styles.zoneTitle, isClose && styles.zoneTitleNearby]}>
            {isClose ? 'Safe Zone Nearby!' : 'Nearest Safe Zone'}
          </Text>
          <Text style={styles.zoneName}>{nearestSafeZone.name}</Text>
          <View style={styles.distanceRow}>
            <Ionicons
              name="navigate"
              size={14}
              color={isClose ? Colors.success : Colors.textTertiary}
            />
            <Text style={[styles.distanceText, isClose && styles.distanceTextNearby]}>
              {formatDistance(distanceMeters)} away
            </Text>
          </View>
        </View>
        {isClose && (
          <View style={styles.pulseIndicator}>
            <View style={styles.pulse} />
          </View>
        )}
      </Card>
    );
  }

  // No safe zones configured
  return (
    <Card style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.noZoneIcon}>
          <Ionicons name="location-outline" size={24} color={Colors.textTertiary} />
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.noZoneTitle}>No Safe Zones</Text>
        <Text style={styles.noZoneDescription}>
          Stay alert! There are no safe zones in this game.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  safeContainer: {
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  immuneContainer: {
    backgroundColor: Colors.secondary + '20',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  nearbyContainer: {
    backgroundColor: Colors.success + '10',
    borderWidth: 1,
    borderColor: Colors.success + '50',
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  safeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  immuneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneIconNearby: {
    backgroundColor: Colors.success + '20',
  },
  noZoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  safeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 2,
  },
  immuneTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 2,
  },
  immuneTime: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  immuneDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  zoneTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  zoneTitleNearby: {
    color: Colors.success,
  },
  zoneName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  safeDescription: {
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  distanceTextNearby: {
    color: Colors.success,
    fontWeight: '600',
  },
  noZoneTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  noZoneDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    marginLeft: Spacing.sm,
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
  },
});

export default SafeZoneIndicator;
