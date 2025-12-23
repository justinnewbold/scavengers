'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  status: string;
  completedChallenges: number;
  startedAt: string;
  completedAt: string | null;
}

interface SSEMessage {
  type: 'connected' | 'update';
  data?: LeaderboardEntry[];
  huntId?: string;
}

interface UseRealtimeLeaderboardOptions {
  huntId: string;
  enabled?: boolean;
  onUpdate?: (leaderboard: LeaderboardEntry[]) => void;
}

export function useRealtimeLeaderboard({
  huntId,
  enabled = true,
  onUpdate,
}: UseRealtimeLeaderboardOptions) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const connect = useCallback(() => {
    if (!enabled || !huntId || typeof window === 'undefined') return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(`/api/leaderboard/${huntId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);

          if (message.type === 'connected') {
            console.log('Leaderboard SSE connected for hunt:', message.huntId);
          } else if (message.type === 'update' && message.data) {
            setLeaderboard(message.data);
            onUpdate?.(message.data);
          }
        } catch (parseError) {
          console.error('Error parsing SSE message:', parseError);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = RECONNECT_DELAY * reconnectAttempts.current;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };
    } catch (err) {
      setError('Failed to connect to leaderboard updates');
      console.error('EventSource error:', err);
    }
  }, [huntId, enabled, onUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [huntId, enabled, connect, disconnect]);

  // Reconnect when visibility changes (tab becomes active again)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && !isConnected) {
        reconnectAttempts.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isConnected, connect]);

  return {
    leaderboard,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
}
