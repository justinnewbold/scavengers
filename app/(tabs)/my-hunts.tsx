import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HuntCard, Button } from '@/components';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SwipeableRow } from '@/components/SwipeableRow';
import type { SwipeAction } from '@/components/SwipeableRow';
import { useHuntStore, useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useRequireAuth } from '@/hooks';
import type { Hunt } from '@/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud';

const LEFT_ACTIONS: SwipeAction[] = [
  { id: 'share', icon: 'share-outline', color: Colors.primary, label: 'Share' },
  { id: 'edit', icon: 'create-outline', color: Colors.secondary, label: 'Edit' },
];

const RIGHT_ACTIONS_DEFAULT: SwipeAction[] = [
  { id: 'delete', icon: 'trash-outline', color: Colors.error, label: 'Delete' },
];

const RIGHT_ACTIONS_ACTIVE: SwipeAction[] = [
  { id: 'archive', icon: 'archive-outline', color: Colors.warning, label: 'Archive' },
  { id: 'delete', icon: 'trash-outline', color: Colors.error, label: 'Delete' },
];

export default function MyHuntsScreen() {
  const router = useRouter();
  useRequireAuth();
  const { user } = useAuthStore();
  const { hunts: myHunts, isLoading, fetchHunts: fetchMyHunts, deleteHunt, updateHunt } = useHuntStore();

  useEffect(() => {
    if (user) {
      fetchMyHunts();
    }
  }, [user]);

  const handleShare = useCallback(async (hunt: Hunt) => {
    try {
      await Share.share({
        title: hunt.title,
        message: `Check out this scavenger hunt: ${hunt.title}\n${API_BASE}/hunt/${hunt.id}`,
        url: `${API_BASE}/hunt/${hunt.id}`,
      });
    } catch (error) {
      // User cancelled or share failed silently
    }
  }, []);

  const handleEdit = useCallback((hunt: Hunt) => {
    router.push(`/hunt/${hunt.id}`);
  }, [router]);

  const handleDelete = useCallback((hunt: Hunt) => {
    Alert.alert(
      'Delete Hunt',
      `Are you sure you want to delete "${hunt.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHunt(hunt.id),
        },
      ],
    );
  }, [deleteHunt]);

  const handleArchive = useCallback((hunt: Hunt) => {
    Alert.alert(
      'Archive Hunt',
      `Archive "${hunt.title}"? Participants will no longer be able to join.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: () => updateHunt(hunt.id, { status: 'archived' }),
        },
      ],
    );
  }, [updateHunt]);

  const handleActionPress = useCallback((actionId: string, hunt: Hunt) => {
    switch (actionId) {
      case 'share':
        handleShare(hunt);
        break;
      case 'edit':
        handleEdit(hunt);
        break;
      case 'delete':
        handleDelete(hunt);
        break;
      case 'archive':
        handleArchive(hunt);
        break;
    }
  }, [handleShare, handleEdit, handleDelete, handleArchive]);

  const renderHuntCard = useCallback((hunt: Hunt, index: number) => {
    const rightActions = hunt.status === 'active'
      ? RIGHT_ACTIONS_ACTIVE
      : RIGHT_ACTIONS_DEFAULT;

    return (
      <AnimatedListItem key={hunt.id} index={index}>
        <SwipeableRow
          leftActions={LEFT_ACTIONS}
          rightActions={rightActions}
          onActionPress={(actionId) => handleActionPress(actionId, hunt)}
        >
          <HuntCard
            hunt={hunt}
            onPress={() => router.push(`/hunt/${hunt.id}`)}
          />
        </SwipeableRow>
      </AnimatedListItem>
    );
  }, [handleActionPress, router]);

  const activeHunts = useMemo(
    () => myHunts.filter(h => h.status === 'active'),
    [myHunts],
  );
  const draftHunts = useMemo(
    () => myHunts.filter(h => h.status === 'draft'),
    [myHunts],
  );
  const completedHunts = useMemo(
    () => myHunts.filter(h => h.status === 'completed'),
    [myHunts],
  );

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="lock-closed-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>Sign in to view your hunts</Text>
        <Text style={styles.authText}>
          Create and manage your scavenger hunts by signing in
        </Text>
        <Button
          title="Sign In"
          onPress={() => router.push('/auth/login')}
          style={styles.authButton}
        />
        <Button
          title="Create Account"
          onPress={() => router.push('/auth/register')}
          variant="outline"
          style={styles.authButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchMyHunts}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Hunts</Text>
        <Button
          title="+ New"
          onPress={() => router.push('/hunt/create')}
          size="sm"
        />
      </View>

      {myHunts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No hunts yet</Text>
          <Text style={styles.emptyText}>
            Create your first scavenger hunt and share it with friends!
          </Text>
          <Button
            title="Create Hunt"
            onPress={() => router.push('/hunt/create')}
            style={styles.emptyButton}
          />
          <Button
            title="AI Quick Create ✨"
            onPress={() => router.push('/hunt/ai-create')}
            variant="outline"
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <>
          {/* Active Hunts */}
          {activeHunts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🟢 Active</Text>
              <Animated.View>
                {activeHunts.map((hunt, i) => renderHuntCard(hunt, i))}
              </Animated.View>
            </View>
          )}

          {/* Draft Hunts */}
          {draftHunts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Drafts</Text>
              <Animated.View>
                {draftHunts.map((hunt, i) => renderHuntCard(hunt, i))}
              </Animated.View>
            </View>
          )}

          {/* Completed Hunts */}
          {completedHunts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Completed</Text>
              <Animated.View>
                {completedHunts.map((hunt, i) => renderHuntCard(hunt, i))}
              </Animated.View>
            </View>
          )}
        </>
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  emptyButton: {
    minWidth: 200,
    marginBottom: Spacing.md,
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  authTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  authText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  authButton: {
    minWidth: 200,
    marginBottom: Spacing.md,
  },
});
