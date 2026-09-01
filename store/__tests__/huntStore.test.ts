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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('public=true'),
        expect.any(Object)
      );
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/hunts/hunt-123'),
        expect.any(Object)
      );
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
    const participant = {
      id: '11111111-1111-4111-8111-111111111111',
      hunt_id: 'hunt-1',
      user_id: 'user-1',
      status: 'playing' as const,
      score: 0,
    };

    beforeEach(() => {
      useHuntStore.setState({ activeParticipation: participant, lastSubmission: null });
    });

    it('should send the participant, type and data the API expects', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true, points_awarded: 50 }),
      });

      const result = await useHuntStore
        .getState()
        .submitChallenge('challenge-1', 'photo', { photoData: 'data:image/jpeg;base64,abc' });

      expect(result.verified).toBe(true);
      expect(result.pointsAwarded).toBe(50);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({
        participant_id: participant.id,
        challenge_id: 'challenge-1',
        submission_type: 'photo',
        submission_data: { photoData: 'data:image/jpeg;base64,abc' },
      });
    });

    it('should report the server verdict when a submission is rejected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: false, reason: 'Incorrect answer', points_awarded: 0 }),
      });

      const result = await useHuntStore
        .getState()
        .submitChallenge('challenge-1', 'text_answer', { answer: 'wrong' });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('Incorrect answer');
      expect(result.pointsAwarded).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should surface the API error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Challenge already completed' }),
      });

      const result = await useHuntStore
        .getState()
        .submitChallenge('challenge-1', 'qr_code', { code: 'abc' });

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Challenge already completed');
      expect(useHuntStore.getState().error).toBe('Challenge already completed');
    });

    it('should refuse to submit when the user has not joined the hunt', async () => {
      useHuntStore.setState({ activeParticipation: null });

      const result = await useHuntStore
        .getState()
        .submitChallenge('challenge-1', 'gps', { latitude: 1, longitude: 2 });

      expect(result.verified).toBe(false);
      expect(result.error).toMatch(/join/i);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should add the awarded points to the local score', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true, points_awarded: 30 }),
      });

      await useHuntStore.getState().submitChallenge('challenge-1', 'manual', {});

      expect(useHuntStore.getState().activeParticipation?.score).toBe(30);
    });

    it('should leave the result for the play screen to consume exactly once', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true, points_awarded: 10 }),
      });

      await useHuntStore.getState().submitChallenge('challenge-7', 'photo', {});

      const pending = useHuntStore.getState().consumeLastSubmission();
      expect(pending?.challengeId).toBe('challenge-7');
      expect(pending?.result.verified).toBe(true);

      // Second read is empty - the challenge must not score twice.
      expect(useHuntStore.getState().consumeLastSubmission()).toBeNull();
    });
  });

  describe('recordLocalVerification', () => {
    beforeEach(() => {
      useHuntStore.setState({ activeParticipation: null, lastSubmission: null });
    });

    /**
     * Solo hunts are generated on-device with local ids and no participant
     * record, so they cannot go through /api/submissions. They must still be
     * able to hand a verdict to the play screen.
     */
    it('records a verdict without touching the network', () => {
      useHuntStore.getState().recordLocalVerification('solo_challenge_1', {
        verified: true,
        pointsAwarded: 0,
      });

      expect(global.fetch).not.toHaveBeenCalled();

      const pending = useHuntStore.getState().consumeLastSubmission();
      expect(pending?.challengeId).toBe('solo_challenge_1');
      expect(pending?.result.verified).toBe(true);
    });

    it('is consumed exactly once, so a solo challenge cannot score twice', () => {
      useHuntStore.getState().recordLocalVerification('solo_challenge_1', {
        verified: true,
        pointsAwarded: 0,
      });

      expect(useHuntStore.getState().consumeLastSubmission()).not.toBeNull();
      expect(useHuntStore.getState().consumeLastSubmission()).toBeNull();
    });

    it('carries a failed verdict through, so a miss is not scored', () => {
      useHuntStore.getState().recordLocalVerification('solo_challenge_2', {
        verified: false,
        pointsAwarded: 0,
        reason: "You're 250m away. Get within 50m.",
      });

      const pending = useHuntStore.getState().consumeLastSubmission();
      expect(pending?.result.verified).toBe(false);
      expect(pending?.result.reason).toMatch(/250m/);
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
