# CLAUDE.md - AI Assistant Guide for Scavengers

This document provides guidance for AI assistants working on the Scavengers codebase.

## Project Overview

Scavengers is an AI-powered scavenger hunt mobile app built with React Native and Expo. It allows users to create, discover, and play scavenger hunts with various verification methods (photo, GPS, QR code, text answers). The app features offline support, AI-powered hunt generation via Google Gemini, and real-time multiplayer capabilities.

**Key Value Props:**
- Free tier with 15 participants per hunt
- Offline-capable gameplay
- AI hunt generation using Gemini 2.0 Flash
- Multiple verification types for challenges

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.76.5 + Expo SDK 52 |
| Language | TypeScript 5.6.3 (strict mode) |
| Navigation | Expo Router 4.0.11 (file-based routing) |
| State Management | Zustand 5.0.2 with persist middleware |
| Backend | Supabase (PostgreSQL) + Custom REST API |
| AI | Google Gemini 2.0 Flash |
| Testing | Jest 29.7.0 + Testing Library |
| Error Tracking | Sentry |

## Project Structure

```
scavengers/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx        # Root layout with Stack navigation
│   ├── (tabs)/            # Tab navigation group
│   │   ├── _layout.tsx    # Tab bar configuration
│   │   ├── index.tsx      # Home/Discover tab
│   │   ├── create.tsx     # Create hunt options
│   │   ├── feed.tsx       # Photo feed
│   │   ├── my-hunts.tsx   # User's hunts
│   │   └── profile.tsx    # User profile
│   ├── hunt/              # Hunt-related routes
│   ├── auth/              # Authentication screens
│   ├── play/              # Gameplay screens
│   ├── solo/              # Solo mode screens
│   ├── tag/               # Tag mode screens
│   ├── teams/             # Team management
│   ├── achievements/      # Achievements display
│   ├── analytics/         # Analytics dashboards
│   └── settings/          # App settings
├── components/            # Reusable React components
│   ├── index.ts          # Component exports
│   ├── Button.tsx        # Primary button component
│   ├── Card.tsx          # Card container
│   ├── HuntCard.tsx      # Hunt display card
│   ├── ErrorBoundary.tsx # Error boundary wrapper
│   ├── OfflineIndicator.tsx # Offline status display
│   └── TagMode/          # Tag mode specific components
├── store/                 # Zustand state management
│   ├── index.ts          # Main exports (useAuthStore, useHuntStore)
│   ├── authStore.ts      # Authentication state
│   ├── soloModeStore.ts  # Solo hunt gameplay
│   ├── teamStore.ts      # Team management
│   ├── socialStore.ts    # Social features
│   ├── liveMultiplayerStore.ts # Live racing
│   ├── achievementStore.ts # Achievement system
│   ├── discoveryStore.ts # Hunt discovery
│   └── __tests__/        # Store unit tests
├── types/                 # TypeScript type definitions
│   ├── index.ts          # Core types (Hunt, Challenge, etc.)
│   ├── teams.ts          # Team-related types
│   ├── liveMultiplayer.ts # Racing/tournament types
│   └── [feature].ts      # Feature-specific types
├── hooks/                 # Custom React hooks
│   ├── index.ts          # Hook exports
│   ├── useOfflineMode.ts # Offline-first functionality
│   ├── useHaptics.ts     # Haptic feedback
│   ├── useStreak.ts      # Streak tracking
│   └── useNotifications.ts # Push notifications
├── lib/                   # Utilities and services
│   ├── supabase.ts       # Supabase client & db helpers
│   ├── gemini.ts         # Gemini AI integration
│   ├── offlineStorage.ts # Offline caching system
│   ├── sentry.ts         # Error tracking
│   └── __tests__/        # Utility tests
├── constants/             # App-wide constants
│   └── theme.ts          # Colors, spacing, typography
├── config/                # Configuration files
│   └── soloMode.ts       # Solo mode presets
├── assets/                # Images, sounds, fonts
│   └── sounds/           # Audio feedback files
└── web/                   # Web version (Next.js - separate)
```

## Development Commands

