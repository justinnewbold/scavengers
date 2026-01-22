import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import {
  ProximityRadar,
  BountyBoard,
  AlliancePanel,
  SabotagePanel,
  SafeZoneIndicator,
  StealthToggle,
} from '@/components/TagMode';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useTagModeStore } from '@/store/tagModeStore';
import type { SabotageType, SafeZone, TagPlayer } from '@/types/tagMode';

export default function TagModeScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'sabotage' | 'bounty' | 'alliance'>('radar');

  const {
    gameState,
    currentPlayer,
    proximityAlerts,
    isLoading,
    error,
    joinTagGame,
    startLocationTracking,
    stopLocationTracking,
    attemptTag,
    activateStealth,
    deploySabotage,
    placeBounty,
    claimBounty,
    formAlliance,
    leaveAlliance,
    betrayAlliance,
    checkSafeZone,
    getNearestSafeZone,
    getActiveBounties,
    getNearbySabotages,
    refreshGameState,
  } = useTagModeStore();

  useEffect(() => {
    if (gameId) {
      joinTagGame(gameId);
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [gameId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshGameState();
    setRefreshing(false);
  }, []);

  const handleTagPlayer = (targetId: string) => {
    const target = gameState?.players.find((p: TagPlayer) => p.id === targetId);
    if (!target) return;

    Alert.alert(
      'Tag Player?',
      `Attempt to tag ${target.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Tag!',
          onPress: () => attemptTag(targetId),
        },
      ]
    );
  };

  const handleDeploySabotage = (type: SabotageType) => {
    if (!currentPlayer?.exactLocation) {
      Alert.alert('Error', 'Location required to deploy sabotage');
      return;
    }
    deploySabotage(
      type,
      currentPlayer.exactLocation.latitude,
      currentPlayer.exactLocation.longitude
    );
  };

  const handlePlaceBounty = (targetId: string, amount: number) => {
    placeBounty(targetId, amount);
  };

  const handleClaimBounty = (bountyId: string) => {
    claimBounty(bountyId);
  };

  const handleFormAlliance = (partnerId: string, name: string) => {
    formAlliance(partnerId, name);
  };

  const getStealthRemaining = (): number | null => {
    if (!currentPlayer?.stealthUntil) return null;
    const remaining = new Date(currentPlayer.stealthUntil).getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  };

  const getImmunityRemaining = (): number | null => {
    if (!currentPlayer?.immuneUntil) return null;
    const remaining = new Date(currentPlayer.immuneUntil).getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  };

  // Check safe zone status
  const isInSafeZone = currentPlayer?.exactLocation
    ? checkSafeZone(currentPlayer.exactLocation.latitude, currentPlayer.exactLocation.longitude)
    : false;

  const nearestSafeZoneInfo = currentPlayer?.exactLocation
    ? getNearestSafeZone(currentPlayer.exactLocation.latitude, currentPlayer.exactLocation.longitude)
    : null;

  const isStealthActive = getStealthRemaining() !== null;
  const immunityRemaining = getImmunityRemaining();

  // Get current alliance
  const currentAlliance = gameState?.alliances.find(
    a => a.members.includes(currentPlayer?.id || '')
  );

  // Get players with proper typing
  const players = gameState?.players || [];
  const activeBounties = getActiveBounties();
  const activeSabotages = getNearbySabotages();

  if (isLoading || !gameState || !currentPlayer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {error || 'Loading Tag Mode...'}
          </Text>
          {error && (
            <Button
              title="Go Back"
              onPress={() => router.back()}
              style={{ marginTop: Spacing.md }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const isHunter = currentPlayer.role === 'hunter';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isHunter ? Colors.error : Colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Button
              title=""
              variant="ghost"
              size="sm"
              icon={<Ionicons name="arrow-back" size={24} color="#fff" />}
              onPress={() => router.back()}
            />
            <View>
              <Text style={styles.gameMode}>
                {gameState.settings.mode === 'hunter_hunted' ? 'Hunter vs Hunted' : 'Tag Mode'}
              </Text>
              <Text style={styles.roleBadge}>
                {isHunter ? '🎯 HUNTER' : '🏃 HUNTED'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{currentPlayer.score}</Text>
            </View>
          </View>
        </View>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          <StealthToggle
            isStealthActive={isStealthActive}
            stealthRemaining={getStealthRemaining()}
            stealthCooldown={0}
            stealthDuration={120}
            onToggleStealth={activateStealth}
          />

          {immunityRemaining && (
            <View style={styles.immunityBadge}>
              <Ionicons name="shield" size={16} color={Colors.secondary} />
              <Text style={styles.immunityText}>{immunityRemaining}s immune</Text>
            </View>
          )}

          {currentPlayer.isTraitor && (
            <View style={styles.traitorBadge}>
              <Ionicons name="skull" size={16} color={Colors.error} />
              <Text style={styles.traitorText}>Traitor</Text>
            </View>
          )}
        </View>
      </View>

      {/* Safe Zone Status */}
      <SafeZoneIndicator
        nearestSafeZone={nearestSafeZoneInfo?.zone as SafeZone | null}
        distanceMeters={nearestSafeZoneInfo?.distance ?? null}
        isInSafeZone={isInSafeZone}
        immuneUntil={currentPlayer.immuneUntil ?? null}
      />

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        {[
          { key: 'radar', icon: 'radio-outline', label: 'Radar' },
          { key: 'sabotage', icon: 'flash-outline', label: 'Sabotage' },
          { key: 'bounty', icon: 'cash-outline', label: 'Bounties' },
          { key: 'alliance', icon: 'people-outline', label: 'Alliance' },
        ].map((tab) => (
          <View
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Button
              title={tab.label}
              variant="ghost"
              size="sm"
              icon={
                <Ionicons
                  name={tab.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={activeTab === tab.key ? Colors.primary : Colors.textSecondary}
                />
              }
              onPress={() => setActiveTab(tab.key as typeof activeTab)}
              textStyle={activeTab === tab.key ? styles.tabTextActive : styles.tabText}
            />
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {activeTab === 'radar' && (
          <>
            <ProximityRadar
              players={players}
              currentPlayerId={currentPlayer.id}
              alerts={proximityAlerts}
              isHunter={isHunter}
              onTagPlayer={handleTagPlayer}
            />

            {/* Quick stats */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Ionicons name="flash" size={24} color={Colors.warning} />
                <Text style={styles.statValue}>{currentPlayer.tagsCompleted}</Text>
                <Text style={styles.statLabel}>Tags Made</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="close-circle" size={24} color={Colors.error} />
                <Text style={styles.statValue}>{currentPlayer.timesTagged}</Text>
                <Text style={styles.statLabel}>Times Tagged</Text>
              </Card>
              <Card style={styles.statCard}>
                <Ionicons name="trophy" size={24} color={Colors.success} />
                <Text style={styles.statValue}>{currentPlayer.challengesCompleted}</Text>
                <Text style={styles.statLabel}>Challenges</Text>
              </Card>
            </View>
          </>
        )}

        {activeTab === 'sabotage' && (
          <SabotagePanel
            availableSabotages={[
              'decoy_challenge',
              'location_scramble',
              'point_drain',
              'challenge_intercept',
              'speed_trap',
            ]}
            activeSabotages={activeSabotages}
            sabotageCooldown={0}
            onDeploySabotage={handleDeploySabotage}
          />
        )}

        {activeTab === 'bounty' && (
          <BountyBoard
            bounties={activeBounties}
            players={players}
            currentPlayerId={currentPlayer.id}
            currentScore={currentPlayer.score}
            onPlaceBounty={handlePlaceBounty}
            onClaimBounty={handleClaimBounty}
          />
        )}

        {activeTab === 'alliance' && (
          <AlliancePanel
            alliance={currentAlliance ?? null}
            players={players}
            currentPlayerId={currentPlayer.id}
            onFormAlliance={handleFormAlliance}
            onLeaveAlliance={leaveAlliance}
            onBetrayAlliance={betrayAlliance}
          />
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Hunter action button */}
      {isHunter && proximityAlerts.some(a => a.distance < 50) && (
        <View style={styles.tagButtonContainer}>
          <Button
            title="TAG NEARBY PLAYER!"
            onPress={() => {
              const nearest = proximityAlerts
                .filter(a => a.distance < 50)
                .sort((a, b) => a.distance - b.distance)[0];
              if (nearest) {
                handleTagPlayer(nearest.playerId);
              }
            }}
            icon={<Ionicons name="hand-left" size={24} color="#fff" />}
            style={styles.tagButton}
            haptic="heavy"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  gameMode: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  roleBadge: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.9,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  scoreLabel: {
    fontSize: FontSizes.xs,
    color: '#fff',
    opacity: 0.8,
  },
  scoreValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  immunityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  immunityText: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
  traitorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  traitorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 100,
  },
  tagButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
  },
  tagButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.lg,
  },
});
