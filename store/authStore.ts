import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: false,
      error: null,

      initialize: async () => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            // Verify token is still valid
            const res = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
              const user = await res.json();
              set({ user, isAuthenticated: true, isInitialized: true });
              return;
            } else {
              // Token invalid, clear it
              await AsyncStorage.removeItem('auth_token');
            }
          }
          set({ isInitialized: true });
        } catch (error) {
          // Network error - still mark as initialized
          set({ isInitialized: true });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Login failed');
          }
          
          const { user, token } = await res.json();
          await AsyncStorage.setItem('auth_token', token);
          
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      register: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, display_name: displayName }),
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Registration failed');
          }
          
          const { user, token } = await res.json();
          await AsyncStorage.setItem('auth_token', token);
          
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await AsyncStorage.removeItem('auth_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        const { user } = get();
        if (!user) return;
        
        set({ isLoading: true, error: null });
        try {
          const token = await AsyncStorage.getItem('auth_token');
          const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });
          
          if (!res.ok) throw new Error('Update failed');

          const data = await res.json();
          set({ user: data.user, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (!token) {
            set({ isLoading: false });
            return;
          }
          
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (res.ok) {
            const user = await res.json();
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            await AsyncStorage.removeItem('auth_token');
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