```bash
# Start development server
npm start                    # or: npx expo start

# Run on specific platform
npm run ios                  # iOS Simulator
npm run android              # Android Emulator
npm run web                  # Web browser

# Code quality
npm run lint                 # ESLint
npm run typecheck            # TypeScript check

# Testing
npm test                     # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# Building
npm run build:dev            # Development build
npm run build:preview        # Preview build
npm run build:prod           # Production build
```

## Key Patterns and Conventions

### State Management with Zustand

All stores use Zustand with `persist` middleware for AsyncStorage integration:

```typescript
// Pattern for creating a store
export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      // State
      data: [],
      isLoading: false,
      error: null,

      // Actions
      fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/endpoint`);
          const data = await response.json();
          set({ data, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch', isLoading: false });
        }
      },
    }),
    {
      name: 'feature-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ data: state.data }), // Only persist data, not loading/error
    }
  )
);
```

### File-Based Routing

Routes are defined by file structure in `app/`:
- `app/index.tsx` → `/`
- `app/hunt/[id].tsx` → `/hunt/:id` (dynamic route)
- `app/(tabs)/` → Tab group (layout in `_layout.tsx`)

### Component Structure

```typescript
// components/FeatureComponent.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface FeatureComponentProps {
  title: string;
  onPress?: () => void;
}

