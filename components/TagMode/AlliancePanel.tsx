import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Alliance, TagPlayer } from '@/types/tagMode';

interface AlliancePanelProps {
  alliance: Alliance | null;
  players: TagPlayer[];
  currentPlayerId: string;
  onFormAlliance: (partnerId: string, name: string) => void;
  onLeaveAlliance: () => void;
  onBetrayAlliance: () => void;
}

export function AlliancePanel({
  alliance,
  players,
  currentPlayerId,
  onFormAlliance,
  onLeaveAlliance,
  onBetrayAlliance,
}: AlliancePanelProps) {
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [allianceName, setAllianceName] = useState('');

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.displayName || 'Unknown';
  };

  const eligiblePartners = players.filter(
    p => p.id !== currentPlayerId && !p.allianceId
  );

  const handleFormAlliance = () => {
    if (!selectedPartner) {
      Alert.alert('Error', 'Select a partner');
      return;
    }

    if (!allianceName.trim()) {
      Alert.alert('Error', 'Enter an alliance name');
      return;
    }

    onFormAlliance(selectedPartner, allianceName.trim());
    setShowFormModal(false);
    setSelectedPartner(null);
    setAllianceName('');
  };

  const confirmBetray = () => {
    Alert.alert(
      'Betray Alliance?',
      'You will steal 25% of your ally\'s points but gain a "Traitor" mark visible to all players. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Betray',
          style: 'destructive',
          onPress: onBetrayAlliance,
        },
      ]
    );
  };

  if (alliance) {
    const partner = alliance.members.find(id => id !== currentPlayerId);
    const isLeader = alliance.leaderId === currentPlayerId;

    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={24} color={Colors.secondary} />
            <View>
              <Text style={styles.allianceName}>{alliance.name}</Text>
              <Text style={styles.allianceLabel}>Alliance Active</Text>
            </View>
          </View>
          {isLeader && (
            <View style={styles.leaderBadge}>
              <Ionicons name="star" size={12} color={Colors.warning} />
              <Text style={styles.leaderText}>Leader</Text>
            </View>
          )}
        </View>

        <View style={styles.memberSection}>
          <Text style={styles.sectionLabel}>Your Ally</Text>
          <View style={styles.memberCard}>
            <Ionicons name="person-circle" size={40} color={Colors.secondary} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{getPlayerName(partner || '')}</Text>
              {alliance.sharedProgress && (
                <Text style={styles.sharedProgress}>
                  <Ionicons name="sync" size={12} color={Colors.success} /> Sharing progress
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>Alliance Benefits</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.benefitText}>See ally's exact location</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.benefitText}>Share challenge progress</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.benefitText}>Can't tag each other</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Leave Alliance"
            variant="outline"
            onPress={onLeaveAlliance}
            style={styles.actionButton}
          />
          <TouchableOpacity
            style={styles.betrayButton}
            onPress={confirmBetray}
          >
            <Ionicons name="skull" size={16} color={Colors.error} />
            <Text style={styles.betrayText}>Betray</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-outline" size={24} color={Colors.textSecondary} />
          <Text style={styles.title}>No Alliance</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Form an alliance with another player to share locations, progress, and protect each other from being tagged.
      </Text>

      <Button
        title="Form Alliance"
        onPress={() => setShowFormModal(true)}
        disabled={eligiblePartners.length === 0}
        icon={<Ionicons name="people" size={18} color="#fff" />}
      />

      {eligiblePartners.length === 0 && (
        <Text style={styles.noPartnersText}>
          No available players to form alliance with
        </Text>
      )}

      {/* Form alliance modal */}
      {showFormModal && (
        <View style={styles.modal}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Form Alliance</Text>

            <Text style={styles.label}>Choose Partner</Text>
            <View style={styles.partnerList}>
              {eligiblePartners.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.partnerOption,
                    selectedPartner === player.id && styles.partnerOptionSelected,
                  ]}
                  onPress={() => setSelectedPartner(player.id)}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={selectedPartner === player.id ? Colors.secondary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.partnerName,
                      selectedPartner === player.id && styles.partnerNameSelected,
                    ]}
                  >
                    {player.displayName}
                  </Text>
                  <Text style={styles.partnerScore}>{player.score} pts</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Alliance Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Dynamic Duo"
              placeholderTextColor={Colors.textTertiary}
              value={allianceName}
              onChangeText={setAllianceName}
              maxLength={30}
            />

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>
                Alliances can be betrayed! Your ally could steal 25% of your points at any time.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowFormModal(false)}
                style={styles.modalButton}
              />
              <Button
                title="Form Alliance"
                onPress={handleFormAlliance}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    margin: Spacing.md,
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
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  allianceName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.secondary,
  },
  allianceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  leaderText: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: '600',
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  memberSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  sharedProgress: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    marginTop: 2,
  },
  benefits: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  benefitsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  benefitText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  betrayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  betrayText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: FontSizes.sm,
  },
  noPartnersText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  modal: {
    position: 'absolute',
    top: -100,
    left: -Spacing.md,
    right: -Spacing.md,
    bottom: -100,
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
  partnerList: {
    gap: Spacing.sm,
  },
  partnerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partnerOptionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '10',
  },
  partnerName: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  partnerNameSelected: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  partnerScore: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warning + '15',
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.warning,
    lineHeight: 18,
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

export default AlliancePanel;
