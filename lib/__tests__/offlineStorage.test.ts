import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineStorage, CachedHunt, PendingSubmission } from '../offlineStorage';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

const mockHunt: CachedHunt = {
  id: 'hunt-1',
  title: 'Test Hunt',
  description: 'A test hunt',
  difficulty: 'medium',
  challenges: [
    {
      id: 'challenge-1',
      title: 'Challenge 1',
      description: 'First challenge',
      points: 100,
      verification_type: 'photo',
    },
  ],
  cachedAt: Date.now(),
};

// Reset AsyncStorage between tests
beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockReset();
  (AsyncStorage.setItem as jest.Mock).mockReset();
  (AsyncStorage.removeItem as jest.Mock).mockReset();
  (AsyncStorage.multiRemove as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockReset();
});

describe('OfflineStorage', () => {
  describe('cacheHunts', () => {
    it('should cache hunts to AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.cacheHunts([mockHunt]);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_hunts',
        expect.any(String)
      );

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('hunt-1');
    });

    it('should merge with existing cached hunts', async () => {
      const existingHunt: CachedHunt = {
        ...mockHunt,
        id: 'hunt-2',
        title: 'Existing Hunt',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([existingHunt]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.cacheHunts([mockHunt]);

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
    });

    it('should update existing hunt', async () => {
      const updatedHunt: CachedHunt = {
        ...mockHunt,
        title: 'Updated Title',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockHunt]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.cacheHunts([updatedHunt]);

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].title).toBe('Updated Title');
    });
  });

  describe('getCachedHunts', () => {
    it('should return cached hunts', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockHunt]));

      const result = await offlineStorage.getCachedHunts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hunt-1');
    });

    it('should return empty array if no cached hunts', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await offlineStorage.getCachedHunts();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const result = await offlineStorage.getCachedHunts();

      expect(result).toEqual([]);
    });
  });

  describe('getCachedHunt', () => {
    it('should return specific cached hunt', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockHunt]));

      const result = await offlineStorage.getCachedHunt('hunt-1');

      expect(result).toEqual(mockHunt);
    });

    it('should return null if hunt not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockHunt]));

      const result = await offlineStorage.getCachedHunt('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('queueSubmission', () => {
    it('should queue a submission for offline sync', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      const submission = {
        hunt_id: 'hunt-1',
        challenge_id: 'challenge-1',
        participant_id: 'participant-1',
        submission_type: 'photo',
        submission_data: { image_url: 'https://example.com/photo.jpg' },
      };

      const id = await offlineStorage.queueSubmission(submission);

      expect(id).toMatch(/^pending_\d+_[a-z0-9]+$/);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pending_submissions',
        expect.any(String)
      );

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].challenge_id).toBe('challenge-1');
      expect(savedData[0].retryCount).toBe(0);
    });

    it('should append to existing submissions', async () => {
      const existingSubmission: PendingSubmission = {
        id: 'pending_existing',
        hunt_id: 'hunt-1',
        challenge_id: 'challenge-2',
        participant_id: 'participant-1',
        submission_type: 'text',
        submission_data: { answer: 'test' },
        created_at: Date.now() - 1000,
        retryCount: 0,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([existingSubmission]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.queueSubmission({
        hunt_id: 'hunt-1',
        challenge_id: 'challenge-1',
        participant_id: 'participant-1',
        submission_type: 'photo',
        submission_data: {},
      });

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
    });
  });

  describe('getPendingSubmissions', () => {
    it('should return pending submissions', async () => {
      const pending: PendingSubmission = {
        id: 'pending_1',
        hunt_id: 'hunt-1',
        challenge_id: 'challenge-1',
        participant_id: 'participant-1',
        submission_type: 'photo',
        submission_data: {},
        created_at: Date.now(),
        retryCount: 0,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([pending]));

      const result = await offlineStorage.getPendingSubmissions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pending_1');
    });

    it('should return empty array if no pending submissions', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await offlineStorage.getPendingSubmissions();

      expect(result).toEqual([]);
    });
  });

  describe('removePendingSubmission', () => {
    it('should remove a pending submission', async () => {
      const pending: PendingSubmission[] = [
        {
          id: 'pending_1',
          hunt_id: 'hunt-1',
          challenge_id: 'challenge-1',
          participant_id: 'participant-1',
          submission_type: 'photo',
          submission_data: {},
          created_at: Date.now(),
          retryCount: 0,
        },
        {
          id: 'pending_2',
          hunt_id: 'hunt-1',
          challenge_id: 'challenge-2',
          participant_id: 'participant-1',
          submission_type: 'text',
          submission_data: {},
          created_at: Date.now(),
          retryCount: 0,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(pending));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.removePendingSubmission('pending_1');

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('pending_2');
    });
  });

  describe('updatePendingSubmission', () => {
    it('should update a pending submission', async () => {
      const pending: PendingSubmission = {
        id: 'pending_1',
        hunt_id: 'hunt-1',
        challenge_id: 'challenge-1',
        participant_id: 'participant-1',
        submission_type: 'photo',
        submission_data: {},
        created_at: Date.now(),
        retryCount: 0,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([pending]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.updatePendingSubmission('pending_1', { retryCount: 1 });

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData[0].retryCount).toBe(1);
    });
  });

  describe('clearStaleCache', () => {
    it('should remove hunts older than 7 days', async () => {
      const freshHunt: CachedHunt = {
        ...mockHunt,
        id: 'fresh-hunt',
        cachedAt: Date.now(),
      };

      const staleHunt: CachedHunt = {
        ...mockHunt,
        id: 'stale-hunt',
        cachedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([freshHunt, staleHunt]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.clearStaleCache();

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('fresh-hunt');
    });
  });

  describe('clearAll', () => {
    it('should clear all offline data', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValueOnce(undefined);

      await offlineStorage.clearAll();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'offline_hunts',
        'pending_submissions',
        'last_sync_time',
      ]);
    });
  });

  describe('checkConnection', () => {
    it('should check network connection', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: true });

      const result = await offlineStorage.checkConnection();

      expect(result).toBe(true);
    });

    it('should handle offline state', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

      const result = await offlineStorage.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('connectivity listeners', () => {
    it('should add and remove connectivity listeners', () => {
      const callback = jest.fn();

      const unsubscribe = offlineStorage.onConnectivityChange(callback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      // Callback should no longer be in listeners
    });
  });
});
