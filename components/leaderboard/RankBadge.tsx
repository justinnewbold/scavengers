import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes } from '@/constants/theme';

export function RankBadge({ rank }: { rank: number }) {
  const getMedalColor = () => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return null;
    }
  };

  const medalColor = getMedalColor();

  if (medalColor) {
    return (
      <View style={[styles.medalBadge, { backgroundColor: medalColor }]}>
        <Ionicons name="trophy" size={14} color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  rankText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
