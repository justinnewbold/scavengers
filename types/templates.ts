// Hunt Templates Types

export type TemplateCategory =
  | 'birthday'
  | 'team_building'
  | 'tourist'
  | 'date_night'
  | 'kids'
  | 'fitness'
  | 'educational'
  | 'holiday'
  | 'custom';

export interface HuntTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string; // Ionicon name
  color: string; // Hex color

  // Template configuration
  defaultDuration: number; // minutes
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  suggestedChallengeCount: number;
  indoorOutdoor: 'indoor' | 'outdoor' | 'both';

  // Challenge templates
  challengePrompts: ChallengePrompt[];

  // AI generation hints
  aiPromptHints: string[];
  themeTags: string[];

  // Stats
  usageCount: number;
  averageRating: number;
}

export interface ChallengePrompt {
  id: string;
  title: string;
  descriptionTemplate: string; // With {location}, {theme} placeholders
  verificationType: 'photo' | 'location' | 'qr' | 'text';
  suggestedPoints: number;
  optional: boolean;
  hints: string[];
}

export interface QuickCreateConfig {
  templateId: string;
  title: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
  };
  duration: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  challengeCount: number;
  customTheme?: string;
  includePhotoChallenges: boolean;
  includeLocationChallenges: boolean;
}

export interface GeneratedHunt {
  title: string;
  description: string;
  challenges: GeneratedChallenge[];
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GeneratedChallenge {
  title: string;
  description: string;
  points: number;
  verificationType: 'photo' | 'location' | 'qr' | 'text';
  verificationData?: Record<string, unknown>;
  hint?: string;
}

// Predefined templates
export const HUNT_TEMPLATES: HuntTemplate[] = [
  {
    id: 'birthday',
    name: 'Birthday Party',
    description: 'Fun challenges for birthday celebrations',
    category: 'birthday',
    icon: 'balloon',
    color: '#FF6B6B',
    defaultDuration: 60,
    defaultDifficulty: 'easy',
    suggestedChallengeCount: 8,
    indoorOutdoor: 'both',
    challengePrompts: [
      {
        id: 'bp1',
        title: 'Birthday Wishes',
        descriptionTemplate: 'Take a photo of everyone singing happy birthday',
        verificationType: 'photo',
        suggestedPoints: 100,
        optional: false,
        hints: ['Gather everyone around the cake'],
      },
      {
        id: 'bp2',
        title: 'Gift Hunt',
        descriptionTemplate: 'Find and photograph a wrapped present',
        verificationType: 'photo',
        suggestedPoints: 50,
        optional: false,
        hints: ['Check under tables or in corners'],
      },
      {
        id: 'bp3',
        title: 'Balloon Pop',
        descriptionTemplate: 'Pop a balloon and photograph the confetti',
        verificationType: 'photo',
        suggestedPoints: 75,
        optional: true,
        hints: ['Look for balloons with surprises inside'],
      },
    ],
    aiPromptHints: ['party games', 'decorations', 'cake', 'presents', 'fun activities'],
    themeTags: ['celebration', 'party', 'fun', 'social'],
    usageCount: 0,
    averageRating: 0,
  },
  {
    id: 'team_building',
    name: 'Team Building',
    description: 'Collaborative challenges for work teams',
    category: 'team_building',
    icon: 'people',
    color: '#4ECDC4',
    defaultDuration: 90,
    defaultDifficulty: 'medium',
    suggestedChallengeCount: 10,
    indoorOutdoor: 'both',
    challengePrompts: [
      {
        id: 'tb1',
        title: 'Team Photo',
        descriptionTemplate: 'Take a creative group photo with your entire team',
        verificationType: 'photo',
        suggestedPoints: 100,
        optional: false,
        hints: ['Try a fun pose or formation'],
      },
      {
        id: 'tb2',
        title: 'Problem Solver',
        descriptionTemplate: 'Work together to solve a puzzle or riddle',
        verificationType: 'text',
        suggestedPoints: 150,
        optional: false,
        hints: ['Everyone should contribute an idea'],
      },
      {
        id: 'tb3',
        title: 'Trust Exercise',
        descriptionTemplate: 'Complete a trust-building activity and document it',
        verificationType: 'photo',
        suggestedPoints: 125,
        optional: false,
        hints: ['Human chain, trust fall, or blindfolded guide'],
      },
    ],
    aiPromptHints: ['collaboration', 'communication', 'problem-solving', 'trust', 'teamwork'],
    themeTags: ['corporate', 'team', 'collaboration', 'professional'],
    usageCount: 0,
    averageRating: 0,
  },
  {
    id: 'tourist',
    name: 'Tourist Adventure',
    description: 'Explore local landmarks and hidden gems',
    category: 'tourist',
    icon: 'camera',
    color: '#45B7D1',
    defaultDuration: 120,
    defaultDifficulty: 'medium',
    suggestedChallengeCount: 12,
    indoorOutdoor: 'outdoor',
    challengePrompts: [
      {
        id: 'ta1',
        title: 'Landmark Selfie',
        descriptionTemplate: 'Take a selfie at the most famous landmark nearby',
        verificationType: 'photo',
        suggestedPoints: 100,
        optional: false,
        hints: ['Ask a local for directions if needed'],
      },
      {
        id: 'ta2',
        title: 'Local Flavor',
        descriptionTemplate: 'Try a local food specialty and photograph it',
        verificationType: 'photo',
        suggestedPoints: 75,
        optional: false,
        hints: ['Ask for recommendations at a local restaurant'],
      },
      {
        id: 'ta3',
        title: 'Hidden Gem',
        descriptionTemplate: 'Find and photograph a place not in typical tourist guides',
        verificationType: 'photo',
        suggestedPoints: 150,
        optional: true,
        hints: ['Look for street art, small parks, or local favorites'],
      },
    ],
    aiPromptHints: ['landmarks', 'local food', 'culture', 'history', 'photography'],
    themeTags: ['travel', 'explore', 'sightseeing', 'adventure'],
    usageCount: 0,
    averageRating: 0,
  },
  {
    id: 'date_night',
    name: 'Date Night',
    description: 'Romantic challenges for couples',
    category: 'date_night',
    icon: 'heart',
    color: '#F78FB3',
    defaultDuration: 90,
    defaultDifficulty: 'easy',
    suggestedChallengeCount: 6,
    indoorOutdoor: 'both',
    challengePrompts: [
      {
        id: 'dn1',
        title: 'Couple Selfie',
        descriptionTemplate: 'Take a romantic photo together at a scenic spot',
        verificationType: 'photo',
        suggestedPoints: 100,
        optional: false,
        hints: ['Find good lighting and a nice background'],
      },
      {
        id: 'dn2',
        title: 'Sweet Treat',
        descriptionTemplate: 'Share a dessert and capture the moment',
        verificationType: 'photo',
        suggestedPoints: 75,
        optional: false,
        hints: ['Ice cream, pastry, or chocolate works great'],
      },
      {
        id: 'dn3',
        title: 'Love Lock',
        descriptionTemplate: 'Find a romantic spot and take a photo there',
        verificationType: 'photo',
        suggestedPoints: 125,
        optional: true,
        hints: ['Bridges, gardens, or scenic overlooks'],
      },
    ],
    aiPromptHints: ['romantic', 'intimate', 'fun', 'memorable', 'couple activities'],
    themeTags: ['romance', 'couple', 'date', 'love'],
    usageCount: 0,
    averageRating: 0,
  },
  {
    id: 'kids',
    name: 'Kids Adventure',
    description: 'Age-appropriate fun for children',
    category: 'kids',
    icon: 'happy',
    color: '#FFD93D',
    defaultDuration: 45,
    defaultDifficulty: 'easy',
    suggestedChallengeCount: 6,
    indoorOutdoor: 'both',
    challengePrompts: [
      {
        id: 'ka1',
        title: 'Animal Spotter',
        descriptionTemplate: 'Find and photograph an animal (pet, bird, or bug)',
        verificationType: 'photo',
        suggestedPoints: 50,
        optional: false,
        hints: ['Parks are great places to find animals'],
      },
      {
        id: 'ka2',
        title: 'Color Hunter',
        descriptionTemplate: 'Find something in every color of the rainbow',
        verificationType: 'photo',
        suggestedPoints: 75,
        optional: false,
        hints: ['Red, orange, yellow, green, blue, purple'],
      },
      {
        id: 'ka3',
        title: 'Silly Face',
        descriptionTemplate: 'Make your silliest face for a photo',
        verificationType: 'photo',
        suggestedPoints: 50,
        optional: false,
        hints: ['The sillier the better!'],
      },
    ],
    aiPromptHints: ['simple', 'fun', 'safe', 'educational', 'active'],
    themeTags: ['family', 'children', 'safe', 'educational'],
    usageCount: 0,
    averageRating: 0,
  },
  {
    id: 'fitness',
    name: 'Fitness Challenge',
    description: 'Active challenges to get moving',
    category: 'fitness',
    icon: 'fitness',
    color: '#6C5CE7',
    defaultDuration: 60,
    defaultDifficulty: 'hard',
    suggestedChallengeCount: 8,
    indoorOutdoor: 'outdoor',
    challengePrompts: [
      {
        id: 'fc1',
        title: 'Sprint Challenge',
        descriptionTemplate: 'Run to the checkpoint location as fast as you can',
        verificationType: 'location',
        suggestedPoints: 100,
        optional: false,
        hints: ['Pace yourself for the whole hunt'],
      },
      {
        id: 'fc2',
        title: 'Stair Climber',
        descriptionTemplate: 'Find and climb a set of stairs, photo at the top',
        verificationType: 'photo',
        suggestedPoints: 75,
        optional: false,
        hints: ['Look for public staircases or building entrances'],
      },
      {
        id: 'fc3',
        title: 'Plank Challenge',
        descriptionTemplate: 'Hold a plank for 30 seconds and have someone photo you',
        verificationType: 'photo',
        suggestedPoints: 100,
        optional: true,
        hints: ['Find a flat, clean surface'],
      },
    ],
    aiPromptHints: ['exercise', 'running', 'movement', 'strength', 'cardio'],
    themeTags: ['fitness', 'health', 'active', 'sports'],
    usageCount: 0,
    averageRating: 0,
  },
];

export const getTemplateById = (id: string): HuntTemplate | undefined => {
  return HUNT_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: TemplateCategory): HuntTemplate[] => {
  return HUNT_TEMPLATES.filter(t => t.category === category);
};
