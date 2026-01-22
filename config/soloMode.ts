/**
 * Solo Mode Configuration
 *
 * This file contains all configurable settings for solo mode hunts.
 * Modify these values to customize the solo mode experience.
 */

import type { SoloHuntType, SoloHuntConfig } from '@/store/soloModeStore';

/**
 * Preset configurations for different solo hunt types
 * Each preset defines default values for hunt generation
 */
export const SOLO_HUNT_PRESETS: Record<SoloHuntType, Partial<SoloHuntConfig>> = {
  quick: {
    challengeCount: 5,
    duration: 10,  // minutes
    difficulty: 'easy',
  },
  explorer: {
    challengeCount: 10,
    duration: 30,
    difficulty: 'medium',
  },
  challenge: {
    challengeCount: 15,
    duration: 45,
    difficulty: 'hard',
  },
  custom: {
    challengeCount: 8,
    duration: 20,
    difficulty: 'medium',
  },
};

/**
 * Available themes for solo hunts
 * Add new themes here to make them available in the app
 */
export interface SoloTheme {
  id: string;
  label: string;
  icon: string;  // Ionicons icon name
  description: string;
}

export const SOLO_THEMES: SoloTheme[] = [
  { id: 'surprise', label: 'Surprise Me!', icon: 'shuffle', description: 'Random theme for variety' },
  { id: 'nature', label: 'Nature', icon: 'leaf', description: 'Plants, animals, outdoors' },
  { id: 'urban', label: 'Urban', icon: 'business', description: 'City landmarks, architecture' },
  { id: 'photo', label: 'Photo Quest', icon: 'camera', description: 'Photography-focused challenges' },
  { id: 'fitness', label: 'Fitness', icon: 'fitness', description: 'Active movement challenges' },
  { id: 'social', label: 'Social', icon: 'people', description: 'Interact with your surroundings' },
  { id: 'creative', label: 'Creative', icon: 'color-palette', description: 'Art and creativity focused' },
  { id: 'mystery', label: 'Mystery', icon: 'help-circle', description: 'Puzzles and hidden clues' },
];

/**
 * Environment types for hunt generation
 */
export interface EnvironmentOption {
  id: string;
  label: string;
  icon: string;
}

export const ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  { id: 'indoor', label: 'Indoor', icon: 'home' },
  { id: 'outdoor', label: 'Outdoor', icon: 'sunny' },
  { id: 'mixed', label: 'Mixed', icon: 'git-merge' },
];

/**
 * Difficulty settings
 */
export interface DifficultyOption {
  id: 'easy' | 'medium' | 'hard';
  label: string;
  description: string;
  pointMultiplier: number;
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: 'easy', label: 'Easy', description: 'Simple tasks, great for beginners', pointMultiplier: 1 },
  { id: 'medium', label: 'Medium', description: 'Moderate challenge, balanced gameplay', pointMultiplier: 1.5 },
  { id: 'hard', label: 'Hard', description: 'Challenging tasks for experienced players', pointMultiplier: 2 },
];

/**
 * Default configuration for new solo hunts
 */
export const DEFAULT_SOLO_CONFIG: SoloHuntConfig = {
  type: 'explorer',
  theme: 'surprise',
  difficulty: 'medium',
  challengeCount: 10,
  duration: 30,
  environment: 'mixed',
  useLocation: true,
};

/**
 * Limits and constraints
 */
export const SOLO_MODE_LIMITS = {
  minChallenges: 3,
  maxChallenges: 25,
  minDuration: 5,      // minutes
  maxDuration: 120,    // minutes
  maxHistoryItems: 50, // number of past hunts to keep
};
