import { useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Hook for accessibility features including screen reader announcements
 */
export function useAccessibility() {
  /**
   * Announce a message to screen readers
   * @param message - The message to announce
   * @param options - Optional configuration
   */
  const announce = useCallback((
    message: string,
    options?: {
      /** On iOS, whether to queue the announcement (default: false) */
      queue?: boolean;
    }
  ) => {
    if (Platform.OS === 'ios') {
      // iOS: Use announceForAccessibility
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      // Android: announceForAccessibility works similarly
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  /**
   * Announce challenge completion
   */
  const announceChallenge = useCallback((
    action: 'completed' | 'skipped' | 'failed',
    challengeTitle: string,
    points?: number
  ) => {
    let message = '';

    switch (action) {
      case 'completed':
        message = points
          ? `Challenge completed! ${challengeTitle}. You earned ${points} points.`
          : `Challenge completed! ${challengeTitle}.`;
        break;
      case 'skipped':
        message = `Challenge skipped. ${challengeTitle}`;
        break;
      case 'failed':
        message = `Challenge not verified. Try again.`;
        break;
    }

    announce(message);
  }, [announce]);

  /**
   * Announce streak changes
   */
  const announceStreak = useCallback((
    streakCount: number,
    multiplier: number
  ) => {
    if (streakCount === 0) {
      announce('Streak lost.');
    } else if (streakCount === 1) {
      announce('Streak started!');
    } else {
      const multiplierText = multiplier > 1 ? ` ${multiplier}x bonus active.` : '';
      announce(`${streakCount} streak!${multiplierText}`);
    }
  }, [announce]);

  /**
   * Announce hunt completion
   */
  const announceHuntComplete = useCallback((
    huntTitle: string,
    score: number,
    challengesCompleted: number,
    totalChallenges: number
  ) => {
    announce(
      `Congratulations! Hunt completed: ${huntTitle}. ` +
      `Final score: ${score} points. ` +
      `${challengesCompleted} of ${totalChallenges} challenges completed.`
    );
  }, [announce]);

  /**
   * Announce navigation
   */
  const announceNavigation = useCallback((
    screenName: string
  ) => {
    announce(`Navigated to ${screenName}`);
  }, [announce]);

  /**
   * Announce loading state
   */
  const announceLoading = useCallback((
    isLoading: boolean,
    context?: string
  ) => {
    if (isLoading) {
      announce(context ? `Loading ${context}...` : 'Loading...');
    } else if (context) {
      announce(`${context} loaded.`);
    }
  }, [announce]);

  /**
   * Announce errors
   */
  const announceError = useCallback((
    errorMessage: string
  ) => {
    announce(`Error: ${errorMessage}`);
  }, [announce]);

  /**
   * Announce sync status
   */
  const announceSync = useCallback((
    status: 'started' | 'completed' | 'failed',
    details?: string
  ) => {
    switch (status) {
      case 'started':
        announce('Syncing data...');
        break;
      case 'completed':
        announce(details || 'Sync completed.');
        break;
      case 'failed':
        announce(details || 'Sync failed. Will retry later.');
        break;
    }
  }, [announce]);

  return {
    announce,
    announceChallenge,
    announceStreak,
    announceHuntComplete,
    announceNavigation,
    announceLoading,
    announceError,
    announceSync,
  };
}

export default useAccessibility;
