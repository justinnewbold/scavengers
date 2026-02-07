import React, { type ReactNode } from 'react';
import { StyleSheet, Dimensions, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 150;
const DRAG_RESISTANCE = 0.7;
const MAX_DRAG_FOR_SCALE = 300;
const MAX_DRAG_FOR_RADIUS = 200;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

interface DismissableViewProps {
  children: ReactNode;
  onDismiss: () => void;
  enabled?: boolean;
  scrollOffset?: Animated.SharedValue<number>;
  style?: ViewStyle;
}

export function DismissableView({
  children,
  onDismiss,
  enabled = true,
  scrollOffset,
  style,
}: DismissableViewProps) {
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY(10)
    .failOffsetY(-5)
    .onStart(() => {
      // Only allow dismiss gesture when scrolled to the top
      if (scrollOffset && scrollOffset.value > 0) {
        return;
      }
    })
    .onUpdate((event) => {
      // Only allow downward dragging and only when at scroll top
      if (scrollOffset && scrollOffset.value > 0) {
        return;
      }
      if (event.translationY > 0) {
        translateY.value = event.translationY * DRAG_RESISTANCE;
      }
    })
    .onEnd(() => {
      if (translateY.value > DISMISS_THRESHOLD) {
        // Dismiss: animate off screen
        isDismissing.value = true;
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: 300 },
          (finished) => {
            if (finished) {
              runOnJS(onDismiss)();
            }
          }
        );
      } else {
        // Spring back to original position
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateY.value,
      [0, MAX_DRAG_FOR_SCALE],
      [1, 0.92],
      'clamp'
    );

    const borderRadius = interpolate(
      translateY.value,
      [0, MAX_DRAG_FOR_RADIUS],
      [0, 20],
      'clamp'
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale },
      ],
      borderRadius,
      overflow: 'hidden' as const,
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, MAX_DRAG_FOR_SCALE],
      [1, 0.3],
      'clamp'
    );

    return {
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, style, contentAnimatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
