// Achievement & Badge System Types

export type AchievementCategory =
  | 'exploration'    // Location-based achievements
  | 'completion'     // Hunt completion achievements
  | 'speed'          // Time-based achievements
  | 'social'         // Group/community achievements
  | 'creator'        // Hunt creation achievements
  | 'streak'         // Consistency achievements
  | 'mastery'        // Skill-based achievements
  | 'special';       // Limited time or rare achievements

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  requirement: AchievementRequirement;
  isSecret?: boolean; // Hidden until unlocked
  createdAt: string;
}

export type AchievementRequirementType =
  | 'hunts_completed'
  | 'challenges_completed'
  | 'total_points'
  | 'streak_days'
  | 'current_streak'
  | 'hunts_created'
  | 'hunt_plays'
  | 'group_hunts'
  | 'solo_hunts'
  | 'cities_visited'
  | 'night_hunts'
  | 'perfect_verification'
  | 'speed_completion'
  | 'photos_taken'
  | 'tags_made'
  | 'bounties_claimed'
  | 'alliances_formed'
  | 'sabotages_deployed';

export interface AchievementRequirement {
  type: AchievementRequirementType;
  threshold: number;
  conditions?: Record<string, unknown>; // Additional conditions
}

export interface UserAchievement {
  id: string;
  oduserId: string;
  odachievementId: string;
  unlockedAt: string;
  progress: number; // Current progress toward threshold
  notified: boolean; // Whether user has been shown the unlock
}

