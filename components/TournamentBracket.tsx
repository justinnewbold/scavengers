import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Tournament, TournamentBracket as BracketMatch, TournamentParticipant } from '@/types/liveMultiplayer';

interface TournamentBracketProps {
  tournament: Tournament;
  brackets: BracketMatch[];
  onMatchPress?: (match: BracketMatch) => void;
  currentUserId?: string;
}

interface MatchCardProps {
  match: BracketMatch;
  onPress?: () => void;
  isUserMatch?: boolean;
}

function MatchCard({ match, onPress, isUserMatch }: MatchCardProps) {
  const getStatusColor = () => {
    switch (match.status) {
      case 'in_progress': return Colors.warning;
      case 'completed': return Colors.success;
      case 'bye': return Colors.textTertiary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = () => {
    switch (match.status) {
      case 'in_progress': return 'LIVE';
      case 'completed': return 'Final';
      case 'bye': return 'BYE';
      default: return match.scheduledTime ? 'Scheduled' : 'TBD';
    }
  };

  const renderParticipant = (
    id: string | undefined,
    name: string | undefined,
    score: number | undefined,
    isWinner: boolean
  ) => (
    <View style={[styles.participant, isWinner && styles.participantWinner]}>
      <View style={styles.participantInfo}>
        {id ? (
          <>
            <View style={styles.seedBadge}>
              <Text style={styles.seedText}>-</Text>
            </View>
            <Text style={[styles.participantName, isWinner && styles.participantNameWinner]} numberOfLines={1}>
              {name || 'TBD'}
            </Text>
          </>
        ) : (
          <Text style={styles.participantTBD}>TBD</Text>
        )}
      </View>
      {match.status === 'completed' && score !== undefined && (
        <Text style={[styles.participantScore, isWinner && styles.participantScoreWinner]}>
          {score}
        </Text>
      )}
      {isWinner && (
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={styles.winnerIcon} />
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.matchCard, isUserMatch && styles.matchCardHighlight]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.matchHeader}>
        <Text style={[styles.matchStatus, { color: getStatusColor() }]}>
          {match.status === 'in_progress' && <View style={styles.liveDot} />}
          {getStatusLabel()}
        </Text>
        <Text style={styles.matchNumber}>Match {match.matchNumber}</Text>
      </View>

      <View style={styles.matchContent}>
        {renderParticipant(
          match.participant1Id,
          match.participant1Name,
          match.participant1Score,
          match.winnerId === match.participant1Id
        )}
        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        {renderParticipant(
          match.participant2Id,
          match.participant2Name,
          match.participant2Score,
          match.winnerId === match.participant2Id
        )}
      </View>

      {match.status === 'in_progress' && match.raceId && (
        <View style={styles.watchButton}>
          <Ionicons name="eye" size={14} color="#fff" />
          <Text style={styles.watchText}>Watch Live</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function RoundColumn({
  round,
  matches,
  roundName,
  onMatchPress,
  currentUserId,
}: {
  round: number;
  matches: BracketMatch[];
  roundName: string;
  onMatchPress?: (match: BracketMatch) => void;
  currentUserId?: string;
}) {
  const roundMatches = matches.filter(m => m.round === round);

  return (
    <View style={styles.roundColumn}>
      <View style={styles.roundHeader}>
        <Text style={styles.roundName}>{roundName}</Text>
        <Text style={styles.roundInfo}>{roundMatches.length} matches</Text>
      </View>
      <View style={styles.roundMatches}>
        {roundMatches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            onPress={onMatchPress ? () => onMatchPress(match) : undefined}
            isUserMatch={
              match.participant1Id === currentUserId ||
              match.participant2Id === currentUserId
            }
          />
        ))}
      </View>
    </View>
  );
}

export function TournamentBracketView({
  tournament,
  brackets,
  onMatchPress,
  currentUserId,
}: TournamentBracketProps) {
  const [selectedView, setSelectedView] = useState<'bracket' | 'list'>('bracket');

  const getRoundName = (round: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - round + 1;
    switch (roundsFromEnd) {
      case 1: return 'Finals';
      case 2: return 'Semi-Finals';
      case 3: return 'Quarter-Finals';
      default: return `Round ${round}`;
    }
  };

  const rounds = Array.from(new Set(brackets.map(b => b.round))).sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, selectedView === 'bracket' && styles.toggleButtonActive]}
          onPress={() => setSelectedView('bracket')}
        >
          <Ionicons
            name="git-network"
            size={18}
            color={selectedView === 'bracket' ? '#fff' : Colors.textSecondary}
          />
          <Text style={[styles.toggleText, selectedView === 'bracket' && styles.toggleTextActive]}>
            Bracket
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, selectedView === 'list' && styles.toggleButtonActive]}
          onPress={() => setSelectedView('list')}
        >
          <Ionicons
            name="list"
            size={18}
            color={selectedView === 'list' ? '#fff' : Colors.textSecondary}
          />
          <Text style={[styles.toggleText, selectedView === 'list' && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tournament info */}
      <View style={styles.tournamentInfo}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              {tournament.registeredCount}/{tournament.maxParticipants}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="trophy" size={16} color={Colors.warning} />
            <Text style={styles.infoText}>
              Round {tournament.currentRound}/{tournament.totalRounds}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name={tournament.format === 'single_elimination' ? 'flash' : 'git-branch'}
              size={16}
              color={Colors.textSecondary}
            />
            <Text style={styles.infoText}>
              {tournament.format.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      {selectedView === 'bracket' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.bracketContainer}>
            {rounds.map(round => (
              <RoundColumn
                key={round}
                round={round}
                matches={brackets}
                roundName={getRoundName(round, tournament.totalRounds)}
                onMatchPress={onMatchPress}
                currentUserId={currentUserId}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.listContainer}>
          {rounds.map(round => (
            <View key={round} style={styles.listRound}>
              <Text style={styles.listRoundTitle}>
                {getRoundName(round, tournament.totalRounds)}
              </Text>
              {brackets
                .filter(m => m.round === round)
                .map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPress={onMatchPress ? () => onMatchPress(match) : undefined}
                    isUserMatch={
                      match.participant1Id === currentUserId ||
                      match.participant2Id === currentUserId
                    }
                  />
                ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Prizes section */}
      {tournament.prizes.length > 0 && (
        <View style={styles.prizesSection}>
          <Text style={styles.prizesTitle}>Prizes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tournament.prizes.map((prize, index) => (
              <View key={index} style={styles.prizeCard}>
                <View style={[styles.prizePosition, index === 0 && styles.prizePositionFirst]}>
                  {index === 0 ? (
                    <Ionicons name="trophy" size={20} color="#FFD700" />
                  ) : (
                    <Text style={styles.prizePositionText}>{prize.position}</Text>
                  )}
                </View>
                <Text style={styles.prizeName}>{prize.name}</Text>
                <Text style={styles.prizeDescription}>{prize.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: '#fff',
  },
  tournamentInfo: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  bracketContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  roundColumn: {
    width: 200,
    marginRight: Spacing.md,
  },
  roundHeader: {
    marginBottom: Spacing.sm,
  },
  roundName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  roundInfo: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  roundMatches: {
    gap: Spacing.sm,
  },
  matchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchCardHighlight: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  matchStatus: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginRight: 4,
  },
  matchNumber: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  matchContent: {
    gap: 4,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  participantWinner: {
    backgroundColor: Colors.success + '20',
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  participantName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  participantNameWinner: {
    fontWeight: '600',
  },
  participantTBD: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  participantScore: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  participantScoreWinner: {
    color: Colors.text,
  },
  winnerIcon: {
    marginLeft: 4,
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  vsText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.error,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: Spacing.xs,
  },
  watchText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#fff',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  listRound: {
    marginBottom: Spacing.lg,
  },
  listRoundTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  prizesSection: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  prizesTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  prizeCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.sm,
    marginLeft: Spacing.md,
    alignItems: 'center',
  },
  prizePosition: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  prizePositionFirst: {
    backgroundColor: Colors.warning + '30',
  },
  prizePositionText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  prizeName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  prizeDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default TournamentBracketView;
