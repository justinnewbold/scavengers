import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { ReplayHighlight } from '@/types/liveMultiplayer';
import { formatTime } from '../ReplayPlayer';

interface HighlightCardProps {
  highlight: ReplayHighlight;
  onPress: () => void;
  isActive: boolean;
}

export function HighlightCard({
  highlight,
  onPress,
  isActive,
}: HighlightCardProps) {
  const getHighlightIcon = () => {
    switch (highlight.type) {
      case 'lead_change': return 'swap-horizontal';
      case 'photo_finish': return 'camera';
      case 'comeback': return 'trending-up';
      case 'streak': return 'flame';
      case 'record': return 'ribbon';
      default: return 'star';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.highlightCard, isActive && styles.highlightCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.highlightIcon}>
        <Ionicons name={getHighlightIcon() as keyof typeof Ionicons.glyphMap} size={16} color={Colors.primary} />
      </View>
      <View style={styles.highlightInfo}>
        <Text style={styles.highlightTitle} numberOfLines={1}>{highlight.title}</Text>
        <Text style={styles.highlightTime}>{formatTime(highlight.startTime)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    minWidth: 140,
  },
  highlightCardActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  highlightInfo: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  highlightTime: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
