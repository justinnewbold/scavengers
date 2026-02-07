import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSoloModeStore } from '../soloModeStore';

jest.mock('@/config/soloMode', () => ({
  SOLO_HUNT_PRESETS: { quick: { challengeCount: 5, duration: 10, difficulty: 'easy' } },
  SOLO_THEMES: [
    { id: 'nature', label: 'Nature', icon: 'leaf', description: 'Plants' },
    { id: 'urban', label: 'Urban', icon: 'business', description: 'City' },
  ],
  SOLO_MODE_LIMITS: { minChallenges: 3, maxChallenges: 25, minDuration: 5, maxDuration: 120, maxHistoryItems: 50 },
}));

const mockSession = {
  id: 'solo_123',
  hunt: {
    id: 'hunt_1',
    title: 'Test',
    description: 'Test hunt',
    difficulty: 'medium' as const,
    is_public: false,
    status: 'active' as const,
    challenges: [
      { id: 'c1', title: 'C1', description: 'D1', points: 100, verification_type: 'photo' as const },
      { id: 'c2', title: 'C2', description: 'D2', points: 150, verification_type: 'gps' as const },
    ],
  },
  config: {
    type: 'explorer' as const,
    difficulty: 'medium' as const,
    challengeCount: 10,
    environment: 'mixed' as const,
    duration: 30,
    useLocation: false,
  },
  startedAt: new Date().toISOString(),
  completedChallenges: [] as string[],
  score: 0,
  bonusPoints: 0,
  currentStreak: 0,
  bestStreak: 0,
  timeElapsed: 0,
  isPaused: false,
};

const mockApiResponse = {
  hunt: { title: 'Generated Hunt', description: 'A generated hunt' },
  challenges: [
    { title: 'Challenge 1', description: 'Desc 1', points: 100, verification_type: 'photo' },
    { title: 'Challenge 2', description: 'Desc 2', points: 200, verification_type: 'gps' },
  ],
};

beforeEach(() => {
  useSoloModeStore.setState({
    activeSession: null,
    history: [],
    personalRecords: {},
    totalSoloHuntsCompleted: 0,
    totalSoloPointsEarned: 0,
    currentDailyStreak: 0,
    lastPlayedDate: null,
    isGenerating: false,
    error: null,
  });
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (global.fetch as jest.Mock).mockReset();
});

