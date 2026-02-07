import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

export function SegmentedControl({ segments, selectedIndex, onChange, style }: SegmentedControlProps) {
  const containerWidth = useSharedValue(0);
  const segmentWidth = useSharedValue(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      // Subtract internal padding (2px on each side)
      const innerWidth = width - 4;
      containerWidth.value = innerWidth;
      segmentWidth.value = innerWidth / segments.length;
    },
    [segments.length, containerWidth, segmentWidth]
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index !== selectedIndex) {
        Haptics.selectionAsync();
        onChange(index);
      }
    },
    [selectedIndex, onChange]
  );

  const highlightStyle = useAnimatedStyle(() => {
    if (segmentWidth.value === 0) {
      return { opacity: 0 };
    }

    return {
      opacity: 1,
      width: segmentWidth.value,
      transform: [
        {
          translateX: withSpring(selectedIndex * segmentWidth.value, SPRING_CONFIG),
        },
      ],
    };
  }, [selectedIndex]);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {/* Animated highlight */}
      <Animated.View style={[styles.highlight, highlightStyle]} />

      {/* Segment buttons */}
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment}
          style={styles.segment}
          activeOpacity={0.7}
          onPress={() => handlePress(index)}
        >
          <Text
            style={[
              styles.segmentText,
              index === selectedIndex && styles.segmentTextSelected,
            ]}
            numberOfLines={1}
          >
            {segment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    color: Colors.text,
  },
});
