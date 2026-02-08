import { useSocialStore } from '../socialStore';
import type {
  Friend,
  FriendRequest,
  ActivityFeedItem,
  FriendChallenge,
  FollowedCreator,
  FriendSuggestion,
  UserProfile,
} from '@/types/social';

// --- Mock Data Factories ---

const mockFriend = (overrides: Partial<Friend> = {}): Friend => ({
  id: 'friend-1',
  friendId: 'user-200',
  displayName: 'Alice',
  username: 'alice',
  avatarUrl: 'https://example.com/alice.jpg',
  isOnline: true,
  lastActiveAt: '2026-01-15T10:00:00Z',
  currentActivity: 'Playing Downtown Adventure',
  huntsCompleted: 12,
  recentAchievement: 'Speed Runner',
  friendsSince: '2025-06-01T00:00:00Z',
  ...overrides,
});

const mockFriendRequest = (overrides: Partial<FriendRequest> = {}): FriendRequest => ({
  id: 'req-1',
  senderId: 'user-300',
  senderName: 'Bob',
  senderAvatar: 'https://example.com/bob.jpg',
  receiverId: 'user-100',
  message: 'Hey, let us be friends!',
  status: 'pending',
  createdAt: '2026-01-20T08:00:00Z',
  ...overrides,
});

const mockActivity = (overrides: Partial<ActivityFeedItem> = {}): ActivityFeedItem => ({
  id: 'activity-1',
  type: 'hunt_completed',
  userId: 'user-200',
  userName: 'Alice',
  userAvatar: 'https://example.com/alice.jpg',
  huntId: 'hunt-1',
  huntTitle: 'Downtown Adventure',
  score: 950,
  position: 1,
  likeCount: 5,
  commentCount: 2,
  isLiked: false,
  createdAt: '2026-01-25T14:00:00Z',
  ...overrides,
});

const mockChallenge = (overrides: Partial<FriendChallenge> = {}): FriendChallenge => ({
  id: 'challenge-1',
  challengerId: 'user-100',
  challengerName: 'Me',
  challengerAvatar: 'https://example.com/me.jpg',
  challengeeId: 'user-200',
  challengeeName: 'Alice',
  challengeeAvatar: 'https://example.com/alice.jpg',
  huntId: 'hunt-1',
  huntTitle: 'Downtown Adventure',
  stakes: 'Loser buys coffee',
  status: 'pending',
  expiresAt: '2026-02-01T00:00:00Z',
  createdAt: '2026-01-25T10:00:00Z',
  ...overrides,
});

const mockCreator = (overrides: Partial<FollowedCreator> = {}): FollowedCreator => ({
  id: 'follow-1',
  creatorId: 'creator-1',
  displayName: 'HuntMaster',
  username: 'huntmaster',
  avatarUrl: 'https://example.com/huntmaster.jpg',
  isVerified: true,
  huntsCreated: 45,
  averageRating: 4.8,
  notifyNewHunts: true,
  followedAt: '2025-12-01T00:00:00Z',
  ...overrides,
});

const mockSuggestion = (overrides: Partial<FriendSuggestion> = {}): FriendSuggestion => ({
  id: 'suggestion-1',
  userId: 'user-400',
  displayName: 'Charlie',
  username: 'charlie',
  avatarUrl: 'https://example.com/charlie.jpg',
  reason: 'mutual_friends',
  mutualFriendCount: 3,
  mutualFriendNames: ['Alice', 'Bob', 'Eve'],
  huntsCompleted: 8,
  commonHunts: 2,
  ...overrides,
});

const mockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-500',
  displayName: 'Dave',
  username: 'dave',
  avatarUrl: 'https://example.com/dave.jpg',
  bio: 'Scavenger hunt enthusiast',
  huntsCompleted: 20,
  huntsCreated: 5,
  totalDistance: 150,
  achievementCount: 10,
  friendCount: 25,
  followerCount: 100,
  followingCount: 30,
  isVerified: false,
  isCreator: true,
  isPrivate: false,
  showActivity: true,
  friendshipStatus: 'none',
  isFollowing: false,
  isFollowedBy: false,
  createdAt: '2025-01-01T00:00:00Z',
  lastActiveAt: '2026-01-28T12:00:00Z',
  ...overrides,
});

