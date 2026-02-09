import { useState, useCallback, useRef, useEffect } from 'react';
import { STREAK_CONFIG, type StreakState } from '@/types';
import { triggerHaptic } from './useHaptics';

interface UseStreakOptions {
  onStreakStart?: () => void;
  onStreakIncrease?: (streak: StreakState) => void;
  onStreakLost?: () => void;
  onMultiplierChange?: (multiplier: number) => void;
}

function getMultiplier(streakCount: number): number {
  const { MULTIPLIERS, STREAK_THRESHOLDS } = STREAK_CONFIG;

  // Find the highest threshold that the streak count meets
  for (let i = STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (streakCount >= STREAK_THRESHOLDS[i]) {
      return MULTIPLIERS[i];
    }
  }
  return MULTIPLIERS[0];
}

export function useStreak(options: UseStreakOptions = {}) {
  const {
    onStreakStart,
    onStreakIncrease,
    onStreakLost,
    onMultiplierChange,
  } = options;

  const [streak, setStreak] = useState<StreakState>({
    count: 0,
    multiplier: 1,
    lastCompletionTime: null,
    isActive: false,
  });

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousMultiplier = useRef(1);

  // Calculate points with streak multiplier
  const calculatePoints = useCallback((basePoints: number): number => {
    return Math.round(basePoints * streak.multiplier);
  }, [streak.multiplier]);

  // Get bonus points (points added by streak)
  const getBonusPoints = useCallback((basePoints: number): number => {
    return calculatePoints(basePoints) - basePoints;
  }, [calculatePoints]);

  // Check if streak is still valid
  const isStreakValid = useCallback((): boolean => {
    if (!streak.lastCompletionTime) return true; // No previous completion, always valid

    const now = Date.now();
    const elapsed = (now - streak.lastCompletionTime) / 1000;
    return elapsed <= STREAK_CONFIG.STREAK_WINDOW_SECONDS;
  }, [streak.lastCompletionTime]);

  // Record a challenge completion
  const recordCompletion = useCallback(() => {
    const now = Date.now();
    const wasValid = isStreakValid();

    setStreak((prev) => {
      const newCount = wasValid ? prev.count + 1 : 1;
      const newMultiplier = getMultiplier(newCount);
      const isNewStreak = !wasValid || prev.count === 0;

      // Trigger callbacks
      if (isNewStreak && newCount === 1) {
        onStreakStart?.();
      } else if (wasValid) {
        onStreakIncrease?.({ count: newCount, multiplier: newMultiplier, lastCompletionTime: now, isActive: true });
      }

      // Notify multiplier change
      if (newMultiplier !== prev.multiplier) {
        onMultiplierChange?.(newMultiplier);
        previousMultiplier.current = newMultiplier;
      }

      // Haptic feedback based on streak
      if (newCount >= 2) {
        if (newMultiplier > prev.multiplier) {
          triggerHaptic('success'); // Multiplier increased!
        } else {
          triggerHaptic('heavy'); // Streak continues
        }
      }

      return {
        count: newCount,
        multiplier: newMultiplier,
        lastCompletionTime: now,
        isActive: true,
      };
    });
  }, [isStreakValid, onStreakStart, onStreakIncrease, onMultiplierChange]);

  // Reset streak (e.g., when time runs out)
  const resetStreak = useCallback(() => {
    setStreak((prev) => {
      if (prev.count > 0) {
        onStreakLost?.();
        triggerHaptic('warning');
      }
      return {
        count: 0,
        multiplier: 1,
        lastCompletionTime: null,
        isActive: false,
      };
    });
    setTimeRemaining(null);
    previousMultiplier.current = 1;
  }, [onStreakLost]);

  // Use ref for resetStreak to avoid timer effect re-running on every streak change
  const resetStreakRef = useRef(resetStreak);
  resetStreakRef.current = resetStreak;

  // Timer to track remaining time and reset streak when expired
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!streak.lastCompletionTime || !streak.isActive) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = (now - streak.lastCompletionTime!) / 1000;
      const remaining = Math.max(0, STREAK_CONFIG.STREAK_WINDOW_SECONDS - elapsed);

      if (remaining <= 0) {
        resetStreakRef.current();
      } else {
        setTimeRemaining(Math.ceil(remaining));
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [streak.lastCompletionTime, streak.isActive]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback((): string => {
    if (timeRemaining === null) return '';
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  return {
    streak,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(),
    isStreakActive: streak.isActive && streak.count > 0,
    recordCompletion,
    resetStreak,
    calculatePoints,
    getBonusPoints,
    isStreakValid,
    // Convenience getters
    currentMultiplier: streak.multiplier,
    currentStreak: streak.count,
    maxMultiplier: Math.max(...STREAK_CONFIG.MULTIPLIERS),
    nextMultiplierAt: STREAK_CONFIG.STREAK_THRESHOLDS.find(t => t > streak.count) || null,
  };
}
