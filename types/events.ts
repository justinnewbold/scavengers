// Seasonal Events & Leaderboards Types

export type EventTheme =
  | 'halloween'
  | 'winter_holiday'
  | 'valentines'
  | 'spring'
  | 'summer'
  | 'back_to_school'
  | 'thanksgiving'
  | 'new_year'
  | 'anniversary'
  | 'custom';

export type LeaderboardScope = 'global' | 'regional' | 'city' | 'friends' | 'team';
export type LeaderboardPeriod = 'all_time' | 'season' | 'monthly' | 'weekly' | 'daily' | 'event';
export type LeaderboardMetric = 'hunts_completed' | 'total_score' | 'distance' | 'speed' | 'achievements';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  theme: EventTheme;

  // Timing
  startDate: string;
  endDate: string;
  isActive: boolean;

  // Visuals
  bannerImageUrl: string;
  iconUrl: string;
  primaryColor: string;
  secondaryColor: string;

  // Content
  featuredHunts: string[];
  exclusiveChallenges: EventChallenge[];
  rewards: EventReward[];

  // Participation
  participantCount: number;
  completionCount: number;

  // User progress
  userProgress?: EventProgress;
}

export interface EventChallenge {
  id: string;
  eventId: string;
  title: string;
  description: string;
  icon: string;

  // Requirements
  type: 'complete_hunts' | 'earn_score' | 'travel_distance' | 'unlock_achievements' | 'find_items' | 'special';
  targetValue: number;
  currentValue?: number;

  // Rewards
  pointsReward: number;
  achievementReward?: string;

  // Status
  isCompleted?: boolean;
  completedAt?: string;

  // Difficulty
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  sortOrder: number;
}

export interface EventReward {
  id: string;
  eventId: string;
  name: string;
  description: string;

  // Type
  type: 'badge' | 'title' | 'avatar_frame' | 'theme' | 'discount' | 'exclusive_hunt';
  imageUrl: string;

  // Unlock requirements
  pointsRequired: number;
  challengesRequired?: string[];

  // Rarity
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

  // Status
  isUnlocked?: boolean;
  unlockedAt?: string;
}

export interface EventProgress {
  eventId: string;
  userId: string;

  // Points
  totalPoints: number;
  rank?: number;

  // Challenges
  challengesCompleted: number;
  challengeProgress: Record<string, number>;

  // Rewards
  rewardsUnlocked: string[];

  // Time
  joinedAt: string;
  lastActivityAt: string;
}

export interface Leaderboard {
  id: string;
  name: string;
  description?: string;

  // Scope
  scope: LeaderboardScope;
  region?: string; // For regional/city leaderboards
  teamId?: string; // For team leaderboards
  eventId?: string; // For event leaderboards

  // Settings
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;

  // Data
  entries: LeaderboardEntry[];
  totalEntries: number;

  // User position
  userEntry?: LeaderboardEntry;
  userRank?: number;

  // Timing
  periodStartDate?: string;
  periodEndDate?: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;

  // Score
  value: number;
  previousRank?: number;
  rankChange?: number; // Positive = moved up

  // Extra stats
  huntsCompleted?: number;
  totalDistance?: number;
  averageScore?: number;

  // Badges
  isVerified: boolean;
  isFriend?: boolean;
  title?: string; // Special title like "Season Champion"
}

export interface LeaderboardReward {
  id: string;
  leaderboardId: string;
  rankStart: number;
  rankEnd: number;

  // Reward
  rewardType: 'badge' | 'title' | 'points' | 'exclusive_content';
  rewardName: string;
  rewardImageUrl?: string;
  rewardValue?: number;
}

// Event theme configurations
export const EVENT_THEMES: Record<EventTheme, { name: string; icon: string; defaultColors: [string, string] }> = {
  halloween: { name: 'Halloween', icon: 'skull', defaultColors: ['#FF6B00', '#8B00FF'] },
  winter_holiday: { name: 'Winter Holidays', icon: 'snow', defaultColors: ['#00BCD4', '#E91E63'] },
  valentines: { name: "Valentine's Day", icon: 'heart', defaultColors: ['#E91E63', '#FF4081'] },
  spring: { name: 'Spring Bloom', icon: 'flower', defaultColors: ['#8BC34A', '#FFEB3B'] },
  summer: { name: 'Summer Fun', icon: 'sunny', defaultColors: ['#FF9800', '#2196F3'] },
  back_to_school: { name: 'Back to School', icon: 'school', defaultColors: ['#3F51B5', '#FF5722'] },
  thanksgiving: { name: 'Thanksgiving', icon: 'leaf', defaultColors: ['#795548', '#FF9800'] },
  new_year: { name: 'New Year', icon: 'sparkles', defaultColors: ['#9C27B0', '#FFD700'] },
  anniversary: { name: 'Anniversary', icon: 'gift', defaultColors: ['#673AB7', '#00BCD4'] },
  custom: { name: 'Special Event', icon: 'star', defaultColors: ['#607D8B', '#009688'] },
};

// Leaderboard metric labels
export const METRIC_LABELS: Record<LeaderboardMetric, { label: string; icon: string; unit: string }> = {
  hunts_completed: { label: 'Hunts Completed', icon: 'trophy', unit: 'hunts' },
  total_score: { label: 'Total Score', icon: 'star', unit: 'pts' },
  distance: { label: 'Distance Traveled', icon: 'walk', unit: 'km' },
  speed: { label: 'Fastest Completion', icon: 'flash', unit: 'min' },
  achievements: { label: 'Achievements', icon: 'ribbon', unit: 'badges' },
};

// Period labels
export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  all_time: 'All Time',
  season: 'This Season',
  monthly: 'This Month',
  weekly: 'This Week',
  daily: 'Today',
  event: 'Event',
};

// Rarity colors
export const RARITY_COLORS: Record<string, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700',
};
