import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, SegmentedControl, LiveRaceCard } from '@/components';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import type { LiveRace, Tournament } from '@/types/liveMultiplayer';

type Tab = 'races' | 'tournaments';

export default function LiveHubScreen() {
  const router = useRouter();
  const {
    publicRaces,
    activeTournaments,
    isLoading,
    fetchPublicRaces,
    fetchTournaments,
    pendingInvites,
    fetchInvites,
  } = useLiveMultiplayerStore();

  const [tab, setTab] = useState<Tab>('races');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchPublicRaces?.(),
      fetchTournaments(),
      fetchInvites?.(),
    ]);
  }, [fetchPublicRaces, fetchTournaments, fetchInvites]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const renderRaceItem = ({ item }: { item: LiveRace }) => (
    <LiveRaceCard
      race={item}
      onPress={() => router.push(`/live/race/${item.id}`)}
      onSpectate={() => router.push(`/live/spectate/${item.id}`)}
    />
  );

  const renderTournamentItem = ({ item }: { item: Tournament }) => (
    <TouchableOpacity
      style={styles.tournamentCard}
      onPress={() => router.push(`/live/tournament/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.tournamentHeader}>
        <View style={[styles.statusBadge, item.status === 'registration' ? styles.statusOpen : styles.statusActive]}>
          <Text style={styles.statusText}>
            {item.status === 'registration' ? 'Open' : 'In Progress'}
          </Text>
        </View>
        <Text style={styles.tournamentFormat}>{item.format.replace('_', ' ')}</Text>
      </View>

      <Text style={styles.tournamentName}>{item.name}</Text>
      <Text style={styles.tournamentHunt}>{item.huntTitle}</Text>

      <View style={styles.tournamentMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="people" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {item.registeredCount}/{item.maxParticipants}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="layers" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            Round {item.currentRound}/{item.totalRounds}
          </Text>
        </View>
        {item.prizes.length > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="gift" size={14} color={Colors.warning} />
            <Text style={[styles.metaText, { color: Colors.warning }]}>
              {item.prizes.length} prizes
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Live',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/live/create')}
              style={styles.createButton}
            >
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Invites Banner */}
        {pendingInvites.length > 0 && (
          <TouchableOpacity
            style={styles.inviteBanner}
            onPress={() => router.push('/live/invites')}
          >
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.inviteBannerText}>
              {pendingInvites.length} race invite{pendingInvites.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Tab Selector */}
        <View style={styles.segmentContainer}>
          <SegmentedControl
            values={['Races', 'Tournaments']}
            selectedIndex={tab === 'races' ? 0 : 1}
            onValueChange={(index) => setTab(index === 0 ? 'races' : 'tournaments')}
          />
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : tab === 'races' ? (
          <FlatList
            data={publicRaces}
            keyExtractor={(item) => item.id}
            renderItem={renderRaceItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="flash-outline" size={64} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>No live races</Text>
                <Text style={styles.emptySubtitle}>Create a race to compete with friends in real time!</Text>
                <Button
                  title="Create Race"
                  onPress={() => router.push('/live/create')}
                  style={styles.emptyButton}
                />
              </View>
            }
          />
        ) : (
          <FlatList
            data={activeTournaments}
            keyExtractor={(item) => item.id}
            renderItem={renderTournamentItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="trophy-outline" size={64} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>No tournaments</Text>
                <Text style={styles.emptySubtitle}>Check back later for upcoming tournaments.</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  createButton: {
    padding: Spacing.xs,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inviteBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  segmentContainer: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    marginTop: Spacing.md,
  },
  tournamentCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
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
  tournamentFormat: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },
  tournamentName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tournamentHunt: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  tournamentMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
