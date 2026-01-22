import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { FeedItem, ReactionType, ReactionSummary } from '@/types';
import { triggerHaptic } from '@/hooks/useHaptics';

interface PhotoFeedItemProps {
  item: FeedItem;
  onReact?: (reactionType: ReactionType) => void;
  onUserPress?: (userId: string) => void;
  onHuntPress?: (huntId: string) => void;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  fire: '🔥',
  laugh: '😂',
  wow: '😮',
  love: '❤️',
  clap: '👏',
};

const screenWidth = Dimensions.get('window').width;

export function PhotoFeedItem({
  item,
  onReact,
  onUserPress,
  onHuntPress,
}: PhotoFeedItemProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<ReactionType | undefined>(
    item.user_reaction
  );
  const scaleAnims = useRef(
    Object.keys(REACTION_EMOJIS).reduce((acc, key) => {
      acc[key] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;
  const reactionBarAnim = useRef(new Animated.Value(0)).current;

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleLongPress = () => {
    triggerHaptic('light');
    setShowReactions(true);
    Animated.spring(reactionBarAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleReaction = (type: ReactionType) => {
    triggerHaptic('medium');

    // Animate the selected emoji
    Animated.sequence([
      Animated.spring(scaleAnims[type], {
        toValue: 1.5,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[type], {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedReaction(type);
    setShowReactions(false);
    reactionBarAnim.setValue(0);
    onReact?.(type);
  };

  const hideReactions = () => {
    Animated.timing(reactionBarAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowReactions(false));
  };

  const getTotalReactions = (reactions: ReactionSummary): number => {
    return reactions.total || 0;
  };

  const getTopReactions = (reactions: ReactionSummary): ReactionType[] => {
    return (Object.keys(REACTION_EMOJIS) as ReactionType[])
      .filter((key) => reactions[key] > 0)
      .sort((a, b) => reactions[b] - reactions[a])
      .slice(0, 3);
  };

  const photoSource = item.photo_url
    ? { uri: item.photo_url }
    : item.photo_data
    ? { uri: item.photo_data }
    : null;

  return (
    <Card style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => onUserPress?.(item.user_id)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color={Colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.userName}>{item.display_name}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="trophy" size={14} color={Colors.primary} />
          <Text style={styles.pointsText}>+{item.points_awarded}</Text>
        </View>
      </TouchableOpacity>

      {/* Hunt/Challenge info */}
      <TouchableOpacity
        style={styles.challengeInfo}
        onPress={() => onHuntPress?.(item.hunt_title)}
        activeOpacity={0.7}
      >
        <Text style={styles.challengeTitle} numberOfLines={1}>
          {item.challenge_title}
        </Text>
        <Text style={styles.huntTitle} numberOfLines={1}>
          in {item.hunt_title}
        </Text>
      </TouchableOpacity>

      {/* Photo */}
      {photoSource && (
        <TouchableOpacity
          style={styles.photoContainer}
          onLongPress={handleLongPress}
          onPressOut={hideReactions}
          activeOpacity={0.95}
          delayLongPress={200}
        >
          <Image source={photoSource} style={styles.photo} resizeMode="cover" />

          {/* Reaction bar overlay */}
          {showReactions && (
            <Animated.View
              style={[
                styles.reactionBar,
                {
                  transform: [
                    {
                      scale: reactionBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                  opacity: reactionBarAnim,
                },
              ]}
            >
              {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleReaction(type)}
                  style={[
                    styles.reactionButton,
                    selectedReaction === type && styles.reactionButtonSelected,
                  ]}
                >
                  <Animated.Text
                    style={[
                      styles.reactionEmoji,
                      { transform: [{ scale: scaleAnims[type] }] },
                    ]}
                  >
                    {REACTION_EMOJIS[type]}
                  </Animated.Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </TouchableOpacity>
      )}

      {/* Reactions summary */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reactionsContainer}
          onPress={handleLongPress}
          activeOpacity={0.7}
        >
          {getTotalReactions(item.reactions) > 0 ? (
            <>
              <View style={styles.reactionPills}>
                {getTopReactions(item.reactions).map((type, index) => (
                  <View key={type} style={[styles.reactionPill, { marginLeft: index > 0 ? -8 : 0 }]}>
                    <Text style={styles.reactionPillEmoji}>{REACTION_EMOJIS[type]}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.reactionCount}>
                {getTotalReactions(item.reactions)}
              </Text>
            </>
          ) : (
            <Text style={styles.addReaction}>
              <Ionicons name="heart-outline" size={16} color={Colors.textTertiary} /> React
            </Text>
          )}
        </TouchableOpacity>

        {selectedReaction && (
          <View style={styles.yourReaction}>
            <Text style={styles.yourReactionText}>You: </Text>
            <Text style={styles.yourReactionEmoji}>{REACTION_EMOJIS[selectedReaction]}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  userName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  timestamp: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    gap: 4,
  },
  pointsText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  challengeInfo: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  challengeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  huntTitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  reactionBar: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reactionButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  reactionButtonSelected: {
    backgroundColor: Colors.primary + '30',
  },
  reactionEmoji: {
    fontSize: 28,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  reactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reactionPills: {
    flexDirection: 'row',
  },
  reactionPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  reactionPillEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  addReaction: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
  },
  yourReaction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yourReactionText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  yourReactionEmoji: {
    fontSize: 16,
  },
});
