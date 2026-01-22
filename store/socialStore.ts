import { create } from 'zustand';
import type {
  UserProfile,
  Friend,
  FriendRequest,
  ActivityFeedItem,
  FriendChallenge,
  FollowedCreator,
  FriendSuggestion,
  ActivityComment,
} from '@/types/social';

interface SocialState {
  // Friends
  friends: Friend[];
  friendRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  suggestions: FriendSuggestion[];

  // Activity
  activityFeed: ActivityFeedItem[];
  friendsActivity: ActivityFeedItem[];

  // Challenges
  pendingChallenges: FriendChallenge[];
  activeChallenges: FriendChallenge[];
  challengeHistory: FriendChallenge[];

  // Following
  followedCreators: FollowedCreator[];

  // UI State
  isLoadingFriends: boolean;
  isLoadingActivity: boolean;
  isLoadingChallenges: boolean;
  error: string | null;

  // Actions - Friends
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  sendFriendRequest: (userId: string, message?: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;

  // Actions - Activity
  fetchActivityFeed: (page?: number) => Promise<void>;
  fetchFriendsActivity: () => Promise<void>;
  likeActivity: (activityId: string) => Promise<void>;
  unlikeActivity: (activityId: string) => Promise<void>;
  commentOnActivity: (activityId: string, content: string) => Promise<void>;

  // Actions - Challenges
  fetchChallenges: () => Promise<void>;
  sendChallenge: (friendId: string, huntId: string, stakes?: string) => Promise<void>;
  acceptChallenge: (challengeId: string) => Promise<void>;
  declineChallenge: (challengeId: string) => Promise<void>;

  // Actions - Following
  fetchFollowedCreators: () => Promise<void>;
  followCreator: (creatorId: string) => Promise<void>;
  unfollowCreator: (creatorId: string) => Promise<void>;
  toggleCreatorNotifications: (creatorId: string) => Promise<void>;

  // Actions - Suggestions
  fetchSuggestions: () => Promise<void>;
  dismissSuggestion: (suggestionId: string) => void;

  // Actions - Profile
  fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
  searchUsers: (query: string) => Promise<UserProfile[]>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  // Initial state
  friends: [],
  friendRequests: [],
  sentRequests: [],
  suggestions: [],
  activityFeed: [],
  friendsActivity: [],
  pendingChallenges: [],
  activeChallenges: [],
  challengeHistory: [],
  followedCreators: [],
  isLoadingFriends: false,
  isLoadingActivity: false,
  isLoadingChallenges: false,
  error: null,

  // Friends
  fetchFriends: async () => {
    set({ isLoadingFriends: true, error: null });
    try {
      const response = await fetch('/api/social/friends');
      const data = await response.json();
      set({ friends: data.friends, isLoadingFriends: false });
    } catch (error) {
      set({ error: 'Failed to load friends', isLoadingFriends: false });
    }
  },

  fetchFriendRequests: async () => {
    try {
      const response = await fetch('/api/social/friend-requests');
      const data = await response.json();
      set({
        friendRequests: data.received,
        sentRequests: data.sent,
      });
    } catch (error) {
      set({ error: 'Failed to load friend requests' });
    }
  },

  sendFriendRequest: async (userId: string, message?: string) => {
    try {
      const response = await fetch('/api/social/friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message }),
      });
      const data = await response.json();

      set(state => ({
        sentRequests: [...state.sentRequests, data.request],
      }));
    } catch (error) {
      set({ error: 'Failed to send friend request' });
      throw error;
    }
  },

  acceptFriendRequest: async (requestId: string) => {
    try {
      const response = await fetch(`/api/social/friend-requests/${requestId}/accept`, {
        method: 'POST',
      });
      const data = await response.json();

      set(state => ({
        friendRequests: state.friendRequests.filter(r => r.id !== requestId),
        friends: [...state.friends, data.friend],
      }));
    } catch (error) {
      set({ error: 'Failed to accept friend request' });
      throw error;
    }
  },

