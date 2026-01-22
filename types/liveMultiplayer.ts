// Live Multiplayer & Spectator Mode Types

export type RaceStatus = 'waiting' | 'countdown' | 'in_progress' | 'finished' | 'cancelled';
export type ParticipantStatus = 'waiting' | 'ready' | 'racing' | 'finished' | 'disconnected' | 'dnf';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';
export type TournamentStatus = 'registration' | 'in_progress' | 'completed' | 'cancelled';

// Live Race Types
export interface LiveRace {
  id: string;
  huntId: string;
  huntTitle: string;
  hostId: string;
  hostName: string;

  // Settings
  maxParticipants: number;
  isPrivate: boolean;
  inviteCode?: string;
  allowSpectators: boolean;
  allowLateJoin: boolean;

  // Status
  status: RaceStatus;
  startTime?: string;
  endTime?: string;
  countdownSeconds?: number;

  // Participants
  participants: RaceParticipant[];
  spectatorCount: number;

  // Live data
  currentLeader?: string;
  totalChallenges: number;

  createdAt: string;
}

export interface RaceParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;

  // Status
  status: ParticipantStatus;
  isHost: boolean;
  isReady: boolean;

  // Progress
  currentChallenge: number;
  completedChallenges: number;
  score: number;
  distance: number; // meters traveled

  // Position
  position?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };

  // Timing
  startedAt?: string;
  finishedAt?: string;
  totalTime?: number; // milliseconds

  // Streaks
  streak: number;
  maxStreak: number;
}

export interface RaceUpdate {
  type: 'participant_joined' | 'participant_left' | 'participant_ready' | 'race_started' |
       'challenge_completed' | 'position_update' | 'race_finished' | 'reaction';
  raceId: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Spectator Types
export interface SpectatorSession {
  id: string;
  raceId: string;
  userId: string;

  // Viewing preferences
  followingUserId?: string; // Auto-follow specific racer
  viewMode: 'overview' | 'follow' | 'map';

  // Interaction
  canReact: boolean;
  canComment: boolean;

  joinedAt: string;
}

export interface SpectatorReaction {
  id: string;
  raceId: string;
  userId: string;
  userName: string;

  type: ReactionType;
  targetUserId?: string; // Reaction directed at specific racer

  createdAt: string;
}

export type ReactionType =
  | 'cheer'
  | 'wow'
  | 'laugh'
  | 'fire'
  | 'trophy'
  | 'lightning'
  | 'heart'
  | 'clap';

export const REACTION_CONFIG: Record<ReactionType, { emoji: string; label: string }> = {
  cheer: { emoji: '🎉', label: 'Cheer' },
  wow: { emoji: '😮', label: 'Wow' },
  laugh: { emoji: '😂', label: 'Laugh' },
  fire: { emoji: '🔥', label: 'Fire' },
  trophy: { emoji: '🏆', label: 'Trophy' },
  lightning: { emoji: '⚡', label: 'Fast' },
  heart: { emoji: '❤️', label: 'Love' },
  clap: { emoji: '👏', label: 'Clap' },
};

export interface LiveComment {
  id: string;
  raceId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
}

// Tournament Types
export interface Tournament {
  id: string;
  name: string;
  description: string;
  huntId: string;
  huntTitle: string;
  organizerId: string;
  organizerName: string;

  // Format
  format: TournamentFormat;
  maxParticipants: number;
  minParticipants: number;

  // Schedule
  registrationStart: string;
  registrationEnd: string;
  tournamentStart: string;
  estimatedEnd?: string;

  // Status
  status: TournamentStatus;
  currentRound: number;
  totalRounds: number;

  // Participants
  registeredCount: number;
  participants: TournamentParticipant[];

  // Brackets
  brackets: TournamentBracket[];

  // Prizes
  prizes: TournamentPrize[];

  // Settings
  isRanked: boolean;
  entryFee?: number;
  prizePool?: number;

  // Visuals
  bannerUrl?: string;
  themeColor: string;

  createdAt: string;
  updatedAt: string;
}

export interface TournamentParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;

  // Seeding
  seed?: number;
  currentRank?: number;

  // Stats
  wins: number;
  losses: number;
  totalScore: number;
  averageTime?: number;

  // Status
  isEliminated: boolean;
  eliminatedInRound?: number;

  registeredAt: string;
}

export interface TournamentBracket {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;

  // Participants
  participant1Id?: string;
  participant1Name?: string;
  participant2Id?: string;
  participant2Name?: string;

  // Results
  winnerId?: string;
  participant1Score?: number;
  participant2Score?: number;
  participant1Time?: number;
  participant2Time?: number;

  // Linked race
  raceId?: string;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
  scheduledTime?: string;
  completedAt?: string;

  // Next match
  nextMatchId?: string;
  nextMatchSlot?: 'participant1' | 'participant2';
}

export interface TournamentPrize {
  position: number;
  name: string;
  description: string;
  type: 'badge' | 'title' | 'points' | 'cash' | 'item';
  value?: number;
  imageUrl?: string;
}

// Replay Types
export interface RaceReplay {
  id: string;
  raceId: string;
  huntId: string;
  huntTitle: string;

  // Metadata
  duration: number; // milliseconds
  participantCount: number;
  winnerId?: string;
  winnerName?: string;

  // Replay data
  events: ReplayEvent[];
  snapshots: ReplaySnapshot[];

  // Stats
  viewCount: number;
  likeCount: number;
  shareCount: number;

  // Highlights
  highlights: ReplayHighlight[];
  thumbnailUrl?: string;

  createdAt: string;
}

export interface ReplayEvent {
  timestamp: number; // milliseconds from race start
  type: 'challenge_start' | 'challenge_complete' | 'position_change' |
       'streak_achieved' | 'power_up' | 'reaction' | 'finish';
  userId: string;
  data: Record<string, unknown>;
}

export interface ReplaySnapshot {
  timestamp: number;
  participants: {
    userId: string;
    position: number;
    score: number;
    challengeIndex: number;
    location?: { latitude: number; longitude: number };
  }[];
}

export interface ReplayHighlight {
  id: string;
  replayId: string;
  startTime: number;
  endTime: number;
  type: 'lead_change' | 'photo_finish' | 'comeback' | 'streak' | 'record';
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

// Matchmaking Types
export interface MatchmakingQueue {
  userId: string;
  huntId?: string; // null for any hunt
  skillRating: number;
  searchRadius: number; // km
  preferences: MatchmakingPreferences;
  joinedAt: string;
}

export interface MatchmakingPreferences {
  minPlayers: number;
  maxPlayers: number;
  allowRanked: boolean;
  difficultyRange: ['easy' | 'medium' | 'hard', 'easy' | 'medium' | 'hard'];
}

export interface MatchFound {
  raceId: string;
  huntId: string;
  huntTitle: string;
  participants: {
    userId: string;
    displayName: string;
    skillRating: number;
  }[];
  estimatedStartTime: string;
}

// Streaming Integration
export interface StreamIntegration {
  platform: 'twitch' | 'youtube';
  channelId: string;
  channelName: string;
  streamUrl: string;
  isLive: boolean;
  viewerCount?: number;
}

// Race Invites
export interface RaceInvite {
  id: string;
  raceId: string;
  huntTitle: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}
