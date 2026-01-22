import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useSocialStore } from '@/store/socialStore';
import type { ActivityFeedItem, ActivityType } from '@/types/social';
import { ACTIVITY_CONFIG } from '@/types/social';

interface ActivityFeedProps {
  activities?: ActivityFeedItem[];
  showHeader?: boolean;
  maxItems?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function ActivityItem({ activity }: { activity: ActivityFeedItem }) {
  const router = useRouter();
  const { likeActivity, unlikeActivity } = useSocialStore();

  const config = ACTIVITY_CONFIG[activity.type];

  const handleLike = () => {
    if (activity.isLiked) {
      unlikeActivity(activity.id);
    } else {
      likeActivity(activity.id);
    }
  };

  const handlePress = () => {
    if (activity.huntId) {
      router.push(`/hunt/${activity.huntId}`);
    } else if (activity.achievementId) {
      router.push(`/achievements`);
    } else if (activity.teamId) {
      router.push(`/teams/${activity.teamId}`);
    }
  };

  const getActivityDescription = () => {
    switch (activity.type) {
      case 'hunt_completed':
        return (
          <>
            completed <Text style={styles.highlight}>{activity.huntTitle}</Text>
            {activity.score !== undefined && ` with ${activity.score} points`}
          </>
        );
      case 'achievement_unlocked':
        return (
          <>
            unlocked <Text style={styles.highlight}>{activity.achievementName}</Text>
          </>
        );
      case 'hunt_created':
        return (
          <>
            created a new hunt: <Text style={styles.highlight}>{activity.huntTitle}</Text>
          </>
        );
      case 'joined_team':
        return (
          <>
            joined team <Text style={styles.highlight}>{activity.teamName}</Text>
          </>
        );
      case 'started_hunt':
        return (
          <>
            started <Text style={styles.highlight}>{activity.huntTitle}</Text>
          </>
        );
      case 'new_review':
        return (
          <>
            reviewed <Text style={styles.highlight}>{activity.huntTitle}</Text>
          </>
        );
      case 'reached_milestone':
        return (
          <>
            reached a milestone: <Text style={styles.highlight}>{activity.score} hunts completed!</Text>
          </>
        );
      case 'challenge_sent':
        return (
          <>
            challenged a friend to <Text style={styles.highlight}>{activity.huntTitle}</Text>
          </>
        );
      case 'challenge_accepted':
        return (
          <>
            accepted a challenge for <Text style={styles.highlight}>{activity.huntTitle}</Text>
          </>
        );
      default:
        return config.label;
    }
  };

  return (
    <Card style={styles.activityCard}>
      <TouchableOpacity
        style={styles.activityContent}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.activityHeader}>
          {activity.userAvatar ? (
            <Image source={{ uri: activity.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color={Colors.textSecondary} />
            </View>
          )}

          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>
              <Text style={styles.userName}>{activity.userName}</Text>
              {' '}
              {getActivityDescription()}
            </Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(activity.createdAt)}</Text>
          </View>

          <View style={[styles.activityIcon, { backgroundColor: config.color + '20' }]}>
            <Ionicons
              name={config.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={config.color}
            />
          </View>
        </View>

        {/* Extra stats for certain activities */}
        {activity.type === 'hunt_completed' && (
          <View style={styles.statsRow}>
            {activity.position !== undefined && (
              <View style={styles.statBadge}>
                <Ionicons name="podium" size={12} color={Colors.warning} />
                <Text style={styles.statText}>#{activity.position}</Text>
              </View>
            )}
            {activity.distance !== undefined && (
              <View style={styles.statBadge}>
                <Ionicons name="walk" size={12} color={Colors.primary} />
                <Text style={styles.statText}>{activity.distance.toFixed(1)}km</Text>
              </View>
            )}
            {activity.duration !== undefined && (
              <View style={styles.statBadge}>
                <Ionicons name="time" size={12} color={Colors.success} />
                <Text style={styles.statText}>{Math.round(activity.duration)}min</Text>
              </View>
            )}
          </View>
        )}

        {/* Interaction row */}
        <View style={styles.interactionRow}>
          <TouchableOpacity style={styles.interactionButton} onPress={handleLike}>
            <Ionicons
              name={activity.isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={activity.isLiked ? Colors.error : Colors.textSecondary}
            />
            <Text style={[
              styles.interactionText,
              activity.isLiked && styles.interactionTextActive
            ]}>
              {activity.likeCount > 0 ? activity.likeCount : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.interactionButton}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.interactionText}>
              {activity.commentCount > 0 ? activity.commentCount : 'Comment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.interactionButton}>
            <Ionicons name="share-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.interactionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

export function ActivityFeed({
  activities,
  showHeader = true,
  maxItems,
  onRefresh,
  refreshing = false,
}: ActivityFeedProps) {
  const { activityFeed, fetchActivityFeed, isLoadingActivity } = useSocialStore();

  const displayActivities = activities || activityFeed;
  const limitedActivities = maxItems
    ? displayActivities.slice(0, maxItems)
    : displayActivities;

  React.useEffect(() => {
    if (!activities) {
      fetchActivityFeed();
    }
  }, [activities]);

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity>
          <Text style={styles.filterLink}>Filter</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptyText}>
        Start completing hunts and adding friends to see activity here!
      </Text>
    </View>
  );

  return (
    <FlatList
      data={limitedActivities}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityItem activity={item} />}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing || isLoadingActivity}
      onRefresh={onRefresh || (!activities ? fetchActivityFeed : undefined)}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  filterLink: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '500',
  },
  activityCard: {
    padding: 0,
    marginBottom: Spacing.sm,
  },
  activityContent: {
    padding: Spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  activityText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  userName: {
    fontWeight: '600',
    color: Colors.text,
  },
  highlight: {
    fontWeight: '600',
    color: Colors.primary,
  },
  timeAgo: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginLeft: 44 + Spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  interactionRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.lg,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interactionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  interactionTextActive: {
    color: Colors.error,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

export default ActivityFeed;