describe('useSoloModeStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useSoloModeStore.getState();

      expect(state.activeSession).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.personalRecords).toEqual({});
      expect(state.totalSoloHuntsCompleted).toBe(0);
      expect(state.totalSoloPointsEarned).toBe(0);
      expect(state.currentDailyStreak).toBe(0);
      expect(state.lastPlayedDate).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('startSoloHunt', () => {
    it('should generate a hunt and create an active session', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const config = mockSession.config;
      const result = await useSoloModeStore.getState().startSoloHunt(config);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Generated Hunt');
      expect(result!.challenges).toHaveLength(2);

      const state = useSoloModeStore.getState();
      expect(state.activeSession).not.toBeNull();
      expect(state.activeSession!.config).toEqual(config);
      expect(state.activeSession!.score).toBe(0);
      expect(state.activeSession!.completedChallenges).toEqual([]);
      expect(state.activeSession!.isPaused).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set isGenerating during hunt generation', async () => {
      let generatingDuringFetch = false;

      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        generatingDuringFetch = useSoloModeStore.getState().isGenerating;
        return { ok: true, json: async () => mockApiResponse };
      });

      await useSoloModeStore.getState().startSoloHunt(mockSession.config);

      expect(generatingDuringFetch).toBe(true);
      expect(useSoloModeStore.getState().isGenerating).toBe(false);
    });

    it('should set error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await useSoloModeStore.getState().startSoloHunt(mockSession.config);

      expect(result).toBeNull();
      expect(useSoloModeStore.getState().error).toBe('Network error');
      expect(useSoloModeStore.getState().activeSession).toBeNull();
      expect(useSoloModeStore.getState().isGenerating).toBe(false);
    });

    it('should set error when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

      const result = await useSoloModeStore.getState().startSoloHunt(mockSession.config);

      expect(result).toBeNull();
      expect(useSoloModeStore.getState().error).toBe('Failed to generate solo hunt');
    });

    it('should pick a random theme when config.theme is surprise', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const config = { ...mockSession.config, theme: 'surprise' };
      await useSoloModeStore.getState().startSoloHunt(config);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(['nature', 'urban']).toContain(body.theme);
    });

    it('should pick a random theme when config.theme is undefined', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const config = { ...mockSession.config, theme: undefined };
      await useSoloModeStore.getState().startSoloHunt(config);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(['nature', 'urban']).toContain(body.theme);
    });
  });

  describe('pauseSession / resumeSession', () => {
    it('should pause an active session', () => {
      useSoloModeStore.setState({ activeSession: { ...mockSession } });

      useSoloModeStore.getState().pauseSession();

      expect(useSoloModeStore.getState().activeSession!.isPaused).toBe(true);
    });

    it('should resume a paused session', () => {
      useSoloModeStore.setState({ activeSession: { ...mockSession, isPaused: true } });

      useSoloModeStore.getState().resumeSession();

      expect(useSoloModeStore.getState().activeSession!.isPaused).toBe(false);
    });

    it('should do nothing when pausing with no active session', () => {
      useSoloModeStore.getState().pauseSession();

      expect(useSoloModeStore.getState().activeSession).toBeNull();
    });

    it('should do nothing when resuming with no active session', () => {
      useSoloModeStore.getState().resumeSession();

      expect(useSoloModeStore.getState().activeSession).toBeNull();
    });
  });

  describe('completeChallenge', () => {
    it('should add challenge to completedChallenges and update score', () => {
      useSoloModeStore.setState({ activeSession: { ...mockSession } });

      useSoloModeStore.getState().completeChallenge('c1', 100, 25);

      const session = useSoloModeStore.getState().activeSession!;
      expect(session.completedChallenges).toEqual(['c1']);
      expect(session.score).toBe(100);
      expect(session.bonusPoints).toBe(25);
      expect(session.currentStreak).toBe(1);
      expect(session.bestStreak).toBe(1);
    });

    it('should accumulate score and streak across multiple completions', () => {
      useSoloModeStore.setState({ activeSession: { ...mockSession } });

      useSoloModeStore.getState().completeChallenge('c1', 100, 10);
      useSoloModeStore.getState().completeChallenge('c2', 150, 20);

      const session = useSoloModeStore.getState().activeSession!;
      expect(session.completedChallenges).toEqual(['c1', 'c2']);
      expect(session.score).toBe(250);
      expect(session.bonusPoints).toBe(30);
      expect(session.currentStreak).toBe(2);
      expect(session.bestStreak).toBe(2);
    });

    it('should do nothing when no active session', () => {
      useSoloModeStore.getState().completeChallenge('c1', 100, 10);

      expect(useSoloModeStore.getState().activeSession).toBeNull();
    });
  });

  describe('finishSoloHunt', () => {
    it('should create a result and update history', () => {
      useSoloModeStore.setState({
        activeSession: { ...mockSession, score: 200, bonusPoints: 50, completedChallenges: ['c1'], bestStreak: 1, timeElapsed: 120 },
      });

      const result = useSoloModeStore.getState().finishSoloHunt();

      expect(result).not.toBeNull();
      expect(result!.score).toBe(200);
      expect(result!.bonusPoints).toBe(50);
      expect(result!.totalPoints).toBe(250);
      expect(result!.challengesCompleted).toBe(1);
      expect(result!.totalChallenges).toBe(2);
      expect(result!.personalBest).toBe(true);

      const state = useSoloModeStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.history).toHaveLength(1);
      expect(state.totalSoloHuntsCompleted).toBe(1);
      expect(state.totalSoloPointsEarned).toBe(250);
    });

    it('should detect personal best when beating existing record', () => {
      useSoloModeStore.setState({
        activeSession: { ...mockSession, score: 500, bonusPoints: 100, completedChallenges: ['c1', 'c2'], bestStreak: 2, timeElapsed: 90 },
        personalRecords: {
          explorer_medium: { huntType: 'explorer', difficulty: 'medium', bestScore: 400, bestTime: 100, bestStreak: 1, totalCompleted: 1, lastPlayedAt: '2025-01-01' },
        },
      });

      const result = useSoloModeStore.getState().finishSoloHunt();

      expect(result!.personalBest).toBe(true);
      expect(useSoloModeStore.getState().personalRecords['explorer_medium'].bestScore).toBe(600);
    });

    it('should not flag personal best when score is lower', () => {
      useSoloModeStore.setState({
        activeSession: { ...mockSession, score: 100, bonusPoints: 0, completedChallenges: ['c1'], bestStreak: 1, timeElapsed: 200 },
        personalRecords: {
          explorer_medium: { huntType: 'explorer', difficulty: 'medium', bestScore: 500, bestTime: 100, bestStreak: 3, totalCompleted: 2, lastPlayedAt: '2025-01-01' },
        },
      });

      const result = useSoloModeStore.getState().finishSoloHunt();

      expect(result!.personalBest).toBe(false);
      expect(useSoloModeStore.getState().personalRecords['explorer_medium'].bestScore).toBe(500);
    });

    it('should increment daily streak when played yesterday', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      useSoloModeStore.setState({
        activeSession: { ...mockSession, score: 100, completedChallenges: ['c1'] },
        currentDailyStreak: 3,
        lastPlayedDate: yesterday,
      });

      useSoloModeStore.getState().finishSoloHunt();

      expect(useSoloModeStore.getState().currentDailyStreak).toBe(4);
    });

    it('should reset daily streak when last played was not yesterday', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

      useSoloModeStore.setState({
        activeSession: { ...mockSession, score: 100, completedChallenges: ['c1'] },
        currentDailyStreak: 5,
        lastPlayedDate: twoDaysAgo,
      });

      useSoloModeStore.getState().finishSoloHunt();

      expect(useSoloModeStore.getState().currentDailyStreak).toBe(1);
    });

    it('should keep daily streak unchanged when played same day', () => {
      const today = new Date().toISOString().split('T')[0];

      useSoloModeStore.setState({
        activeSession: { ...mockSession, score: 100, completedChallenges: ['c1'] },
        currentDailyStreak: 3,
        lastPlayedDate: today,
      });

      useSoloModeStore.getState().finishSoloHunt();

      expect(useSoloModeStore.getState().currentDailyStreak).toBe(3);
    });

    it('should return null when no active session', () => {
      const result = useSoloModeStore.getState().finishSoloHunt();

      expect(result).toBeNull();
    });
  });

  describe('abandonSoloHunt', () => {
    it('should set activeSession to null', () => {
      useSoloModeStore.setState({ activeSession: { ...mockSession } });

      useSoloModeStore.getState().abandonSoloHunt();

      expect(useSoloModeStore.getState().activeSession).toBeNull();
    });
  });

  describe('getPersonalBest', () => {
    it('should return the record for a given type and difficulty', () => {
      const record = { huntType: 'explorer' as const, difficulty: 'medium' as const, bestScore: 400, bestTime: 100, bestStreak: 3, totalCompleted: 2, lastPlayedAt: '2025-01-01' };
      useSoloModeStore.setState({ personalRecords: { explorer_medium: record } });

      const result = useSoloModeStore.getState().getPersonalBest('explorer', 'medium');

      expect(result).toEqual(record);
    });

    it('should return null when no record exists', () => {
      const result = useSoloModeStore.getState().getPersonalBest('quick', 'hard');

      expect(result).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('should empty the history array', () => {
      useSoloModeStore.setState({
        history: [{ id: 'r1', huntId: 'h1', huntTitle: 'H', config: mockSession.config, score: 100, bonusPoints: 0, totalPoints: 100, challengesCompleted: 1, totalChallenges: 2, timeElapsed: 60, bestStreak: 1, completedAt: '2025-01-01' }],
      });

      useSoloModeStore.getState().clearHistory();

      expect(useSoloModeStore.getState().history).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('should set error to null', () => {
      useSoloModeStore.setState({ error: 'Something went wrong' });

      useSoloModeStore.getState().clearError();

      expect(useSoloModeStore.getState().error).toBeNull();
    });
  });
});
