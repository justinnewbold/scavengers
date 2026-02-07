import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Achievement,
  AchievementProgress,
  UserAchievement,
  AchievementCategory,
} from '@/types/achievements';
import { ACHIEVEMENTS, RARITY_COLORS } from '@/types/achievements';
import { useAuthStore } from './authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface UserStats {
  huntsCompleted: number;
  challengesCompleted: number;
  totalPoints: number;
  streakDays: number;
  maxStreak: number;
  huntsCreated: number;
  totalHuntPlays: number;
  groupHunts: number;
  soloHunts: number;
  citiesVisited: number;
  nightHunts: number;
  perfectHunts: number;
  photosTaken: number;
  tagsMade: number;
  bountiesClaimed: number;
  alliancesFormed: number;
  sabotagesDeployed: number;
  fastestHuntMinutes: number | null;
}

interface AchievementStore {
  // State
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  achievementProgress: AchievementProgress[];
  userStats: UserStats | null;
  recentUnlocks: Achievement[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAchievements: () => Promise<void>;
  fetchUserAchievements: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  checkAndUnlockAchievements: () => Promise<Achievement[]>;
  markAchievementNotified: (achievementId: string) => Promise<void>;

  // Stat updates (called after various actions)
  incrementStat: (stat: keyof UserStats, amount?: number) => Promise<void>;
  recordHuntCompletion: (data: {
    isGroup: boolean;
    isSolo: boolean;
    isNight: boolean;
    isPerfect: boolean;
    timeMinutes: number;
    city?: string;
    challengeCount: number;
    photoCount: number;
    maxStreak: number;
  }) => Promise<Achievement[]>;

  // Getters
  getAchievementsByCategory: (category: AchievementCategory) => Achievement[];
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getProgressForAchievement: (achievementId: string) => AchievementProgress | null;
  getTotalAchievementPoints: () => number;
  getCompletionPercentage: () => number;

  // Utility
  clearRecentUnlocks: () => void;
  clearError: () => void;
}

const defaultStats: UserStats = {
  huntsCompleted: 0,
  challengesCompleted: 0,
  totalPoints: 0,
  streakDays: 0,
  maxStreak: 0,
  huntsCreated: 0,
  totalHuntPlays: 0,
  groupHunts: 0,
  soloHunts: 0,
  citiesVisited: 0,
  nightHunts: 0,
  perfectHunts: 0,
  photosTaken: 0,
  tagsMade: 0,
  bountiesClaimed: 0,
  alliancesFormed: 0,
  sabotagesDeployed: 0,
  fastestHuntMinutes: null,
};

export const useAchievementStore = create<AchievementStore>()(persist((set, get) => ({
  achievements: ACHIEVEMENTS,
  userAchievements: [],
  achievementProgress: [],
  userStats: null,
  recentUnlocks: [],
  isLoading: false,
  error: null,

  fetchAchievements: async () => {
    // Achievements are defined client-side, but we can fetch any server additions
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/achievements`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Merge with local achievements
        const serverAchievements = data.achievements || [];
        const merged = [...ACHIEVEMENTS];

        for (const serverAch of serverAchievements) {
          if (!merged.find(a => a.id === serverAch.id)) {
            merged.push(serverAch);
          }
        }

        set({ achievements: merged });
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  },

  fetchUserAchievements: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/achievements/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user achievements');
      }

      const data = await response.json();
      set({
        userAchievements: data.achievements || [],
        achievementProgress: data.progress || [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUserStats: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/achievements/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        set({ userStats: data.stats || defaultStats });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      set({ userStats: defaultStats });
    }
  },

  checkAndUnlockAchievements: async () => {
    const { achievements, userAchievements, userStats } = get();
    if (!userStats) return [];

    const newUnlocks: Achievement[] = [];
    const unlockedIds = new Set(userAchievements.map(ua => ua.odachievementId));

    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const { type, threshold } = achievement.requirement;
      let currentValue = 0;

      // Map requirement type to user stat
      switch (type) {
        case 'hunts_completed':
          currentValue = userStats.huntsCompleted;
          break;
        case 'challenges_completed':
          currentValue = userStats.challengesCompleted;
          break;
        case 'total_points':
          currentValue = userStats.totalPoints;
          break;
        case 'streak_days':
          currentValue = userStats.streakDays;
          break;
        case 'current_streak':
          currentValue = userStats.maxStreak;
          break;
        case 'hunts_created':
          currentValue = userStats.huntsCreated;
          break;
        case 'hunt_plays':
          currentValue = userStats.totalHuntPlays;
          break;
        case 'group_hunts':
          currentValue = userStats.groupHunts;
          break;
        case 'solo_hunts':
          currentValue = userStats.soloHunts;
          break;
        case 'cities_visited':
          currentValue = userStats.citiesVisited;
          break;
        case 'night_hunts':
          currentValue = userStats.nightHunts;
          break;
        case 'perfect_verification':
          currentValue = userStats.perfectHunts;
          break;
        case 'speed_completion':
          currentValue = userStats.fastestHuntMinutes ?? Infinity;
          // For speed, we check if less than threshold
          if (currentValue <= threshold) {
            newUnlocks.push(achievement);
          }
          continue;
        case 'photos_taken':
          currentValue = userStats.photosTaken;
          break;
        case 'tags_made':
          currentValue = userStats.tagsMade;
          break;
        case 'bounties_claimed':
          currentValue = userStats.bountiesClaimed;
          break;
        case 'alliances_formed':
          currentValue = userStats.alliancesFormed;
          break;
        case 'sabotages_deployed':
          currentValue = userStats.sabotagesDeployed;
          break;
        default:
          continue;
      }

      if (currentValue >= threshold) {
        newUnlocks.push(achievement);
      }
    }

    // Unlock achievements on server
    if (newUnlocks.length > 0) {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          await fetch(`${API_BASE}/achievements/unlock`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              achievementIds: newUnlocks.map(a => a.id),
            }),
          });
        }
      } catch (error) {
        console.error('Failed to unlock achievements on server:', error);
      }

      // Update local state
      const userId = useAuthStore.getState().user?.id || '';
      const newUserAchievements: UserAchievement[] = newUnlocks.map(a => ({
        id: `local-${a.id}-${Date.now()}`,
        oduserId: userId,
        odachievementId: a.id,
        unlockedAt: new Date().toISOString(),
        progress: a.requirement.threshold,
        notified: false,
      }));

      set({
        userAchievements: [...userAchievements, ...newUserAchievements],
        recentUnlocks: [...get().recentUnlocks, ...newUnlocks],
      });
    }

    return newUnlocks;
  },

  markAchievementNotified: async (achievementId) => {
    const { userAchievements } = get();

    set({
      userAchievements: userAchievements.map(ua =>
        ua.odachievementId === achievementId ? { ...ua, notified: true } : ua
      ),
    });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE}/achievements/${achievementId}/notified`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Failed to mark achievement notified:', error);
    }
  },

  incrementStat: async (stat, amount = 1) => {
    const { userStats } = get();
    if (!userStats) return;

    const newStats = {
      ...userStats,
      [stat]: (userStats[stat] as number) + amount,
    };

    set({ userStats: newStats });

    // Sync to server
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE}/achievements/stats`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [stat]: amount }),
        });
      }
    } catch (error) {
      console.error('Failed to sync stat:', error);
    }

    // Check for new achievements
    await get().checkAndUnlockAchievements();
  },

  recordHuntCompletion: async (data) => {
    const { userStats } = get();
    if (!userStats) return [];

    const newStats: UserStats = {
      ...userStats,
      huntsCompleted: userStats.huntsCompleted + 1,
      challengesCompleted: userStats.challengesCompleted + data.challengeCount,
      photosTaken: userStats.photosTaken + data.photoCount,
      maxStreak: Math.max(userStats.maxStreak, data.maxStreak),
    };

    if (data.isGroup) newStats.groupHunts++;
    if (data.isSolo) newStats.soloHunts++;
    if (data.isNight) newStats.nightHunts++;
    if (data.isPerfect) newStats.perfectHunts++;

    // Track fastest completion
    if (
      newStats.fastestHuntMinutes === null ||
      data.timeMinutes < newStats.fastestHuntMinutes
    ) {
      newStats.fastestHuntMinutes = data.timeMinutes;
    }

    set({ userStats: newStats });

    // Sync to server
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE}/achievements/record-hunt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      }
    } catch (error) {
      console.error('Failed to record hunt completion:', error);
    }

    // Check for new achievements
    return get().checkAndUnlockAchievements();
  },

  getAchievementsByCategory: (category) => {
    return get().achievements.filter(a => a.category === category);
  },

  getUnlockedAchievements: () => {
    const { achievements, userAchievements } = get();
    const unlockedIds = new Set(userAchievements.map(ua => ua.odachievementId));
    return achievements.filter(a => unlockedIds.has(a.id));
  },

  getLockedAchievements: () => {
    const { achievements, userAchievements } = get();
    const unlockedIds = new Set(userAchievements.map(ua => ua.odachievementId));
    return achievements.filter(a => !unlockedIds.has(a.id) && !a.isSecret);
  },

  getProgressForAchievement: (achievementId) => {
    const { achievementProgress } = get();
    return achievementProgress.find(p => p.odachievementId === achievementId) || null;
  },

  getTotalAchievementPoints: () => {
    const unlocked = get().getUnlockedAchievements();
    return unlocked.reduce((sum, a) => sum + a.points, 0);
  },

  getCompletionPercentage: () => {
    const { achievements, userAchievements } = get();
    const visibleAchievements = achievements.filter(a => !a.isSecret);
    if (visibleAchievements.length === 0) return 0;
    return (userAchievements.length / visibleAchievements.length) * 100;
  },

  clearRecentUnlocks: () => {
    set({ recentUnlocks: [] });
  },

  clearError: () => {
    set({ error: null });
  },
}), {
  name: 'achievement-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    userAchievements: state.userAchievements,
    achievementProgress: state.achievementProgress,
    userStats: state.userStats,
  }),
}));

export default useAchievementStore;
