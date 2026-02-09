import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, SpectatorOverlay, AnimatedLeaderboard } from '@/components';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function SpectateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    spectatorSession,
    currentRace,
    liveReactions,
    liveComments,
    startSpectating,
    stopSpectating,
    sendReaction,
    sendComment,
    followRacer,
    setViewMode,
    isSpectating,
  } = useLiveMultiplayerStore();

  useEffect(() => {
    if (id) {
      startSpectating(id);
    }
    return () => {
      stopSpectating();
    };
  }, [id, startSpectating, stopSpectating]);

  const handleLeave = useCallback(() => {
    stopSpectating();
    router.back();
  }, [stopSpectating, router]);

  if (!isSpectating || !currentRace) {
    return (
      <>
        <Stack.Screen options={{ title: 'Spectating' }} />
        <View style={styles.loadingContainer}>
          <Ionicons name="eye-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.loadingText}>Connecting to race...</Text>
        </View>
      </>
    );
  }

  const leaderboardEntries = [...currentRace.participants]
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({
      rank: idx + 1,
      participant_id: p.userId,
      user_id: p.userId,
      display_name: p.displayName,
      avatar_url: p.avatarUrl,
      score: p.score,
      challenges_completed: p.completedChallenges,
      time_elapsed: p.totalTime,
    }));

  return (
    <>
      <Stack.Screen
        options={{
          title: `Live: ${currentRace.huntTitle}`,
          headerRight: () => (
            <Text style={styles.spectatorCount}>
              {currentRace.spectatorCount} watching
            </Text>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Race Status */}
        <View style={styles.statusBar}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.statusText}>
            {currentRace.status === 'in_progress'
              ? `${currentRace.participants.filter(p => p.status === 'finished').length}/${currentRace.participants.length} finished`
              : currentRace.status}
          </Text>
        </View>

        {/* Leaderboard */}
        <AnimatedLeaderboard entries={leaderboardEntries} />

        {/* Spectator Overlay (reactions, comments) */}
        <SpectatorOverlay
          reactions={liveReactions}
          comments={liveComments}
          onSendReaction={sendReaction}
          onSendComment={sendComment}
          onFollowRacer={followRacer}
          participants={currentRace.participants}
          viewMode={spectatorSession?.viewMode || 'overview'}
          onChangeViewMode={setViewMode}
        />

        <Button
          title="Leave"
          variant="ghost"
          onPress={handleLeave}
          style={styles.leaveButton}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  spectatorCount: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.error,
  },
  statusText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  leaveButton: {
    margin: Spacing.md,
  },
});
