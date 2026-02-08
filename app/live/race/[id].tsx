import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { RaceParticipant } from '@/types/liveMultiplayer';

export default function RaceLobbyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    currentRace,
    joinRace,
    leaveRace,
    setReady,
    startRace,
    cancelRace,
    isLoading,
    isRacing,
  } = useLiveMultiplayerStore();

  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (id && !currentRace) {
      setJoining(true);
      joinRace(id).finally(() => setJoining(false));
    }
  }, [id, currentRace, joinRace]);

  // Redirect when race starts
  useEffect(() => {
    if (isRacing && currentRace?.status === 'in_progress') {
      router.replace(`/live/playing/${currentRace.id}`);
    }
  }, [isRacing, currentRace?.status, currentRace?.id, router]);

  const isHost = currentRace?.hostId === user?.id;
  const currentParticipant = currentRace?.participants.find(p => p.userId === user?.id);
  const allReady = currentRace?.participants.every(p => p.isReady || p.isHost) ?? false;
  const canStart = isHost && allReady && (currentRace?.participants.length ?? 0) >= 2;

  const handleShare = useCallback(async () => {
    if (!currentRace?.inviteCode) return;
    try {
      await Share.share({
        message: `Join my race on Scavengers! Use code: ${currentRace.inviteCode}\n\nhttps://scavengers.newbold.cloud/join/${currentRace.inviteCode}`,
        title: 'Join My Race',
      });
    } catch { /* user cancelled */ }
  }, [currentRace?.inviteCode]);

  const handleLeave = useCallback(async () => {
    await leaveRace();
    router.back();
  }, [leaveRace, router]);

  const renderParticipant = ({ item }: { item: RaceParticipant }) => (
    <View style={styles.participantRow}>
      <View style={styles.participantAvatar}>
        <Text style={styles.avatarText}>
          {item.displayName[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {item.displayName}
          {item.isHost ? ' (Host)' : ''}
        </Text>
        <Text style={styles.participantStatus}>
          {item.isHost ? 'Host' : item.isReady ? 'Ready' : 'Waiting'}
        </Text>
      </View>
      <View style={[styles.readyIndicator, item.isReady || item.isHost ? styles.ready : styles.notReady]}>
        <Ionicons
          name={item.isReady || item.isHost ? 'checkmark' : 'time'}
          size={16}
          color={item.isReady || item.isHost ? Colors.success : Colors.textTertiary}
        />
      </View>
    </View>
  );

  if (joining || (!currentRace && isLoading)) {
    return (
      <>
        <Stack.Screen options={{ title: 'Joining Race...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Joining race...</Text>
        </View>
      </>
    );
  }

  if (!currentRace) {
    return (
      <>
        <Stack.Screen options={{ title: 'Race Not Found' }} />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.emptyTitle}>Race not found</Text>
          <Button title="Go Back" onPress={() => router.back()} variant="outline" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: currentRace.huntTitle }} />

      <View style={styles.container}>
        {/* Race Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="flash" size={20} color={Colors.primary} />
            <Text style={styles.infoTitle}>{currentRace.huntTitle}</Text>
          </View>
          <View style={styles.infoMeta}>
            <Text style={styles.metaText}>
              {currentRace.totalChallenges} challenges
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>
              {currentRace.participants.length}/{currentRace.maxParticipants} players
            </Text>
            {currentRace.inviteCode && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.metaText, { color: Colors.primary }]}>
                  Code: {currentRace.inviteCode}
                </Text>
              </>
            )}
          </View>
        </Card>

        {/* Participants */}
        <Text style={styles.sectionTitle}>
          Players ({currentRace.participants.length}/{currentRace.maxParticipants})
        </Text>
        <FlatList
          data={currentRace.participants}
          keyExtractor={(item) => item.userId}
          renderItem={renderParticipant}
          contentContainerStyle={styles.participantList}
        />

        {/* Actions */}
        <View style={styles.actions}>
          {currentRace.inviteCode && (
            <Button
              title="Invite Friends"
              variant="outline"
              onPress={handleShare}
              icon={<Ionicons name="share-outline" size={20} color={Colors.primary} />}
              style={styles.actionButton}
            />
          )}

          {isHost ? (
            <>
              <Button
                title={canStart ? 'Start Race' : 'Waiting for players...'}
                onPress={startRace}
                disabled={!canStart || isLoading}
                style={styles.actionButton}
              />
              <Button
                title="Cancel Race"
                variant="ghost"
                onPress={async () => { await cancelRace(); router.back(); }}
              />
            </>
          ) : (
            <>
              <Button
                title={currentParticipant?.isReady ? 'Not Ready' : 'Ready!'}
                onPress={() => setReady(!currentParticipant?.isReady)}
                variant={currentParticipant?.isReady ? 'outline' : 'primary'}
                style={styles.actionButton}
              />
              <Button
                title="Leave Race"
                variant="ghost"
                onPress={handleLeave}
              />
            </>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
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
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  infoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  metaDot: {
    color: Colors.textTertiary,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  participantList: {
    gap: Spacing.sm,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  participantStatus: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  readyIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ready: {
    backgroundColor: Colors.success + '20',
  },
  notReady: {
    backgroundColor: Colors.backgroundTertiary,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: 'auto',
    paddingTop: Spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
