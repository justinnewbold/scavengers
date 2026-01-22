import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { LiveRace, RaceParticipant } from '@/types/liveMultiplayer';

interface LiveRaceCardProps {
  race: LiveRace;
  onJoin?: () => void;
  onSpectate?: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

function ParticipantAvatars({ participants, max = 5 }: { participants: RaceParticipant[]; max?: number }) {
  const displayParticipants = participants.slice(0, max);
  const remaining = participants.length - max;

  return (
    <View style={styles.avatarStack}>
      {displayParticipants.map((p, index) => (
        <View
          key={p.userId}
          style={[styles.avatarContainer, { marginLeft: index > 0 ? -10 : 0, zIndex: max - index }]}
        >
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={12} color={Colors.textSecondary} />
            </View>
          )}
          {p.status === 'ready' && (
            <View style={styles.readyDot} />
          )}
        </View>
      ))}
      {remaining > 0 && (
        <View style={[styles.avatarContainer, styles.moreAvatar, { marginLeft: -10 }]}>
          <Text style={styles.moreText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

function RaceStatusBadge({ status }: { status: LiveRace['status'] }) {
  const config = {
    waiting: { label: 'Waiting', color: Colors.warning, icon: 'hourglass' },
    countdown: { label: 'Starting', color: Colors.error, icon: 'timer' },
    in_progress: { label: 'LIVE', color: Colors.error, icon: 'radio' },
    finished: { label: 'Finished', color: Colors.textSecondary, icon: 'checkmark-circle' },
    cancelled: { label: 'Cancelled', color: Colors.textTertiary, icon: 'close-circle' },
  };

  const { label, color, icon } = config[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      {status === 'in_progress' && <View style={[styles.liveDot, { backgroundColor: color }]} />}
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={12} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

export function LiveRaceCard({ race, onJoin, onSpectate, variant = 'default' }: LiveRaceCardProps) {
  const router = useRouter();

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    } else {
      router.push(`/live/race/${race.id}/join`);
    }
  };

  const handleSpectate = () => {
    if (onSpectate) {
      onSpectate();
    } else {
      router.push(`/live/race/${race.id}/spectate`);
    }
  };

  const canJoin = race.status === 'waiting' && race.participants.length < race.maxParticipants;
  const canSpectate = race.allowSpectators && ['waiting', 'countdown', 'in_progress'].includes(race.status);
  const isLive = race.status === 'in_progress';

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={canJoin ? handleJoin : (canSpectate ? handleSpectate : undefined)}
        activeOpacity={0.8}
      >
        <View style={styles.compactLeft}>
          <RaceStatusBadge status={race.status} />
          <Text style={styles.compactTitle} numberOfLines={1}>{race.huntTitle}</Text>
          <Text style={styles.compactHost}>by {race.hostName}</Text>
        </View>
        <View style={styles.compactRight}>
          <ParticipantAvatars participants={race.participants} max={3} />
          <Text style={styles.compactCount}>
            {race.participants.length}/{race.maxParticipants}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'featured') {
    return (
      <Card style={styles.featuredContainer}>
        <View style={styles.featuredHeader}>
          <RaceStatusBadge status={race.status} />
          {race.spectatorCount > 0 && (
            <View style={styles.spectatorCount}>
              <Ionicons name="eye" size={14} color={Colors.textSecondary} />
              <Text style={styles.spectatorText}>{race.spectatorCount} watching</Text>
            </View>
          )}
        </View>

        <Text style={styles.featuredTitle}>{race.huntTitle}</Text>

        <View style={styles.featuredMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>Hosted by {race.hostName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flag" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{race.totalChallenges} challenges</Text>
          </View>
        </View>

        <View style={styles.participantsSection}>
          <Text style={styles.participantsLabel}>
            Racers ({race.participants.length}/{race.maxParticipants})
          </Text>
          <ParticipantAvatars participants={race.participants} max={8} />
        </View>

        {isLive && race.currentLeader && (
          <View style={styles.leaderSection}>
            <Ionicons name="trophy" size={16} color={Colors.warning} />
            <Text style={styles.leaderText}>
              {race.participants.find(p => p.userId === race.currentLeader)?.displayName} is leading!
            </Text>
          </View>
        )}

        <View style={styles.featuredActions}>
          {canJoin && (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.joinButtonText}>Join Race</Text>
            </TouchableOpacity>
          )}
          {canSpectate && (
            <TouchableOpacity
              style={[styles.spectateButton, canJoin && styles.spectateButtonSecondary]}
              onPress={handleSpectate}
            >
              <Ionicons name="eye" size={18} color={canJoin ? Colors.primary : '#fff'} />
              <Text style={[styles.spectateButtonText, canJoin && styles.spectateButtonTextSecondary]}>
                Watch {isLive ? 'Live' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  }

  // Default variant
  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <RaceStatusBadge status={race.status} />
        {race.isPrivate && (
          <View style={styles.privateBadge}>
            <Ionicons name="lock-closed" size={12} color={Colors.textSecondary} />
          </View>
        )}
        {race.spectatorCount > 0 && (
          <View style={styles.spectatorCount}>
            <Ionicons name="eye" size={12} color={Colors.textSecondary} />
            <Text style={styles.spectatorText}>{race.spectatorCount}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>{race.huntTitle}</Text>
      <Text style={styles.host}>Hosted by {race.hostName}</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="people" size={14} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            {race.participants.length}/{race.maxParticipants}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="flag" size={14} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{race.totalChallenges} challenges</Text>
        </View>
      </View>

      <View style={styles.participantsRow}>
        <ParticipantAvatars participants={race.participants} />
      </View>

      <View style={styles.actions}>
        {canJoin && (
          <TouchableOpacity style={styles.actionButton} onPress={handleJoin}>
            <Ionicons name="enter" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Join</Text>
          </TouchableOpacity>
        )}
        {canSpectate && (
          <TouchableOpacity style={styles.actionButton} onPress={handleSpectate}>
            <Ionicons name="eye" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Watch</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  privateBadge: {
    padding: 4,
  },
  spectatorCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  spectatorText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  host: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  participantsRow: {
    marginBottom: Spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    borderWidth: 1,
    borderColor: Colors.background,
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  moreText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  compactLeft: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  compactHost: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  compactCount: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Featured variant
  featuredContainer: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featuredTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  participantsSection: {
    marginBottom: Spacing.md,
  },
  participantsLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  leaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning + '15',
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  leaderText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  featuredActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
  },
  joinButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  spectateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
  },
  spectateButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  spectateButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  spectateButtonTextSecondary: {
    color: Colors.primary,
  },
});

export default LiveRaceCard;
