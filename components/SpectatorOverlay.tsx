import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import type {
  LiveRace,
  SpectatorReaction,
  ReactionType,
} from '@/types/liveMultiplayer';
import { REACTION_CONFIG } from '@/types/liveMultiplayer';
import { FloatingReaction } from './spectator/FloatingReaction';
import { RacerCard } from './spectator/RacerCard';
import { CommentsPanel } from './spectator/CommentsPanel';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpectatorOverlayProps {
  race: LiveRace;
  onClose: () => void;
}

export function SpectatorOverlay({ race, onClose }: SpectatorOverlayProps) {
  const {
    spectatorSession,
    liveReactions,
    liveComments,
    followRacer,
    setViewMode,
    sendReaction,
    sendComment,
  } = useLiveMultiplayerStore();

  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<SpectatorReaction[]>([]);

  // Add new reactions to floating display
  useEffect(() => {
    if (liveReactions.length > 0) {
      const latest = liveReactions[liveReactions.length - 1];
      setFloatingReactions(prev => [...prev, latest]);
    }
  }, [liveReactions.length]);

  const handleReactionComplete = (reactionId: string) => {
    setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
  };

  const sortedParticipants = useMemo(
    () => [...race.participants]
      .filter(p => p.status === 'racing' || p.status === 'finished')
      .sort((a, b) => {
        if (a.completedChallenges !== b.completedChallenges) {
          return b.completedChallenges - a.completedChallenges;
        }
        return b.score - a.score;
      }),
    [race.participants]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Floating reactions */}
      {floatingReactions.map(reaction => (
        <FloatingReaction
          key={reaction.id}
          reaction={reaction}
          onComplete={() => handleReactionComplete(reaction.id)}
        />
      ))}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>{race.huntTitle}</Text>
        </View>

        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={16} color="#fff" />
          <Text style={styles.viewerText}>{race.spectatorCount}</Text>
        </View>
      </View>

      {/* Main content area - would show map or focused racer */}
      <View style={styles.mainContent}>
        {/* Placeholder for map/video content */}
        <View style={styles.contentPlaceholder}>
          <Ionicons name="videocam" size={48} color={Colors.textTertiary} />
          <Text style={styles.placeholderText}>Live race view</Text>
        </View>
      </View>

      {/* Leaderboard sidebar */}
      <View style={styles.leaderboard}>
        <Text style={styles.leaderboardTitle}>Live Standings</Text>
        <FlatList
          data={sortedParticipants}
          keyExtractor={(item) => item.userId}
          renderItem={({ item, index }) => (
            <RacerCard
              participant={item}
              position={index + 1}
              totalChallenges={race.totalChallenges}
              isFollowed={spectatorSession?.followingUserId === item.userId}
              onFollow={() => followRacer(
                spectatorSession?.followingUserId === item.userId ? null : item.userId
              )}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={styles.leaderboardList}
        />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* View mode selector */}
        <View style={styles.viewModes}>
          {(['overview', 'follow', 'map'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.viewModeButton,
                spectatorSession?.viewMode === mode && styles.viewModeActive,
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Ionicons
                name={mode === 'overview' ? 'grid' : mode === 'follow' ? 'person' : 'map'}
                size={18}
                color={spectatorSession?.viewMode === mode ? '#fff' : Colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Reactions */}
        <View style={styles.reactionsContainer}>
          {showReactions ? (
            <View style={styles.reactionsBar}>
              {(Object.entries(REACTION_CONFIG) as [ReactionType, { emoji: string }][]).map(([type, config]) => (
                <TouchableOpacity
                  key={type}
                  style={styles.reactionButton}
                  onPress={() => {
                    sendReaction(type);
                    setShowReactions(false);
                  }}
                >
                  <Text style={styles.reactionEmoji}>{config.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.openReactionsButton}
              onPress={() => setShowReactions(true)}
            >
              <Ionicons name="heart" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Comments toggle */}
        <TouchableOpacity
          style={styles.commentsToggle}
          onPress={() => setShowComments(!showComments)}
        >
          <Ionicons name="chatbubble" size={24} color="#fff" />
          {liveComments.length > 0 && (
            <View style={styles.commentsBadge}>
              <Text style={styles.commentsBadgeText}>
                {liveComments.length > 99 ? '99+' : liveComments.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Comments panel */}
      {showComments && (
        <CommentsPanel comments={liveComments} onSend={sendComment} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerText: {
    fontSize: FontSizes.sm,
    color: '#fff',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentPlaceholder: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  leaderboard: {
    position: 'absolute',
    top: 100,
    right: Spacing.md,
    width: 200,
    maxHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: Spacing.sm,
  },
  leaderboardTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  leaderboardList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewModes: {
    flexDirection: 'row',
    gap: 4,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModeActive: {
    backgroundColor: Colors.primary,
  },
  reactionsContainer: {
    flex: 1,
    alignItems: 'center',
  },
  reactionsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    padding: 4,
  },
  reactionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  openReactionsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsToggle: {
    position: 'relative',
    padding: Spacing.xs,
  },
  commentsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});

export default SpectatorOverlay;
