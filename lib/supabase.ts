import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter for Expo
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database helper functions
export const db = {
  // Hunt operations
  hunts: {
    async getAll() {
      const { data, error } = await supabase
        .from('hunts')
        .select('*, challenges(*)')
        .order('created_at', { ascending: false });
      return { data, error };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('hunts')
        .select('*, challenges(*)')
        .eq('id', id)
        .single();
      return { data, error };
    },
    
    async getPublic() {
      const { data, error } = await supabase
        .from('hunts')
        .select('*, challenges(*)')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return { data, error };
    },
    
    async create(hunt: Partial<Hunt>) {
      const { data, error } = await supabase
        .from('hunts')
        .insert(hunt)
        .select()
        .single();
      return { data, error };
    },
    
    async update(id: string, updates: Partial<Hunt>) {
      const { data, error } = await supabase
        .from('hunts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('hunts')
        .delete()
        .eq('id', id);
      return { error };
    },
  },
  
  // Challenge operations
  challenges: {
    async create(challenge: Partial<Challenge>) {
      const { data, error } = await supabase
        .from('challenges')
        .insert(challenge)
        .select()
        .single();
      return { data, error };
    },
    
    async createBulk(challenges: Partial<Challenge>[]) {
      const { data, error } = await supabase
        .from('challenges')
        .insert(challenges)
        .select();
      return { data, error };
    },
    
    async update(id: string, updates: Partial<Challenge>) {
      const { data, error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);
      return { error };
    },
  },
  
  // Participant operations
  participants: {
    async join(huntId: string, userId: string) {
      const { data, error } = await supabase
        .from('participants')
        .insert({ hunt_id: huntId, user_id: userId, status: 'joined' })
        .select()
        .single();
      return { data, error };
    },
    
    async getByHunt(huntId: string) {
      const { data, error } = await supabase
        .from('participants')
        .select('*, users(*)')
        .eq('hunt_id', huntId)
        .order('score', { ascending: false });
      return { data, error };
    },
    
    async updateScore(id: string, score: number) {
      const { data, error } = await supabase
        .from('participants')
        .update({ score })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
  },
  
  // Submission operations
  submissions: {
    async create(submission: Partial<Submission>) {
      const { data, error } = await supabase
        .from('submissions')
        .insert(submission)
        .select()
        .single();
      return { data, error };
    },
    
    async getByParticipant(participantId: string) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('participant_id', participantId);
      return { data, error };
    },
    
    async approve(id: string, points: number) {
      const { data, error } = await supabase
        .from('submissions')
        .update({ 
          status: 'approved', 
          points_awarded: points,
          verified_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
  },
};

// Type imports for database operations
import type { Hunt, Challenge, Participant, Submission } from '@/types';
