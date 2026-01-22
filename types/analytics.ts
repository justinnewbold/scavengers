// Hunt Analytics Types

export interface HuntAnalytics {
  huntId: string;
  huntTitle: string;
  creatorId: string;

  // Overview stats
  totalPlays: number;
  uniquePlayers: number;
  completionRate: number; // Percentage who finish
  averageScore: number;
  averageTime: number; // in seconds

  // Time-based stats
  playsToday: number;
  playsThisWeek: number;
  playsThisMonth: number;

  // Ratings
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };

  // Player engagement
  repeatPlayers: number; // Players who played more than once
  shareCount: number;

  // Timestamps
  createdAt: string;
  lastPlayedAt: string | null;
  updatedAt: string;
}

export interface ChallengeAnalytics {
  challengeId: string;
  challengeTitle: string;
  huntId: string;
  orderIndex: number;

  // Completion stats
  totalAttempts: number;
  successfulCompletions: number;
  completionRate: number;

  // Time stats
  averageTime: number; // seconds
  fastestTime: number;
  slowestTime: number;

  // Verification stats
  verificationSuccessRate: number;
  photoVerificationRate: number;
  locationVerificationRate: number;

  // Skip/Abandon stats
  skipCount: number;
  abandonCount: number; // Players who quit at this challenge

  // Difficulty perception
  averageDifficulty: number; // 1-5 from player feedback

  // Points
  basePoints: number;
  averagePointsAwarded: number;
}

export interface PlayerAnalytics {
  playerId: string;
  huntId: string;
  sessionId: string;

  // Session info
  startedAt: string;
  completedAt: string | null;
  totalTime: number; // seconds

  // Progress
  challengesAttempted: number;
  challengesCompleted: number;
  challengesSkipped: number;

  // Performance
  totalScore: number;
  maxStreak: number;
  verificationScore: number; // Average verification confidence

  // Engagement
  photosSubmitted: number;
  hintsUsed: number;

  // Drop-off tracking
  lastChallengeId: string | null;
  dropOffReason: 'completed' | 'quit' | 'timeout' | 'error' | null;
}

export interface AnalyticsTimeRange {
  start: string; // ISO date
  end: string;   // ISO date
}

export interface AnalyticsTrend {
  date: string;
  value: number;
}

export interface HuntAnalyticsSummary {
  huntId: string;
  period: 'day' | 'week' | 'month' | 'all';

  // Trends
  playsTrend: AnalyticsTrend[];
  completionTrend: AnalyticsTrend[];
  ratingTrend: AnalyticsTrend[];

  // Top stats
  topChallenges: {
    challengeId: string;
    title: string;
    completionRate: number;
  }[];

  // Problem areas
  problemChallenges: {
    challengeId: string;
    title: string;
    dropOffRate: number;
    issue: 'high_skip' | 'low_completion' | 'high_abandon';
  }[];

  // Player segments
  playerSegments: {
    newPlayers: number;
    returningPlayers: number;
    completers: number;
    abandoners: number;
  };
}

// Analytics events to track
export type AnalyticsEventType =
  | 'hunt_started'
  | 'hunt_completed'
  | 'hunt_abandoned'
  | 'challenge_started'
  | 'challenge_completed'
  | 'challenge_skipped'
  | 'challenge_failed'
  | 'photo_submitted'
  | 'hint_used'
  | 'location_checked'
  | 'share_initiated'
  | 'rating_submitted';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  huntId: string;
  oduserId: string;
  sessionId: string;
  challengeId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Dashboard filter options
export interface AnalyticsFilters {
  dateRange: AnalyticsTimeRange;
  huntIds?: string[];
  challengeIds?: string[];
  minPlays?: number;
}
