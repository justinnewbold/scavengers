import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_ENABLED_KEY = 'haptics_enabled';

// Haptic patterns for different actions
export type HapticType =
  | 'light'       // Subtle feedback (selections, toggles)
  | 'medium'      // Standard feedback (button presses)
  | 'heavy'       // Strong feedback (important actions)
  | 'success'     // Positive feedback (challenge complete, achievement unlocked)
  | 'warning'     // Alert feedback (warning states)
  | 'error'       // Error feedback (validation errors, failures)
  | 'selection';  // UI selection changes

let hapticsEnabled = true;

// Load preference on module init
AsyncStorage.getItem(HAPTICS_ENABLED_KEY).then((value) => {
  hapticsEnabled = value !== 'false';
}).catch(() => {});

export function useHaptics() {
  /**
   * Trigger haptic feedback
   */
  const trigger = useCallback(async (type: HapticType = 'medium') => {
    if (Platform.OS === 'web' || !hapticsEnabled) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;

        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;

        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;

        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;

        case 'selection':
          await Haptics.selectionAsync();
          break;

        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      // Haptics not supported on this device
      console.debug('Haptics not available:', error);
    }
  }, []);

  /**
   * Enable or disable haptic feedback
   */
  const setEnabled = useCallback(async (enabled: boolean) => {
    hapticsEnabled = enabled;
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
  }, []);

  /**
   * Check if haptics are currently enabled
   */
  const isEnabled = useCallback(() => hapticsEnabled, []);

  return {
    trigger,
    setEnabled,
    isEnabled,
    // Convenience methods
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    selection: () => trigger('selection'),
  };
}

// Standalone function for use outside of React components
export async function triggerHaptic(type: HapticType = 'medium') {
  if (Platform.OS === 'web' || !hapticsEnabled) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {}
}
