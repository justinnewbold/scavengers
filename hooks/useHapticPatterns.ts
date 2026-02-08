import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_ENABLED_KEY = 'haptics_enabled';

type CancelFunction = () => void;

/**
 * Hook providing pre-built haptic feedback patterns for gameplay events.
 *
 * All patterns are no-ops when haptics are disabled or on web.
 * Patterns that run over time return a cancel function and are
 * automatically cleaned up on unmount.
 */
export function useHapticPatterns() {
  const [enabled, setEnabledState] = useState(true);
  const activeTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Load haptics preference from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(HAPTICS_ENABLED_KEY)
      .then((value) => {
        setEnabledState(value !== 'false');
      })
      .catch(() => {});
  }, []);

  // Clear all active timeouts on unmount
  useEffect(() => {
    return () => {
      for (const id of activeTimeouts.current) {
        clearTimeout(id);
      }
      activeTimeouts.current.clear();
    };
  }, []);

  /** Schedule a timeout that is tracked for cleanup. */
  const scheduleTimeout = useCallback((fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      activeTimeouts.current.delete(id);
      fn();
    }, delay);
    activeTimeouts.current.add(id);
    return id;
  }, []);

  /** Remove and clear a set of timeout IDs. */
  const cancelTimeouts = useCallback((ids: ReturnType<typeof setTimeout>[]) => {
    for (const id of ids) {
      clearTimeout(id);
      activeTimeouts.current.delete(id);
    }
  }, []);

  const isDisabled = useCallback(() => {
    return !enabled || Platform.OS === 'web';
  }, [enabled]);

  /**
   * Haptic countdown before an action starts.
   *
   * Fires a medium impact every 1 second for `seconds` count.
   * The final beat is a heavy impact. Returns a cancel function.
   */
  const countdown = useCallback(
    (seconds: number): CancelFunction => {
      if (isDisabled() || seconds <= 0) return () => {};

      const timeoutIds: ReturnType<typeof setTimeout>[] = [];

      const scheduleBeat = (delay: number, beatIndex: number) => {
        const id = scheduleTimeout(() => {
          const isFinalBeat = beatIndex === seconds - 1;
          if (isFinalBeat) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }, delay);
        timeoutIds.push(id);
      };

      for (let i = 0; i < seconds; i++) {
        scheduleBeat(i * 1000, i);
      }

      return () => cancelTimeouts(timeoutIds);
    },
    [isDisabled, scheduleTimeout, cancelTimeouts],
  );

  /**
   * Multi-beat celebration for big wins.
   *
   * Sequence: light-light-medium-pause-light-light-heavy
   * Timing:   0ms  50ms  100ms  200ms(pause) 400ms 450ms 500ms
   * Total duration ~600ms. Returns a promise that resolves when done.
   */
  const celebration = useCallback((): Promise<void> => {
    if (isDisabled()) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const timeoutIds: ReturnType<typeof setTimeout>[] = [];

      // Beat 1: light @ 0ms
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Beat 2: light @ 50ms
      timeoutIds.push(
        scheduleTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 50),
      );

      // Beat 3: medium @ 100ms
      timeoutIds.push(
        scheduleTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 100),
      );

      // Pause 200ms (no haptic at 200ms–400ms)

      // Beat 4: light @ 400ms
      timeoutIds.push(
        scheduleTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 400),
      );

      // Beat 5: light @ 450ms
      timeoutIds.push(
        scheduleTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 450),
      );

      // Beat 6: heavy @ 500ms
      timeoutIds.push(
        scheduleTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 500),
      );

      // Resolve after full sequence (~600ms total)
      timeoutIds.push(
        scheduleTimeout(() => {
          resolve();
        }, 600),
      );
    });
  }, [isDisabled, scheduleTimeout]);

  /**
   * Single proximity pulse at the given intensity.
   *
   * - far: light impact
   * - medium: medium impact
   * - close: heavy impact
   * - arrived: success notification
   */
  const proximityPulse = useCallback(
    (intensity: 'far' | 'medium' | 'close' | 'arrived') => {
      if (isDisabled()) return;

      switch (intensity) {
        case 'far':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'close':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'arrived':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    },
    [isDisabled],
  );

  /**
   * Rhythmic heartbeat pattern (double-tap: thud-thud ... thud-thud).
   *
   * @param bpm - Beats per minute, clamped to 60-180 range.
   * @param duration - Total duration in milliseconds.
   * @returns A cancel function to stop the heartbeat early.
   */
  const heartbeat = useCallback(
    (bpm: number, duration: number): CancelFunction => {
      if (isDisabled() || duration <= 0) return () => {};

      const clampedBpm = Math.max(60, Math.min(180, bpm));
      const beatIntervalMs = (60 / clampedBpm) * 1000; // Time between heartbeat pairs
      const timeoutIds: ReturnType<typeof setTimeout>[] = [];
      const endTime = Date.now() + duration;

      const scheduleNextBeat = (delay: number) => {
        const id = scheduleTimeout(() => {
          if (Date.now() >= endTime) return;

          // First thud: medium impact
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // Second thud: light impact after 80ms pause
          const secondId = scheduleTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }, 80);
          timeoutIds.push(secondId);

          // Schedule next heartbeat pair
          scheduleNextBeat(beatIntervalMs);
        }, delay);
        timeoutIds.push(id);
      };

      // Fire first beat immediately
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const firstSecondId = scheduleTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 80);
      timeoutIds.push(firstSecondId);

      // Schedule subsequent beats
      scheduleNextBeat(beatIntervalMs);

      return () => cancelTimeouts(timeoutIds);
    },
    [isDisabled, scheduleTimeout, cancelTimeouts],
  );

  /**
   * Ramp up intensity for approaching targets.
   *
   * 5 stages over the given duration:
   *   Stage 1: light  @ 0ms        (interval: 600ms of the duration segment)
   *   Stage 2: light  @ 20%
   *   Stage 3: medium @ 40%
   *   Stage 4: medium @ 60%
   *   Stage 5: heavy  @ 80%
   *
   * @param duration - Total ramp duration in milliseconds.
   * @returns A cancel function to stop the ramp early.
   */
  const rampUp = useCallback(
    (duration: number): CancelFunction => {
      if (isDisabled() || duration <= 0) return () => {};

      const timeoutIds: ReturnType<typeof setTimeout>[] = [];

      interface Stage {
        style: Haptics.ImpactFeedbackStyle;
        atFraction: number;
      }

      const stages: Stage[] = [
        { style: Haptics.ImpactFeedbackStyle.Light, atFraction: 0 },
        { style: Haptics.ImpactFeedbackStyle.Light, atFraction: 0.2 },
        { style: Haptics.ImpactFeedbackStyle.Medium, atFraction: 0.4 },
        { style: Haptics.ImpactFeedbackStyle.Medium, atFraction: 0.6 },
        { style: Haptics.ImpactFeedbackStyle.Heavy, atFraction: 0.8 },
      ];

      for (const stage of stages) {
        const delay = Math.round(duration * stage.atFraction);
        if (delay === 0) {
          Haptics.impactAsync(stage.style);
        } else {
          const id = scheduleTimeout(() => {
            Haptics.impactAsync(stage.style);
          }, delay);
          timeoutIds.push(id);
        }
      }

      return () => cancelTimeouts(timeoutIds);
    },
    [isDisabled, scheduleTimeout, cancelTimeouts],
  );

  /**
   * Quick error buzz: three rapid light impacts 50ms apart.
   * Total duration ~100ms.
   */
  const error = useCallback(() => {
    if (isDisabled()) return;

    // Impact 1: immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Impact 2: 50ms later
    scheduleTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 50);

    // Impact 3: 100ms later
    scheduleTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 100);
  }, [isDisabled, scheduleTimeout]);

  /**
   * Persist the enabled preference to AsyncStorage.
   */
  const setEnabled = useCallback(async (value: boolean) => {
    setEnabledState(value);
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(value));
  }, []);

  return {
    countdown,
    celebration,
    proximityPulse,
    heartbeat,
    rampUp,
    error,
    setEnabled,
  };
}
