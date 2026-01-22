// Hunt Series & Storylines Types

export type SeriesStatus = 'not_started' | 'in_progress' | 'completed' | 'locked';
export type ChapterStatus = 'locked' | 'available' | 'in_progress' | 'completed';
export type ChoiceType = 'dialogue' | 'action' | 'path' | 'ending';

export interface HuntSeries {
  id: string;
  title: string;
  tagline: string;
  description: string;
  creatorId: string;
  creatorName: string;

  // Visual
  coverImageUrl: string;
  bannerImageUrl?: string;
  themeColor: string;

  // Structure
  chapters: SeriesChapter[];
  totalChapters: number;
  estimatedTotalDuration: number; // minutes

  // Genre/Tags
  genre: SeriesGenre;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';

  // Features
  hasBranchingPaths: boolean;
  hasMultipleEndings: boolean;
  endingCount?: number;
  hasCharacterProgression: boolean;

  // Stats
  playCount: number;
  completionRate: number;
  averageRating: number;
  reviewCount: number;

  // User progress
  userProgress?: SeriesProgress;

  // Metadata
  isFeatured: boolean;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SeriesGenre =
  | 'mystery'
  | 'adventure'
  | 'horror'
  | 'romance'
  | 'comedy'
  | 'sci_fi'
  | 'fantasy'
  | 'historical'
  | 'thriller'
  | 'educational';

export const GENRE_CONFIG: Record<SeriesGenre, { label: string; icon: string; color: string }> = {
  mystery: { label: 'Mystery', icon: 'search', color: '#673AB7' },
  adventure: { label: 'Adventure', icon: 'compass', color: '#FF9800' },
  horror: { label: 'Horror', icon: 'skull', color: '#424242' },
  romance: { label: 'Romance', icon: 'heart', color: '#E91E63' },
  comedy: { label: 'Comedy', icon: 'happy', color: '#FFEB3B' },
  sci_fi: { label: 'Sci-Fi', icon: 'planet', color: '#00BCD4' },
  fantasy: { label: 'Fantasy', icon: 'sparkles', color: '#9C27B0' },
  historical: { label: 'Historical', icon: 'library', color: '#795548' },
  thriller: { label: 'Thriller', icon: 'flash', color: '#F44336' },
  educational: { label: 'Educational', icon: 'school', color: '#4CAF50' },
};

export interface SeriesChapter {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string;
  synopsis: string;

  // The hunt for this chapter
  huntId: string;
  huntTitle: string;
  estimatedDuration: number;

  // Visual
  thumbnailUrl?: string;

  // Unlock requirements
  requiresPreviousChapter: boolean;
  requiredChoices?: string[]; // Specific choices needed to unlock
  requiredItems?: string[]; // Items needed from inventory

  // Branching
  isOptional: boolean; // Side chapter
  branchId?: string; // Which branch this belongs to
  branches?: ChapterBranch[];

  // Status
  status?: ChapterStatus;
  completedAt?: string;
}

export interface ChapterBranch {
  id: string;
  name: string;
  description: string;
  triggeredByChoice: string; // Choice ID that leads to this branch
  chapters: string[]; // Chapter IDs in this branch
}

export interface SeriesProgress {
  seriesId: string;
  userId: string;

  // Overall progress
  status: SeriesStatus;
  currentChapterId?: string;
  chaptersCompleted: number;
  percentComplete: number;

  // Story state
  choices: StoryChoice[];
  inventory: InventoryItem[];
  characterStats?: CharacterStats;

  // Paths taken
  currentBranch?: string;
  unlockedBranches: string[];
  achievedEndings: string[];

  // Time
  startedAt: string;
  lastPlayedAt: string;
  totalPlayTime: number; // minutes
  completedAt?: string;
}

export interface StoryChoice {
  id: string;
  chapterId: string;
  choicePointId: string;
  selectedOption: string;
  timestamp: string;

  // Impact
  affectedStats?: Partial<CharacterStats>;
  unlockedItems?: string[];
  triggeredBranch?: string;
}

export interface ChoicePoint {
  id: string;
  chapterId: string;
  promptText: string;
  type: ChoiceType;

  // Options
  options: ChoiceOption[];

  // Timing (when during hunt this appears)
  triggerType: 'challenge_complete' | 'location_reached' | 'item_found' | 'time_elapsed';
  triggerValue: string;

  // Requirements
  requiredStats?: Partial<CharacterStats>;
  requiredItems?: string[];
}

export interface ChoiceOption {
  id: string;
  text: string;
  subtext?: string; // Shows consequence hint

  // Requirements to show this option
  requiredStats?: Partial<CharacterStats>;
  requiredItems?: string[];
  isLocked?: boolean;
  lockReason?: string;

  // Consequences
  statsChange?: Partial<CharacterStats>;
  itemsGained?: string[];
  itemsLost?: string[];
  branchUnlock?: string;
  endingId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;

  // Source
  obtainedInChapter: string;
  obtainedAt: string;

  // Usage
  isKeyItem: boolean; // Required for story progression
  isConsumable: boolean;
  usedInChapter?: string;
}

export interface CharacterStats {
  // Core stats that can be affected by choices
  reputation: number; // -100 to 100
  courage: number; // 0 to 100
  wisdom: number; // 0 to 100
  charisma: number; // 0 to 100

  // Relationships with NPCs
  relationships?: Record<string, number>; // NPC ID -> relationship level

  // Custom stats defined by series
  custom?: Record<string, number>;
}

export interface StoryEnding {
  id: string;
  seriesId: string;
  name: string;
  description: string;

  // Visuals
  imageUrl: string;
  videoUrl?: string;

  // Requirements
  requiredChoices: string[];
  requiredStats?: Partial<CharacterStats>;

  // Rarity
  rarity: 'common' | 'uncommon' | 'rare' | 'secret';
  percentPlayers?: number; // % of players who got this ending

  // Rewards
  achievementId?: string;
  titleReward?: string;
}

export interface SeriesCollection {
  id: string;
  name: string;
  description: string;
  imageUrl: string;

  // Series in this collection
  seriesIds: string[];
  totalSeries: number;

  // Progress
  completedSeries?: number;
  percentComplete?: number;

  // Rewards for completing collection
  collectionReward?: {
    type: 'badge' | 'title' | 'exclusive_series';
    name: string;
    imageUrl: string;
  };
}

// Default character stats
export const DEFAULT_CHARACTER_STATS: CharacterStats = {
  reputation: 0,
  courage: 50,
  wisdom: 50,
  charisma: 50,
};

// Stat labels and colors
export const STAT_CONFIG: Record<keyof Omit<CharacterStats, 'relationships' | 'custom'>, { label: string; icon: string; color: string }> = {
  reputation: { label: 'Reputation', icon: 'star', color: '#FFD700' },
  courage: { label: 'Courage', icon: 'shield', color: '#F44336' },
  wisdom: { label: 'Wisdom', icon: 'book', color: '#2196F3' },
  charisma: { label: 'Charisma', icon: 'heart', color: '#E91E63' },
};
