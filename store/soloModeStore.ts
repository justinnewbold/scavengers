import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Hunt, Challenge } from '@/types';

// Solo hunt types
export type SoloHuntType = 'quick' | 'explorer' | 'challenge' | 'custom';
export type SoloEnvironment = 'outdoor' | 'indoor' | 'any';

export interface SoloHuntConfig {
  type: SoloHuntType;
  theme?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challengeCount: number;
  environment: SoloEnvironment;
  duration: number; // in minutes
  useCurrentLocation: boolean;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export interface SoloHuntResult {
  id: string;
  huntId: string;
  huntTitle: string;
  config: SoloHuntConfig;
  score: number;
  bonusPoints: number;
  totalPoints: number;
  challengesCompleted: number;
  totalChallenges: number;
  timeElapsed: number; // in seconds
  bestStreak: number;
  completedAt: string;
  personalBest?: boolean;
}

export interface SoloHuntSession {
  id: string;
  hunt: Hunt;
  config: SoloHuntConfig;
  startedAt: string;
  completedChallenges: string[];
  score: number;
  bonusPoints: number;
  currentStreak: number;
  bestStreak: number;
  timeElapsed: number;
  isPaused: boolean;
}

export interface PersonalRecord {
  huntType: SoloHuntType;
  difficulty: 'easy' | 'medium' | 'hard';
  bestScore: number;
  bestTime: number; // in seconds
  bestStreak: number;
  totalCompleted: number;
  lastPlayedAt: string;
}

interface SoloModeState {
  // Active session
  activeSession: SoloHuntSession | null;

  // History
  history: SoloHuntResult[];

  // Personal records by type and difficulty
  personalRecords: Record<string, PersonalRecord>;

  // Stats
  totalSoloHuntsCompleted: number;
  totalSoloPointsEarned: number;
  currentDailyStreak: number;
  lastPlayedDate: string | null;

  // Loading state
  isGenerating: boolean;
  error: string | null;

  // Actions
  startSoloHunt: (config: SoloHuntConfig) => Promise<Hunt | null>;
  pauseSession: () => void;
  resumeSession: () => void;
  updateSession: (updates: Partial<SoloHuntSession>) => void;
  completeChallenge: (challengeId: string, points: number, bonus: number) => void;
  finishSoloHunt: () => SoloHuntResult | null;
  abandonSoloHunt: () => void;
  getPersonalBest: (type: SoloHuntType, difficulty: string) => PersonalRecord | null;
  clearHistory: () => void;
  clearError: () => void;
}

// Quick hunt presets
export const SOLO_HUNT_PRESETS: Record<SoloHuntType, Partial<SoloHuntConfig>> = {
  quick: {
    challengeCount: 5,
    duration: 10,
    difficulty: 'easy',
  },
  explorer: {
    challengeCount: 10,
    duration: 30,
    difficulty: 'medium',
  },
  challenge: {
    challengeCount: 15,
    duration: 45,
    difficulty: 'hard',
  },
  custom: {
    challengeCount: 8,
    duration: 20,
    difficulty: 'medium',
  },
};

// Theme options for solo hunts
export const SOLO_THEMES = [
  { id: 'surprise', label: 'Surprise Me!', icon: 'shuffle', description: 'Random theme' },
  { id: 'nature', label: 'Nature', icon: 'leaf', description: 'Plants, animals, outdoors' },
  { id: 'urban', label: 'Urban Explorer', icon: 'business', description: 'City sights & architecture' },
  { id: 'photo', label: 'Photo Quest', icon: 'camera', description: 'Creative photography' },
  { id: 'fitness', label: 'Active Adventure', icon: 'fitness', description: 'Movement challenges' },
  { id: 'mindful', label: 'Mindful Walk', icon: 'happy', description: 'Peaceful observations' },
  { id: 'color', label: 'Color Hunt', icon: 'color-palette', description: 'Find specific colors' },
  { id: 'texture', label: 'Texture Quest', icon: 'hand-left', description: 'Find interesting textures' },
];

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

function generateSessionId(): string {
  return `solo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRecordKey(type: SoloHuntType, difficulty: string): string {
  return `${type}_${difficulty}`;
}

export const useSoloModeStore = create<SoloModeState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeSession: null,
      history: [],
      personalRecords: {},
      totalSoloHuntsCompleted: 0,
      totalSoloPointsEarned: 0,
      currentDailyStreak: 0,
      lastPlayedDate: null,
      isGenerating: false,
      error: null,

      // Start a new solo hunt
      startSoloHunt: async (config: SoloHuntConfig) => {
        set({ isGenerating: true, error: null });

        try {
          // Generate hunt using AI
          const theme = config.theme === 'surprise' || !config.theme
            ? SOLO_THEMES[Math.floor(Math.random() * (SOLO_THEMES.length - 1)) + 1].id
            : config.theme;

          const response = await fetch(`${API_BASE}/solo/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              theme,
              difficulty: config.difficulty,
              challengeCount: config.challengeCount,
              duration: config.duration,
              environment: config.environment,
              latitude: config.latitude,
              longitude: config.longitude,
              locationName: config.locationName,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate solo hunt');
          }

          const { hunt, challenges } = await response.json();

          // Create full hunt object
          const soloHunt: Hunt = {
            id: `solo_hunt_${Date.now()}`,
            title: hunt.title,
            description: hunt.description,
            difficulty: config.difficulty,
            is_public: false,
            status: 'active',
            challenges: challenges.map((c: Challenge, index: number) => ({
              ...c,
              id: `solo_challenge_${Date.now()}_${index}`,
              order_index: index,
            })),
            created_at: new Date().toISOString(),
          };

