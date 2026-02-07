import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { RaceParticipant } from '@/types/liveMultiplayer';

// Race position card
export const RacerCard = memo(function RacerCard({
  participant,
  position,
  totalChallenges,
  isFollowed,
  onFollow,
}: {
  participant: RaceParticipant;
  position: number;
  totalChallenges: number;
  isFollowed: boolean;
  onFollow: () => void;
}) {
  const progressPercent = (participant.completedChallenges / totalChallenges) * 100;

  return (
    <TouchableOpacity
      style={[styles.racerCard, isFollowed && styles.racerCardFollowed]}
      onPress={onFollow}
      activeOpacity={0.8}
    >
      <View style={styles.racerPosition}>
        <Text style={styles.positionText}>{position}</Text>
      </View>

      {participant.avatarUrl ? (
        <Image source={{ uri: participant.avatarUrl }} style={styles.racerAvatar} />
      ) : (
        <View style={[styles.racerAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={16} color={Colors.textSecondary} />
        </View>
      )}

      <View style={styles.racerInfo}>
        <Text style={styles.racerName} numberOfLines={1}>
          {participant.displayName}
        </Text>
        <View style={styles.racerProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {participant.completedChallenges}/{totalChallenges}
          </Text>
        </View>
      </View>

      <View style={styles.racerStats}>
        <Text style={styles.racerScore}>{participant.score}</Text>
        {participant.streak > 1 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={12} color={Colors.warning} />
            <Text style={styles.streakText}>{participant.streak}</Text>
          </View>
        )}
      </View>

      {isFollowed && (
        <View style={styles.followedBadge}>
          <Ionicons name="eye" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  racerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  racerCardFollowed: {
    backgroundColor: Colors.primary + '40',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  racerPosition: {
    width: 20,
    alignItems: 'center',
  },
  positionText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#fff',
  },
  racerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  racerInfo: {
    flex: 1,
  },
  racerName: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#fff',
  },
  racerProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  racerStats: {
    alignItems: 'flex-end',
    marginLeft: 4,
  },
  racerScore: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#fff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  streakText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '600',
  },
  followedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 2,
  },
});
