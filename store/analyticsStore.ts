import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  HuntAnalytics,
  ChallengeAnalytics,
  HuntAnalyticsSummary,
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsFilters,
  AnalyticsTrend,
} from '@/types/analytics';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface AnalyticsStore {
  // State
  huntAnalytics: Record<string, HuntAnalytics>;
  challengeAnalytics: Record<string, ChallengeAnalytics[]>;
  summaries: Record<string, HuntAnalyticsSummary>;
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHuntAnalytics: (huntId: string) => Promise<HuntAnalytics | null>;
  fetchChallengeAnalytics: (huntId: string) => Promise<ChallengeAnalytics[]>;
  fetchAnalyticsSummary: (huntId: string, period?: 'day' | 'week' | 'month' | 'all') => Promise<HuntAnalyticsSummary | null>;
  fetchCreatorDashboard: () => Promise<HuntAnalytics[]>;

  // Event tracking
  startSession: (huntId: string) => string;
  endSession: (data: {
    completed: boolean;
    score: number;
    challengesCompleted: number;
    maxStreak: number;
  }) => Promise<void>;
  trackEvent: (
    type: AnalyticsEventType,
    huntId: string,
    data?: Record<string, unknown>,
    challengeId?: string
  ) => Promise<void>;

  // Rating
  submitRating: (huntId: string, rating: number, feedback?: string) => Promise<void>;
  submitChallengeFeedback: (
    huntId: string,
    challengeId: string,
    difficulty: number,
    feedback?: string
  ) => Promise<void>;

  // Utility
  generateSessionId: () => string;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  huntAnalytics: {},
  challengeAnalytics: {},
  summaries: {},
  currentSessionId: null,
  isLoading: false,
  error: null,

  fetchHuntAnalytics: async (huntId) => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/analytics/hunts/${huntId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hunt analytics');
      }

      const data = await response.json();
      const analytics = data.analytics as HuntAnalytics;

      set((state) => ({
        huntAnalytics: { ...state.huntAnalytics, [huntId]: analytics },
        isLoading: false,
      }));

      return analytics;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  fetchChallengeAnalytics: async (huntId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/analytics/hunts/${huntId}/challenges`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch challenge analytics');
      }

      const data = await response.json();
      const challenges = data.challenges as ChallengeAnalytics[];

      set((state) => ({
        challengeAnalytics: { ...state.challengeAnalytics, [huntId]: challenges },
      }));

      return challenges;
    } catch (error) {
      console.error('Failed to fetch challenge analytics:', error);
      return [];
    }
  },

  fetchAnalyticsSummary: async (huntId, period = 'week') => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${API_BASE}/analytics/hunts/${huntId}/summary?period=${period}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics summary');
      }

      const data = await response.json();
      const summary = data.summary as HuntAnalyticsSummary;

      set((state) => ({
        summaries: { ...state.summaries, [`${huntId}-${period}`]: summary },
      }));

      return summary;
    } catch (error) {
      console.error('Failed to fetch analytics summary:', error);
      return null;
    }
  },

  fetchCreatorDashboard: async () => {
    set({ isLoading: true, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/analytics/creator/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch creator dashboard');
      }

      const data = await response.json();
      const hunts = data.hunts as HuntAnalytics[];

      // Store all hunt analytics
      const analyticsMap: Record<string, HuntAnalytics> = {};
      for (const hunt of hunts) {
        analyticsMap[hunt.huntId] = hunt;
      }

      set({
        huntAnalytics: { ...get().huntAnalytics, ...analyticsMap },
        isLoading: false,
      });

      return hunts;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  startSession: (huntId) => {
    const sessionId = get().generateSessionId();
    set({ currentSessionId: sessionId });

    // Track session start
    get().trackEvent('hunt_started', huntId, { sessionId });

    return sessionId;
  },

  endSession: async (data) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${API_BASE}/analytics/sessions/${currentSessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          completed: data.completed,
          totalScore: data.score,
          challengesCompleted: data.challengesCompleted,
          maxStreak: data.maxStreak,
          dropOffReason: data.completed ? 'completed' : 'quit',
        }),
      });
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }

    set({ currentSessionId: null });
  },

  trackEvent: async (type, huntId, data = {}, challengeId) => {
    const { currentSessionId } = get();

    const event: Partial<AnalyticsEvent> = {
      type,
      huntId,
      sessionId: currentSessionId || undefined,
      challengeId,
      data,
      timestamp: new Date().toISOString(),
    };

    // Fire and forget - don't block on analytics
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        fetch(`${API_BASE}/analytics/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(event),
        }).catch(() => {});
      }
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
    }
  },

  submitRating: async (huntId, rating, feedback) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE}/analytics/hunts/${huntId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, feedback }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }

      // Refresh hunt analytics to get updated rating
      get().fetchHuntAnalytics(huntId);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      throw error;
    }
  },

  submitChallengeFeedback: async (huntId, challengeId, difficulty, feedback) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${API_BASE}/analytics/challenges/${challengeId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ huntId, difficulty, feedback }),
      });
    } catch (error) {
      console.error('Failed to submit challenge feedback:', error);
    }
  },

  generateSessionId: () => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useAnalyticsStore;
