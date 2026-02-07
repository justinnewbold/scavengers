import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import type { ReplayEvent } from '@/types/liveMultiplayer';

interface TimelineMarkerProps {
  event: ReplayEvent;
  duration: number;
  onPress: () => void;
}

export function TimelineMarker({
  event,
  duration,
  onPress,
}: TimelineMarkerProps) {
  const position = (event.timestamp / duration) * 100;

  const getMarkerColor = () => {
    switch (event.type) {
      case 'position_change': return Colors.warning;
      case 'streak_achieved': return Colors.error;
      case 'finish': return Colors.success;
      default: return Colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.timelineMarker, { left: `${position}%`, backgroundColor: getMarkerColor() }]}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  timelineMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 8,
    marginLeft: -4,
  },
});
