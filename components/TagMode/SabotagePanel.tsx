import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Sabotage, SabotageType } from '@/types/tagMode';

interface SabotagePanelProps {
  availableSabotages: SabotageType[];
  activeSabotages: Sabotage[];
  sabotageCooldown: number; // seconds remaining
  onDeploySabotage: (type: SabotageType) => void;
}

const SABOTAGE_INFO: Record<SabotageType, {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  duration: string;
}> = {
  decoy_challenge: {
    name: 'Decoy Challenge',
    description: 'Create a fake challenge that wastes time when attempted',
    icon: 'document-text',
    color: '#FF9800',
    duration: '10 min',
  },
  location_scramble: {
    name: 'Location Scramble',
    description: 'Randomize your radar blip position for nearby players',
    icon: 'shuffle',
    color: '#9C27B0',
    duration: '2 min',
  },
  point_drain: {
    name: 'Point Drain',
    description: 'Drop a trap that steals 50 points from whoever triggers it',
    icon: 'water',
    color: '#F44336',
    duration: '5 min',
  },
  challenge_intercept: {
    name: 'Challenge Intercept',
    description: 'Steal credit for the next challenge completed near you',
    icon: 'git-branch',
    color: '#2196F3',
    duration: '3 min',
  },
  speed_trap: {
    name: 'Speed Trap',
    description: 'Slow down nearby players\' challenge timers by 50%',
    icon: 'speedometer',
    color: '#607D8B',
    duration: '2 min',
  },
};

export function SabotagePanel({
  availableSabotages,
  activeSabotages,
  sabotageCooldown,
  onDeploySabotage,
}: SabotagePanelProps) {
  const [selectedType, setSelectedType] = useState<SabotageType | null>(null);

  const handleDeploy = () => {
    if (!selectedType) {
      Alert.alert('Error', 'Select a sabotage type');
      return;
    }

    if (sabotageCooldown > 0) {
      Alert.alert('Cooldown', `Wait ${sabotageCooldown}s before deploying`);
      return;
    }

    Alert.alert(
      'Deploy Sabotage?',
      `Deploy ${SABOTAGE_INFO[selectedType].name}?\n\n${SABOTAGE_INFO[selectedType].description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: () => {
            onDeploySabotage(selectedType);
            setSelectedType(null);
          },
        },
      ]
    );
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flash" size={24} color={Colors.warning} />
          <Text style={styles.title}>Sabotage</Text>
        </View>
        {sabotageCooldown > 0 && (
          <View style={styles.cooldownBadge}>
            <Ionicons name="time" size={14} color={Colors.textSecondary} />
            <Text style={styles.cooldownText}>{sabotageCooldown}s</Text>
          </View>
        )}
      </View>

      {/* Active sabotages */}
      {activeSabotages.length > 0 && (
        <View style={styles.activeSection}>
          <Text style={styles.sectionLabel}>Your Active Sabotages</Text>
          {activeSabotages.map((sabotage) => {
            const info = SABOTAGE_INFO[sabotage.type];
            return (
              <View key={sabotage.id} style={styles.activeSabotage}>
                <View style={[styles.activeIcon, { backgroundColor: info.color + '30' }]}>
                  <Ionicons name={info.icon} size={16} color={info.color} />
                </View>
                <View style={styles.activeInfo}>
                  <Text style={styles.activeName}>{info.name}</Text>
                  <Text style={styles.activeStatus}>
                    {sabotage.triggered ? (
                      <Text style={styles.triggeredText}>Triggered!</Text>
                    ) : (
                      `${formatTimeRemaining(sabotage.expiresAt)} remaining`
                    )}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Available sabotages */}
      <Text style={styles.sectionLabel}>Deploy Sabotage</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sabotageScroll}
        contentContainerStyle={styles.sabotageScrollContent}
      >
        {availableSabotages.map((type) => {
          const info = SABOTAGE_INFO[type];
          const isSelected = selectedType === type;

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.sabotageOption,
                isSelected && styles.sabotageOptionSelected,
                { borderColor: isSelected ? info.color : Colors.border },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <View style={[styles.sabotageIcon, { backgroundColor: info.color + '20' }]}>
                <Ionicons name={info.icon} size={24} color={info.color} />
              </View>
              <Text style={[styles.sabotageName, isSelected && { color: info.color }]}>
                {info.name}
              </Text>
              <Text style={styles.sabotageDuration}>{info.duration}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedType && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedDescription}>
            {SABOTAGE_INFO[selectedType].description}
          </Text>
        </View>
      )}

      <Button
        title={sabotageCooldown > 0 ? `Cooldown (${sabotageCooldown}s)` : 'Deploy Sabotage'}
        onPress={handleDeploy}
        disabled={!selectedType || sabotageCooldown > 0}
        icon={<Ionicons name="flash" size={18} color="#fff" />}
      />
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
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cooldownText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeSection: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  sectionLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeSabotage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  activeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInfo: {
    flex: 1,
  },
  activeName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  activeStatus: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  triggeredText: {
    color: Colors.success,
    fontWeight: '600',
  },
  sabotageScroll: {
    marginBottom: Spacing.md,
  },
  sabotageScrollContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sabotageOption: {
    width: 100,
    padding: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    alignItems: 'center',
  },
  sabotageOptionSelected: {
    backgroundColor: Colors.backgroundTertiary,
  },
  sabotageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  sabotageName: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  sabotageDuration: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  selectedInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  selectedDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default SabotagePanel;
