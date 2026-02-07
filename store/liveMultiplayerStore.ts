import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LiveRace,
  RaceParticipant,
  RaceUpdate,
  SpectatorSession,
  SpectatorReaction,
  LiveComment,
  Tournament,
  TournamentBracket,
  RaceReplay,
  ReplayHighlight,
  RaceInvite,
  MatchmakingQueue,
  MatchFound,
  ReactionType,
} from '@/types/liveMultiplayer';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface LiveMultiplayerState {
  // Active Race
  currentRace: LiveRace | null;
  raceUpdates: RaceUpdate[];
  isRacing: boolean;

  // Spectating
  spectatorSession: SpectatorSession | null;
  liveReactions: SpectatorReaction[];
  liveComments: LiveComment[];
  isSpectating: boolean;

  // Available Races
  publicRaces: LiveRace[];
  friendRaces: LiveRace[];

  // Tournaments
  activeTournaments: Tournament[];
  currentTournament: Tournament | null;
  tournamentBrackets: TournamentBracket[];

  // Replays
  savedReplays: RaceReplay[];
  currentReplay: RaceReplay | null;
  replayPlaybackTime: number;
  isPlayingReplay: boolean;

  // Invites
  pendingInvites: RaceInvite[];

  // Matchmaking
  isMatchmaking: boolean;
  matchmakingStatus: string | null;
  matchFound: MatchFound | null;

  // WebSocket connection
  isConnected: boolean;
  connectionError: string | null;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions - Race Management
  createRace: (huntId: string, settings: Partial<LiveRace>) => Promise<string>;
  joinRace: (raceId: string, inviteCode?: string) => Promise<void>;
  leaveRace: () => Promise<void>;
  setReady: (isReady: boolean) => Promise<void>;
  startRace: () => Promise<void>;
  cancelRace: () => Promise<void>;

  // Actions - Racing
  submitChallengeCompletion: (challengeId: string, score: number) => Promise<void>;
  updatePosition: (latitude: number, longitude: number) => void;
  finishRace: () => Promise<void>;

  // Actions - Spectating
  startSpectating: (raceId: string) => Promise<void>;
  stopSpectating: () => void;
  followRacer: (userId: string | null) => void;
  setViewMode: (mode: 'overview' | 'follow' | 'map') => void;
  sendReaction: (type: ReactionType, targetUserId?: string) => void;
  sendComment: (content: string) => void;

  // Actions - Tournaments
  fetchTournaments: () => Promise<void>;
  fetchTournamentDetails: (tournamentId: string) => Promise<void>;
  registerForTournament: (tournamentId: string) => Promise<void>;
  withdrawFromTournament: (tournamentId: string) => Promise<void>;

  // Actions - Replays
  fetchReplays: (huntId?: string) => Promise<void>;
  loadReplay: (replayId: string) => Promise<void>;
  playReplay: () => void;
  pauseReplay: () => void;
  seekReplay: (time: number) => void;
  shareReplay: (replayId: string) => Promise<string>;

  // Actions - Invites
  fetchInvites: () => Promise<void>;
  sendInvite: (raceId: string, userId: string) => Promise<void>;
  respondToInvite: (inviteId: string, accept: boolean) => Promise<void>;

  // Actions - Matchmaking
  startMatchmaking: (huntId?: string, preferences?: Partial<MatchmakingQueue>) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  acceptMatch: () => Promise<void>;
  declineMatch: () => void;

  // Actions - Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  handleWebSocketMessage: (message: RaceUpdate) => void;

  // Actions - Public Races
  fetchPublicRaces: () => Promise<void>;
  fetchFriendRaces: () => Promise<void>;
}

