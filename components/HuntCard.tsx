import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Hunt } from '@/types';

interface HuntCardProps {
  hunt: Hunt;
  onPress: () => void;
}

export function HuntCard({ hunt, onPress }: HuntCardProps) {
  const totalPoints = hunt.challenges?.reduce((sum, c) => sum + c.points, 0) || 0;
  const challengeCount = hunt.challenges?.length || 0;
  
  return (
    <Card variant="elevated" onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{hunt.title}</Text>
        {hunt.is_public && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Public</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {hunt.description}
      </Text>
      
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="flag-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{challengeCount} challenges</Text>
        </View>
        
        <View style={styles.stat}>
          <Ionicons name="star-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{totalPoints} pts</Text>
        </View>
        
        {hunt.time_limit_minutes && (
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>{hunt.time_limit_minutes}m</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.status}>
          {hunt.status === 'active' ? '🟢 Active' : 
           hunt.status === 'draft' ? '📝 Draft' : 
           hunt.status === 'completed' ? '✅ Completed' : '📦 Archived'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 100,
  },
  badgeText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  footer: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  status: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
