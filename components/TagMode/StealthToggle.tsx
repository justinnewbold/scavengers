import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface StealthToggleProps {
  isStealthActive: boolean;
  stealthRemaining: number | null; // seconds
  stealthCooldown: number; // seconds until can use again
  stealthDuration: number; // total duration in seconds
  onToggleStealth: () => void;
}

export function StealthToggle({
  isStealthActive,
  stealthRemaining,
  stealthCooldown,
  stealthDuration,
  onToggleStealth,
}: StealthToggleProps) {
  const handlePress = () => {
    if (isStealthActive) {
      Alert.alert(
        'Deactivate Stealth?',
        'You will become visible on the radar again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Deactivate', onPress: onToggleStealth },
        ]
      );
      return;
    }

    if (stealthCooldown > 0) {
      Alert.alert('Cooldown', `Stealth available in ${formatTime(stealthCooldown)}`);
      return;
    }

    Alert.alert(
      'Activate Stealth Mode?',
      `You will be invisible on the radar for ${formatTime(stealthDuration)}. Use wisely!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Stealth', onPress: onToggleStealth },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const getButtonStyle = () => {
    if (isStealthActive) {
      return [styles.button, styles.buttonActive];
    }
    if (stealthCooldown > 0) {
      return [styles.button, styles.buttonCooldown];
    }
    return [styles.button, styles.buttonReady];
  };

  const getIconColor = () => {
    if (isStealthActive) return Colors.secondary;
    if (stealthCooldown > 0) return Colors.textTertiary;
    return Colors.text;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={stealthCooldown > 0 && !isStealthActive}
      activeOpacity={0.8}
    >
      <View style={styles.iconWrapper}>
        <Ionicons
          name={isStealthActive ? 'eye-off' : 'eye-off-outline'}
          size={20}
          color={getIconColor()}
        />
        {isStealthActive && (
          <View style={styles.activeDot} />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={[
          styles.label,
          isStealthActive && styles.labelActive,
          stealthCooldown > 0 && !isStealthActive && styles.labelCooldown,
        ]}>
          {isStealthActive ? 'STEALTH' : 'Stealth'}
        </Text>

        {isStealthActive && stealthRemaining !== null && (
          <Text style={styles.timer}>{formatTime(stealthRemaining)}</Text>
        )}

        {!isStealthActive && stealthCooldown > 0 && (
          <Text style={styles.cooldown}>{formatTime(stealthCooldown)}</Text>
        )}
      </View>

      {isStealthActive && (
        <View style={styles.waves}>
          <View style={[styles.wave, styles.wave1]} />
          <View style={[styles.wave, styles.wave2]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
    minWidth: 100,
  },
  buttonReady: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonActive: {
    backgroundColor: Colors.secondary + '30',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  buttonCooldown: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  iconWrapper: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  labelActive: {
    color: Colors.secondary,
    letterSpacing: 1,
  },
  labelCooldown: {
    color: Colors.textTertiary,
  },
  timer: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    fontWeight: '700',
  },
  cooldown: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  waves: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  wave1: {
    opacity: 0.5,
  },
  wave2: {
    opacity: 0.3,
  },
});

export default StealthToggle;
