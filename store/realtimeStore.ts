import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  RealtimeState,
  RealtimeEvent,
  ConnectionState,
  LeaderboardEntry,
  PlayerJoinedEvent,
  ChallengeCompletedEvent,
  LeaderboardUpdateEvent,
  WebSocketMessage,
} from '@/types/realtime';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://scavengers.newbold.cloud/ws';
const MAX_EVENTS = 50;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

interface RealtimeStore extends RealtimeState {
  // WebSocket instance
  ws: WebSocket | null;
  reconnectAttempt: number;
  reconnectTimeout: NodeJS.Timeout | null;

  // Actions
  connect: (huntId: string) => Promise<void>;
  disconnect: () => void;
  subscribe: (huntId: string) => void;
  unsubscribe: () => void;

  // Event handlers
  handleMessage: (event: MessageEvent) => void;
  handleOpen: () => void;
  handleClose: () => void;
  handleError: (error: Event) => void;

  // Broadcasting
  broadcastChallengeComplete: (data: Omit<ChallengeCompletedEvent, 'timestamp'>) => void;
  broadcastScoreUpdate: (oldScore: number, newScore: number, reason: string) => void;

  // Getters
  getPlayerRank: (playerId: string) => number | null;
  isPlayerOnline: (playerId: string) => boolean;

  // Utility
  clearEvents: () => void;
  setConnectionState: (state: ConnectionState) => void;
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  // Initial state
  connectionState: 'disconnected',
  huntId: null,
  leaderboard: [],
  recentEvents: [],
  connectedPlayers: [],
  error: null,
  ws: null,
  reconnectAttempt: 0,
  reconnectTimeout: null,

