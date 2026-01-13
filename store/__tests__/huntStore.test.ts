import { useHuntStore } from '../index';
import type { Hunt } from '@/types';

// Mock hunt data
const mockHunt: Hunt = {
  id: 'hunt-123',
  title: 'Test Hunt',
  description: 'A test scavenger hunt',
  creator_id: 'user-123',
  status: 'active',
  is_public: true,
  difficulty: 'medium',
  challenges: [
    {
      id: 'challenge-1',
      hunt_id: 'hunt-123',
      title: 'Find the statue',
      description: 'Find the famous statue in the park',
      verification_type: 'photo',
      points: 100,
      order_index: 0,
    },
    {
      id: 'challenge-2',
      hunt_id: 'hunt-123',
      title: 'Answer the riddle',
      description: 'What has keys but no locks?',
      verification_type: 'text_answer',
      points: 50,
      order_index: 1,
      verification_data: { correct_answer: 'piano' },
    },
  ],
};

const mockHunts: Hunt[] = [
  mockHunt,
  {
    id: 'hunt-456',
    title: 'City Explorer',
    description: 'Explore the city landmarks',
    creator_id: 'user-123',
    status: 'draft',
    is_public: false,
    difficulty: 'easy',
    challenges: [],
  },
];

// Reset store between tests
beforeEach(() => {
  useHuntStore.setState({
    hunts: [],
    publicHunts: [],
    currentHunt: null,
    activeParticipation: null,
    isLoading: false,
    error: null,
  });
  (global.fetch as jest.Mock).mockReset();
});

