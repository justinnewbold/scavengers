import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: number[];
  children: React.ReactNode;
  title?: string;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 150,
  mass: 0.5,
  overshootClamping: false,
  restDisplacementThreshold: 0.1,
  restSpeedThreshold: 0.1,
};

export function BottomSheet({
  visible,
  onClose,
  snapPoints = [0.5],
  children,
  title,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  // The maximum sheet height is determined by the largest snap point
  const maxSnapFraction = Math.max(...snapPoints);
  const sheetHeight = SCREEN_HEIGHT * maxSnapFraction;

  const open = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
    overlayOpacity.value = withTiming(1, { duration: 300 });
  }, [translateY, overlayOpacity]);

  const close = useCallback(() => {
    translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
    overlayOpacity.value = withTiming(0, { duration: 200 });
    runOnJS(onClose)();
  }, [translateY, overlayOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      // Start from off-screen, then animate in
      translateY.value = SCREEN_HEIGHT;
      open();
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, open, translateY, overlayOpacity]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      // Only allow dragging downward (positive translationY) or slightly upward
      const newTranslateY = context.value + event.translationY;
      translateY.value = Math.max(0, newTranslateY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 500) {
        // Dismiss the sheet
        translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
        overlayOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        // Snap back to open position
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      overlayOpacity.value,
      [0, 1],
      [0, 0.6],
      Extrapolation.CLAMP,
    ),
  }));

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.root}>
      {/* Dark overlay */}
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight, paddingBottom: insets.bottom + Spacing.md },
              sheetAnimatedStyle,
            ]}
          >
            {/* Handle bar */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Optional title */}
            {title && (
              <Text style={styles.title}>{title}</Text>
            )}

            {/* Content */}
            <View style={styles.content}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});