// --- Default initial state for reset ---

const initialState = {
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
};

// --- Test Suite ---

beforeEach(() => {
  useSocialStore.setState(initialState);
  (global.fetch as jest.Mock).mockReset();
});

describe('useSocialStore', () => {
  // ─── Initial State ──────────────────────────────────────────────

  describe('initial state', () => {
    it('should have correct initial state values', () => {
      const state = useSocialStore.getState();

      expect(state.friends).toEqual([]);
      expect(state.friendRequests).toEqual([]);
      expect(state.sentRequests).toEqual([]);
      expect(state.suggestions).toEqual([]);
      expect(state.activityFeed).toEqual([]);
      expect(state.friendsActivity).toEqual([]);
      expect(state.pendingChallenges).toEqual([]);
      expect(state.activeChallenges).toEqual([]);
      expect(state.challengeHistory).toEqual([]);
      expect(state.followedCreators).toEqual([]);
      expect(state.isLoadingFriends).toBe(false);
      expect(state.isLoadingActivity).toBe(false);
      expect(state.isLoadingChallenges).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ─── fetchFriends ───────────────────────────────────────────────

  describe('fetchFriends', () => {
    it('should fetch friends successfully and update state', async () => {
      const friends = [mockFriend(), mockFriend({ id: 'friend-2', friendId: 'user-201', displayName: 'Eve' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends }),
      });

      await useSocialStore.getState().fetchFriends();

      const state = useSocialStore.getState();
      expect(state.friends).toEqual(friends);
      expect(state.isLoadingFriends).toBe(false);
      expect(state.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/friends')
      );
    });

    it('should set isLoadingFriends to true while fetching', async () => {
      let loadingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useSocialStore.getState().isLoadingFriends;
        return {
          ok: true,
          json: async () => ({ friends: [] }),
        };
      });

      await useSocialStore.getState().fetchFriends();

      expect(loadingDuringFetch).toBe(true);
      expect(useSocialStore.getState().isLoadingFriends).toBe(false);
    });

    it('should set error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await useSocialStore.getState().fetchFriends();

      const state = useSocialStore.getState();
      expect(state.error).toBe('Failed to load friends');
      expect(state.isLoadingFriends).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useSocialStore.getState().fetchFriends();

      expect(useSocialStore.getState().error).toBe('Failed to load friends');
      expect(useSocialStore.getState().isLoadingFriends).toBe(false);
    });
  });

  // ─── sendFriendRequest ─────────────────────────────────────────

  describe('sendFriendRequest', () => {
    it('should send a friend request and append to sentRequests', async () => {
      const newRequest = mockFriendRequest({ id: 'req-new', senderId: 'user-100' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request: newRequest }),
      });

      await useSocialStore.getState().sendFriendRequest('user-300', 'Hey!');

      expect(useSocialStore.getState().sentRequests).toEqual([newRequest]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/friend-requests'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-300', message: 'Hey!' }),
        })
      );
    });

    it('should set error and throw when request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(
        useSocialStore.getState().sendFriendRequest('user-300')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to send friend request');
    });

    it('should append to existing sentRequests without replacing them', async () => {
      const existingRequest = mockFriendRequest({ id: 'req-existing' });
      useSocialStore.setState({ sentRequests: [existingRequest] });

      const newRequest = mockFriendRequest({ id: 'req-new', senderId: 'user-100' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request: newRequest }),
      });

      await useSocialStore.getState().sendFriendRequest('user-400');

      expect(useSocialStore.getState().sentRequests).toHaveLength(2);
      expect(useSocialStore.getState().sentRequests[0]).toEqual(existingRequest);
      expect(useSocialStore.getState().sentRequests[1]).toEqual(newRequest);
    });
  });

  // ─── acceptFriendRequest ───────────────────────────────────────

  describe('acceptFriendRequest', () => {
    it('should accept a friend request, remove from requests, and add to friends', async () => {
      const request = mockFriendRequest({ id: 'req-1' });
      const newFriend = mockFriend({ id: 'friend-new', friendId: 'user-300' });

      useSocialStore.setState({ friendRequests: [request] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friend: newFriend }),
      });

      await useSocialStore.getState().acceptFriendRequest('req-1');

      const state = useSocialStore.getState();
      expect(state.friendRequests).toEqual([]);
      expect(state.friends).toEqual([newFriend]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/friend-requests/req-1/accept'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set error and throw when accepting fails', async () => {
      useSocialStore.setState({ friendRequests: [mockFriendRequest()] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        useSocialStore.getState().acceptFriendRequest('req-1')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to accept friend request');
    });
  });

  // ─── declineFriendRequest ──────────────────────────────────────

  describe('declineFriendRequest', () => {
    it('should decline a friend request and remove it from the list', async () => {
      const request1 = mockFriendRequest({ id: 'req-1' });
      const request2 = mockFriendRequest({ id: 'req-2', senderId: 'user-400', senderName: 'Eve' });
      useSocialStore.setState({ friendRequests: [request1, request2] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().declineFriendRequest('req-1');

      const state = useSocialStore.getState();
      expect(state.friendRequests).toEqual([request2]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/friend-requests/req-1/decline'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set error and throw when declining fails', async () => {
      useSocialStore.setState({ friendRequests: [mockFriendRequest()] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      await expect(
        useSocialStore.getState().declineFriendRequest('req-1')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to decline friend request');
    });
  });

  // ─── removeFriend ──────────────────────────────────────────────

  describe('removeFriend', () => {
    it('should remove a friend from the friends list', async () => {
      const friend1 = mockFriend({ id: 'friend-1', friendId: 'user-200' });
      const friend2 = mockFriend({ id: 'friend-2', friendId: 'user-201' });
      useSocialStore.setState({ friends: [friend1, friend2] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().removeFriend('user-200');

      expect(useSocialStore.getState().friends).toEqual([friend2]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/friends/user-200'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should set error and throw when removal fails', async () => {
      useSocialStore.setState({ friends: [mockFriend()] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      await expect(
        useSocialStore.getState().removeFriend('user-200')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to remove friend');
      // Friend should still be in the list since removal failed
      expect(useSocialStore.getState().friends).toHaveLength(1);
    });
  });

  // ─── blockUser ─────────────────────────────────────────────────

  describe('blockUser', () => {
    it('should block a user and remove them from friends, requests, and suggestions', async () => {
      const friend = mockFriend({ friendId: 'user-bad' });
      const request = mockFriendRequest({ senderId: 'user-bad' });
      const suggestion = mockSuggestion({ userId: 'user-bad' });
      const otherFriend = mockFriend({ id: 'friend-2', friendId: 'user-good' });

      useSocialStore.setState({
        friends: [friend, otherFriend],
        friendRequests: [request],
        suggestions: [suggestion],
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().blockUser('user-bad');

      const state = useSocialStore.getState();
      expect(state.friends).toEqual([otherFriend]);
      expect(state.friendRequests).toEqual([]);
      expect(state.suggestions).toEqual([]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/block/user-bad'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set error and throw when blocking fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      await expect(
        useSocialStore.getState().blockUser('user-bad')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to block user');
    });
  });

  // ─── fetchActivityFeed ─────────────────────────────────────────

  describe('fetchActivityFeed', () => {
    it('should fetch activity feed for page 1 and replace existing feed', async () => {
      const oldActivity = mockActivity({ id: 'old-activity' });
      useSocialStore.setState({ activityFeed: [oldActivity] });

      const newActivities = [
        mockActivity({ id: 'activity-1' }),
        mockActivity({ id: 'activity-2', type: 'achievement_unlocked' }),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: newActivities }),
      });

      await useSocialStore.getState().fetchActivityFeed(1);

      const state = useSocialStore.getState();
      expect(state.activityFeed).toEqual(newActivities);
      expect(state.isLoadingActivity).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should append activities when fetching subsequent pages', async () => {
      const existingActivity = mockActivity({ id: 'activity-1' });
      useSocialStore.setState({ activityFeed: [existingActivity] });

      const newActivities = [mockActivity({ id: 'activity-2' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: newActivities }),
      });

      await useSocialStore.getState().fetchActivityFeed(2);

      expect(useSocialStore.getState().activityFeed).toEqual([existingActivity, ...newActivities]);
    });

    it('should default to page 1 when no page is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: [] }),
      });

      await useSocialStore.getState().fetchActivityFeed();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/activity?page=1')
      );
    });

    it('should set isLoadingActivity while fetching', async () => {
      let loadingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useSocialStore.getState().isLoadingActivity;
        return {
          ok: true,
          json: async () => ({ activities: [] }),
        };
      });

      await useSocialStore.getState().fetchActivityFeed();

      expect(loadingDuringFetch).toBe(true);
      expect(useSocialStore.getState().isLoadingActivity).toBe(false);
    });

    it('should set error when fetching feed fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await useSocialStore.getState().fetchActivityFeed();

      expect(useSocialStore.getState().error).toBe('Failed to load activity feed');
      expect(useSocialStore.getState().isLoadingActivity).toBe(false);
    });
  });

  // ─── likeActivity (optimistic update + rollback) ───────────────

  describe('likeActivity', () => {
    it('should optimistically update like state in activityFeed', async () => {
      const activity = mockActivity({ id: 'activity-1', isLiked: false, likeCount: 5 });
      useSocialStore.setState({ activityFeed: [activity] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().likeActivity('activity-1');

      const updated = useSocialStore.getState().activityFeed[0];
      expect(updated.isLiked).toBe(true);
      expect(updated.likeCount).toBe(6);
    });

    it('should optimistically update like state in friendsActivity', async () => {
      const activity = mockActivity({ id: 'activity-1', isLiked: false, likeCount: 3 });
      useSocialStore.setState({ friendsActivity: [activity] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().likeActivity('activity-1');

      const updated = useSocialStore.getState().friendsActivity[0];
      expect(updated.isLiked).toBe(true);
      expect(updated.likeCount).toBe(4);
    });

    it('should rollback like on API failure', async () => {
      const activity = mockActivity({ id: 'activity-1', isLiked: false, likeCount: 5 });
      useSocialStore.setState({ activityFeed: [activity], friendsActivity: [activity] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      await useSocialStore.getState().likeActivity('activity-1');

      const feedItem = useSocialStore.getState().activityFeed[0];
      expect(feedItem.isLiked).toBe(false);
      expect(feedItem.likeCount).toBe(5);

      const friendsItem = useSocialStore.getState().friendsActivity[0];
      expect(friendsItem.isLiked).toBe(false);
      expect(friendsItem.likeCount).toBe(5);
    });

    it('should not update activities that do not match the given id', async () => {
      const activity1 = mockActivity({ id: 'activity-1', isLiked: false, likeCount: 5 });
      const activity2 = mockActivity({ id: 'activity-2', isLiked: false, likeCount: 10 });
      useSocialStore.setState({ activityFeed: [activity1, activity2] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().likeActivity('activity-1');

      const state = useSocialStore.getState();
      expect(state.activityFeed[0].likeCount).toBe(6);
      expect(state.activityFeed[1].likeCount).toBe(10);
    });

    it('should ensure rollback likeCount does not go below zero', async () => {
      const activity = mockActivity({ id: 'activity-1', isLiked: false, likeCount: 0 });
      useSocialStore.setState({ activityFeed: [activity] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      await useSocialStore.getState().likeActivity('activity-1');

      // After optimistic +1 then rollback -1, should clamp to 0
      expect(useSocialStore.getState().activityFeed[0].likeCount).toBe(0);
    });
  });

  // ─── unlikeActivity ────────────────────────────────────────────

  describe('unlikeActivity', () => {
    it('should optimistically unlike and decrement count', async () => {
      const activity = mockActivity({ id: 'activity-1', isLiked: true, likeCount: 5 });
      useSocialStore.setState({ activityFeed: [activity], friendsActivity: [activity] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().unlikeActivity('activity-1');

      expect(useSocialStore.getState().activityFeed[0].isLiked).toBe(false);
      expect(useSocialStore.getState().activityFeed[0].likeCount).toBe(4);
      expect(useSocialStore.getState().friendsActivity[0].isLiked).toBe(false);
      expect(useSocialStore.getState().friendsActivity[0].likeCount).toBe(4);
    });

    it('should rollback unlike on API failure', async () => {
      const activity = mockActivity({ id: 'activity-1', isLiked: true, likeCount: 5 });
      useSocialStore.setState({ activityFeed: [activity], friendsActivity: [activity] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      await useSocialStore.getState().unlikeActivity('activity-1');

      expect(useSocialStore.getState().activityFeed[0].isLiked).toBe(true);
      expect(useSocialStore.getState().activityFeed[0].likeCount).toBe(5);
      expect(useSocialStore.getState().friendsActivity[0].isLiked).toBe(true);
      expect(useSocialStore.getState().friendsActivity[0].likeCount).toBe(5);
    });
  });

  // ─── commentOnActivity ─────────────────────────────────────────

  describe('commentOnActivity', () => {
    it('should increment comment count in activityFeed and friendsActivity', async () => {
      const activity = mockActivity({ id: 'activity-1', commentCount: 2 });
      useSocialStore.setState({ activityFeed: [activity], friendsActivity: [activity] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().commentOnActivity('activity-1', 'Great job!');

      expect(useSocialStore.getState().activityFeed[0].commentCount).toBe(3);
      expect(useSocialStore.getState().friendsActivity[0].commentCount).toBe(3);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/activity/activity-1/comments'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Great job!' }),
        })
      );
    });

    it('should set error and throw when commenting fails', async () => {
      useSocialStore.setState({ activityFeed: [mockActivity()] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

      await expect(
        useSocialStore.getState().commentOnActivity('activity-1', 'Nice!')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to post comment');
    });
  });

  // ─── fetchChallenges ───────────────────────────────────────────

  describe('fetchChallenges', () => {
    it('should fetch and categorize challenges by status', async () => {
      const pending = [mockChallenge({ id: 'c-1', status: 'pending' })];
      const active = [mockChallenge({ id: 'c-2', status: 'in_progress' })];
      const history = [mockChallenge({ id: 'c-3', status: 'completed' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pending, active, history }),
      });

      await useSocialStore.getState().fetchChallenges();

      const state = useSocialStore.getState();
      expect(state.pendingChallenges).toEqual(pending);
      expect(state.activeChallenges).toEqual(active);
      expect(state.challengeHistory).toEqual(history);
      expect(state.isLoadingChallenges).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isLoadingChallenges while fetching', async () => {
      let loadingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useSocialStore.getState().isLoadingChallenges;
        return {
          ok: true,
          json: async () => ({ pending: [], active: [], history: [] }),
        };
      });

      await useSocialStore.getState().fetchChallenges();

      expect(loadingDuringFetch).toBe(true);
      expect(useSocialStore.getState().isLoadingChallenges).toBe(false);
    });

    it('should set error when fetching challenges fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

      await useSocialStore.getState().fetchChallenges();

      expect(useSocialStore.getState().error).toBe('Failed to load challenges');
      expect(useSocialStore.getState().isLoadingChallenges).toBe(false);
    });
  });

  // ─── sendChallenge ─────────────────────────────────────────────

  describe('sendChallenge', () => {
    it('should send a challenge and add it to pendingChallenges', async () => {
      const newChallenge = mockChallenge({ id: 'c-new' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: newChallenge }),
      });

      await useSocialStore.getState().sendChallenge('user-200', 'hunt-1', 'Loser buys coffee');

      expect(useSocialStore.getState().pendingChallenges).toEqual([newChallenge]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/challenges'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId: 'user-200', huntId: 'hunt-1', stakes: 'Loser buys coffee' }),
        })
      );
    });

    it('should set error and throw when sending challenge fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });

      await expect(
        useSocialStore.getState().sendChallenge('user-200', 'hunt-1')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to send challenge');
    });
  });

  // ─── acceptChallenge ───────────────────────────────────────────

  describe('acceptChallenge', () => {
    it('should move challenge from pending to active', async () => {
      const pending = mockChallenge({ id: 'c-1', status: 'pending' });
      const accepted = mockChallenge({ id: 'c-1', status: 'accepted' });
      useSocialStore.setState({ pendingChallenges: [pending] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: accepted }),
      });

      await useSocialStore.getState().acceptChallenge('c-1');

      const state = useSocialStore.getState();
      expect(state.pendingChallenges).toEqual([]);
      expect(state.activeChallenges).toEqual([accepted]);
    });
  });

  // ─── declineChallenge ──────────────────────────────────────────

  describe('declineChallenge', () => {
    it('should remove challenge from pendingChallenges', async () => {
      const challenge1 = mockChallenge({ id: 'c-1' });
      const challenge2 = mockChallenge({ id: 'c-2' });
      useSocialStore.setState({ pendingChallenges: [challenge1, challenge2] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().declineChallenge('c-1');

      expect(useSocialStore.getState().pendingChallenges).toEqual([challenge2]);
    });
  });

  // ─── followCreator ─────────────────────────────────────────────

  describe('followCreator', () => {
    it('should follow a creator and add to followedCreators', async () => {
      const newCreator = mockCreator({ creatorId: 'creator-2', displayName: 'TrailBlazer' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ creator: newCreator }),
      });

      await useSocialStore.getState().followCreator('creator-2');

      expect(useSocialStore.getState().followedCreators).toEqual([newCreator]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/follow/creator-2'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set error and throw when following fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(
        useSocialStore.getState().followCreator('creator-2')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to follow creator');
    });
  });

  // ─── unfollowCreator ───────────────────────────────────────────

  describe('unfollowCreator', () => {
    it('should unfollow a creator and remove from followedCreators', async () => {
      const creator1 = mockCreator({ creatorId: 'creator-1' });
      const creator2 = mockCreator({ id: 'follow-2', creatorId: 'creator-2', displayName: 'Other' });
      useSocialStore.setState({ followedCreators: [creator1, creator2] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().unfollowCreator('creator-1');

      expect(useSocialStore.getState().followedCreators).toEqual([creator2]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/unfollow/creator-1'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should set error and throw when unfollowing fails', async () => {
      useSocialStore.setState({ followedCreators: [mockCreator()] });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        useSocialStore.getState().unfollowCreator('creator-1')
      ).rejects.toThrow();

      expect(useSocialStore.getState().error).toBe('Failed to unfollow creator');
      // Creator should still be in the list since unfollow failed
      expect(useSocialStore.getState().followedCreators).toHaveLength(1);
    });
  });

  // ─── searchUsers ───────────────────────────────────────────────

  describe('searchUsers', () => {
    it('should search users and return results', async () => {
      const users = [mockUserProfile(), mockUserProfile({ id: 'user-600', displayName: 'Frank' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users }),
      });

      const result = await useSocialStore.getState().searchUsers('dave');

      expect(result).toEqual(users);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/search?q=dave')
      );
    });

    it('should return empty array when search fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await useSocialStore.getState().searchUsers('ghost');

      expect(result).toEqual([]);
      expect(useSocialStore.getState().error).toBe('Failed to search users');
    });

    it('should encode special characters in the search query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      });

      await useSocialStore.getState().searchUsers('user name&special=chars');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/search?q=user%20name%26special%3Dchars')
      );
    });
  });

  // ─── fetchUserProfile ──────────────────────────────────────────

  describe('fetchUserProfile', () => {
    it('should fetch and return a user profile', async () => {
      const profile = mockUserProfile();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile }),
      });

      const result = await useSocialStore.getState().fetchUserProfile('user-500');

      expect(result).toEqual(profile);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-500/profile')
      );
    });

    it('should return null and set error when profile fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await useSocialStore.getState().fetchUserProfile('nonexistent');

      expect(result).toBeNull();
      expect(useSocialStore.getState().error).toBe('Failed to load user profile');
    });
  });

  // ─── dismissSuggestion ─────────────────────────────────────────

  describe('dismissSuggestion', () => {
    it('should remove a suggestion from the list without an API call', () => {
      const suggestion1 = mockSuggestion({ id: 'sug-1' });
      const suggestion2 = mockSuggestion({ id: 'sug-2', userId: 'user-500' });
      useSocialStore.setState({ suggestions: [suggestion1, suggestion2] });

      useSocialStore.getState().dismissSuggestion('sug-1');

      expect(useSocialStore.getState().suggestions).toEqual([suggestion2]);
      // dismissSuggestion is synchronous and does not call fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─── toggleCreatorNotifications ────────────────────────────────

  describe('toggleCreatorNotifications', () => {
    it('should toggle notification setting for a followed creator', async () => {
      const creator = mockCreator({ creatorId: 'creator-1', notifyNewHunts: true });
      useSocialStore.setState({ followedCreators: [creator] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().toggleCreatorNotifications('creator-1');

      expect(useSocialStore.getState().followedCreators[0].notifyNewHunts).toBe(false);
    });

    it('should toggle notification from false to true', async () => {
      const creator = mockCreator({ creatorId: 'creator-1', notifyNewHunts: false });
      useSocialStore.setState({ followedCreators: [creator] });

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await useSocialStore.getState().toggleCreatorNotifications('creator-1');

      expect(useSocialStore.getState().followedCreators[0].notifyNewHunts).toBe(true);
    });
  });

  // ─── fetchFriendsActivity ──────────────────────────────────────

  describe('fetchFriendsActivity', () => {
    it('should fetch friends activity and set state', async () => {
      const activities = [mockActivity({ id: 'fa-1' }), mockActivity({ id: 'fa-2' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities }),
      });

      await useSocialStore.getState().fetchFriendsActivity();

      expect(useSocialStore.getState().friendsActivity).toEqual(activities);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/activity/friends')
      );
    });

    it('should set error when fetching friends activity fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

      await useSocialStore.getState().fetchFriendsActivity();

      expect(useSocialStore.getState().error).toBe('Failed to load friends activity');
    });
  });

  // ─── fetchFriendRequests ───────────────────────────────────────

  describe('fetchFriendRequests', () => {
    it('should fetch and separate received and sent friend requests', async () => {
      const received = [mockFriendRequest({ id: 'req-1' })];
      const sent = [mockFriendRequest({ id: 'req-2', senderId: 'user-100' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ received, sent }),
      });

      await useSocialStore.getState().fetchFriendRequests();

      const state = useSocialStore.getState();
      expect(state.friendRequests).toEqual(received);
      expect(state.sentRequests).toEqual(sent);
    });

    it('should set error when fetching friend requests fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

      await useSocialStore.getState().fetchFriendRequests();

      expect(useSocialStore.getState().error).toBe('Failed to load friend requests');
    });
  });

  // ─── fetchSuggestions ──────────────────────────────────────────

  describe('fetchSuggestions', () => {
    it('should fetch friend suggestions', async () => {
      const suggestions = [mockSuggestion({ id: 'sug-1' }), mockSuggestion({ id: 'sug-2' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions }),
      });

      await useSocialStore.getState().fetchSuggestions();

      expect(useSocialStore.getState().suggestions).toEqual(suggestions);
    });

    it('should set error when fetching suggestions fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

      await useSocialStore.getState().fetchSuggestions();

      expect(useSocialStore.getState().error).toBe('Failed to load suggestions');
    });
  });

  // ─── fetchFollowedCreators ─────────────────────────────────────

  describe('fetchFollowedCreators', () => {
    it('should fetch followed creators', async () => {
      const creators = [mockCreator(), mockCreator({ id: 'follow-2', creatorId: 'creator-2' })];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ creators }),
      });

      await useSocialStore.getState().fetchFollowedCreators();

      expect(useSocialStore.getState().followedCreators).toEqual(creators);
    });

    it('should set error when fetching followed creators fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useSocialStore.getState().fetchFollowedCreators();

      expect(useSocialStore.getState().error).toBe('Failed to load followed creators');
    });
  });
});
