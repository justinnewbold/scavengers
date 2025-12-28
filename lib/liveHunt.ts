import { useEffect, useRef, useState, useCallback } from 'react';

export interface LivePlayer {
  id: string;
  name: string;
  score: number;
  currentChallenge: number;
  completedChallenges: number[];
  lastUpdate: number;
}

export interface LiveHuntState {
  huntId: string;
  players: LivePlayer[];
  startTime: number;
  endTime?: number;
  leaderboard: { id: string; name: string; score: number }[];
}

type MessageHandler = (data: LiveHuntState) => void;

class LiveHuntConnection {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private huntId: string | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  connect(huntId: string, userId: string, token: string): void {
    this.huntId = huntId;
    this.userId = userId;
    this.token = token;
    this.establishConnection();
  }

  private establishConnection(): void {
    if (!this.huntId || !this.token) return;

    const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.example.com/ws';
    this.ws = new WebSocket(`${wsUrl}/live/${this.huntId}?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('[LiveHunt] Connected');
      this.reconnectAttempts = 0;
      this.startPingInterval();
      this.sendJoin();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(data));
      } catch (e) {
        console.error('[LiveHunt] Parse error:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[LiveHunt] Disconnected');
      this.stopPingInterval();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[LiveHunt] Error:', error);
    };
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[LiveHunt] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[LiveHunt] Reconnecting in ${delay}ms...`);

    setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  private sendJoin(): void {
    this.send({
      type: 'join',
      userId: this.userId,
      huntId: this.huntId,
    });
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  updateProgress(challengeIndex: number, score: number): void {
    this.send({
      type: 'progress',
      challengeIndex,
      score,
      timestamp: Date.now(),
    });
  }

  completeChallenge(challengeIndex: number, points: number): void {
    this.send({
      type: 'complete',
      challengeIndex,
      points,
      timestamp: Date.now(),
    });
  }

  sendReaction(emoji: string): void {
    this.send({
      type: 'reaction',
      emoji,
      timestamp: Date.now(),
    });
  }

  onUpdate(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.huntId = null;
    this.userId = null;
    this.token = null;
  }
}

export const liveHuntConnection = new LiveHuntConnection();

export function useLiveHunt(huntId: string, userId: string, token: string) {
  const [state, setState] = useState<LiveHuntState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; name: string }[]>([]);

  useEffect(() => {
    liveHuntConnection.connect(huntId, userId, token);

    const unsubscribe = liveHuntConnection.onUpdate((data) => {
      if (data.huntId) {
        setState(data);
        setIsConnected(true);
      }
    });

    return () => {
      unsubscribe();
      liveHuntConnection.disconnect();
    };
  }, [huntId, userId, token]);

  const updateProgress = useCallback((challengeIndex: number, score: number) => {
    liveHuntConnection.updateProgress(challengeIndex, score);
  }, []);

  const completeChallenge = useCallback((challengeIndex: number, points: number) => {
    liveHuntConnection.completeChallenge(challengeIndex, points);
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    liveHuntConnection.sendReaction(emoji);
  }, []);

  return {
    state,
    isConnected,
    reactions,
    updateProgress,
    completeChallenge,
    sendReaction,
    leaderboard: state?.leaderboard || [],
    players: state?.players || [],
  };
}