  declineFriendRequest: async (requestId: string) => {
    try {
      await fetch(`/api/social/friend-requests/${requestId}/decline`, {
        method: 'POST',
      });

      set(state => ({
        friendRequests: state.friendRequests.filter(r => r.id !== requestId),
      }));
    } catch (error) {
      set({ error: 'Failed to decline friend request' });
      throw error;
    }
  },

  removeFriend: async (friendId: string) => {
    try {
      await fetch(`/api/social/friends/${friendId}`, {
        method: 'DELETE',
      });

      set(state => ({
        friends: state.friends.filter(f => f.friendId !== friendId),
      }));
    } catch (error) {
      set({ error: 'Failed to remove friend' });
      throw error;
    }
  },

  blockUser: async (userId: string) => {
    try {
      await fetch(`/api/social/block/${userId}`, {
        method: 'POST',
      });

      set(state => ({
        friends: state.friends.filter(f => f.friendId !== userId),
        friendRequests: state.friendRequests.filter(r => r.senderId !== userId),
        suggestions: state.suggestions.filter(s => s.userId !== userId),
      }));
    } catch (error) {
      set({ error: 'Failed to block user' });
      throw error;
    }
  },

  // Activity
  fetchActivityFeed: async (page = 1) => {
    set({ isLoadingActivity: true, error: null });
    try {
      const response = await fetch(`/api/social/activity?page=${page}`);
      const data = await response.json();

      set(state => ({
        activityFeed: page === 1 ? data.activities : [...state.activityFeed, ...data.activities],
        isLoadingActivity: false,
      }));
    } catch (error) {
      set({ error: 'Failed to load activity feed', isLoadingActivity: false });
    }
  },

  fetchFriendsActivity: async () => {
    try {
      const response = await fetch('/api/social/activity/friends');
      const data = await response.json();
      set({ friendsActivity: data.activities });
    } catch (error) {
      set({ error: 'Failed to load friends activity' });
    }
  },

  likeActivity: async (activityId: string) => {
    // Optimistic update
    set(state => ({
      activityFeed: state.activityFeed.map(a =>
        a.id === activityId
          ? { ...a, isLiked: true, likeCount: a.likeCount + 1 }
          : a
      ),
      friendsActivity: state.friendsActivity.map(a =>
        a.id === activityId
          ? { ...a, isLiked: true, likeCount: a.likeCount + 1 }
          : a
      ),
    }));

    try {
      await fetch(`/api/social/activity/${activityId}/like`, {
        method: 'POST',
      });
    } catch (error) {
      // Revert on error
      set(state => ({
        activityFeed: state.activityFeed.map(a =>
          a.id === activityId
            ? { ...a, isLiked: false, likeCount: a.likeCount - 1 }
            : a
        ),
        friendsActivity: state.friendsActivity.map(a =>
          a.id === activityId
            ? { ...a, isLiked: false, likeCount: a.likeCount - 1 }
            : a
        ),
      }));
    }
  },

  unlikeActivity: async (activityId: string) => {
    // Optimistic update
    set(state => ({
      activityFeed: state.activityFeed.map(a =>
        a.id === activityId
          ? { ...a, isLiked: false, likeCount: Math.max(0, a.likeCount - 1) }
          : a
      ),
      friendsActivity: state.friendsActivity.map(a =>
        a.id === activityId
          ? { ...a, isLiked: false, likeCount: Math.max(0, a.likeCount - 1) }
          : a
      ),
    }));

    try {
      await fetch(`/api/social/activity/${activityId}/unlike`, {
        method: 'POST',
      });
    } catch (error) {
      // Revert on error
      set(state => ({
        activityFeed: state.activityFeed.map(a =>
          a.id === activityId
            ? { ...a, isLiked: true, likeCount: a.likeCount + 1 }
            : a
        ),
        friendsActivity: state.friendsActivity.map(a =>
          a.id === activityId
            ? { ...a, isLiked: true, likeCount: a.likeCount + 1 }
            : a
        ),
      }));
    }
  },

