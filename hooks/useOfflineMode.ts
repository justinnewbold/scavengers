import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, CachedHunt, PendingSubmission } from '@/lib/offlineStorage';
import type { Hunt, Challenge } from '@/types';

export interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: { synced: number; failed: number } | null;
}

export interface UseOfflineModeResult {
  // State
  isOnline: boolean;
  pendingSubmissions: number;
  isSyncing: boolean;

  // Actions
  cacheHuntForOffline: (hunt: Hunt) => Promise<void>;
  getCachedHunt: (huntId: string) => Promise<Hunt | null>;
  submitOffline: (submission: {
    huntId: string;
    challengeId: string;
    participantId: string;
    submissionType: string;
    submissionData: Record<string, unknown>;
  }) => Promise<{ queued: boolean; submissionId?: string }>;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  getPendingForHunt: (huntId: string) => Promise<PendingSubmission[]>;
}

/**
 * Hook for offline-first functionality
 * Caches hunts, queues submissions when offline, syncs when back online
 */
export function useOfflineMode(): UseOfflineModeResult {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Listen for connectivity changes
  useEffect(() => {
    // Get initial state
    offlineStorage.checkConnection().then(setIsOnline);
    offlineStorage.getPendingSubmissions().then(pending => {
      setPendingSubmissions(pending.length);
    });

    // Subscribe to changes
    const unsubscribe = offlineStorage.onConnectivityChange((online) => {
      setIsOnline(online);

      // Auto-sync when coming back online
      if (online) {
        syncNow();
      }
    });

    return unsubscribe;
  }, []);

  // Cache a hunt for offline use
  const cacheHuntForOffline = useCallback(async (hunt: Hunt) => {
    if (!hunt.id) return;

    const cachedHunt: CachedHunt = {
      id: hunt.id,
      title: hunt.title,
      description: hunt.description || '',
      difficulty: hunt.difficulty || 'medium',
      challenges: (hunt.challenges || []).map(c => ({
        id: c.id!,
        title: c.title,
        description: c.description || '',
        points: c.points,
        verification_type: c.verification_type,
        verification_data: c.verification_data,
        hint: c.hint,
      })),
      cachedAt: Date.now(),
    };

    await offlineStorage.cacheHunts([cachedHunt]);
  }, []);

  // Get a cached hunt
  const getCachedHunt = useCallback(async (huntId: string): Promise<Hunt | null> => {
    const cached = await offlineStorage.getCachedHunt(huntId);
    if (!cached) return null;

    // Convert back to Hunt type
    return {
      id: cached.id,
      title: cached.title,
      description: cached.description,
      difficulty: cached.difficulty as Hunt['difficulty'],
      challenges: cached.challenges.map((c, index) => ({
        id: c.id,
        hunt_id: cached.id,
        title: c.title,
        description: c.description,
        points: c.points,
        verification_type: c.verification_type as Challenge['verification_type'],
        verification_data: c.verification_data,
        hint: c.hint,
        order_index: index,
      })),
      is_public: false,
      status: 'active',
    };
  }, []);

  // Submit when offline (queues for later sync)
  const submitOffline = useCallback(async (submission: {
    huntId: string;
    challengeId: string;
    participantId: string;
    submissionType: string;
    submissionData: Record<string, unknown>;
  }) => {
    // If online, try to submit directly first
    if (isOnline) {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/submissions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participant_id: submission.participantId,
              challenge_id: submission.challengeId,
              submission_type: submission.submissionType,
              submission_data: submission.submissionData,
            }),
          }
        );

        if (response.ok) {
          return { queued: false };
        }
        // If request fails, fall through to queue
      } catch {
        // Network error, queue for later
      }
    }

    // Queue for later sync
    const submissionId = await offlineStorage.queueSubmission({
      hunt_id: submission.huntId,
      challenge_id: submission.challengeId,
      participant_id: submission.participantId,
      submission_type: submission.submissionType,
      submission_data: submission.submissionData,
    });

    setPendingSubmissions(prev => prev + 1);
    return { queued: true, submissionId };
  }, [isOnline]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await offlineStorage.syncPendingSubmissions();

      // Update pending count
      const remaining = await offlineStorage.getPendingSubmissions();
      setPendingSubmissions(remaining.length);

      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  // Get pending submissions for a specific hunt
  const getPendingForHunt = useCallback(async (huntId: string) => {
    const all = await offlineStorage.getPendingSubmissions();
    return all.filter(s => s.hunt_id === huntId);
  }, []);

  return {
    isOnline,
    pendingSubmissions,
    isSyncing,
    cacheHuntForOffline,
    getCachedHunt,
    submitOffline,
    syncNow,
    getPendingForHunt,
  };
}

export default useOfflineMode;
