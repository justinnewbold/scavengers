import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface VoiceNavButtonProps {
  isEnabled: boolean;
  isSpeaking: boolean;
  currentDistance: number;
  currentDirection: string;
  onToggle: () => void;
  onAnnounce: () => void;
}

export function VoiceNavButton({
  isEnabled,
  isSpeaking,
  currentDistance,
  currentDirection,
  onToggle,
  onAnnounce,
}: VoiceNavButtonProps) {
  const formatDistance = (meters: number): string => {
    if (meters === 0) return '...';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <View style={styles.container}>
      {isEnabled && currentDistance > 0 && (
        <TouchableOpacity style={styles.infoBar} onPress={onAnnounce}>
          <View style={styles.infoContent}>
            <Ionicons name="navigate" size={16} color={Colors.primary} />
            <Text style={styles.directionText}>{currentDirection}</Text>
            <Text style={styles.distanceText}>{formatDistance(currentDistance)}</Text>
          </View>
          {isSpeaking && (
            <View style={styles.speakingIndicator}>
              <Ionicons name="volume-high" size={14} color={Colors.success} />
            </View>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, isEnabled && styles.buttonActive]}
        onPress={onToggle}
      >
        <Ionicons
          name={isEnabled ? 'volume-high' : 'volume-mute'}
          size={24}
          color={isEnabled ? Colors.text : Colors.textSecondary}
        />
        <Text style={[styles.buttonText, isEnabled && styles.buttonTextActive]}>
          {isEnabled ? 'Voice On' : 'Voice Off'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  directionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  distanceText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  buttonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  buttonTextActive: {
    color: Colors.text,
  },
});

export default VoiceNavButton;
