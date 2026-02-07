import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { RankBadge } from './RankBadge';
import { RankChange } from './RankChange';
import type { LeaderboardEntry, LeaderboardMetric } from '@/types/events';
import { METRIC_LABELS } from '@/types/events';

export const LeaderboardRow = memo(function LeaderboardRow({
  entry,
  isCurrentUser,
  metric,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  metric: LeaderboardMetric;
}) {
  const formatValue = (value: number) => {
    const config = METRIC_LABELS[metric];
    if (metric === 'distance') {
      return `${value.toFixed(1)} ${config.unit}`;
    }
    if (metric === 'speed') {
      return `${Math.round(value)} ${config.unit}`;
    }
    return `${value.toLocaleString()} ${config.unit}`;
  };

  return (
    <View style={[styles.leaderboardRow, isCurrentUser && styles.currentUserRow]}>
      <RankBadge rank={entry.rank} />
      <RankChange change={entry.rankChange} />

      {entry.avatarUrl ? (
        <Image source={{ uri: entry.avatarUrl }} style={styles.rowAvatar} />
      ) : (
        <View style={[styles.rowAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={16} color={Colors.textSecondary} />
        </View>
      )}

      <View style={styles.rowInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.rowName, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
            {entry.displayName}
          </Text>
          {entry.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
          )}
          {entry.isFriend && (
            <Ionicons name="people" size={14} color={Colors.success} />
          )}
        </View>
        {entry.title && (
          <Text style={styles.rowTitle}>{entry.title}</Text>
        )}
      </View>

      <View style={styles.valueContainer}>
        <Text style={styles.rowValue}>{formatValue(entry.value)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currentUserRow: {
    backgroundColor: Colors.primary + '10',
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  rowAvatar: {
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
  rowInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  currentUserName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  rowTitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  rowValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
});
