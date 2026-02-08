import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Hunt } from '@/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface DailyHuntState {
  dailyHunt: Hunt | null;
  dailyDate: string | null; // ISO date string (YYYY-MM-DD)
  completedDailyIds: string[]; // Track which daily hunts the user has completed
  isLoading: boolean;
  error: string | null;

  fetchDailyHunt: () => Promise<void>;
  markDailyCompleted: (huntId: string) => void;
  isDailyCompleted: () => boolean;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export const useDailyHuntStore = create<DailyHuntState>()(
  persist(
    (set, get) => ({
      dailyHunt: null,
      dailyDate: null,
      completedDailyIds: [],
      isLoading: false,
      error: null,

      fetchDailyHunt: async () => {
        const today = getTodayDate();

        // If we already have today's hunt cached, skip the fetch
        if (get().dailyDate === today && get().dailyHunt) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const token = await AsyncStorage.getItem('auth_token');
          const headers: Record<string, string> = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(`${API_BASE}/hunts/daily`, { headers });
          if (!response.ok) throw new Error('Failed to fetch daily hunt');
          const data = await response.json();

          set({
            dailyHunt: data.hunt,
            dailyDate: today,
            isLoading: false,
          });
        } catch {
          set({ error: 'Failed to load daily hunt', isLoading: false });
        }
      },

      markDailyCompleted: (huntId: string) => {
        set((state) => ({
          completedDailyIds: [...new Set([...state.completedDailyIds, huntId])],
        }));
      },

      isDailyCompleted: () => {
        const { dailyHunt, completedDailyIds } = get();
        return dailyHunt?.id ? completedDailyIds.includes(dailyHunt.id) : false;
      },
    }),
    {
      name: 'daily-hunt-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dailyHunt: state.dailyHunt,
        dailyDate: state.dailyDate,
        completedDailyIds: state.completedDailyIds,
      }),
    }
  )
);
