import { create } from 'zustand';
import { supabase, db } from '@/lib/supabase';
import type { Hunt, Challenge, User, Participant } from '@/types';

interface HuntState {
  // Data
  hunts: Hunt[];
  currentHunt: Hunt | null;
  myHunts: Hunt[];
  publicHunts: Hunt[];
  
  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchHunts: () => Promise<void>;
  fetchPublicHunts: () => Promise<void>;
  fetchMyHunts: () => Promise<void>;
  fetchHuntById: (id: string) => Promise<Hunt | null>;
  createHunt: (hunt: Partial<Hunt>) => Promise<Hunt | null>;
  updateHunt: (id: string, updates: Partial<Hunt>) => Promise<void>;
  deleteHunt: (id: string) => Promise<void>;
  setCurrentHunt: (hunt: Hunt | null) => void;
  clearError: () => void;
}

export const useHuntStore = create<HuntState>((set, get) => ({
  hunts: [],
  currentHunt: null,
  myHunts: [],
  publicHunts: [],
  isLoading: false,
  isGenerating: false,
  error: null,
  
  fetchHunts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db.hunts.getAll();
      if (error) throw error;
      set({ hunts: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchPublicHunts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db.hunts.getPublic();
      if (error) throw error;
      set({ publicHunts: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchMyHunts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ myHunts: [], isLoading: false });
        return;
      }
      
      const { data, error } = await supabase
        .from('hunts')
        .select('*, challenges(*)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      set({ myHunts: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchHuntById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db.hunts.getById(id);
      if (error) throw error;
      set({ currentHunt: data, isLoading: false });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  createHunt: async (hunt: Partial<Hunt>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db.hunts.create(hunt);
      if (error) throw error;
      
      const { myHunts } = get();
      set({ 
        myHunts: [data, ...myHunts],
        currentHunt: data,
        isLoading: false 
      });
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  updateHunt: async (id: string, updates: Partial<Hunt>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await db.hunts.update(id, updates);
      if (error) throw error;
      
      const { hunts, myHunts, currentHunt } = get();
      
      set({
        hunts: hunts.map(h => h.id === id ? { ...h, ...data } : h),
        myHunts: myHunts.map(h => h.id === id ? { ...h, ...data } : h),
        currentHunt: currentHunt?.id === id ? { ...currentHunt, ...data } : currentHunt,
        isLoading: false
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  deleteHunt: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await db.hunts.delete(id);
      if (error) throw error;
      
      const { hunts, myHunts, currentHunt } = get();
      
      set({
        hunts: hunts.filter(h => h.id !== id),
        myHunts: myHunts.filter(h => h.id !== id),
        currentHunt: currentHunt?.id === id ? null : currentHunt,
        isLoading: false
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  setCurrentHunt: (hunt: Hunt | null) => {
    set({ currentHunt: hunt });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));

// Auth store
interface AuthState {
  user: User | null;
  session: any;
  isLoading: boolean;
  isInitialized: boolean;
  
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ 
          user: {
            id: session.user.id,
            email: session.user.email || '',
            display_name: session.user.user_metadata?.display_name || 'Player',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
          },
          session,
          isInitialized: true
        });
      } else {
        set({ isInitialized: true });
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email || '',
              display_name: session.user.user_metadata?.display_name || 'Player',
              avatar_url: session.user.user_metadata?.avatar_url || null,
              created_at: session.user.created_at,
            },
            session
          });
        } else {
          set({ user: null, session: null });
        }
      });
    } catch (error) {
      set({ isInitialized: true });
    }
  },
  
  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
        }
      });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Game state store for active hunts
interface GameState {
  activeHunt: Hunt | null;
  currentChallengeIndex: number;
  completedChallenges: string[];
  score: number;
  startTime: Date | null;
  
  startHunt: (hunt: Hunt) => void;
  completeChallenge: (challengeId: string, points: number) => void;
  nextChallenge: () => void;
  previousChallenge: () => void;
  endHunt: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  activeHunt: null,
  currentChallengeIndex: 0,
  completedChallenges: [],
  score: 0,
  startTime: null,
  
  startHunt: (hunt: Hunt) => {
    set({
      activeHunt: hunt,
      currentChallengeIndex: 0,
      completedChallenges: [],
      score: 0,
      startTime: new Date(),
    });
  },
  
  completeChallenge: (challengeId: string, points: number) => {
    const { completedChallenges, score } = get();
    if (!completedChallenges.includes(challengeId)) {
      set({
        completedChallenges: [...completedChallenges, challengeId],
        score: score + points,
      });
    }
  },
  
  nextChallenge: () => {
    const { currentChallengeIndex, activeHunt } = get();
    if (activeHunt && currentChallengeIndex < activeHunt.challenges.length - 1) {
      set({ currentChallengeIndex: currentChallengeIndex + 1 });
    }
  },
  
  previousChallenge: () => {
    const { currentChallengeIndex } = get();
    if (currentChallengeIndex > 0) {
      set({ currentChallengeIndex: currentChallengeIndex - 1 });
    }
  },
  
  endHunt: () => {
    set({
      activeHunt: null,
      currentChallengeIndex: 0,
      completedChallenges: [],
      score: 0,
      startTime: null,
    });
  },
}));
