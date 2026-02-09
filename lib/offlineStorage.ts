import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { fetchWithTimeout, TimeoutError } from './fetchWithTimeout';

// Storage keys
const KEYS = {
  CACHED_HUNTS: 'offline_hunts',
  CACHED_USER_HUNTS: 'offline_user_hunts',
  PENDING_SUBMISSIONS: 'pending_submissions',
  LAST_SYNC: 'last_sync_time',
  OFFLINE_MODE: 'offline_mode_enabled',
};

// Storage limits to prevent filling device storage
const STORAGE_LIMITS = {
  MAX_CACHED_HUNTS: 50,
  MAX_USER_HUNTS_PER_USER: 20,
  MAX_PENDING_SUBMISSIONS: 100,
  STALE_THRESHOLD_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export interface CachedHunt {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  challenges: CachedChallenge[];
  cachedAt: number;
}

export interface CachedChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  verification_type: string;
  verification_data?: Record<string, unknown>;
  hint?: string;
}

export interface PendingSubmission {
  id: string;
  hunt_id: string;
  challenge_id: string;
  participant_id: string;
  submission_type: string;
  submission_data: Record<string, unknown>;
  created_at: number;
  retryCount: number;
}

// Simple async mutex to prevent concurrent read-modify-write on the same key
class AsyncMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let release: () => void;
    const promise = new Promise<void>(resolve => { release = resolve; });
    this.locks.set(key, promise);
    return () => {
      this.locks.delete(key);
      release!();
    };
  }
}

