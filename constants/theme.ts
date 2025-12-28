// Color palette - Dark theme optimized for scavenger hunts
export const Colors = {
  // Primary colors
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4D45B5',
  primaryMuted: '#4A4580',
  
  // Secondary colors
  secondary: '#00D9FF',
  secondaryLight: '#5CE6FF',
  secondaryDark: '#00A3BF',
  
  // Accent colors
  accent: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  
  // Background colors
  background: '#0F0F1A',
  backgroundSecondary: '#1A1A2E',
  backgroundTertiary: '#252542',
  
  // Surface colors
  surface: '#1E1E32',
  surfaceLight: '#2A2A45',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B0B0C0',
  textTertiary: '#707080',
  textInverse: '#0F0F1A',
  
  // Border colors
  border: '#3A3A5A',
  borderLight: '#4A4A6A',
  
  // Gradient presets
  gradientPrimary: ['#6C63FF', '#8B85FF'],
  gradientSecondary: ['#00D9FF', '#5CE6FF'],
  gradientAccent: ['#FF6B6B', '#FF8E8E'],
  gradientDark: ['#1A1A2E', '#0F0F1A'],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 8,
  },
};

// App configuration
export const AppConfig = {
  name: 'Scavengers',
  version: '1.0.0',
  
  // Free tier limits
  freeTier: {
    maxParticipants: 15,
    maxHunts: 3,
    maxChallengesPerHunt: 20,
  },
  
  // Premium pricing
  premium: {
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
  },
  
  // AI settings
  ai: {
    defaultModel: 'gemini-2.0-flash',
    maxChallengesPerGeneration: 25,
    defaultDifficulty: 'medium' as const,
  },
  
  // Verification settings
  verification: {
    gpsRadiusMeters: 50,
    photoConfidenceThreshold: 0.7,
  },
};
