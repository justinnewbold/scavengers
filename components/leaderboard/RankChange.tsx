import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export function RankChange({ change }: { change?: number }) {
  if (!change || change === 0) return null;

  const isUp = change > 0;
  return (
    <View style={[styles.rankChange, isUp ? styles.rankUp : styles.rankDown]}>
      <Ionicons
        name={isUp ? 'arrow-up' : 'arrow-down'}
        size={10}
        color={isUp ? Colors.success : Colors.error}
      />
      <Text style={[styles.rankChangeText, isUp ? styles.rankUpText : styles.rankDownText]}>
        {Math.abs(change)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rankChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.xs,
    width: 24,
  },
  rankUp: {},
  rankDown: {},
  rankChangeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  rankUpText: {
    color: Colors.success,
  },
  rankDownText: {
    color: Colors.error,
  },
});
