import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useToastStore } from '@/store/toastStore';
import type { Hunt } from '@/types';

export default function CreateRaceScreen() {
  const router = useRouter();
  const { createRace, isLoading } = useLiveMultiplayerStore();
  const { hunts, fetchHunts } = useHuntStore();

  const [selectedHunt, setSelectedHunt] = useState<Hunt | null>(null);
  const [maxParticipants, setMaxParticipants] = useState('4');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [allowLateJoin, setAllowLateJoin] = useState(false);

  useEffect(() => {
    fetchHunts();
  }, [fetchHunts]);

  const activeHunts = hunts.filter(h => h.status === 'active' && h.challenges && h.challenges.length > 0);

  const handleCreate = async () => {
    if (!selectedHunt) {
      useToastStore.getState().show('Select a hunt first', 'warning');
      return;
    }

    try {
      const raceId = await createRace(selectedHunt.id, {
        maxParticipants: parseInt(maxParticipants) || 4,
        isPrivate,
        allowSpectators,
        allowLateJoin,
        huntTitle: selectedHunt.title,
      } as any);

      if (raceId) {
        router.replace(`/live/race/${raceId}`);
      }
    } catch (error) {
      console.error('Create race error:', error);
      useToastStore.getState().show('Failed to create race', 'error');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Race' }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hunt Selection */}
        <Text style={styles.sectionTitle}>Select Hunt</Text>
        {activeHunts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="map-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No active hunts. Create a hunt first!</Text>
          </Card>
        ) : (
          <View style={styles.huntList}>
            {activeHunts.map((hunt) => (
              <Card
                key={hunt.id}
                style={[styles.huntCard, selectedHunt?.id === hunt.id && styles.huntCardSelected]}
                onPress={() => setSelectedHunt(hunt)}
              >
                <Text style={styles.huntName}>{hunt.title}</Text>
                <Text style={styles.huntMeta}>
                  {hunt.challenges?.length || 0} challenges · {hunt.difficulty}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Settings */}
        <Text style={styles.sectionTitle}>Race Settings</Text>
        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Max Players</Text>
            <TextInput
              style={styles.numberInput}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Text style={styles.settingLabel}>Private Race</Text>
              <Text style={styles.settingHint}>Invite only</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ true: Colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelRow}>
              <Text style={styles.settingLabel}>Allow Spectators</Text>
              <Text style={styles.settingHint}>Others can watch live</Text>
            </View>
            <Switch
              value={allowSpectators}
              onValueChange={setAllowSpectators}
              trackColor={{ true: Colors.primary }}
            />
          </View>

          <View style={[styles.settingRow, styles.lastSettingRow]}>
            <View style={styles.settingLabelRow}>
              <Text style={styles.settingLabel}>Allow Late Join</Text>
              <Text style={styles.settingHint}>Players can join mid-race</Text>
            </View>
            <Switch
              value={allowLateJoin}
              onValueChange={setAllowLateJoin}
              trackColor={{ true: Colors.primary }}
            />
          </View>
        </Card>

        <Button
          title={isLoading ? 'Creating...' : 'Create Race'}
          onPress={handleCreate}
          disabled={!selectedHunt || isLoading}
          style={styles.createButton}
        />
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
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  huntList: {
    gap: Spacing.sm,
  },
  huntCard: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  huntCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  huntName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  huntMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastSettingRow: {
    borderBottomWidth: 0,
  },
  settingLabelRow: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  settingHint: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  numberInput: {
    width: 56,
    height: 40,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  createButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
});