export interface AchievementProgress {
  odachievementId: string;
  odachievement: Achievement;
  currentProgress: number;
  threshold: number;
  percentComplete: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

// Predefined achievements
export const ACHIEVEMENTS: Achievement[] = [
  // Exploration
  {
    id: 'explorer_10',
    name: 'Explorer',
    description: 'Complete hunts in 10 different cities',
    icon: 'globe-outline',
    category: 'exploration',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'cities_visited', threshold: 10 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'world_traveler',
    name: 'World Traveler',
    description: 'Complete hunts in 25 different cities',
    icon: 'airplane-outline',
    category: 'exploration',
    rarity: 'epic',
    points: 1000,
    requirement: { type: 'cities_visited', threshold: 25 },
    createdAt: new Date().toISOString(),
  },

  // Completion
  {
    id: 'first_hunt',
    name: 'First Steps',
    description: 'Complete your first hunt',
    icon: 'footsteps-outline',
    category: 'completion',
    rarity: 'common',
    points: 50,
    requirement: { type: 'hunts_completed', threshold: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hunt_veteran',
    name: 'Hunt Veteran',
    description: 'Complete 25 hunts',
    icon: 'medal-outline',
    category: 'completion',
    rarity: 'uncommon',
    points: 250,
    requirement: { type: 'hunts_completed', threshold: 25 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hunt_master',
    name: 'Hunt Master',
    description: 'Complete 100 hunts',
    icon: 'trophy-outline',
    category: 'completion',
    rarity: 'epic',
    points: 1000,
    requirement: { type: 'hunts_completed', threshold: 100 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'challenge_champion',
    name: 'Challenge Champion',
    description: 'Complete 500 challenges',
    icon: 'checkmark-done-outline',
    category: 'completion',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'challenges_completed', threshold: 500 },
    createdAt: new Date().toISOString(),
  },

  // Speed
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a hunt in under 15 minutes',
    icon: 'flash-outline',
    category: 'speed',
    rarity: 'uncommon',
    points: 200,
    requirement: { type: 'speed_completion', threshold: 15, conditions: { unit: 'minutes' } },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lightning_fast',
    name: 'Lightning Fast',
    description: 'Complete a hunt in under 10 minutes',
    icon: 'thunderstorm-outline',
    category: 'speed',
    rarity: 'rare',
    points: 400,
    requirement: { type: 'speed_completion', threshold: 10, conditions: { unit: 'minutes' } },
    createdAt: new Date().toISOString(),
  },

  // Social
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Complete 5 group hunts',
    icon: 'people-outline',
    category: 'social',
    rarity: 'uncommon',
    points: 200,
    requirement: { type: 'group_hunts', threshold: 5 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'party_animal',
    name: 'Party Animal',
    description: 'Complete 25 group hunts',
    icon: 'balloon-outline',
    category: 'social',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'group_hunts', threshold: 25 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lone_wolf',
    name: 'Lone Wolf',
    description: 'Complete 10 solo hunts',
    icon: 'moon-outline',
    category: 'social',
    rarity: 'uncommon',
    points: 200,
    requirement: { type: 'solo_hunts', threshold: 10 },
    createdAt: new Date().toISOString(),
  },

  // Creator
  {
    id: 'hunt_creator',
    name: 'Hunt Creator',
    description: 'Create your first hunt',
    icon: 'create-outline',
    category: 'creator',
    rarity: 'common',
    points: 100,
    requirement: { type: 'hunts_created', threshold: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prolific_creator',
    name: 'Prolific Creator',
    description: 'Create 10 hunts',
    icon: 'brush-outline',
    category: 'creator',
    rarity: 'uncommon',
    points: 300,
    requirement: { type: 'hunts_created', threshold: 10 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'viral_hunt',
    name: 'Viral Hunt',
    description: 'Have your hunt played by 100 people',
    icon: 'trending-up-outline',
    category: 'creator',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'hunt_plays', threshold: 100 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'legendary_creator',
    name: 'Legendary Creator',
    description: 'Have your hunts played 1000 times total',
    icon: 'star-outline',
    category: 'creator',
    rarity: 'legendary',
    points: 2000,
    requirement: { type: 'hunt_plays', threshold: 1000 },
    createdAt: new Date().toISOString(),
  },

  // Streak
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Play for 7 days in a row',
    icon: 'calendar-outline',
    category: 'streak',
    rarity: 'uncommon',
    points: 200,
    requirement: { type: 'streak_days', threshold: 7 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Play for 30 days in a row',
    icon: 'flame-outline',
    category: 'streak',
    rarity: 'epic',
    points: 1000,
    requirement: { type: 'streak_days', threshold: 30 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Achieve a 10x streak in a single hunt',
    icon: 'rocket-outline',
    category: 'streak',
    rarity: 'rare',
    points: 400,
    requirement: { type: 'current_streak', threshold: 10 },
    createdAt: new Date().toISOString(),
  },

  // Mastery
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: '100% verification on all challenges in a hunt',
    icon: 'ribbon-outline',
    category: 'mastery',
    rarity: 'rare',
    points: 400,
    requirement: { type: 'perfect_verification', threshold: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a hunt after 10 PM',
    icon: 'cloudy-night-outline',
    category: 'mastery',
    rarity: 'uncommon',
    points: 150,
    requirement: { type: 'night_hunts', threshold: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'photographer',
    name: 'Photographer',
    description: 'Take 100 photos across hunts',
    icon: 'camera-outline',
    category: 'mastery',
    rarity: 'uncommon',
    points: 200,
    requirement: { type: 'photos_taken', threshold: 100 },
    createdAt: new Date().toISOString(),
  },

  // Tag Mode Special
  {
    id: 'tag_champion',
    name: 'Tag Champion',
    description: 'Tag 50 players in Tag Mode',
    icon: 'hand-left-outline',
    category: 'special',
    rarity: 'rare',
    points: 500,
    requirement: { type: 'tags_made', threshold: 50 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bounty_hunter',
    name: 'Bounty Hunter',
    description: 'Claim 10 bounties',
    icon: 'cash-outline',
    category: 'special',
    rarity: 'rare',
    points: 400,
    requirement: { type: 'bounties_claimed', threshold: 10 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'saboteur',
    name: 'Saboteur',
    description: 'Deploy 25 sabotages',
    icon: 'flash-outline',
    category: 'special',
    rarity: 'uncommon',
    points: 250,
    requirement: { type: 'sabotages_deployed', threshold: 25 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alliance_master',
    name: 'Alliance Master',
    description: 'Form 10 alliances',
    icon: 'people-circle-outline',
    category: 'special',
    rarity: 'uncommon',
    points: 200,
    requirement: { type: 'alliances_formed', threshold: 10 },
    createdAt: new Date().toISOString(),
  },
];

// Helper to get achievement by ID
export const getAchievementById = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find(a => a.id === id);

// Helper to get achievements by category
export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] =>
  ACHIEVEMENTS.filter(a => a.category === category);

// Rarity colors
export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#9CA3AF',     // Gray
  uncommon: '#10B981',   // Green
  rare: '#3B82F6',       // Blue
  epic: '#8B5CF6',       // Purple
  legendary: '#F59E0B',  // Gold
};
