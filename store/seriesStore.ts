import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  HuntSeries,
  SeriesChapter,
  SeriesProgress,
  StoryChoice,
  ChoicePoint,
  InventoryItem,
  CharacterStats,
  SeriesCollection,
} from '@/types/series';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface SeriesState {
  // Series data
  featuredSeries: HuntSeries[];
  allSeries: HuntSeries[];
  currentSeries: HuntSeries | null;
  currentChapter: SeriesChapter | null;

  // Progress
  seriesProgress: Record<string, SeriesProgress>;
  activeChoicePoint: ChoicePoint | null;

  // Collections
  collections: SeriesCollection[];

  // UI State
  isLoadingSeries: boolean;
  isLoadingChapter: boolean;
  showChoiceModal: boolean;
  error: string | null;

  // Actions - Series
  fetchFeaturedSeries: () => Promise<void>;
  fetchAllSeries: (genre?: string) => Promise<void>;
  fetchSeriesDetails: (seriesId: string) => Promise<void>;
  startSeries: (seriesId: string) => Promise<string | undefined>;
  continueSeries: (seriesId: string) => Promise<string | undefined>;
  resetSeriesProgress: (seriesId: string) => Promise<void>;

  // Actions - Chapters
  startChapter: (seriesId: string, chapterId: string) => Promise<string | undefined>;
  completeChapter: (seriesId: string, chapterId: string, score: number) => Promise<void>;
  unlockChapter: (seriesId: string, chapterId: string) => void;

  // Actions - Choices
  presentChoice: (choicePoint: ChoicePoint) => void;
  makeChoice: (seriesId: string, choicePointId: string, optionId: string) => Promise<void>;
  dismissChoice: () => void;

  // Actions - Inventory
  addItem: (seriesId: string, item: InventoryItem) => void;
  useItem: (seriesId: string, itemId: string, chapterId: string) => void;
  getInventory: (seriesId: string) => InventoryItem[];

  // Actions - Stats
  updateStats: (seriesId: string, changes: Partial<CharacterStats>) => void;
  getStats: (seriesId: string) => CharacterStats;

  // Actions - Endings
  achieveEnding: (seriesId: string, endingId: string) => Promise<void>;
  getAchievedEndings: (seriesId: string) => string[];

  // Actions - Collections
  fetchCollections: () => Promise<void>;
}