export function FeatureComponent({ title, onPress }: FeatureComponentProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Path Aliases

Use `@/` prefix for imports (configured in `tsconfig.json`):

```typescript
import { useAuthStore } from '@/store';
import { Colors } from '@/constants/theme';
import { Button } from '@/components';
```

### API Calls

API base URL is configured via environment variable:

```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';
```

Standard API endpoints:
- `POST /auth/login` - Login
- `POST /auth/register` - Register
- `GET /auth/me` - Current user
- `GET /hunts` - User's hunts
- `GET /hunts?public=true` - Public hunts
- `POST /hunts` - Create hunt
- `GET /hunts/:id` - Get hunt
- `PATCH /hunts/:id` - Update hunt
- `DELETE /hunts/:id` - Delete hunt
- `POST /hunts/:id/join` - Join hunt
- `POST /submissions` - Submit challenge

### Theme Constants

Always use theme constants from `@/constants/theme`:

```typescript
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, TouchTargets } from '@/constants/theme';

// Colors
Colors.primary        // #6C63FF
Colors.background     // #0F0F1A (dark theme)
Colors.text           // #FFFFFF
Colors.textSecondary  // #B0B0C0
Colors.success        // #4CAF50
Colors.error          // #F44336

// Spacing
Spacing.xs  // 4
Spacing.sm  // 8
Spacing.md  // 16
Spacing.lg  // 24
Spacing.xl  // 32

// Touch targets (WCAG 2.1 compliant)
TouchTargets.minimum     // 48 (minimum accessible)
TouchTargets.large       // 56 (primary actions)
```

## Core Types

Key types defined in `types/index.ts`:

```typescript
// Hunt status
type HuntStatus = 'draft' | 'active' | 'completed' | 'archived';

// Difficulty levels
type Difficulty = 'easy' | 'medium' | 'hard';

// Verification types for challenges
type VerificationType = 'photo' | 'gps' | 'qr_code' | 'text_answer' | 'manual';

// Main hunt structure
interface Hunt {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  is_public: boolean;
  status: HuntStatus;
  challenges?: Challenge[];
  settings?: HuntSettings;
}

// Challenge structure
interface Challenge {
  id?: string;
  hunt_id?: string;
  title: string;
  description: string;
  points: number;
  verification_type: VerificationType;
  verification_data?: VerificationData;
  hint?: string;
  is_mystery?: boolean;
}
```

## Testing Guidelines

### Test File Location
- Store tests: `store/__tests__/*.test.ts`
- Lib tests: `lib/__tests__/*.test.ts`

### Running Tests
```bash
npm test                    # All tests
npm run test:coverage       # With coverage
```

### Coverage Requirements
- 50% minimum for branches, functions, lines, statements

### Test Patterns

```typescript
// Example store test
import { useAuthStore } from '../index';

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('should login successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser, token: 'token' }),
    });

    const result = await useAuthStore.getState().login('test@test.com', 'password');
    expect(result).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
```

### Mocked Dependencies
The following are mocked in `jest.setup.ts`:
- `@react-native-async-storage/async-storage`
- `expo-secure-store`
- `expo-notifications`
- `expo-device`
- `expo-constants`
- `global.fetch`

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# API
EXPO_PUBLIC_API_URL=https://your-app.vercel.app/api

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# AI
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key

# Error Tracking (optional)
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## Important Files to Understand

When working on this codebase, start with these files:

1. **Entry Point**: `app/_layout.tsx` - Root layout, auth initialization, error boundary
2. **Main Store**: `store/index.ts` - Auth and Hunt stores, API patterns
3. **Types**: `types/index.ts` - Core type definitions
4. **Theme**: `constants/theme.ts` - Colors, spacing, app config
5. **Offline**: `lib/offlineStorage.ts` - Offline-first caching strategy
6. **AI**: `lib/gemini.ts` - Gemini AI integration for hunt generation

## Common Tasks

### Adding a New Screen

1. Create file in `app/` directory following the routing convention
2. Add any necessary Stack.Screen options in parent `_layout.tsx`
3. Import components and stores as needed

### Adding a New Store

1. Create `store/featureStore.ts` following Zustand pattern
2. Define types (optionally in `types/feature.ts`)
3. Export from main `store/index.ts` if commonly used
4. Add tests in `store/__tests__/featureStore.test.ts`

### Adding a New Component

1. Create in `components/` directory
2. Use `Colors`, `Spacing` from theme
3. Export from `components/index.ts` for convenience
4. Ensure touch targets meet WCAG 2.1 (48px minimum)

### Adding API Integration

1. Add endpoint to relevant store
2. Use `API_BASE` constant
3. Handle loading and error states
4. Consider offline support via `offlineStorage`

## Things to Avoid

1. **Don't hardcode colors** - Always use `Colors` from theme
2. **Don't skip loading states** - Always show loading indicators
3. **Don't ignore offline** - Consider offline scenarios
4. **Don't forget error handling** - Wrap API calls in try/catch
5. **Don't use inline styles for recurring patterns** - Use StyleSheet
6. **Don't create small touch targets** - Minimum 48x48 for accessibility
7. **Don't persist loading/error state** - Use `partialize` in stores
8. **Don't skip TypeScript types** - This is a strict mode project

## Feature Stores Overview

| Store | Purpose | Key Actions |
|-------|---------|-------------|
| `useAuthStore` | Authentication | login, register, logout, checkAuth |
| `useHuntStore` | Hunt CRUD | fetchHunts, createHunt, generateHuntWithAI |
| `useSoloModeStore` | Solo gameplay | startSoloHunt, completeChallenge, finishSoloHunt |
| `useTeamStore` | Team management | createTeam, inviteMember, joinWithCode |
| `useSocialStore` | Social features | followUser, getFeed, sendFriendRequest |
| `useLiveMultiplayerStore` | Live racing | createRace, joinRace, startSpectating |
| `useAchievementStore` | Achievements | getAchievements, checkForUnlocks |
| `useDiscoveryStore` | Hunt discovery | fetchDiscovery, searchHunts, applyFilters |

## Offline-First Architecture

The app uses an offline-first approach:

1. **Hunt Caching**: Hunts can be downloaded for offline play
2. **Submission Queue**: Challenge submissions are queued when offline
3. **Auto-Sync**: Pending submissions sync when connectivity returns
4. **Stale Threshold**: Cached data expires after 7 days

Use the `useOfflineMode` hook for offline functionality:

```typescript
const { isOnline, pendingSubmissions, cacheHuntForOffline, submitOffline } = useOfflineMode();
```

## AI Integration

Hunt generation uses Google Gemini 2.0 Flash:

```typescript
import { gemini } from '@/lib/gemini';

const generated = await gemini.generateHunt({
  theme: 'Nature Walk',
  difficulty: 'medium',
  challenge_count: 5,
  include_photo_challenges: true,
  include_gps_challenges: true,
});
```

Photo verification also uses Gemini for AI analysis:

```typescript
const result = await gemini.verifyPhoto(base64Image, challengeDescription);
```

## Web Version

The `web/` directory contains a separate Next.js web version. It is excluded from the main mobile app's TypeScript and ESLint configuration. The mobile app is the primary focus of this repository.
