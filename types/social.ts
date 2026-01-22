// Social & Friends System Types

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
export type ActivityType =
  | 'hunt_completed'
  | 'achievement_unlocked'
  | 'hunt_created'
  | 'joined_team'
  | 'started_hunt'
  | 'new_review'
  | 'reached_milestone'
  | 'challenge_sent'
  | 'challenge_accepted';

export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;

  // Stats
  huntsCompleted: number;
  huntsCreated: number;
  totalDistance: number; // km
  achievementCount: number;
  friendCount: number;
  followerCount: number;
  followingCount: number;

  // Social
  isVerified: boolean;
  isCreator: boolean;

  // Privacy
  isPrivate: boolean;
  showActivity: boolean;

  // Relationship with current user
  friendshipStatus?: FriendshipStatus;
  isFollowing?: boolean;
  isFollowedBy?: boolean;

  createdAt: string;
  lastActiveAt: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Friend {
  id: string;
  friendId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;

  // Status
  isOnline: boolean;
  lastActiveAt: string;
  currentActivity?: string; // "Playing Downtown Adventure"

  // Quick stats
  huntsCompleted: number;
  recentAchievement?: string;

  friendsSince: string;
}

export interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatar?: string;

  // Activity details
  huntId?: string;
  huntTitle?: string;
  achievementId?: string;
  achievementName?: string;
  teamId?: string;
  teamName?: string;

  // Extra data
  score?: number;
  position?: number;
  distance?: number;
  duration?: number;

  // Interaction
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;

  createdAt: string;
}

export interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface FriendChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerAvatar?: string;
  challengeeId: string;
  challengeeName: string;
  challengeeAvatar?: string;

  huntId: string;
  huntTitle: string;

  // Wager/stakes (optional)
  stakes?: string; // "Loser buys coffee"

  // Status
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed';

  // Results
  challengerScore?: number;
  challengerTime?: number;
  challengeeScore?: number;
  challengeeTime?: number;
  winnerId?: string;

  expiresAt: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreatorProfile extends UserProfile {
  // Creator-specific
  totalPlays: number;
  totalReviews: number;
  averageRating: number;
  featuredHunts: string[];

  // Monetization (future)
  isPremiumCreator: boolean;
  tipEnabled: boolean;

  // Branding
  coverImageUrl?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
  };
}

export interface FollowedCreator {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  isVerified: boolean;

  huntsCreated: number;
  averageRating: number;

  // Notifications
  notifyNewHunts: boolean;

  followedAt: string;
}

// Activity type labels and icons
export const ACTIVITY_CONFIG: Record<ActivityType, { label: string; icon: string; color: string }> = {
  hunt_completed: { label: 'Completed a hunt', icon: 'trophy', color: '#FFD700' },
  achievement_unlocked: { label: 'Unlocked achievement', icon: 'ribbon', color: '#9C27B0' },
  hunt_created: { label: 'Created a new hunt', icon: 'add-circle', color: '#4CAF50' },
  joined_team: { label: 'Joined a team', icon: 'people', color: '#2196F3' },
  started_hunt: { label: 'Started a hunt', icon: 'play-circle', color: '#FF9800' },
  new_review: { label: 'Left a review', icon: 'star', color: '#FFC107' },
  reached_milestone: { label: 'Reached milestone', icon: 'flag', color: '#E91E63' },
  challenge_sent: { label: 'Challenged a friend', icon: 'flash', color: '#FF5722' },
  challenge_accepted: { label: 'Accepted a challenge', icon: 'checkmark-circle', color: '#00BCD4' },
};

// Friend suggestion reasons
export type SuggestionReason =
  | 'mutual_friends'
  | 'same_hunts'
  | 'same_location'
  | 'popular_creator'
  | 'team_member';

export interface FriendSuggestion {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;

  reason: SuggestionReason;
  mutualFriendCount?: number;
  mutualFriendNames?: string[];

  huntsCompleted: number;
  commonHunts?: number;
}

export const SUGGESTION_LABELS: Record<SuggestionReason, string> = {
  mutual_friends: 'mutual friends',
  same_hunts: 'played same hunts',
  same_location: 'in your area',
  popular_creator: 'popular creator',
  team_member: 'on your team',
};