          // Create session
          const session: SoloHuntSession = {
            id: generateSessionId(),
            hunt: soloHunt,
            config,
            startedAt: new Date().toISOString(),
            completedChallenges: [],
            score: 0,
            bonusPoints: 0,
            currentStreak: 0,
            bestStreak: 0,
            timeElapsed: 0,
            isPaused: false,
          };

          set({ activeSession: session, isGenerating: false });
          return soloHunt;
        } catch (error) {
          console.error('Solo hunt generation error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to start solo hunt',
            isGenerating: false,
          });
          return null;
        }
      },

      // Pause current session
      pauseSession: () => {
        const { activeSession } = get();
        if (activeSession) {
          set({ activeSession: { ...activeSession, isPaused: true } });
        }
      },

      // Resume current session
      resumeSession: () => {
        const { activeSession } = get();
        if (activeSession) {
          set({ activeSession: { ...activeSession, isPaused: false } });
        }
      },

      // Update session (e.g., time elapsed)
      updateSession: (updates: Partial<SoloHuntSession>) => {
        const { activeSession } = get();
        if (activeSession) {
          set({ activeSession: { ...activeSession, ...updates } });
        }
      },

      // Complete a challenge
      completeChallenge: (challengeId: string, points: number, bonus: number) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const newCompletedChallenges = [...activeSession.completedChallenges, challengeId];
        const newScore = activeSession.score + points;
        const newBonusPoints = activeSession.bonusPoints + bonus;
        const newStreak = activeSession.currentStreak + 1;
        const newBestStreak = Math.max(activeSession.bestStreak, newStreak);

        set({
          activeSession: {
            ...activeSession,
            completedChallenges: newCompletedChallenges,
            score: newScore,
            bonusPoints: newBonusPoints,
            currentStreak: newStreak,
            bestStreak: newBestStreak,
          },
        });
      },

      // Finish the solo hunt
      finishSoloHunt: () => {
        const { activeSession, history, personalRecords, totalSoloHuntsCompleted, totalSoloPointsEarned, lastPlayedDate } = get();
        if (!activeSession) return null;

        const totalPoints = activeSession.score + activeSession.bonusPoints;
        const recordKey = getRecordKey(activeSession.config.type, activeSession.config.difficulty);
        const existingRecord = personalRecords[recordKey];

        // Check if this is a personal best
        const isPersonalBest = !existingRecord || totalPoints > existingRecord.bestScore;

        // Create result
        const result: SoloHuntResult = {
          id: generateSessionId(),
          huntId: activeSession.hunt.id!,
          huntTitle: activeSession.hunt.title,
          config: activeSession.config,
          score: activeSession.score,
          bonusPoints: activeSession.bonusPoints,
          totalPoints,
          challengesCompleted: activeSession.completedChallenges.length,
          totalChallenges: activeSession.hunt.challenges?.length || 0,
          timeElapsed: activeSession.timeElapsed,
          bestStreak: activeSession.bestStreak,
          completedAt: new Date().toISOString(),
          personalBest: isPersonalBest,
        };

        // Update personal record
        const newRecord: PersonalRecord = {
          huntType: activeSession.config.type,
          difficulty: activeSession.config.difficulty,
          bestScore: Math.max(existingRecord?.bestScore || 0, totalPoints),
          bestTime: existingRecord?.bestTime
            ? Math.min(existingRecord.bestTime, activeSession.timeElapsed)
            : activeSession.timeElapsed,
          bestStreak: Math.max(existingRecord?.bestStreak || 0, activeSession.bestStreak),
          totalCompleted: (existingRecord?.totalCompleted || 0) + 1,
          lastPlayedAt: new Date().toISOString(),
        };

        // Update daily streak
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let newDailyStreak = 1;

        if (lastPlayedDate === yesterday) {
          newDailyStreak = get().currentDailyStreak + 1;
        } else if (lastPlayedDate === today) {
          newDailyStreak = get().currentDailyStreak;
        }

        set({
          activeSession: null,
          history: [result, ...history].slice(0, 50), // Keep last 50 results
          personalRecords: { ...personalRecords, [recordKey]: newRecord },
          totalSoloHuntsCompleted: totalSoloHuntsCompleted + 1,
          totalSoloPointsEarned: totalSoloPointsEarned + totalPoints,
          currentDailyStreak: newDailyStreak,
          lastPlayedDate: today,
        });

        return result;
      },

      // Abandon current hunt
      abandonSoloHunt: () => {
        set({ activeSession: null });
      },

      // Get personal best for a specific type and difficulty
      getPersonalBest: (type: SoloHuntType, difficulty: string) => {
        const { personalRecords } = get();
        return personalRecords[getRecordKey(type, difficulty)] || null;
      },

      // Clear history
      clearHistory: () => {
        set({ history: [] });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'solo-mode-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        history: state.history,
        personalRecords: state.personalRecords,
        totalSoloHuntsCompleted: state.totalSoloHuntsCompleted,
        totalSoloPointsEarned: state.totalSoloPointsEarned,
        currentDailyStreak: state.currentDailyStreak,
        lastPlayedDate: state.lastPlayedDate,
        // Don't persist active session - it's ephemeral
      }),
    }
  )
);

export default useSoloModeStore;
