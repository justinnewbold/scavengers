// Real-time WebSocket Types for Multiplayer Sync

export type RealtimeEventType =
  | 'player_joined'
  | 'player_left'
  | 'challenge_completed'
  | 'challenge_started'
  | 'score_updated'
  | 'hunt_started'
  | 'hunt_ended'
  | 'leaderboard_update'
  | 'player_location'
  | 'achievement_unlocked'
  | 'tag_event'
  | 'chat_message';

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  huntId: string;
  userId: string;
  timestamp: number;
  data: T;
}

export interface PlayerJoinedEvent {
  playerId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface PlayerLeftEvent {
  playerId: string;
  displayName: string;
}

export interface ChallengeCompletedEvent {
  playerId: string;
  displayName: string;
  challengeId: string;
  challengeTitle: string;
  points: number;
  photoUrl?: string;
  streak?: number;
}

export interface ScoreUpdatedEvent {
  playerId: string;
  displayName: string;
  oldScore: number;
  newScore: number;
  reason: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  challengesCompleted: number;
  currentStreak: number;
  lastActivity: number;
}

export interface LeaderboardUpdateEvent {
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
}

export interface PlayerLocationEvent {
  playerId: string;
  zone: string; // Fuzzy zone, not exact location
  lastUpdated: number;
}

export interface AchievementUnlockedEvent {
  playerId: string;
  displayName: string;
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  points: number;
}

export interface ChatMessageEvent {
  messageId: string;
  playerId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

// Connection state
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeState {
  connectionState: ConnectionState;
  huntId: string | null;
  leaderboard: LeaderboardEntry[];
  recentEvents: RealtimeEvent[];
  connectedPlayers: PlayerJoinedEvent[];
  error: string | null;
}

// WebSocket message format
export interface WebSocketMessage {
  action: 'subscribe' | 'unsubscribe' | 'broadcast' | 'ping';
  huntId?: string;
  event?: RealtimeEvent;
}
