import { create } from 'zustand';
import type {
  SeasonalEvent,
  EventChallenge,
  EventProgress,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardScope,
  LeaderboardPeriod,
  LeaderboardMetric,
} from '@/types/events';

interface EventsState {
  // Events
  activeEvents: SeasonalEvent[];
  upcomingEvents: SeasonalEvent[];
  pastEvents: SeasonalEvent[];
  currentEvent: SeasonalEvent | null;

  // Leaderboards
  globalLeaderboard: Leaderboard | null;
  regionalLeaderboard: Leaderboard | null;
  friendsLeaderboard: Leaderboard | null;
  eventLeaderboard: Leaderboard | null;

  // User rankings
  userGlobalRank: number | null;
  userRegionalRank: number | null;

  // UI State
  isLoadingEvents: boolean;
  isLoadingLeaderboard: boolean;
  selectedLeaderboardScope: LeaderboardScope;
  selectedLeaderboardPeriod: LeaderboardPeriod;
  selectedLeaderboardMetric: LeaderboardMetric;
  error: string | null;

  // Actions - Events
  fetchActiveEvents: () => Promise<void>;
  fetchEventDetails: (eventId: string) => Promise<void>;
  joinEvent: (eventId: string) => Promise<void>;
  completeChallenge: (eventId: string, challengeId: string) => Promise<void>;
  claimReward: (eventId: string, rewardId: string) => Promise<void>;
  updateChallengeProgress: (eventId: string, challengeId: string, progress: number) => void;

  // Actions - Leaderboards
  fetchLeaderboard: (scope: LeaderboardScope, period: LeaderboardPeriod, metric: LeaderboardMetric) => Promise<void>;
  fetchUserRank: () => Promise<void>;
  setLeaderboardFilters: (scope: LeaderboardScope, period: LeaderboardPeriod, metric: LeaderboardMetric) => void;
  loadMoreLeaderboardEntries: (leaderboardId: string) => Promise<void>;

  // Helpers
  getEventTimeRemaining: (eventId: string) => { days: number; hours: number; minutes: number } | null;
  isEventActive: (eventId: string) => boolean;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  // Initial state
  activeEvents: [],
  upcomingEvents: [],
  pastEvents: [],
  currentEvent: null,
  globalLeaderboard: null,
  regionalLeaderboard: null,
  friendsLeaderboard: null,
  eventLeaderboard: null,
  userGlobalRank: null,
  userRegionalRank: null,
  isLoadingEvents: false,
  isLoadingLeaderboard: false,
  selectedLeaderboardScope: 'global',
  selectedLeaderboardPeriod: 'weekly',
  selectedLeaderboardMetric: 'total_score',
  error: null,

  // Events
  fetchActiveEvents: async () => {
    set({ isLoadingEvents: true, error: null });
    try {
      const response = await fetch('/api/events');
      const data = await response.json();

      set({
        activeEvents: data.active,
        upcomingEvents: data.upcoming,
        pastEvents: data.past,
        isLoadingEvents: false,
      });
    } catch (error) {
      set({ error: 'Failed to load events', isLoadingEvents: false });
    }
  },

