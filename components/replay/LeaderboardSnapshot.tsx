import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { ReplaySnapshot } from '@/types/liveMultiplayer';

interface LeaderboardSnapshotProps {
  snapshot: ReplaySnapshot;
  participantNames: Record<string, string>;
}

export function LeaderboardSnapshot({
  snapshot,
  participantNames,
}: LeaderboardSnapshotProps) {
  const sortedParticipants = [...snapshot.participants].sort((a, b) => a.position - b.position);

  return (
    <View style={styles.snapshotLeaderboard}>
      {sortedParticipants.slice(0, 5).map((p, index) => (
        <View key={p.userId} style={styles.snapshotRow}>
          <Text style={styles.snapshotPosition}>{index + 1}</Text>
          <Text style={styles.snapshotName} numberOfLines={1}>
            {participantNames[p.userId] || 'Unknown'}
          </Text>
          <Text style={styles.snapshotScore}>{p.score}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  snapshotLeaderboard: {
    gap: 4,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snapshotPosition: {
    width: 20,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#fff',
  },
  snapshotName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#fff',
  },
  snapshotScore: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
});
