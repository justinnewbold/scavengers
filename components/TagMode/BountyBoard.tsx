import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Bounty, TagPlayer } from '@/types/tagMode';

interface BountyBoardProps {
  bounties: Bounty[];
  players: TagPlayer[];
  currentPlayerId: string;
  currentScore: number;
  onPlaceBounty: (targetId: string, reward: number, reason?: string) => void;
  onClaimBounty: (bountyId: string) => void;
}

export function BountyBoard({
  bounties,
  players,
  currentPlayerId,
  currentScore,
  onPlaceBounty,
  onClaimBounty,
}: BountyBoardProps) {
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [bountyAmount, setBountyAmount] = useState('50');
  const [bountyReason, setBountyReason] = useState('');

  const getExpiresAtMs = (expiresAt: number | string): number => {
    return typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  };

  const activeBounties = useMemo(
    () => bounties.filter(b => !b.claimed && getExpiresAtMs(b.expiresAt) > Date.now()),
    [bounties]
  );
  const myBounties = useMemo(
    () => activeBounties.filter(b => b.targetId === currentPlayerId),
    [activeBounties, currentPlayerId]
  );
  const otherBounties = useMemo(
    () => activeBounties.filter(b => b.targetId !== currentPlayerId),
    [activeBounties, currentPlayerId]
  );

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.displayName || 'Unknown';
  };

  const formatTimeRemaining = (expiresAt: number | string) => {
    const remaining = getExpiresAtMs(expiresAt) - Date.now();
    if (remaining <= 0) return 'Expired';

    const minutes = Math.floor(remaining / 60000);
    if (minutes < 60) return `${minutes}m left`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m left`;
  };

  const handlePlaceBounty = () => {
    if (!selectedTarget) {
      Alert.alert('Error', 'Select a target');
      return;
    }

    const amount = parseInt(bountyAmount);
    if (isNaN(amount) || amount < 10) {
      Alert.alert('Error', 'Bounty must be at least 10 points');
      return;
    }

    if (amount > currentScore) {
      Alert.alert('Error', 'Not enough points');
      return;
    }

    onPlaceBounty(selectedTarget, amount, bountyReason || undefined);
    setShowPlaceModal(false);
    setSelectedTarget(null);
    setBountyAmount('50');
    setBountyReason('');
  };

  const eligibleTargets = useMemo(
    () => players.filter(
      p => p.id !== currentPlayerId && !activeBounties.some(b => b.targetId === p.id)
    ),
    [players, currentPlayerId, activeBounties]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cash" size={24} color={Colors.warning} />
          <Text style={styles.title}>Bounty Board</Text>
        </View>
        <Button
          title="Place Bounty"
          size="sm"
          onPress={() => setShowPlaceModal(true)}
          disabled={eligibleTargets.length === 0}
        />
      </View>

      {/* Bounties on you */}
      {myBounties.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="warning" size={16} color={Colors.error} /> Bounties on YOU
          </Text>
          {myBounties.map((bounty) => (
            <Card key={bounty.id} style={styles.bountyCardDanger}>
              <View style={styles.bountyHeader}>
                <View style={styles.bountyReward}>
                  <Ionicons name="diamond" size={20} color={Colors.warning} />
                  <Text style={styles.bountyAmount}>{bounty.reward}</Text>
                </View>
                <Text style={styles.bountyTime}>
                  {formatTimeRemaining(bounty.expiresAt)}
                </Text>
              </View>
              <Text style={styles.bountyText}>
                Placed by {getPlayerName(bounty.placedBy)}
              </Text>
              {bounty.reason && (
                <Text style={styles.bountyReason}>"{bounty.reason}"</Text>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* Available bounties */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Bounties</Text>
        {otherBounties.length === 0 ? (
          <Text style={styles.emptyText}>No active bounties</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {otherBounties.map((bounty) => (
              <Card key={bounty.id} style={styles.bountyCard}>
                <View style={styles.bountyHeader}>
                  <View style={styles.bountyReward}>
                    <Ionicons name="diamond" size={20} color={Colors.warning} />
                    <Text style={styles.bountyAmount}>{bounty.reward}</Text>
                  </View>
                  <Text style={styles.bountyTime}>
                    {formatTimeRemaining(bounty.expiresAt)}
                  </Text>
                </View>

                <View style={styles.targetInfo}>
                  <Ionicons name="person-circle" size={32} color={Colors.error} />
                  <Text style={styles.targetName}>
                    {getPlayerName(bounty.targetId)}
                  </Text>
                </View>

                {bounty.reason && (
                  <Text style={styles.bountyReason}>"{bounty.reason}"</Text>
                )}

                <Button
                  title="Claim"
                  size="sm"
                  variant="outline"
                  onPress={() => onClaimBounty(bounty.id)}
                  style={styles.claimButton}
                />
              </Card>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Place bounty modal */}
      {showPlaceModal && (
        <View style={styles.modal}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Place Bounty</Text>

            <Text style={styles.label}>Target</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.targetList}>
              {eligibleTargets.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.targetOption,
                    selectedTarget === player.id && styles.targetOptionSelected,
                  ]}
                  onPress={() => setSelectedTarget(player.id)}
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color={selectedTarget === player.id ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.targetOptionText,
                      selectedTarget === player.id && styles.targetOptionTextSelected,
                    ]}
                  >
                    {player.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Reward (Your points: {currentScore})</Text>
            <View style={styles.amountRow}>
              {[25, 50, 100, 200].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.amountOption,
                    bountyAmount === String(amount) && styles.amountOptionSelected,
                    amount > currentScore && styles.amountOptionDisabled,
                  ]}
                  onPress={() => amount <= currentScore && setBountyAmount(String(amount))}
                  disabled={amount > currentScore}
                >
                  <Text
                    style={[
                      styles.amountText,
                      bountyAmount === String(amount) && styles.amountTextSelected,
                    ]}
                  >
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Leading by 500 points"
              placeholderTextColor={Colors.textTertiary}
              value={bountyReason}
              onChangeText={setBountyReason}
              maxLength={100}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowPlaceModal(false)}
                style={styles.modalButton}
              />
              <Button
                title={`Place (${bountyAmount} pts)`}
                onPress={handlePlaceBounty}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  bountyCard: {
    width: 200,
    marginRight: Spacing.sm,
    padding: Spacing.md,
  },
  bountyCardDanger: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  bountyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bountyReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bountyAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.warning,
  },
  bountyTime: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  targetInfo: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  targetName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  bountyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  bountyReason: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  claimButton: {
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  targetList: {
    flexDirection: 'row',
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  targetOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  targetOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  targetOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  amountOption: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  amountOptionDisabled: {
    opacity: 0.5,
  },
  amountText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  amountTextSelected: {
    color: Colors.primary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  modalButton: {
    flex: 1,
  },
});

export default BountyBoard;
