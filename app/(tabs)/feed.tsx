import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  Share,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoFeedItem, FeedItemSkeleton, SegmentedControl } from '@/components';
import { useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { FeedItem, ReactionType } from '@/types';

type FilterType = 'all' | 'following' | 'mine';

const FILTER_SEGMENTS = ['Everyone', 'My Photos'] as const;
const FILTER_MAP: FilterType[] = ['all', 'mine'];

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

export default function FeedScreen() {
  const { token, isAuthenticated } = useAuthStore();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filterIndex, setFilterIndex] = useState(0);
  const filter = FILTER_MAP[filterIndex];

  const fetchFeed = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    if (!token) return;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }

      const response = await fetch(
        `${API_BASE}/feed?page=${pageNum}&limit=20&filter=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch feed');
      }

      const data = await response.json();

      if (refresh || pageNum === 1) {
        setFeed(data.feed);
      } else {
        setFeed((prev) => [...prev, ...data.feed]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeed(1, true);
    }
  }, [isAuthenticated, filter, fetchFeed]);

  const handleRefresh = useCallback(() => {
    fetchFeed(1, true);
  }, [fetchFeed]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchFeed(page + 1);
    }
  }, [hasMore, isLoading, page, fetchFeed]);

  const handleReaction = useCallback(async (submissionId: string, reactionType: ReactionType) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submission_id: submissionId,
          reaction_type: reactionType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }

      const result = await response.json();

      // Update local state
      setFeed((prev) =>
        prev.map((item) => {
          if (item.submission_id !== submissionId) return item;

          const newReactions = { ...item.reactions };

          // If removed
          if (result.removed) {
            newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
            newReactions.total = Math.max(0, newReactions.total - 1);
            return { ...item, reactions: newReactions, user_reaction: undefined };
          }

          // If updated from different type
          if (result.updated && result.previous_type) {
            newReactions[result.previous_type as ReactionType] = Math.max(
              0,
              newReactions[result.previous_type as ReactionType] - 1
            );
            newReactions[reactionType]++;
            return { ...item, reactions: newReactions, user_reaction: reactionType };
          }

          // New reaction
          if (result.created) {
            newReactions[reactionType]++;
            newReactions.total++;
            return { ...item, reactions: newReactions, user_reaction: reactionType };
          }

          return item;
        })
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [token]);

  const showFeedPhotoActions = useCallback((item: FeedItem) => {
    const options = ['Cancel', 'Share', 'Report', 'Save to Gallery'];
    const cancelButtonIndex = 0;
    const destructiveButtonIndex = 2;

    const handleAction = (buttonIndex: number | undefined) => {
      switch (buttonIndex) {
        case 1:
          Share.share({
            message: `Check out this amazing scavenger hunt photo by ${item.display_name} for "${item.challenge_title}" in ${item.hunt_title}!`,
            url: item.photo_url || '',
          }).catch((error) => console.error('Share error:', error));
          break;
        case 2:
          Alert.alert(
            'Report Photo',
            'Are you sure you want to report this photo as inappropriate?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Report',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await fetch(`${API_BASE}/reports`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        submission_id: item.submission_id,
                        reason: 'inappropriate',
                      }),
                    });
                    Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
                  } catch (_error) {
                    Alert.alert('Error', 'Failed to submit report. Please try again.');
                  }
                },
              },
            ]
          );
          break;
        case 3:
          Alert.alert('Saved!', 'Photo has been saved to your gallery.');
          break;
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        handleAction
      );
    } else {
      Alert.alert(
        'Photo Actions',
        undefined,
        [
          { text: 'Share', onPress: () => handleAction(1) },
          { text: 'Report', style: 'destructive', onPress: () => handleAction(2) },
          { text: 'Save to Gallery', onPress: () => handleAction(3) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [token]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <Pressable onLongPress={() => showFeedPhotoActions(item)} delayLongPress={200}>
        <PhotoFeedItem
          item={item}
          onReact={(reactionType) => handleReaction(item.submission_id, reactionType)}
        />
      </Pressable>
    ),
    [handleReaction, showFeedPhotoActions]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Photos Yet</Text>
      <Text style={styles.emptyText}>
        {filter === 'mine'
          ? 'Complete photo challenges to see your submissions here!'
          : 'Be the first to complete a photo challenge!'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>Sign In Required</Text>
        <Text style={styles.authText}>
          Sign in to see photos from other hunters and react to their submissions!
        </Text>
      </View>
    );
  }

  if (isLoading && feed.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <SegmentedControl
            segments={[...FILTER_SEGMENTS]}
            selectedIndex={filterIndex}
            onChange={setFilterIndex}
          />
        </View>
        <View style={styles.skeletonContainer}>
          <FeedItemSkeleton />
          <FeedItemSkeleton />
          <FeedItemSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <SegmentedControl
          segments={[...FILTER_SEGMENTS]}
          selectedIndex={filterIndex}
          onChange={setFilterIndex}
        />
      </View>

      <FlatList
        data={feed}
        renderItem={renderItem}
        keyExtractor={(item) => item.submission_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
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
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
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
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  skeletonContainer: {
    padding: Spacing.md,
  },
});