  commentOnActivity: async (activityId: string, content: string) => {
    try {
      await fetch(`/api/social/activity/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      // Update comment count
      set(state => ({
        activityFeed: state.activityFeed.map(a =>
          a.id === activityId
            ? { ...a, commentCount: a.commentCount + 1 }
            : a
        ),
        friendsActivity: state.friendsActivity.map(a =>
          a.id === activityId
            ? { ...a, commentCount: a.commentCount + 1 }
            : a
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to post comment' });
      throw error;
    }
  },

  // Challenges
  fetchChallenges: async () => {
    set({ isLoadingChallenges: true, error: null });
    try {
      const response = await fetch('/api/social/challenges');
      const data = await response.json();

      set({
        pendingChallenges: data.pending,
        activeChallenges: data.active,
        challengeHistory: data.history,
        isLoadingChallenges: false,
      });
    } catch (error) {
      set({ error: 'Failed to load challenges', isLoadingChallenges: false });
    }
  },

  sendChallenge: async (friendId: string, huntId: string, stakes?: string) => {
    try {
      const response = await fetch('/api/social/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, huntId, stakes }),
      });
      const data = await response.json();

      set(state => ({
        pendingChallenges: [...state.pendingChallenges, data.challenge],
      }));
    } catch (error) {
      set({ error: 'Failed to send challenge' });
      throw error;
    }
  },

  acceptChallenge: async (challengeId: string) => {
    try {
      const response = await fetch(`/api/social/challenges/${challengeId}/accept`, {
        method: 'POST',
      });
      const data = await response.json();

      set(state => ({
        pendingChallenges: state.pendingChallenges.filter(c => c.id !== challengeId),
        activeChallenges: [...state.activeChallenges, data.challenge],
      }));
    } catch (error) {
      set({ error: 'Failed to accept challenge' });
      throw error;
    }
  },

  declineChallenge: async (challengeId: string) => {
    try {
      await fetch(`/api/social/challenges/${challengeId}/decline`, {
        method: 'POST',
      });

      set(state => ({
        pendingChallenges: state.pendingChallenges.filter(c => c.id !== challengeId),
      }));
    } catch (error) {
      set({ error: 'Failed to decline challenge' });
      throw error;
    }
  },

  // Following
  fetchFollowedCreators: async () => {
    try {
      const response = await fetch('/api/social/following');
      const data = await response.json();
      set({ followedCreators: data.creators });
    } catch (error) {
      set({ error: 'Failed to load followed creators' });
    }
  },

  followCreator: async (creatorId: string) => {
    try {
      const response = await fetch(`/api/social/follow/${creatorId}`, {
        method: 'POST',
      });
      const data = await response.json();

      set(state => ({
        followedCreators: [...state.followedCreators, data.creator],
      }));
    } catch (error) {
      set({ error: 'Failed to follow creator' });
      throw error;
    }
  },

  unfollowCreator: async (creatorId: string) => {
    try {
      await fetch(`/api/social/unfollow/${creatorId}`, {
        method: 'POST',
      });

      set(state => ({
        followedCreators: state.followedCreators.filter(c => c.creatorId !== creatorId),
      }));
    } catch (error) {
      set({ error: 'Failed to unfollow creator' });
      throw error;
    }
  },

  toggleCreatorNotifications: async (creatorId: string) => {
    try {
      await fetch(`/api/social/following/${creatorId}/notifications`, {
        method: 'POST',
      });

      set(state => ({
        followedCreators: state.followedCreators.map(c =>
          c.creatorId === creatorId
            ? { ...c, notifyNewHunts: !c.notifyNewHunts }
            : c
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to update notification settings' });
    }
  },

  // Suggestions
  fetchSuggestions: async () => {
    try {
      const response = await fetch('/api/social/suggestions');
      const data = await response.json();
      set({ suggestions: data.suggestions });
    } catch (error) {
      set({ error: 'Failed to load suggestions' });
    }
  },

  dismissSuggestion: (suggestionId: string) => {
    set(state => ({
      suggestions: state.suggestions.filter(s => s.id !== suggestionId),
    }));
  },

  // Profile
  fetchUserProfile: async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/profile`);
      const data = await response.json();
      return data.profile;
    } catch (error) {
      set({ error: 'Failed to load user profile' });
      return null;
    }
  },

  searchUsers: async (query: string) => {
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      return data.users;
    } catch (error) {
      set({ error: 'Failed to search users' });
      return [];
    }
  },
}));
