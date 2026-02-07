import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAchievementStore } from '../achievementStore';
import { ACHIEVEMENTS } from '@/types/achievements';

const defaultStats = {
  huntsCompleted: 0, challengesCompleted: 0, totalPoints: 0, streakDays: 0, maxStreak: 0,
  huntsCreated: 0, totalHuntPlays: 0, groupHunts: 0, soloHunts: 0, citiesVisited: 0,
  nightHunts: 0, perfectHunts: 0, photosTaken: 0, tagsMade: 0, bountiesClaimed: 0,
  alliancesFormed: 0, sabotagesDeployed: 0, fastestHuntMinutes: null as number | null,
};

beforeEach(() => {
  useAchievementStore.setState({
    achievements: ACHIEVEMENTS,
    userAchievements: [],
    achievementProgress: [],
    userStats: null,
    recentUnlocks: [],
    isLoading: false,
    error: null,
  });
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (global.fetch as jest.Mock).mockReset();
});

describe('useAchievementStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAchievementStore.getState();

      expect(state.achievements).toEqual(ACHIEVEMENTS);
      expect(state.userAchievements).toEqual([]);
      expect(state.achievementProgress).toEqual([]);
      expect(state.userStats).toBeNull();
      expect(state.recentUnlocks).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchUserAchievements', () => {
    it('should fetch and set user achievements on success', async () => {
      const mockAchievements = [{ id: 'ua-1', odachievementId: 'first_hunt', unlockedAt: '2025-01-01', progress: 1, notified: true }];
      const mockProgress = [{ odachievementId: 'first_hunt', currentProgress: 1, threshold: 1, percentComplete: 100, isUnlocked: true }];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ achievements: mockAchievements, progress: mockProgress }),
      });

      await useAchievementStore.getState().fetchUserAchievements();

      const state = useAchievementStore.getState();
      expect(state.userAchievements).toEqual(mockAchievements);
      expect(state.achievementProgress).toEqual(mockProgress);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should throw and set error when not authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useAchievementStore.getState().fetchUserAchievements();

      const state = useAchievementStore.getState();
      expect(state.error).toBe('Not authenticated');
      expect(state.isLoading).toBe(false);
    });

    it('should set error on API failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await useAchievementStore.getState().fetchUserAchievements();

      expect(useAchievementStore.getState().error).toBe('Failed to fetch user achievements');
      expect(useAchievementStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading during fetch', async () => {
      let loadingDuringFetch = false;

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useAchievementStore.getState().isLoading;
        return { ok: true, json: async () => ({ achievements: [], progress: [] }) };
      });

      await useAchievementStore.getState().fetchUserAchievements();

      expect(loadingDuringFetch).toBe(true);
      expect(useAchievementStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchUserStats', () => {
    it('should fetch and set user stats on success', async () => {
      const mockStats = { ...defaultStats, huntsCompleted: 5 };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: mockStats }),
      });

      await useAchievementStore.getState().fetchUserStats();

      expect(useAchievementStore.getState().userStats).toEqual(mockStats);
    });

    it('should return early silently when no token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await useAchievementStore.getState().fetchUserStats();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(useAchievementStore.getState().userStats).toBeNull();
    });

    it('should set defaultStats on network failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('mock-token');
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useAchievementStore.getState().fetchUserStats();

      expect(useAchievementStore.getState().userStats).toEqual(defaultStats);
    });
  });

  describe('checkAndUnlockAchievements', () => {
    it('should return empty array when no userStats', async () => {
      const result = await useAchievementStore.getState().checkAndUnlockAchievements();
      expect(result).toEqual([]);
    });

    it('should unlock achievement when threshold is met', async () => {
      useAchievementStore.setState({
        userStats: { ...defaultStats, huntsCompleted: 1 },
        userAchievements: [],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      const result = await useAchievementStore.getState().checkAndUnlockAchievements();

      const unlockedIds = result.map(a => a.id);
      expect(unlockedIds).toContain('first_hunt');
    });

    it('should not unlock already-unlocked achievements', async () => {
      useAchievementStore.setState({
        userStats: { ...defaultStats, huntsCompleted: 1 },
        userAchievements: [{
          id: 'ua-1', oduserId: 'u1', odachievementId: 'first_hunt',
          unlockedAt: '2025-01-01', progress: 1, notified: true,
        }],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      const result = await useAchievementStore.getState().checkAndUnlockAchievements();

      const unlockedIds = result.map(a => a.id);
      expect(unlockedIds).not.toContain('first_hunt');
    });

    it('should handle speed_completion with <= comparison', async () => {
      useAchievementStore.setState({
        userStats: { ...defaultStats, fastestHuntMinutes: 10 },
        userAchievements: [],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      const result = await useAchievementStore.getState().checkAndUnlockAchievements();

      const unlockedIds = result.map(a => a.id);
      // 10 <= 15 (speed_demon threshold) and 10 <= 10 (lightning_fast threshold)
      expect(unlockedIds).toContain('speed_demon');
      expect(unlockedIds).toContain('lightning_fast');
    });

    it('should not unlock speed achievement when time exceeds threshold', async () => {
      useAchievementStore.setState({
        userStats: { ...defaultStats, fastestHuntMinutes: 20 },
        userAchievements: [],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      const result = await useAchievementStore.getState().checkAndUnlockAchievements();

      const unlockedIds = result.map(a => a.id);
      expect(unlockedIds).not.toContain('speed_demon');
      expect(unlockedIds).not.toContain('lightning_fast');
    });

    it('should post unlocked achievements to server and update local state', async () => {
      useAchievementStore.setState({
        userStats: { ...defaultStats, huntsCompleted: 1 },
        userAchievements: [],
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().checkAndUnlockAchievements();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/achievements/unlock'),
        expect.objectContaining({ method: 'POST' }),
      );

      const state = useAchievementStore.getState();
      expect(state.userAchievements.length).toBeGreaterThan(0);
      expect(state.recentUnlocks.length).toBeGreaterThan(0);
    });
  });

  describe('incrementStat', () => {
    it('should increment a stat and trigger unlock check', async () => {
      useAchievementStore.setState({ userStats: { ...defaultStats } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().incrementStat('huntsCompleted', 1);

      expect(useAchievementStore.getState().userStats!.huntsCompleted).toBe(1);
    });

    it('should return early if no userStats', async () => {
      await useAchievementStore.getState().incrementStat('huntsCompleted');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(useAchievementStore.getState().userStats).toBeNull();
    });

    it('should default increment amount to 1', async () => {
      useAchievementStore.setState({ userStats: { ...defaultStats, photosTaken: 5 } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().incrementStat('photosTaken');

      expect(useAchievementStore.getState().userStats!.photosTaken).toBe(6);
    });
  });

  describe('recordHuntCompletion', () => {
    const baseCompletionData = {
      isGroup: false, isSolo: true, isNight: false, isPerfect: false,
      timeMinutes: 30, challengeCount: 5, photoCount: 3, maxStreak: 2,
    };

    it('should update multiple stats at once', async () => {
      useAchievementStore.setState({ userStats: { ...defaultStats } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().recordHuntCompletion(baseCompletionData);

      const stats = useAchievementStore.getState().userStats!;
      expect(stats.huntsCompleted).toBe(1);
      expect(stats.challengesCompleted).toBe(5);
      expect(stats.photosTaken).toBe(3);
      expect(stats.soloHunts).toBe(1);
      expect(stats.groupHunts).toBe(0);
      expect(stats.fastestHuntMinutes).toBe(30);
    });

    it('should increment group/night/perfect hunts when applicable', async () => {
      useAchievementStore.setState({ userStats: { ...defaultStats } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().recordHuntCompletion({
        ...baseCompletionData, isGroup: true, isSolo: false, isNight: true, isPerfect: true,
      });

      const stats = useAchievementStore.getState().userStats!;
      expect(stats.groupHunts).toBe(1);
      expect(stats.nightHunts).toBe(1);
      expect(stats.perfectHunts).toBe(1);
      expect(stats.soloHunts).toBe(0);
    });

    it('should track fastest hunt time', async () => {
      useAchievementStore.setState({ userStats: { ...defaultStats, fastestHuntMinutes: 20 } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().recordHuntCompletion({ ...baseCompletionData, timeMinutes: 10 });
      expect(useAchievementStore.getState().userStats!.fastestHuntMinutes).toBe(10);
    });

    it('should not overwrite faster existing time', async () => {
      useAchievementStore.setState({ userStats: { ...defaultStats, fastestHuntMinutes: 5 } });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-token');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

      await useAchievementStore.getState().recordHuntCompletion({ ...baseCompletionData, timeMinutes: 30 });
      expect(useAchievementStore.getState().userStats!.fastestHuntMinutes).toBe(5);
    });

    it('should return empty array if no userStats', async () => {
      const result = await useAchievementStore.getState().recordHuntCompletion(baseCompletionData);
      expect(result).toEqual([]);
    });
  });

  describe('getters', () => {
    it('getAchievementsByCategory should filter by category', () => {
      const exploration = useAchievementStore.getState().getAchievementsByCategory('exploration');
      expect(exploration.length).toBeGreaterThan(0);
      expect(exploration.every(a => a.category === 'exploration')).toBe(true);
    });

    it('getUnlockedAchievements should return achievements with matching userAchievements', () => {
      useAchievementStore.setState({
        userAchievements: [{
          id: 'ua-1', oduserId: 'u1', odachievementId: 'first_hunt',
          unlockedAt: '2025-01-01', progress: 1, notified: true,
        }],
      });

      const unlocked = useAchievementStore.getState().getUnlockedAchievements();
      expect(unlocked).toHaveLength(1);
      expect(unlocked[0].id).toBe('first_hunt');
    });

    it('getLockedAchievements should return non-secret achievements not yet unlocked', () => {
      useAchievementStore.setState({
        userAchievements: [{
          id: 'ua-1', oduserId: 'u1', odachievementId: 'first_hunt',
          unlockedAt: '2025-01-01', progress: 1, notified: true,
        }],
      });

      const locked = useAchievementStore.getState().getLockedAchievements();
      const lockedIds = locked.map(a => a.id);
      expect(lockedIds).not.toContain('first_hunt');
      expect(locked.every(a => !a.isSecret)).toBe(true);
    });

    it('getProgressForAchievement should return progress or null', () => {
      const mockProgress = {
        odachievementId: 'first_hunt', odachievement: ACHIEVEMENTS[2],
        currentProgress: 0, threshold: 1, percentComplete: 0, isUnlocked: false,
      };
      useAchievementStore.setState({ achievementProgress: [mockProgress] });

      expect(useAchievementStore.getState().getProgressForAchievement('first_hunt')).toEqual(mockProgress);
      expect(useAchievementStore.getState().getProgressForAchievement('nonexistent')).toBeNull();
    });

    it('getTotalAchievementPoints should sum points of unlocked achievements', () => {
      useAchievementStore.setState({
        userAchievements: [
          { id: 'ua-1', oduserId: 'u1', odachievementId: 'first_hunt', unlockedAt: '2025-01-01', progress: 1, notified: true },
          { id: 'ua-2', oduserId: 'u1', odachievementId: 'hunt_creator', unlockedAt: '2025-01-01', progress: 1, notified: true },
        ],
      });

      const firstHunt = ACHIEVEMENTS.find(a => a.id === 'first_hunt')!;
      const huntCreator = ACHIEVEMENTS.find(a => a.id === 'hunt_creator')!;
      const expectedPoints = firstHunt.points + huntCreator.points;

      expect(useAchievementStore.getState().getTotalAchievementPoints()).toBe(expectedPoints);
    });

    it('getCompletionPercentage should calculate percentage of non-secret achievements', () => {
      const visibleCount = ACHIEVEMENTS.filter(a => !a.isSecret).length;
      useAchievementStore.setState({
        userAchievements: [
          { id: 'ua-1', oduserId: 'u1', odachievementId: 'first_hunt', unlockedAt: '2025-01-01', progress: 1, notified: true },
        ],
      });

      const expected = (1 / visibleCount) * 100;
      expect(useAchievementStore.getState().getCompletionPercentage()).toBeCloseTo(expected);
    });
  });

  describe('clearRecentUnlocks', () => {
    it('should empty recentUnlocks', () => {
      useAchievementStore.setState({ recentUnlocks: [ACHIEVEMENTS[0]] });

      useAchievementStore.getState().clearRecentUnlocks();

      expect(useAchievementStore.getState().recentUnlocks).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('should set error to null', () => {
      useAchievementStore.setState({ error: 'Something went wrong' });

      useAchievementStore.getState().clearError();

      expect(useAchievementStore.getState().error).toBeNull();
    });
  });
});