export const useSeriesStore = create<SeriesState>()(persist((set, get) => ({
  // Initial state
  featuredSeries: [],
  allSeries: [],
  currentSeries: null,
  currentChapter: null,
  seriesProgress: {},
  activeChoicePoint: null,
  collections: [],
  isLoadingSeries: false,
  isLoadingChapter: false,
  showChoiceModal: false,
  error: null,

  // Series
  fetchFeaturedSeries: async () => {
    set({ isLoadingSeries: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/series/featured`);
      if (!response.ok) throw new Error('Failed to load featured series');
      const data = await response.json();
      set({ featuredSeries: data.series, isLoadingSeries: false });
    } catch (error) {
      set({ error: 'Failed to load featured series', isLoadingSeries: false });
    }
  },

  fetchAllSeries: async (genre?: string) => {
    set({ isLoadingSeries: true, error: null });
    try {
      const params = genre ? `?genre=${genre}` : '';
      const response = await fetch(`${API_BASE}/series${params}`);
      if (!response.ok) throw new Error('Failed to load series');
      const data = await response.json();
      set({ allSeries: data.series, isLoadingSeries: false });
    } catch (error) {
      set({ error: 'Failed to load series', isLoadingSeries: false });
    }
  },

  fetchSeriesDetails: async (seriesId: string) => {
    set({ isLoadingSeries: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/series/${seriesId}`);
      if (!response.ok) throw new Error('Failed to load series details');
      const data = await response.json();

      set(state => ({
        currentSeries: data.series,
        seriesProgress: data.progress
          ? { ...state.seriesProgress, [seriesId]: data.progress }
          : state.seriesProgress,
        isLoadingSeries: false,
      }));
    } catch (error) {
      set({ error: 'Failed to load series details', isLoadingSeries: false });
    }
  },

  startSeries: async (seriesId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/series/${seriesId}/start`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to start series');
      const data = await response.json();

      const newProgress: SeriesProgress = {
        seriesId,
        userId: data.userId,
        status: 'in_progress',
        currentChapterId: data.firstChapterId,
        chaptersCompleted: 0,
        percentComplete: 0,
        choices: [],
        inventory: [],
        characterStats: { reputation: 0, courage: 50, wisdom: 50, charisma: 50 },
        unlockedBranches: [],
        achievedEndings: [],
        startedAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        totalPlayTime: 0,
      };

      set(state => ({
        seriesProgress: { ...state.seriesProgress, [seriesId]: newProgress },
        currentSeries: state.currentSeries
          ? { ...state.currentSeries, userProgress: newProgress }
          : null,
      }));

      return data.firstChapterId;
    } catch (error) {
      set({ error: 'Failed to start series' });
      throw error;
    }
  },

  continueSeries: async (seriesId: string) => {
    const progress = get().seriesProgress[seriesId];
    if (!progress?.currentChapterId) {
      throw new Error('No progress found');
    }
    return progress.currentChapterId;
  },

  resetSeriesProgress: async (seriesId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/series/${seriesId}/reset`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      set(state => {
        const newProgress = { ...state.seriesProgress };
        delete newProgress[seriesId];

        return {
          seriesProgress: newProgress,
          currentSeries: state.currentSeries?.id === seriesId
            ? { ...state.currentSeries, userProgress: undefined }
            : state.currentSeries,
        };
      });
    } catch (error) {
      set({ error: 'Failed to reset progress' });
      throw error;
    }
  },

  // Chapters
  startChapter: async (seriesId: string, chapterId: string) => {
    set({ isLoadingChapter: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/series/${seriesId}/chapters/${chapterId}`);
      if (!response.ok) throw new Error('Failed to load chapter');
      const data = await response.json();

      set(state => ({
        currentChapter: data.chapter,
        seriesProgress: {
          ...state.seriesProgress,
          [seriesId]: {
            ...state.seriesProgress[seriesId],
            currentChapterId: chapterId,
            lastPlayedAt: new Date().toISOString(),
          },
        },
        isLoadingChapter: false,
      }));

      return data.chapter.huntId;
    } catch (error) {
      set({ error: 'Failed to load chapter', isLoadingChapter: false });
      throw error;
    }
  },

  completeChapter: async (seriesId: string, chapterId: string, score: number) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/series/${seriesId}/chapters/${chapterId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ score }),
      });
      if (!response.ok) throw new Error('Failed to complete chapter');
      const data = await response.json();

      set(state => {
        const currentProgress = state.seriesProgress[seriesId];
        if (!currentProgress) return state;

        const series = state.currentSeries;
        const totalChapters = series?.totalChapters || 1;
        const newCompletedCount = currentProgress.chaptersCompleted + 1;

        const updatedProgress: SeriesProgress = {
          ...currentProgress,
          chaptersCompleted: newCompletedCount,
          percentComplete: (newCompletedCount / totalChapters) * 100,
          currentChapterId: data.nextChapterId || undefined,
          status: data.nextChapterId ? 'in_progress' : 'completed',
          lastPlayedAt: new Date().toISOString(),
          completedAt: !data.nextChapterId ? new Date().toISOString() : undefined,
        };

        return {
          seriesProgress: {
            ...state.seriesProgress,
            [seriesId]: updatedProgress,
          },
          currentChapter: null,
        };
      });
    } catch (error) {
      set({ error: 'Failed to complete chapter' });
      throw error;
    }
  },

  unlockChapter: (seriesId: string, chapterId: string) => {
    set(state => {
      const series = state.currentSeries;
      if (!series || series.id !== seriesId) return state;

      const updatedChapters = series.chapters.map(c =>
        c.id === chapterId ? { ...c, status: 'available' as const } : c
      );

      return {
        currentSeries: { ...series, chapters: updatedChapters },
      };
    });
  },

  // Choices
  presentChoice: (choicePoint: ChoicePoint) => {
    set({ activeChoicePoint: choicePoint, showChoiceModal: true });
  },

  makeChoice: async (seriesId: string, choicePointId: string, optionId: string) => {
    const { activeChoicePoint, seriesProgress, currentChapter } = get();
    if (!activeChoicePoint) return;

    const selectedOption = activeChoicePoint.options.find(o => o.id === optionId);
    if (!selectedOption) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/series/${seriesId}/choices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ choicePointId, optionId }),
      });
      if (!response.ok) throw new Error('Failed to save choice');

      const currentProgress = seriesProgress[seriesId];
      if (!currentProgress) return;

      const newChoice: StoryChoice = {
        id: `choice-${Date.now()}`,
        chapterId: currentChapter?.id || '',
        choicePointId,
        selectedOption: optionId,
        timestamp: new Date().toISOString(),
        affectedStats: selectedOption.statsChange,
        unlockedItems: selectedOption.itemsGained,
        triggeredBranch: selectedOption.branchUnlock,
      };

      // Apply stat changes
      const baseStats = currentProgress.characterStats || { reputation: 0, courage: 50, wisdom: 50, charisma: 50 };
      let newStats: CharacterStats = { ...baseStats };
      if (selectedOption.statsChange) {
        newStats = {
          reputation: (newStats.reputation || 0) + (selectedOption.statsChange.reputation || 0),
          courage: Math.min(100, Math.max(0, (newStats.courage || 50) + (selectedOption.statsChange.courage || 0))),
          wisdom: Math.min(100, Math.max(0, (newStats.wisdom || 50) + (selectedOption.statsChange.wisdom || 0))),
          charisma: Math.min(100, Math.max(0, (newStats.charisma || 50) + (selectedOption.statsChange.charisma || 0))),
        };
      }

      // Add new items
      let newInventory = [...currentProgress.inventory];
      if (selectedOption.itemsGained) {
        selectedOption.itemsGained.forEach(itemId => {
          newInventory.push({
            id: itemId,
            name: itemId, // Would be fetched from server
            description: '',
            icon: 'cube',
            obtainedInChapter: currentChapter?.id || '',
            obtainedAt: new Date().toISOString(),
            isKeyItem: false,
            isConsumable: false,
          });
        });
      }

      // Remove used items
      if (selectedOption.itemsLost) {
        newInventory = newInventory.filter(i => !selectedOption.itemsLost?.includes(i.id));
      }

      // Unlock branch
      let newBranches = [...currentProgress.unlockedBranches];
      if (selectedOption.branchUnlock && !newBranches.includes(selectedOption.branchUnlock)) {
        newBranches.push(selectedOption.branchUnlock);
      }

      set(state => ({
        seriesProgress: {
          ...state.seriesProgress,
          [seriesId]: {
            ...currentProgress,
            choices: [...currentProgress.choices, newChoice],
            characterStats: newStats,
            inventory: newInventory,
            unlockedBranches: newBranches,
            currentBranch: selectedOption.branchUnlock || currentProgress.currentBranch,
          },
        },
        activeChoicePoint: null,
        showChoiceModal: false,
      }));

      // Check if this choice triggers an ending
      if (selectedOption.endingId) {
        get().achieveEnding(seriesId, selectedOption.endingId);
      }
    } catch (error) {
      set({ error: 'Failed to save choice' });
      throw error;
    }
  },

  dismissChoice: () => {
    set({ activeChoicePoint: null, showChoiceModal: false });
  },

  // Inventory
  addItem: (seriesId: string, item: InventoryItem) => {
    set(state => {
      const progress = state.seriesProgress[seriesId];
      if (!progress) return state;

      return {
        seriesProgress: {
          ...state.seriesProgress,
          [seriesId]: {
            ...progress,
            inventory: [...progress.inventory, item],
          },
        },
      };
    });
  },

  useItem: (seriesId: string, itemId: string, chapterId: string) => {
    set(state => {
      const progress = state.seriesProgress[seriesId];
      if (!progress) return state;

      const item = progress.inventory.find(i => i.id === itemId);
      if (!item) return state;

      let newInventory: InventoryItem[];
      if (item.isConsumable) {
        newInventory = progress.inventory.filter(i => i.id !== itemId);
      } else {
        newInventory = progress.inventory.map(i =>
          i.id === itemId ? { ...i, usedInChapter: chapterId } : i
        );
      }

      return {
        seriesProgress: {
          ...state.seriesProgress,
          [seriesId]: {
            ...progress,
            inventory: newInventory,
          },
        },
      };
    });
  },

  getInventory: (seriesId: string) => {
    return get().seriesProgress[seriesId]?.inventory || [];
  },

  // Stats
  updateStats: (seriesId: string, changes: Partial<CharacterStats>) => {
    set(state => {
      const progress = state.seriesProgress[seriesId];
      if (!progress?.characterStats) return state;

      const currentStats = progress.characterStats;
      const newStats: CharacterStats = {
        reputation: currentStats.reputation + (changes.reputation || 0),
        courage: Math.min(100, Math.max(0, currentStats.courage + (changes.courage || 0))),
        wisdom: Math.min(100, Math.max(0, currentStats.wisdom + (changes.wisdom || 0))),
        charisma: Math.min(100, Math.max(0, currentStats.charisma + (changes.charisma || 0))),
      };

      return {
        seriesProgress: {
          ...state.seriesProgress,
          [seriesId]: {
            ...progress,
            characterStats: newStats,
          },
        },
      };
    });
  },

  getStats: (seriesId: string) => {
    return get().seriesProgress[seriesId]?.characterStats || {
      reputation: 0,
      courage: 50,
      wisdom: 50,
      charisma: 50,
    };
  },

  // Endings
  achieveEnding: async (seriesId: string, endingId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/series/${seriesId}/endings/${endingId}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to save ending');

      set(state => {
        const progress = state.seriesProgress[seriesId];
        if (!progress) return state;

        return {
          seriesProgress: {
            ...state.seriesProgress,
            [seriesId]: {
              ...progress,
              achievedEndings: [...progress.achievedEndings, endingId],
              status: 'completed',
              completedAt: new Date().toISOString(),
            },
          },
        };
      });
    } catch (error) {
      set({ error: 'Failed to save ending' });
    }
  },

  getAchievedEndings: (seriesId: string) => {
    return get().seriesProgress[seriesId]?.achievedEndings || [];
  },

  // Collections
  fetchCollections: async () => {
    try {
      const response = await fetch(`${API_BASE}/series/collections`);
      if (!response.ok) throw new Error('Failed to load collections');
      const data = await response.json();
      set({ collections: data.collections });
    } catch (error) {
      set({ error: 'Failed to load collections' });
    }
  },
}), {
  name: 'series-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    seriesProgress: state.seriesProgress,
    collections: state.collections,
  }),
}));
