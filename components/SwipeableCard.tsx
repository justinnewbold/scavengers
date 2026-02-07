import React from 'react';
import { StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, Shadows, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const SWIPE_THRESHOLD = 120;
const MAX_ROTATION = 15;
const EXIT_DISTANCE = SCREEN_WIDTH * 1.5;

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  style?: ViewStyle;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  style,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const handleSwipeRight = () => {
    onSwipeRight?.();
  };

  const handleSwipeLeft = () => {
    onSwipeLeft?.();
  };

  const handleSwipeUp = () => {
    onSwipeUp?.();
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isActive.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((_event) => {
      isActive.value = false;

      // Check vertical swipe up first (negative Y means upward)
      if (translateY.value < -SWIPE_THRESHOLD && Math.abs(translateY.value) > Math.abs(translateX.value)) {
        translateY.value = withTiming(-EXIT_DISTANCE, { duration: 300 });
        translateX.value = withTiming(translateX.value * 1.5, { duration: 300 });
        runOnJS(handleSwipeUp)();
        return;
      }

      // Horizontal swipe right
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(EXIT_DISTANCE, { duration: 300 });
        translateY.value = withTiming(translateY.value * 1.5, { duration: 300 });
        runOnJS(handleSwipeRight)();
        return;
      }

      // Horizontal swipe left
      if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-EXIT_DISTANCE, { duration: 300 });
        translateY.value = withTiming(translateY.value * 1.5, { duration: 300 });
        runOnJS(handleSwipeLeft)();
        return;
      }

      // Below threshold: spring back to center
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION, 0, MAX_ROTATION],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  // SKIP overlay (left side) - appears when dragging left
  const skipOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  // COMPLETE overlay (right side) - appears when dragging right
  const completeOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  // HINT overlay (top) - appears when dragging up
  const hintOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.card, style, cardAnimatedStyle]}
        accessibilityRole="button"
        accessibilityHint="Swipe right to complete, left to skip, or up for a hint"
      >
        {/* SKIP overlay - left side */}
        <Animated.View style={[styles.overlay, styles.skipOverlay, skipOverlayStyle]}>
          <Ionicons name="close-circle" size={28} color={Colors.text} />
          <Animated.Text style={styles.skipText}>SKIP</Animated.Text>
        </Animated.View>

        {/* COMPLETE overlay - right side */}
        <Animated.View style={[styles.overlay, styles.completeOverlay, completeOverlayStyle]}>
          <Ionicons name="checkmark-circle" size={28} color={Colors.text} />
          <Animated.Text style={styles.completeText}>DONE</Animated.Text>
        </Animated.View>

        {/* HINT overlay - top center */}
        <Animated.View style={[styles.overlay, styles.hintOverlay, hintOverlayStyle]}>
          <Ionicons name="bulb" size={28} color={Colors.textInverse} />
          <Animated.Text style={styles.hintText}>HINT</Animated.Text>
        </Animated.View>

        {/* Card content */}
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  overlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    zIndex: 10,
  },
  skipOverlay: {
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.error,
  },
  skipText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '800',
    letterSpacing: 1,
  },
  completeOverlay: {
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.success,
  },
  completeText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hintOverlay: {
    top: Spacing.md,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -45 }],
    backgroundColor: Colors.warning,
  },
  hintText: {
    color: Colors.textInverse,
    fontSize: FontSizes.lg,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