  connect: async (huntId: string) => {
    const { ws, disconnect } = get();

    // Disconnect existing connection
    if (ws) {
      disconnect();
    }

    set({ connectionState: 'connecting', huntId, error: null });

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const websocket = new WebSocket(`${WS_URL}?token=${token}&huntId=${huntId}`);

      websocket.onopen = () => get().handleOpen();
      websocket.onmessage = (event) => get().handleMessage(event);
      websocket.onclose = () => get().handleClose();
      websocket.onerror = (error) => get().handleError(error);

      set({ ws: websocket });
    } catch (error) {
      set({
        connectionState: 'disconnected',
        error: (error as Error).message,
      });
    }
  },

  disconnect: () => {
    const { ws, reconnectTimeout } = get();

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    if (ws) {
      ws.close();
    }

    set({
      ws: null,
      connectionState: 'disconnected',
      huntId: null,
      leaderboard: [],
      recentEvents: [],
      connectedPlayers: [],
      reconnectAttempt: 0,
      reconnectTimeout: null,
    });
  },

  subscribe: (huntId: string) => {
    const { ws, connectionState } = get();

    if (ws && connectionState === 'connected') {
      const message: WebSocketMessage = {
        action: 'subscribe',
        huntId,
      };
      ws.send(JSON.stringify(message));
      set({ huntId });
    }
  },

  unsubscribe: () => {
    const { ws, huntId, connectionState } = get();

    if (ws && connectionState === 'connected' && huntId) {
      const message: WebSocketMessage = {
        action: 'unsubscribe',
        huntId,
      };
      ws.send(JSON.stringify(message));
      set({ huntId: null, leaderboard: [], recentEvents: [], connectedPlayers: [] });
    }
  },

  handleOpen: () => {
    const { huntId } = get();

    set({
      connectionState: 'connected',
      reconnectAttempt: 0,
      error: null,
    });

    // Re-subscribe if we have a huntId
    if (huntId) {
      get().subscribe(huntId);
    }

    console.log('[WebSocket] Connected');
  },

  handleClose: () => {
    const { huntId, reconnectAttempt } = get();

    set({ connectionState: 'disconnected', ws: null });

    // Attempt reconnection if we were subscribed to a hunt
    if (huntId && reconnectAttempt < RECONNECT_DELAYS.length) {
      const delay = RECONNECT_DELAYS[reconnectAttempt];
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1})`);

      set({ connectionState: 'reconnecting' });

      const timeout = setTimeout(() => {
        set({ reconnectAttempt: reconnectAttempt + 1 });
        get().connect(huntId);
      }, delay);

      set({ reconnectTimeout: timeout });
    } else if (reconnectAttempt >= RECONNECT_DELAYS.length) {
      set({ error: 'Connection lost. Please try again.' });
    }
  },

  handleError: (error) => {
    console.error('[WebSocket] Error:', error);
    set({ error: 'Connection error occurred' });
  },

  handleMessage: (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as RealtimeEvent;
      const { recentEvents, connectedPlayers, leaderboard } = get();

      // Add to recent events (keep last MAX_EVENTS)
      const newEvents = [data, ...recentEvents].slice(0, MAX_EVENTS);
      set({ recentEvents: newEvents });

      // Handle specific event types
      switch (data.type) {
        case 'player_joined': {
          const joinData = data.data as PlayerJoinedEvent;
          if (!connectedPlayers.find(p => p.playerId === joinData.playerId)) {
            set({ connectedPlayers: [...connectedPlayers, joinData] });
          }
          break;
        }

        case 'player_left': {
          const leftData = data.data as { playerId: string };
          set({
            connectedPlayers: connectedPlayers.filter(p => p.playerId !== leftData.playerId),
          });
          break;
        }

        case 'leaderboard_update': {
          const lbData = data.data as LeaderboardUpdateEvent;
          set({ leaderboard: lbData.leaderboard });
          break;
        }

        case 'score_updated': {
          // Update leaderboard entry if exists
          const scoreData = data.data as { playerId: string; newScore: number };
          const updatedLeaderboard = leaderboard.map(entry =>
            entry.playerId === scoreData.playerId
              ? { ...entry, score: scoreData.newScore }
              : entry
          );
          // Re-sort by score
          updatedLeaderboard.sort((a, b) => b.score - a.score);
          // Update ranks
          updatedLeaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
          });
          set({ leaderboard: updatedLeaderboard });
          break;
        }

        case 'challenge_completed': {
          const challengeData = data.data as ChallengeCompletedEvent;
          // Update leaderboard entry
          const updatedLb = leaderboard.map(entry =>
            entry.playerId === challengeData.playerId
              ? {
                  ...entry,
                  score: entry.score + challengeData.points,
                  challengesCompleted: entry.challengesCompleted + 1,
                  currentStreak: challengeData.streak || entry.currentStreak,
                  lastActivity: Date.now(),
                }
              : entry
          );
          updatedLb.sort((a, b) => b.score - a.score);
          updatedLb.forEach((entry, index) => {
            entry.rank = index + 1;
          });
          set({ leaderboard: updatedLb });
          break;
        }
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  },

  broadcastChallengeComplete: (data) => {
    const { ws, huntId, connectionState } = get();

    if (ws && connectionState === 'connected' && huntId) {
      const event: RealtimeEvent<ChallengeCompletedEvent> = {
        type: 'challenge_completed',
        huntId,
        userId: data.playerId,
        timestamp: Date.now(),
        data: { ...data, timestamp: Date.now() } as ChallengeCompletedEvent,
      };

      const message: WebSocketMessage = {
        action: 'broadcast',
        huntId,
        event,
      };

      ws.send(JSON.stringify(message));
    }
  },

  broadcastScoreUpdate: (oldScore, newScore, reason) => {
    const { ws, huntId, connectionState } = get();

    if (ws && connectionState === 'connected' && huntId) {
      // This will be handled by the server typically
      console.log('[WebSocket] Score update:', { oldScore, newScore, reason });
    }
  },

  getPlayerRank: (playerId) => {
    const { leaderboard } = get();
    const entry = leaderboard.find(e => e.playerId === playerId);
    return entry?.rank ?? null;
  },

  isPlayerOnline: (playerId) => {
    const { connectedPlayers } = get();
    return connectedPlayers.some(p => p.playerId === playerId);
  },

  clearEvents: () => {
    set({ recentEvents: [] });
  },

  setConnectionState: (state) => {
    set({ connectionState: state });
  },
}));

export default useRealtimeStore;
