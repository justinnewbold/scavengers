import { create } from 'zustand';
import { Hunt, Challenge, HuntSession } from '@/types';

interface HuntState {
  hunts: Hunt[];
  currentHunt: Hunt | null;
  currentSession: HuntSession | null;
  challenges: Challenge[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setHunts: (hunts: Hunt[]) => void;
  setCurrentHunt: (hunt: Hunt | null) => void;
  setCurrentSession: (session: HuntSession | null) => void;
  setChallenges: (challenges: Challenge[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addHunt: (hunt: Hunt) => void;
  completeChallenge: (challengeId: string) => void;
}

export const useHuntStore = create<HuntState>((set) => ({
  hunts: [],
  currentHunt: null,
  currentSession: null,
  challenges: [],
  isLoading: false,
  error: null,
  
  setHunts: (hunts) => set({ hunts }),
  setCurrentHunt: (hunt) => set({ currentHunt: hunt }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setChallenges: (challenges) => set({ challenges }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addHunt: (hunt) => set((state) => ({ hunts: [hunt, ...state.hunts] })),
  completeChallenge: (challengeId) => set((state) => ({
    currentSession: state.currentSession ? {
      ...state.currentSession,
      completedChallenges: [...state.currentSession.completedChallenges, challengeId],
    } : null,
  })),
}));