describe('useHuntStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useHuntStore.getState();

      expect(state.hunts).toEqual([]);
      expect(state.publicHunts).toEqual([]);
      expect(state.currentHunt).toBeNull();
      expect(state.activeParticipation).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchHunts', () => {
    it('should fetch user hunts successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: mockHunts }),
      });

      await useHuntStore.getState().fetchHunts();

      expect(useHuntStore.getState().hunts).toEqual(mockHunts);
      expect(useHuntStore.getState().isLoading).toBe(false);
      expect(useHuntStore.getState().error).toBeNull();
    });

    it('should handle fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await useHuntStore.getState().fetchHunts();

      expect(useHuntStore.getState().hunts).toEqual([]);
      expect(useHuntStore.getState().error).toBe('Failed to load hunts');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await useHuntStore.getState().fetchHunts();

      expect(useHuntStore.getState().error).toBe('Failed to load hunts');
    });

    it('should set isLoading during fetch', async () => {
      let loadingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        loadingDuringFetch = useHuntStore.getState().isLoading;
        return { ok: true, json: async () => ({ hunts: [] }) };
      });

      await useHuntStore.getState().fetchHunts();

      expect(loadingDuringFetch).toBe(true);
      expect(useHuntStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchPublicHunts', () => {
    it('should fetch public hunts successfully', async () => {
      const publicHunts = mockHunts.filter(h => h.is_public);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hunts: publicHunts }),
      });

      await useHuntStore.getState().fetchPublicHunts();

      expect(useHuntStore.getState().publicHunts).toEqual(publicHunts);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('public=true'));
    });
  });

  describe('getHuntById', () => {
    it('should return cached hunt if available', async () => {
      useHuntStore.setState({ hunts: mockHunts });

      const result = await useHuntStore.getState().getHuntById('hunt-123');

      expect(result).toEqual(mockHunt);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(useHuntStore.getState().currentHunt).toEqual(mockHunt);
    });

    it('should fetch hunt from API if not cached', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHunt,
      });

      const result = await useHuntStore.getState().getHuntById('hunt-123');

      expect(result).toEqual(mockHunt);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/hunts/hunt-123'));
      expect(useHuntStore.getState().currentHunt).toEqual(mockHunt);
    });

    it('should handle hunt not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await useHuntStore.getState().getHuntById('nonexistent');

      expect(result).toBeNull();
      expect(useHuntStore.getState().error).toBe('Failed to load hunt');
    });
  });

  describe('createHunt', () => {
    it('should create hunt successfully', async () => {
      const newHunt: Partial<Hunt> = {
        title: 'New Hunt',
        description: 'A new scavenger hunt',
        is_public: true,
        difficulty: 'easy',
      };

      const createdHunt = { ...newHunt, id: 'hunt-new', creator_id: 'user-123', status: 'draft' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => createdHunt,
      });

      const result = await useHuntStore.getState().createHunt(newHunt);

      expect(result).toEqual(createdHunt);
      expect(useHuntStore.getState().hunts).toContainEqual(createdHunt);
      expect(useHuntStore.getState().currentHunt).toEqual(createdHunt);
    });

    it('should handle creation failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await useHuntStore.getState().createHunt({ title: '' });

      expect(result).toBeNull();
      expect(useHuntStore.getState().error).toBe('Failed to create hunt');
    });
  });

  describe('updateHunt', () => {
    it('should update hunt successfully', async () => {
      useHuntStore.setState({ hunts: mockHunts, currentHunt: mockHunt });

      const updatedHunt = { ...mockHunt, title: 'Updated Title' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedHunt,
      });

      await useHuntStore.getState().updateHunt('hunt-123', { title: 'Updated Title' });

      const state = useHuntStore.getState();
      expect(state.hunts.find(h => h.id === 'hunt-123')?.title).toBe('Updated Title');
      expect(state.currentHunt?.title).toBe('Updated Title');
    });

    it('should handle update failure', async () => {
      useHuntStore.setState({ hunts: mockHunts });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await useHuntStore.getState().updateHunt('hunt-123', { title: 'Updated' });

      expect(useHuntStore.getState().error).toBe('Failed to update hunt');
    });
  });

  describe('deleteHunt', () => {
    it('should delete hunt successfully', async () => {
      useHuntStore.setState({ hunts: mockHunts, currentHunt: mockHunt });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await useHuntStore.getState().deleteHunt('hunt-123');

      expect(useHuntStore.getState().hunts.find(h => h.id === 'hunt-123')).toBeUndefined();
      expect(useHuntStore.getState().currentHunt).toBeNull();
    });

    it('should handle delete failure', async () => {
      useHuntStore.setState({ hunts: mockHunts });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await useHuntStore.getState().deleteHunt('hunt-123');

      expect(useHuntStore.getState().hunts).toHaveLength(2);
      expect(useHuntStore.getState().error).toBe('Failed to delete hunt');
    });
  });

  describe('joinHunt', () => {
    it('should join hunt successfully', async () => {
      const mockParticipation = {
        id: 'participant-1',
        hunt_id: 'hunt-123',
        user_id: 'user-456',
        score: 0,
        status: 'active',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockParticipation,
      });

      const result = await useHuntStore.getState().joinHunt('hunt-123');

      expect(result).toEqual(mockParticipation);
      expect(useHuntStore.getState().activeParticipation).toEqual(mockParticipation);
    });

    it('should handle join failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await useHuntStore.getState().joinHunt('hunt-123');

      expect(result).toBeNull();
      expect(useHuntStore.getState().error).toBe('Failed to join hunt');
    });
  });

  describe('submitChallenge', () => {
    it('should submit challenge successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await useHuntStore.getState().submitChallenge('challenge-1', {
        submission_type: 'photo',
        submission_data: { image_url: 'https://example.com/photo.jpg' },
      });

      expect(result).toBe(true);
    });

    it('should handle submission failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await useHuntStore.getState().submitChallenge('challenge-1', {
        submission_type: 'text',
        submission_data: { answer: 'wrong' },
      });

      expect(result).toBe(false);
      expect(useHuntStore.getState().error).toBe('Failed to submit challenge');
    });
  });

  describe('setCurrentHunt', () => {
    it('should set current hunt', () => {
      useHuntStore.getState().setCurrentHunt(mockHunt);

      expect(useHuntStore.getState().currentHunt).toEqual(mockHunt);
    });

    it('should clear current hunt', () => {
      useHuntStore.setState({ currentHunt: mockHunt });

      useHuntStore.getState().setCurrentHunt(null);

      expect(useHuntStore.getState().currentHunt).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useHuntStore.setState({ error: 'Some error' });

      useHuntStore.getState().clearError();

      expect(useHuntStore.getState().error).toBeNull();
    });
  });
});
