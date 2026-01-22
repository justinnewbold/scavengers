import { useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerHaptic } from './useHaptics';

const SOUND_ENABLED_KEY = 'sound_effects_enabled';

export type SoundEffect =
  | 'success'
  | 'achievement'
  | 'levelUp'
  | 'challenge_complete'
  | 'button_tap'
  | 'notification'
  | 'error'
  | 'countdown'
  | 'rankUp'
  | 'rankDown';

// Sound file mappings - actual audio files in assets/sounds
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SOUND_FILES: Record<SoundEffect, ReturnType<typeof require>> = {
  success: require('@/assets/sounds/success.wav'),
  achievement: require('@/assets/sounds/achievement.wav'),
  levelUp: require('@/assets/sounds/levelUp.wav'),
  challenge_complete: require('@/assets/sounds/challenge_complete.wav'),
  button_tap: require('@/assets/sounds/button_tap.wav'),
  notification: require('@/assets/sounds/notification.wav'),
  error: require('@/assets/sounds/error.wav'),
  countdown: require('@/assets/sounds/countdown.wav'),
  rankUp: require('@/assets/sounds/rankUp.wav'),
  rankDown: require('@/assets/sounds/rankDown.wav'),
};

let soundEnabled = true;

// Load preference on module init
AsyncStorage.getItem(SOUND_ENABLED_KEY).then((value) => {
  soundEnabled = value !== 'false';
}).catch(() => {});

export function useSoundEffects() {
  const soundRefs = useRef<Map<SoundEffect, Audio.Sound>>(new Map());

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Cleanup sounds on unmount
    return () => {
      soundRefs.current.forEach((sound) => {
        sound.unloadAsync().catch(() => {});
      });
    };
  }, []);

  /**
   * Play a sound effect
   */
  const play = useCallback(async (effect: SoundEffect) => {
    if (!soundEnabled) return;

    try {
      const soundFile = SOUND_FILES[effect];

      // Load and play actual audio file
      let sound = soundRefs.current.get(effect);

      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          soundFile,
          { shouldPlay: false }
        );
        sound = newSound;
        soundRefs.current.set(effect, sound);
      }

      await sound.setPositionAsync(0);
      await sound.playAsync();

      // Also trigger haptic for tactile feedback
      switch (effect) {
        case 'success':
        case 'achievement':
        case 'levelUp':
        case 'challenge_complete':
        case 'rankUp':
          triggerHaptic('success');
          break;
        case 'error':
        case 'rankDown':
          triggerHaptic('error');
          break;
        case 'button_tap':
          triggerHaptic('light');
          break;
        case 'notification':
          triggerHaptic('medium');
          break;
        case 'countdown':
          triggerHaptic('light');
          break;
      }
    } catch (error) {
      // Fallback to haptic only if sound fails
      console.debug('Sound playback failed, using haptic fallback:', error);
      triggerHaptic('medium');
    }
  }, []);

  /**
   * Enable or disable sound effects
   */
  const setEnabled = useCallback(async (enabled: boolean) => {
    soundEnabled = enabled;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  /**
   * Check if sounds are enabled
   */
  const isEnabled = useCallback(() => soundEnabled, []);

  /**
   * Preload sounds for faster playback
   */
  const preload = useCallback(async (effects: SoundEffect[]) => {
    for (const effect of effects) {
      if (!soundRefs.current.has(effect)) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            SOUND_FILES[effect],
            { shouldPlay: false }
          );
          soundRefs.current.set(effect, sound);
        } catch (error) {
          console.debug(`Failed to preload sound ${effect}:`, error);
        }
      }
    }
  }, []);

  return {
    play,
    setEnabled,
    isEnabled,
    preload,
    // Convenience methods
    playSuccess: () => play('success'),
    playAchievement: () => play('achievement'),
    playLevelUp: () => play('levelUp'),
    playChallengeComplete: () => play('challenge_complete'),
    playError: () => play('error'),
    playRankUp: () => play('rankUp'),
    playRankDown: () => play('rankDown'),
  };
}
