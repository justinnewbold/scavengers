import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Hunt, Participant, VerificationType, AIGenerationRequest } from '@/types';
import { gemini } from '@/lib/gemini';

/**
 * Outcome of a challenge submission.
 *
 * Verification happens on the server (the API deliberately withholds
 * `verification_data` from clients), so this carries the server's verdict
 * rather than a local guess.
 */
export interface SubmissionResult {
  /** True only when the server approved the submission. */
  verified: boolean;
  /** Human-readable explanation, shown to the player on rejection. */
  reason?: string;
  /** Points the server actually awarded. 0 when rejected. */
  pointsAwarded: number;
  /** True when a human needs to review (AI was not confident enough). */
  requiresManualReview?: boolean;
  /** Set when the request itself failed, as opposed to being rejected. */
  error?: string;
}

// API base URL - points to your Vercel deployment
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Re-export the canonical auth store (single source of truth)
export { useAuthStore } from './authStore';

interface HuntState {
  // State
  hunts: Hunt[];
  publicHunts: Hunt[];
  currentHunt: Hunt | null;
  activeParticipation: Participant | null;
  /**
   * Result of the most recent submission, waiting to be picked up by the play
   * screen. The verifier screens (camera/location/qr-scanner) are pushed routes
   * and cannot return a value directly, so they leave the outcome here and the
   * play screen consumes it when it regains focus.
   */
  lastSubmission: { challengeId: string; result: SubmissionResult } | null;
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
  submitChallenge: (
    challengeId: string,
    submissionType: VerificationType,
    submissionData: Record<string, unknown>
  ) => Promise<SubmissionResult>;
  /**
   * Records a verification decided on-device, for solo mode. Solo hunts are
   * generated client-side with local ids and no participant record, so they
   * cannot go through /api/submissions - and there is nothing to cheat, since
   * the player is only competing with themselves.
   */
  recordLocalVerification: (challengeId: string, result: SubmissionResult) => void;
  /** Returns the pending submission result and clears it, so it fires once. */
  consumeLastSubmission: () => { challengeId: string; result: SubmissionResult } | null;
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
      lastSubmission: null,
      isLoading: false,
      error: null,

      // Fetch user's hunts
      fetchHunts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/hunts`, {
            headers: { ...(await getAuthHeaders()) },
          });
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
          const response = await fetch(`${API_BASE}/hunts?public=true`, {
            headers: { ...(await getAuthHeaders()) },
          });
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
          const response = await fetch(`${API_BASE}/hunts/${id}`, {
            headers: { ...(await getAuthHeaders()) },
          });
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
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
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
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
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
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
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
            headers: { ...(await getAuthHeaders()) },
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
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
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

      // Submit challenge completion. The server verifies and awards points -
      // clients never see verification_data, so they cannot check answers.
      submitChallenge: async (
        challengeId: string,
        submissionType: VerificationType,
        submissionData: Record<string, unknown>
      ): Promise<SubmissionResult> => {
        const participant = get().activeParticipation;
        if (!participant?.id) {
          const error = 'You need to join this hunt before submitting.';
          set({ error });
          return { verified: false, pointsAwarded: 0, error };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
            body: JSON.stringify({
              participant_id: participant.id,
              challenge_id: challengeId,
              submission_type: submissionType,
              submission_data: submissionData,
            }),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            // Surface the API's own message - it explains *why*
            // ("Hunt is full", "Challenge already completed", ...).
            const error = data?.error || 'Failed to submit challenge';
            set({ error, isLoading: false });
            return { verified: false, pointsAwarded: 0, error };
          }

          const pointsAwarded = Number(data.points_awarded) || 0;

          // Keep the local score in step with the server's.
          if (data.verified) {
            set(state => ({
              activeParticipation: state.activeParticipation
                ? {
                    ...state.activeParticipation,
                    score: (state.activeParticipation.score || 0) + pointsAwarded,
                  }
                : state.activeParticipation,
            }));
          }

          const result: SubmissionResult = {
            verified: !!data.verified,
            reason: data.reason,
            pointsAwarded,
            requiresManualReview: data.status === 'pending',
          };
          set({ isLoading: false, lastSubmission: { challengeId, result } });
          return result;
        } catch (error) {
          console.error('Submit challenge error:', error);
          const message = 'Could not reach the server. Check your connection and try again.';
          set({ error: message, isLoading: false });
          return { verified: false, pointsAwarded: 0, error: message };
        }
      },

      recordLocalVerification: (challengeId: string, result: SubmissionResult) => {
        set({ lastSubmission: { challengeId, result } });
      },

      consumeLastSubmission: () => {
        const pending = get().lastSubmission;
        if (pending) set({ lastSubmission: null });
        return pending;
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
