import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Hunt, Participant, Submission, AIGenerationRequest } from '@/types';
import { gemini } from '@/lib/gemini';

// API base URL - points to your Vercel deployment
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

// Auth Store
interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
}

interface Session {
  user: User;
  token: string;
  access_token: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  session: Session | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      session: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,
      error: null,

      initialize: async () => {
        const { token, user } = get();
        if (token && user) {
          set({
            session: { user, token, access_token: token },
            isAuthenticated: true,
            isInitialized: true
          });
        } else {
          set({ isInitialized: true });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Login failed');
          }

          const { user, token } = await response.json();
          set({
            user,
            token,
            session: { user, token, access_token: token },
            isAuthenticated: true,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          });
          return false;
        }
      },

      register: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, display_name: displayName }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Registration failed');
          }

          const { user, token } = await response.json();
          set({
            user,
            token,
            session: { user, token, access_token: token },
            isAuthenticated: true,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false
          });
          return false;
        }
      },

      logout: async () => {
        set({ user: null, token: null, session: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            set({ user: null, token: null, isAuthenticated: false });
            return;
          }

          const user = await response.json();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

interface HuntState {
  // State
  hunts: Hunt[];
  publicHunts: Hunt[];
  currentHunt: Hunt | null;
  activeParticipation: Participant | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchHunts: () => Promise<void>;
  fetchPublicHunts: () => Promise<void>;
  getHuntById: (id: string) => Promise<Hunt | null>;
  createHunt: (hunt: Partial<Hunt>) => Promise<Hunt | null>;
  generateHuntWithAI: (request: AIGenerationRequest) => Promise<Hunt | null>;
  updateHunt: (id: string, updates: Partial<Hunt>) => Promise<void>;
  deleteHunt: (id: string) => Promise<void>;
  joinHunt: (huntId: string) => Promise<Participant | null>;
  submitChallenge: (challengeId: string, submission: Partial<Submission>) => Promise<boolean>;
  setCurrentHunt: (hunt: Hunt | null) => void;
  clearError: () => void;
}

export const useHuntStore = create<HuntState>()(
  persist(
    (set, get) => ({
      // Initial state
      hunts: [],
      publicHunts: [],
      currentHunt: null,
      activeParticipation: null,
      isLoading: false,
      error: null,

      // Fetch user's hunts
      fetchHunts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts`);
          if (!response.ok) throw new Error('Failed to fetch hunts');
          const data = await response.json();
          set({ hunts: data.hunts || [], isLoading: false });
        } catch (error) {
          console.error('Fetch hunts error:', error);
          set({ error: 'Failed to load hunts', isLoading: false });
        }
      },

      // Fetch public hunts
      fetchPublicHunts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts?public=true`);
          if (!response.ok) throw new Error('Failed to fetch public hunts');
          const data = await response.json();
          set({ publicHunts: data.hunts || [], isLoading: false });
        } catch (error) {
          console.error('Fetch public hunts error:', error);
          set({ error: 'Failed to load public hunts', isLoading: false });
        }
      },

      // Get hunt by ID
      getHuntById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // First check local cache
          const { hunts, publicHunts } = get();
          const cached = [...hunts, ...publicHunts].find(h => h.id === id);
          if (cached) {
            set({ currentHunt: cached, isLoading: false });
            return cached;
          }

          // Fetch from API
          const response = await fetch(`${API_BASE}/hunts/${id}`);
          if (!response.ok) throw new Error('Hunt not found');
          const hunt = await response.json();
          set({ currentHunt: hunt, isLoading: false });
          return hunt;
        } catch (error) {
          console.error('Get hunt error:', error);
          set({ error: 'Failed to load hunt', isLoading: false });
          return null;
        }
      },

      // Create a new hunt
      createHunt: async (hunt: Partial<Hunt>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hunt),
          });
          if (!response.ok) throw new Error('Failed to create hunt');
          const newHunt = await response.json();
          
          set(state => ({
            hunts: [newHunt, ...state.hunts],
            currentHunt: newHunt,
            isLoading: false,
          }));
          
          return newHunt;
        } catch (error) {
          console.error('Create hunt error:', error);
          set({ error: 'Failed to create hunt', isLoading: false });
          return null;
        }
      },

      // Generate hunt with AI
      generateHuntWithAI: async (request: AIGenerationRequest) => {
        set({ isLoading: true, error: null });
        try {
          // Generate with Gemini AI
          const generated = await gemini.generateHunt(request);
          
          // Create the hunt
          const hunt: Partial<Hunt> = {
            title: generated.title,
            description: generated.description,
            difficulty: request.difficulty,
            is_public: true,
            status: 'draft',
            challenges: generated.challenges.map((c, index) => ({
              ...c,
              order_index: index,
            })),
          };

          // Save to database
          const response = await fetch(`${API_BASE}/hunts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hunt),
          });
          
          if (!response.ok) throw new Error('Failed to save generated hunt');
          const newHunt = await response.json();
          
          set(state => ({
            hunts: [newHunt, ...state.hunts],
            currentHunt: newHunt,
            isLoading: false,
          }));
          
          return newHunt;
        } catch (error) {
          console.error('AI generation error:', error);
          set({ error: 'Failed to generate hunt', isLoading: false });
          return null;
        }
      },

      // Update hunt
      updateHunt: async (id: string, updates: Partial<Hunt>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error('Failed to update hunt');
          const updated = await response.json();
          
          set(state => ({
            hunts: state.hunts.map(h => h.id === id ? updated : h),
            currentHunt: state.currentHunt?.id === id ? updated : state.currentHunt,
            isLoading: false,
          }));
        } catch (error) {
          console.error('Update hunt error:', error);
          set({ error: 'Failed to update hunt', isLoading: false });
        }
      },

      // Delete hunt
      deleteHunt: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts/${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete hunt');
          
          set(state => ({
            hunts: state.hunts.filter(h => h.id !== id),
            currentHunt: state.currentHunt?.id === id ? null : state.currentHunt,
            isLoading: false,
          }));
        } catch (error) {
          console.error('Delete hunt error:', error);
          set({ error: 'Failed to delete hunt', isLoading: false });
        }
      },

      // Join a hunt
      joinHunt: async (huntId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts/${huntId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) throw new Error('Failed to join hunt');
          const participation = await response.json();
          
          set({ activeParticipation: participation, isLoading: false });
          return participation;
        } catch (error) {
          console.error('Join hunt error:', error);
          set({ error: 'Failed to join hunt', isLoading: false });
          return null;
        }
      },

      // Submit challenge completion
      submitChallenge: async (challengeId: string, submission: Partial<Submission>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challenge_id: challengeId,
              ...submission,
            }),
          });
          if (!response.ok) throw new Error('Failed to submit challenge');
          
          set({ isLoading: false });
          return true;
        } catch (error) {
          console.error('Submit challenge error:', error);
          set({ error: 'Failed to submit challenge', isLoading: false });
          return false;
        }
      },

      // Set current hunt
      setCurrentHunt: (hunt: Hunt | null) => {
        set({ currentHunt: hunt });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'hunt-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hunts: state.hunts,
        publicHunts: state.publicHunts,
      }),
    }
  )
);

export default useHuntStore;

// Re-export solo mode store
export { useSoloModeStore, SOLO_HUNT_PRESETS, SOLO_THEMES } from './soloModeStore';
export type { SoloHuntType, SoloEnvironment, SoloHuntConfig, SoloHuntResult, SoloHuntSession, PersonalRecord } from './soloModeStore';
