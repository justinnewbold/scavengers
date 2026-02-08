import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, TournamentBracket, SegmentedControl } from '@/components';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';

type Tab = 'bracket' | 'participants' | 'prizes';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    currentTournament,
    tournamentBrackets,
    fetchTournamentDetails,
    registerForTournament,
    withdrawFromTournament,
    isLoading,
  } = useLiveMultiplayerStore();

  const [tab, setTab] = useState<Tab>('bracket');

  useEffect(() => {
    if (id) {
      fetchTournamentDetails(id);
    }
  }, [id, fetchTournamentDetails]);

  if (isLoading || !currentTournament) {
    return (
      <>
        <Stack.Screen options={{ title: 'Tournament' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  const isRegistered = currentTournament.participants.some(p => p.userId === user?.id);
  const canRegister = currentTournament.status === 'registration' &&
    currentTournament.registeredCount < currentTournament.maxParticipants;

  return (
    <>
      <Stack.Screen options={{ title: currentTournament.name }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, currentTournament.status === 'registration' ? styles.statusOpen : styles.statusActive]}>
            <Text style={styles.statusText}>
              {currentTournament.status === 'registration' ? 'Registration Open' : 'In Progress'}
            </Text>
          </View>
          <Text style={styles.title}>{currentTournament.name}</Text>
          <Text style={styles.description}>{currentTournament.description}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentTournament.registeredCount}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentTournament.format.replace('_', ' ')}</Text>
            <Text style={styles.statLabel}>Format</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {currentTournament.currentRound}/{currentTournament.totalRounds}
            </Text>
            <Text style={styles.statLabel}>Round</Text>
          </View>
        </View>

        {/* Registration Action */}
        {currentTournament.status === 'registration' && (
          <View style={styles.registrationSection}>
            {isRegistered ? (
              <Button
                title="Withdraw"
                variant="outline"
                onPress={() => withdrawFromTournament(currentTournament.id)}
                disabled={isLoading}
              />
            ) : (
              <Button
                title={canRegister ? 'Register' : 'Registration Full'}
                onPress={() => registerForTournament(currentTournament.id)}
                disabled={!canRegister || isLoading}
              />
            )}
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.segmentContainer}>
          <SegmentedControl
            values={['Bracket', 'Participants', 'Prizes']}
            selectedIndex={['bracket', 'participants', 'prizes'].indexOf(tab)}
            onValueChange={(index) => setTab((['bracket', 'participants', 'prizes'] as Tab[])[index])}
          />
        </View>

        {/* Tab Content */}
        {tab === 'bracket' && (
          <TournamentBracket
            brackets={tournamentBrackets}
            currentUserId={user?.id}
          />
        )}

        {tab === 'participants' && (
          <View style={styles.participantsList}>
            {currentTournament.participants
              .sort((a, b) => (a.seed || 999) - (b.seed || 999))
              .map((p) => (
                <View
                  key={p.userId}
                  style={[styles.participantRow, p.isEliminated && styles.eliminated]}
                >
                  <Text style={styles.seedText}>#{p.seed || '-'}</Text>
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, p.isEliminated && styles.eliminatedText]}>
                      {p.displayName}
                      {p.userId === user?.id ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.participantStats}>
                      {p.wins}W - {p.losses}L · {p.totalScore} pts
                    </Text>
                  </View>
                  {p.isEliminated && (
                    <Text style={styles.eliminatedBadge}>R{p.eliminatedInRound}</Text>
                  )}
                </View>
              ))}
          </View>
        )}

        {tab === 'prizes' && (
          <View style={styles.prizesList}>
            {currentTournament.prizes.map((prize) => (
              <Card key={prize.position} style={styles.prizeCard}>
                <View style={styles.prizeHeader}>
                  <Ionicons
                    name={prize.position === 1 ? 'trophy' : prize.position === 2 ? 'medal' : 'ribbon'}
                    size={24}
                    color={prize.position === 1 ? '#FFD700' : prize.position === 2 ? '#C0C0C0' : '#CD7F32'}
                  />
                  <Text style={styles.prizePosition}>
                    {prize.position === 1 ? '1st' : prize.position === 2 ? '2nd' : `${prize.position}th`} Place
                  </Text>
                </View>
                <Text style={styles.prizeName}>{prize.name}</Text>
                <Text style={styles.prizeDescription}>{prize.description}</Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  statusOpen: {
    backgroundColor: Colors.success + '20',
  },
  statusActive: {
    backgroundColor: Colors.primary + '20',
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  registrationSection: {
    marginBottom: Spacing.lg,
  },
  segmentContainer: {
    marginBottom: Spacing.lg,
  },
  participantsList: {
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
  eliminated: {
    opacity: 0.5,
  },
  seedText: {
    width: 28,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  eliminatedText: {
    textDecorationLine: 'line-through',
  },
  participantStats: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  eliminatedBadge: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.error,
  },
  prizesList: {
    gap: Spacing.md,
  },
  prizeCard: {
    gap: Spacing.xs,
  },
  prizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  prizePosition: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  prizeName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  prizeDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
