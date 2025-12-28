import { useState, useEffect } from 'react';
import { offlineStorage, PendingSubmission } from '@/lib/offlineStorage';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Check initial state
    offlineStorage.checkConnection().then(setIsOnline);
    loadPendingSubmissions();

    // Subscribe to connectivity changes
    const unsubscribe = offlineStorage.onConnectivityChange(online => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  const loadPendingSubmissions = async () => {
    const pending = await offlineStorage.getPendingSubmissions();
    setPendingSubmissions(pending);
  };

  const queueSubmission = async (
    submission: Omit<PendingSubmission, 'id' | 'created_at' | 'retryCount'>
  ) => {
    const id = await offlineStorage.queueSubmission(submission);
    await loadPendingSubmissions();
    return id;
  };

  const syncNow = async () => {
    if (!isOnline || isSyncing) return { synced: 0, failed: 0 };

    setIsSyncing(true);
    try {
      const result = await offlineStorage.syncPendingSubmissions();
      await loadPendingSubmissions();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    pendingSubmissions,
    pendingCount: pendingSubmissions.length,
    isSyncing,
    queueSubmission,
    syncNow,
    refreshPending: loadPendingSubmissions,
  };
}
