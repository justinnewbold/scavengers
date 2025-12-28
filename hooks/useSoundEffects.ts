import { useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Sound file mappings - these would be actual audio files in assets
const SOUND_FILES: Record<SoundEffect, string | null> = {
  success: null, // Would be: require('@/assets/sounds/success.mp3')
  achievement: null,
  levelUp: null,
  challenge_complete: null,
  button_tap: null,
  notification: null,
  error: null,
  countdown: null,
  rankUp: null,
  rankDown: null,
};

// Synthesized sound configurations (fallback when no audio files)
const SYNTH_SOUNDS: Record<SoundEffect, { frequency: number; duration: number; type: 'beep' | 'chirp' | 'buzz' }> = {
  success: { frequency: 800, duration: 200, type: 'chirp' },
  achievement: { frequency: 1000, duration: 500, type: 'chirp' },
  levelUp: { frequency: 600, duration: 300, type: 'chirp' },
  challenge_complete: { frequency: 700, duration: 250, type: 'beep' },
  button_tap: { frequency: 400, duration: 50, type: 'beep' },
  notification: { frequency: 500, duration: 150, type: 'beep' },
  error: { frequency: 200, duration: 300, type: 'buzz' },
  countdown: { frequency: 440, duration: 100, type: 'beep' },
  rankUp: { frequency: 900, duration: 400, type: 'chirp' },
  rankDown: { frequency: 300, duration: 400, type: 'buzz' },
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

      if (soundFile) {
        // Load and play actual audio file
        let sound = soundRefs.current.get(effect);

        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            soundFile as never,
            { shouldPlay: false }
          );
          sound = newSound;
          soundRefs.current.set(effect, sound);
        }

        await sound.setPositionAsync(0);
        await sound.playAsync();
      } else {
        // Use haptic feedback as fallback since we don't have actual audio files
        // The haptic system provides tactile feedback
        const { triggerHaptic } = await import('./useHaptics');

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
      }
    } catch (error) {
      console.debug('Sound playback failed:', error);
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
      const soundFile = SOUND_FILES[effect];
      if (soundFile && !soundRefs.current.has(effect)) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            soundFile as never,
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