export const useLiveMultiplayerStore = create<LiveMultiplayerState>((set, get) => ({
  // Initial state
  currentRace: null,
  raceUpdates: [],
  isRacing: false,
  spectatorSession: null,
  liveReactions: [],
  liveComments: [],
  isSpectating: false,
  publicRaces: [],
  friendRaces: [],
  activeTournaments: [],
  currentTournament: null,
  tournamentBrackets: [],
  savedReplays: [],
  currentReplay: null,
  replayPlaybackTime: 0,
  isPlayingReplay: false,
  pendingInvites: [],
  isMatchmaking: false,
  matchmakingStatus: null,
  matchFound: null,
  isConnected: false,
  connectionError: null,
  isLoading: false,
  error: null,

  // Race Management
  createRace: async (huntId, settings) => {
    set({ isLoading: true, error: null });
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/live/races`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ huntId, ...settings }),
      });
      if (!response.ok) throw new Error('Failed to create race');
      const data = await response.json();

      set({
        currentRace: data.race,
        isLoading: false,
      });

      // Connect to WebSocket for real-time updates
      get().connect();

      return data.race.id;
    } catch (error) {
      set({ error: 'Failed to create race', isLoading: false });
      throw error;
    }
  },

  joinRace: async (raceId, inviteCode) => {
    set({ isLoading: true, error: null });
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/live/races/${raceId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ inviteCode }),
      });
      if (!response.ok) throw new Error('Failed to join race');
      const data = await response.json();

      set({
        currentRace: data.race,
        isLoading: false,
      });

      get().connect();
    } catch (error) {
      set({ error: 'Failed to join race', isLoading: false });
      throw error;
    }
  },

  leaveRace: async () => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${currentRace.id}/leave`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      get().disconnect();
      set({
        currentRace: null,
        raceUpdates: [],
        isRacing: false,
      });
    } catch (error) {
      set({ error: 'Failed to leave race' });
      throw error;
    }
  },

  setReady: async (isReady) => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${currentRace.id}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isReady }),
      });
    } catch (error) {
      set({ error: 'Failed to update ready status' });
    }
  },

  startRace: async () => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${currentRace.id}/start`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      set({ isRacing: true });
    } catch (error) {
      set({ error: 'Failed to start race' });
      throw error;
    }
  },

  cancelRace: async () => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${currentRace.id}/cancel`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      get().disconnect();
      set({
        currentRace: null,
        raceUpdates: [],
        isRacing: false,
      });
    } catch (error) {
      set({ error: 'Failed to cancel race' });
    }
  },

  // Racing Actions
  submitChallengeCompletion: async (challengeId, score) => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${currentRace.id}/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ challengeId, score }),
      });
    } catch (error) {
      set({ error: 'Failed to submit challenge' });
    }
  },

  updatePosition: (latitude, longitude) => {
    const { currentRace, isConnected } = get();
    if (!currentRace || !isConnected) return;

    // Send position update via WebSocket (handled elsewhere in actual implementation)
    // This would typically be handled by a WebSocket service
  },

  finishRace: async () => {
    const { currentRace } = get();
    if (!currentRace) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${currentRace.id}/finish`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      set({ isRacing: false });
    } catch (error) {
      set({ error: 'Failed to finish race' });
    }
  },

  // Spectating
  startSpectating: async (raceId) => {
    set({ isLoading: true, error: null });
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/live/races/${raceId}/spectate`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to start spectating');
      const data = await response.json();

      set({
        currentRace: data.race,
        spectatorSession: data.session,
        isSpectating: true,
        isLoading: false,
      });

      get().connect();
    } catch (error) {
      set({ error: 'Failed to start spectating', isLoading: false });
      throw error;
    }
  },

  stopSpectating: () => {
    get().disconnect();
    set({
      currentRace: null,
      spectatorSession: null,
      liveReactions: [],
      liveComments: [],
      isSpectating: false,
    });
  },

  followRacer: (userId) => {
    set(state => ({
      spectatorSession: state.spectatorSession
        ? { ...state.spectatorSession, followingUserId: userId || undefined }
        : null,
    }));
  },

  setViewMode: (mode) => {
    set(state => ({
      spectatorSession: state.spectatorSession
        ? { ...state.spectatorSession, viewMode: mode }
        : null,
    }));
  },

  sendReaction: (type, targetUserId) => {
    const { currentRace, isConnected } = get();
    if (!currentRace || !isConnected) return;

    // Send reaction via WebSocket
    const reaction: Partial<SpectatorReaction> = {
      raceId: currentRace.id,
      type,
      targetUserId,
    };

    // Add to local state optimistically
    set(state => ({
      liveReactions: [
        ...state.liveReactions.slice(-50), // Keep last 50 reactions
        {
          ...reaction,
          id: `temp-${Date.now()}`,
          userId: 'current-user',
          userName: 'You',
          createdAt: new Date().toISOString(),
        } as SpectatorReaction,
      ],
    }));
  },

  sendComment: (content) => {
    const { currentRace, isConnected } = get();
    if (!currentRace || !isConnected || !content.trim()) return;

    // Send comment via WebSocket
    const comment: Partial<LiveComment> = {
      raceId: currentRace.id,
      content: content.trim(),
    };

    // Add to local state optimistically
    set(state => ({
      liveComments: [
        ...state.liveComments,
        {
          ...comment,
          id: `temp-${Date.now()}`,
          userId: 'current-user',
          displayName: 'You',
          createdAt: new Date().toISOString(),
        } as LiveComment,
      ],
    }));
  },

  // Tournaments
  fetchTournaments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tournaments`);
      if (!response.ok) throw new Error('Failed to load tournaments');
      const data = await response.json();

      set({
        activeTournaments: data.tournaments,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to load tournaments', isLoading: false });
    }
  },

  fetchTournamentDetails: async (tournamentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
      if (!response.ok) throw new Error('Failed to load tournament');
      const data = await response.json();

      set({
        currentTournament: data.tournament,
        tournamentBrackets: data.brackets,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to load tournament', isLoading: false });
    }
  },

  registerForTournament: async (tournamentId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to register for tournament');
      const data = await response.json();

      set(state => ({
        currentTournament: state.currentTournament?.id === tournamentId
          ? data.tournament
          : state.currentTournament,
      }));
    } catch (error) {
      set({ error: 'Failed to register for tournament' });
      throw error;
    }
  },

  withdrawFromTournament: async (tournamentId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/tournaments/${tournamentId}/withdraw`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      set(state => ({
        currentTournament: state.currentTournament?.id === tournamentId
          ? { ...state.currentTournament, registeredCount: state.currentTournament.registeredCount - 1 }
          : state.currentTournament,
      }));
    } catch (error) {
      set({ error: 'Failed to withdraw from tournament' });
      throw error;
    }
  },

  // Replays
  fetchReplays: async (huntId) => {
    set({ isLoading: true, error: null });
    try {
      const params = huntId ? `?huntId=${huntId}` : '';
      const response = await fetch(`${API_BASE}/replays${params}`);
      if (!response.ok) throw new Error('Failed to load replays');
      const data = await response.json();

      set({
        savedReplays: data.replays,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to load replays', isLoading: false });
    }
  },

  loadReplay: async (replayId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/replays/${replayId}`);
      if (!response.ok) throw new Error('Failed to load replay');
      const data = await response.json();

      set({
        currentReplay: data.replay,
        replayPlaybackTime: 0,
        isPlayingReplay: false,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to load replay', isLoading: false });
    }
  },

  playReplay: () => {
    set({ isPlayingReplay: true });
    // Playback logic would be handled by a separate timer/animation
  },

  pauseReplay: () => {
    set({ isPlayingReplay: false });
  },

  seekReplay: (time) => {
    const { currentReplay } = get();
    if (!currentReplay) return;

    const clampedTime = Math.max(0, Math.min(time, currentReplay.duration));
    set({ replayPlaybackTime: clampedTime });
  },

  shareReplay: async (replayId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/replays/${replayId}/share`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to share replay');
      const data = await response.json();

      // Update share count
      set(state => ({
        savedReplays: state.savedReplays.map(r =>
          r.id === replayId ? { ...r, shareCount: r.shareCount + 1 } : r
        ),
        currentReplay: state.currentReplay?.id === replayId
          ? { ...state.currentReplay, shareCount: state.currentReplay.shareCount + 1 }
          : state.currentReplay,
      }));

      return data.shareUrl;
    } catch (error) {
      set({ error: 'Failed to share replay' });
      throw error;
    }
  },

  // Invites
  fetchInvites: async () => {
    try {
      const response = await fetch(`${API_BASE}/live/invites`);
      if (!response.ok) throw new Error('Failed to load invites');
      const data = await response.json();

      set({ pendingInvites: data.invites });
    } catch (error) {
      set({ error: 'Failed to load invites' });
    }
  },

  sendInvite: async (raceId, userId) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/races/${raceId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      set({ error: 'Failed to send invite' });
      throw error;
    }
  },

  respondToInvite: async (inviteId, accept) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/live/invites/${inviteId}/${accept ? 'accept' : 'decline'}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (accept) {
        if (!response.ok) throw new Error('Failed to respond to invite');
        const data = await response.json();
        set(state => ({
          currentRace: data.race,
          pendingInvites: state.pendingInvites.filter(i => i.id !== inviteId),
        }));
        get().connect();
      } else {
        set(state => ({
          pendingInvites: state.pendingInvites.filter(i => i.id !== inviteId),
        }));
      }
    } catch (error) {
      set({ error: 'Failed to respond to invite' });
      throw error;
    }
  },

  // Matchmaking
  startMatchmaking: async (huntId, preferences) => {
    set({
      isMatchmaking: true,
      matchmakingStatus: 'Searching for opponents...',
      matchFound: null,
      error: null,
    });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/live/matchmaking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ huntId, preferences }),
      });
      if (!response.ok) throw new Error('Failed to start matchmaking');
      const data = await response.json();

      if (data.status === 'queued') {
        // Connect to WebSocket for matchmaking updates
        get().connect();
      }
    } catch (error) {
      set({
        isMatchmaking: false,
        matchmakingStatus: null,
        error: 'Failed to start matchmaking',
      });
    }
  },

  cancelMatchmaking: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/live/matchmaking/cancel`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // Best-effort cancellation
    }
    set({
      isMatchmaking: false,
      matchmakingStatus: null,
      matchFound: null,
    });
  },

  acceptMatch: async () => {
    const { matchFound } = get();
    if (!matchFound) return;

    try {
      await get().joinRace(matchFound.raceId);
      set({
        isMatchmaking: false,
        matchmakingStatus: null,
        matchFound: null,
      });
    } catch (error) {
      set({ error: 'Failed to accept match' });
    }
  },

  declineMatch: () => {
    set({
      matchFound: null,
      matchmakingStatus: 'Searching for opponents...',
    });
    // Could re-queue here
  },

  // Connection
  connect: async () => {
    // WebSocket connection logic would go here
    // This is a placeholder for the actual WebSocket implementation
    set({ isConnected: true, connectionError: null });
  },

  disconnect: () => {
    // WebSocket disconnection logic
    set({ isConnected: false });
  },

  handleWebSocketMessage: (message) => {
    const { currentRace } = get();
    if (!currentRace || message.raceId !== currentRace.id) return;

    // Add to updates log
    set(state => ({
      raceUpdates: [...state.raceUpdates.slice(-100), message],
    }));

    // Handle specific message types
    switch (message.type) {
      case 'participant_joined':
        set(state => ({
          currentRace: state.currentRace
            ? {
                ...state.currentRace,
                participants: [
                  ...state.currentRace.participants,
                  message.data as unknown as RaceParticipant,
                ],
              }
            : null,
        }));
        break;

      case 'participant_left':
        set(state => ({
          currentRace: state.currentRace
            ? {
                ...state.currentRace,
                participants: state.currentRace.participants.filter(
                  p => p.userId !== message.userId
                ),
              }
            : null,
        }));
        break;

      case 'race_started':
        set(state => ({
          currentRace: state.currentRace
            ? { ...state.currentRace, status: 'in_progress' }
            : null,
          isRacing: !state.isSpectating,
        }));
        break;

      case 'challenge_completed':
      case 'position_update':
        // Update participant data
        set(state => ({
          currentRace: state.currentRace
            ? {
                ...state.currentRace,
                participants: state.currentRace.participants.map(p =>
                  p.userId === message.userId
                    ? { ...p, ...(message.data as Partial<RaceParticipant>) }
                    : p
                ),
              }
            : null,
        }));
        break;

      case 'race_finished':
        set(state => ({
          currentRace: state.currentRace
            ? { ...state.currentRace, status: 'finished' }
            : null,
          isRacing: false,
        }));
        break;

      case 'reaction':
        set(state => ({
          liveReactions: [
            ...state.liveReactions.slice(-50),
            message.data as unknown as SpectatorReaction,
          ],
        }));
        break;
    }
  },

  // Public Races
  fetchPublicRaces: async () => {
    try {
      const response = await fetch(`${API_BASE}/live/races?public=true`);
      if (!response.ok) throw new Error('Failed to load public races');
      const data = await response.json();

      set({ publicRaces: data.races });
    } catch (error) {
      set({ error: 'Failed to load public races' });
    }
  },

  fetchFriendRaces: async () => {
    try {
      const response = await fetch(`${API_BASE}/live/races?friends=true`);
      if (!response.ok) throw new Error('Failed to load friend races');
      const data = await response.json();

      set({ friendRaces: data.races });
    } catch (error) {
      set({ error: 'Failed to load friend races' });
    }
  },
}));