  fetchEventDetails: async (eventId: string) => {
    set({ isLoadingEvents: true, error: null });
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      set({
        currentEvent: data.event,
        isLoadingEvents: false,
      });

      // Also fetch event leaderboard
      get().fetchLeaderboard('global', 'event', 'total_score');
    } catch (error) {
      set({ error: 'Failed to load event details', isLoadingEvents: false });
    }
  },

  joinEvent: async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/join`, {
        method: 'POST',
      });
      const data = await response.json();

      set(state => ({
        currentEvent: state.currentEvent?.id === eventId
          ? { ...state.currentEvent, userProgress: data.progress }
          : state.currentEvent,
        activeEvents: state.activeEvents.map(e =>
          e.id === eventId
            ? { ...e, userProgress: data.progress, participantCount: e.participantCount + 1 }
            : e
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to join event' });
      throw error;
    }
  },

  completeChallenge: async (eventId: string, challengeId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/challenges/${challengeId}/complete`, {
        method: 'POST',
      });
      const data = await response.json();

      set(state => {
        if (!state.currentEvent || state.currentEvent.id !== eventId) {
          return state;
        }

        const updatedChallenges = state.currentEvent.exclusiveChallenges.map(c =>
          c.id === challengeId
            ? { ...c, isCompleted: true, completedAt: new Date().toISOString() }
            : c
        );

        return {
          currentEvent: {
            ...state.currentEvent,
            exclusiveChallenges: updatedChallenges,
            userProgress: data.progress,
          },
        };
      });
    } catch (error) {
      set({ error: 'Failed to complete challenge' });
      throw error;
    }
  },

  claimReward: async (eventId: string, rewardId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/rewards/${rewardId}/claim`, {
        method: 'POST',
      });
      const data = await response.json();

      set(state => {
        if (!state.currentEvent || state.currentEvent.id !== eventId) {
          return state;
        }

        const updatedRewards = state.currentEvent.rewards.map(r =>
          r.id === rewardId
            ? { ...r, isUnlocked: true, unlockedAt: new Date().toISOString() }
            : r
        );

        return {
          currentEvent: {
            ...state.currentEvent,
            rewards: updatedRewards,
            userProgress: data.progress,
          },
        };
      });
    } catch (error) {
      set({ error: 'Failed to claim reward' });
      throw error;
    }
  },

  updateChallengeProgress: (eventId: string, challengeId: string, progress: number) => {
    set(state => {
      if (!state.currentEvent || state.currentEvent.id !== eventId) {
        return state;
      }

      const updatedChallenges = state.currentEvent.exclusiveChallenges.map(c =>
        c.id === challengeId ? { ...c, currentValue: progress } : c
      );

      return {
        currentEvent: {
          ...state.currentEvent,
          exclusiveChallenges: updatedChallenges,
        },
      };
    });
  },

  // Leaderboards
  fetchLeaderboard: async (scope: LeaderboardScope, period: LeaderboardPeriod, metric: LeaderboardMetric) => {
    set({
      isLoadingLeaderboard: true,
      error: null,
      selectedLeaderboardScope: scope,
      selectedLeaderboardPeriod: period,
      selectedLeaderboardMetric: metric,
    });

    try {
      const params = new URLSearchParams({ scope, period, metric });
      const response = await fetch(`/api/leaderboards?${params}`);
      const data = await response.json();

      const leaderboardKey = `${scope}Leaderboard` as keyof Pick<
        EventsState,
        'globalLeaderboard' | 'regionalLeaderboard' | 'friendsLeaderboard' | 'eventLeaderboard'
      >;

      set({
        [leaderboardKey]: data.leaderboard,
        isLoadingLeaderboard: false,
      } as Partial<EventsState>);
    } catch (error) {
      set({ error: 'Failed to load leaderboard', isLoadingLeaderboard: false });
    }
  },

  fetchUserRank: async () => {
    try {
      const response = await fetch('/api/leaderboards/my-rank');
      const data = await response.json();

      set({
        userGlobalRank: data.globalRank,
        userRegionalRank: data.regionalRank,
      });
    } catch (error) {
      set({ error: 'Failed to load your rank' });
    }
  },

  setLeaderboardFilters: (scope: LeaderboardScope, period: LeaderboardPeriod, metric: LeaderboardMetric) => {
    set({
      selectedLeaderboardScope: scope,
      selectedLeaderboardPeriod: period,
      selectedLeaderboardMetric: metric,
    });
    get().fetchLeaderboard(scope, period, metric);
  },

  loadMoreLeaderboardEntries: async (leaderboardId: string) => {
    const { globalLeaderboard, regionalLeaderboard, friendsLeaderboard, eventLeaderboard } = get();
    const leaderboard = [globalLeaderboard, regionalLeaderboard, friendsLeaderboard, eventLeaderboard]
      .find(l => l?.id === leaderboardId);

    if (!leaderboard) return;

    const offset = leaderboard.entries.length;

    try {
      const response = await fetch(`/api/leaderboards/${leaderboardId}?offset=${offset}&limit=50`);
      const data = await response.json();

      // Update the appropriate leaderboard
      const updateLeaderboard = (lb: Leaderboard | null) => {
        if (lb?.id === leaderboardId) {
          return {
            ...lb,
            entries: [...lb.entries, ...data.entries],
          };
        }
        return lb;
      };

      set(state => ({
        globalLeaderboard: updateLeaderboard(state.globalLeaderboard),
        regionalLeaderboard: updateLeaderboard(state.regionalLeaderboard),
        friendsLeaderboard: updateLeaderboard(state.friendsLeaderboard),
        eventLeaderboard: updateLeaderboard(state.eventLeaderboard),
      }));
    } catch (error) {
      set({ error: 'Failed to load more entries' });
    }
  },

  // Helpers
  getEventTimeRemaining: (eventId: string) => {
    const { activeEvents, upcomingEvents } = get();
    const event = [...activeEvents, ...upcomingEvents].find(e => e.id === eventId);

    if (!event) return null;

    const now = new Date();
    const endDate = new Date(event.endDate);
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  },

  isEventActive: (eventId: string) => {
    const { activeEvents } = get();
    const event = activeEvents.find(e => e.id === eventId);

    if (!event) return false;

    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    return now >= startDate && now <= endDate;
  },
}));