class OfflineStorage {
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  private mutex = new AsyncMutex();

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline !== this.isOnline) {
        this.notifyListeners();

        // Auto-sync when coming back online
        if (this.isOnline) {
          this.syncPendingSubmissions().catch((error) => {
            console.error('Failed to sync pending submissions:', error);
          });
        }
      }
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  onConnectivityChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  // LRU eviction: remove oldest items when over limit
  private evictOldest<T extends { cachedAt: number }>(items: T[], maxItems: number): T[] {
    if (items.length <= maxItems) return items;

    // Sort by cachedAt (oldest first) and keep only the newest items
    return items
      .sort((a, b) => b.cachedAt - a.cachedAt)
      .slice(0, maxItems);
  }

  // Cache hunts for offline access with LRU eviction
  async cacheHunts(hunts: CachedHunt[]): Promise<void> {
    const release = await this.mutex.acquire(KEYS.CACHED_HUNTS);
    try {
      const existing = await this.getCachedHunts();
      const huntMap = new Map(existing.map(h => [h.id, h]));

      // Update or add new hunts
      for (const hunt of hunts) {
        huntMap.set(hunt.id, { ...hunt, cachedAt: Date.now() });
      }

      // Apply LRU eviction if over limit
      let allHunts = Array.from(huntMap.values());
      allHunts = this.evictOldest(allHunts, STORAGE_LIMITS.MAX_CACHED_HUNTS);

      await AsyncStorage.setItem(KEYS.CACHED_HUNTS, JSON.stringify(allHunts));
    } catch (error) {
      console.error('Failed to cache hunts:', error);
    } finally {
      release();
    }
  }

  async getCachedHunts(): Promise<CachedHunt[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CACHED_HUNTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async getCachedHunt(huntId: string): Promise<CachedHunt | null> {
    const hunts = await this.getCachedHunts();
    return hunts.find(h => h.id === huntId) || null;
  }

  // Cache user's hunts separately with LRU eviction
  async cacheUserHunts(userId: string, hunts: CachedHunt[]): Promise<void> {
    try {
      const key = `${KEYS.CACHED_USER_HUNTS}_${userId}`;
      let cachedHunts = hunts.map(h => ({
        ...h,
        cachedAt: Date.now(),
      }));

      // Apply LRU eviction if over limit
      cachedHunts = this.evictOldest(cachedHunts, STORAGE_LIMITS.MAX_USER_HUNTS_PER_USER);

      await AsyncStorage.setItem(key, JSON.stringify(cachedHunts));
    } catch (error) {
      console.error('Failed to cache user hunts:', error);
    }
  }

  async getCachedUserHunts(userId: string): Promise<CachedHunt[]> {
    try {
      const key = `${KEYS.CACHED_USER_HUNTS}_${userId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Queue submissions when offline with limit enforcement
  async queueSubmission(submission: Omit<PendingSubmission, 'id' | 'created_at' | 'retryCount'>): Promise<string> {
    const id = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const pendingSubmission: PendingSubmission = {
      ...submission,
      id,
      created_at: Date.now(),
      retryCount: 0,
    };

    const release = await this.mutex.acquire(KEYS.PENDING_SUBMISSIONS);
    try {
      let pending = await this.getPendingSubmissions();

      // If at limit, remove oldest submissions first (FIFO eviction)
      if (pending.length >= STORAGE_LIMITS.MAX_PENDING_SUBMISSIONS) {
        // Keep newest submissions, make room for new one
        pending = pending
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, STORAGE_LIMITS.MAX_PENDING_SUBMISSIONS - 1);
      }

      pending.push(pendingSubmission);
      await AsyncStorage.setItem(KEYS.PENDING_SUBMISSIONS, JSON.stringify(pending));
      return id;
    } catch (error) {
      console.error('Failed to queue submission:', error);
      throw error;
    } finally {
      release();
    }
  }

  async getPendingSubmissions(): Promise<PendingSubmission[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_SUBMISSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async removePendingSubmission(id: string): Promise<void> {
    try {
      const pending = await this.getPendingSubmissions();
      const filtered = pending.filter(s => s.id !== id);
      await AsyncStorage.setItem(KEYS.PENDING_SUBMISSIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove pending submission:', error);
    }
  }

  async updatePendingSubmission(id: string, updates: Partial<PendingSubmission>): Promise<void> {
    try {
      const pending = await this.getPendingSubmissions();
      const index = pending.findIndex(s => s.id === id);
      if (index >= 0) {
        pending[index] = { ...pending[index], ...updates };
        await AsyncStorage.setItem(KEYS.PENDING_SUBMISSIONS, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('Failed to update pending submission:', error);
    }
  }

  // Delay helper for exponential backoff
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate exponential backoff delay (1s, 2s, 4s, 8s, 16s max)
  private getBackoffDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 16000; // 16 seconds
    return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  }

  // Sync pending submissions when online with exponential backoff
  async syncPendingSubmissions(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    const pending = await this.getPendingSubmissions();
    let synced = 0;
    let failed = 0;
    const maxRetries = 5; // Increased from 3 to 5 with exponential backoff

    for (const submission of pending) {
      // Apply backoff delay based on retry count (skip on first attempt)
      if (submission.retryCount > 0) {
        const backoffDelay = this.getBackoffDelay(submission.retryCount - 1);
        await this.delay(backoffDelay);
      }

      try {
        const token = await AsyncStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetchWithTimeout(
          `${process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api'}/submissions`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              participant_id: submission.participant_id,
              challenge_id: submission.challenge_id,
              submission_type: submission.submission_type,
              submission_data: submission.submission_data,
            }),
            timeout: 30000, // 30 second timeout for submissions
          }
        );

        if (response.ok) {
          await this.removePendingSubmission(submission.id);
          synced++;
        } else if (response.status >= 400 && response.status < 500) {
          // Client error (4xx) - don't retry, remove from queue
          await this.removePendingSubmission(submission.id);
          failed++;
        } else if (submission.retryCount >= maxRetries) {
          // Max retries reached for server errors
          await this.removePendingSubmission(submission.id);
          failed++;
        } else {
          // Server error - increment retry count for next sync
          await this.updatePendingSubmission(submission.id, {
            retryCount: submission.retryCount + 1,
          });
          failed++;
        }
      } catch (error) {
        const isTimeout = error instanceof TimeoutError;
        const isNetworkError = (error as Error).message?.includes('Network');

        if (submission.retryCount >= maxRetries) {
          // Max retries reached
          await this.removePendingSubmission(submission.id);
          failed++;
        } else if (isTimeout || isNetworkError) {
          // Network/timeout errors are retryable
          await this.updatePendingSubmission(submission.id, {
            retryCount: submission.retryCount + 1,
          });
          failed++;
        } else {
          // Unknown error - remove from queue
          await this.removePendingSubmission(submission.id);
          failed++;
        }
      }
    }

    return { synced, failed };
  }

  // Clear old cached data (older than 7 days)
  async clearStaleCache(): Promise<void> {
    const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    try {
      const hunts = await this.getCachedHunts();
      const fresh = hunts.filter(h => now - h.cachedAt < STALE_THRESHOLD);
      await AsyncStorage.setItem(KEYS.CACHED_HUNTS, JSON.stringify(fresh));
    } catch (error) {
      console.error('Failed to clear stale cache:', error);
    }
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.CACHED_HUNTS,
        KEYS.PENDING_SUBMISSIONS,
        KEYS.LAST_SYNC,
      ]);
    } catch (error) {
      console.error('Failed to clear offline storage:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();
