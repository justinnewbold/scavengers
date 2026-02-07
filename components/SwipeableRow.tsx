import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';

export interface SwipeAction {
  id: string;
  icon: string;
  color: string;
  label: string;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onActionPress?: (actionId: string) => void;
}

const ACTION_WIDTH = 80;
const FULL_SWIPE_THRESHOLD = 200;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  onActionPress,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const isOpen = useSharedValue(false);

  const leftActionsWidth = leftActions.length * ACTION_WIDTH;
  const rightActionsWidth = rightActions.length * ACTION_WIDTH;

  const handleActionPress = useCallback(
    (actionId: string) => {
      onActionPress?.(actionId);
    },
    [onActionPress],
  );

  const triggerFullSwipeAction = useCallback(() => {
    // Full left swipe triggers the first right action (delete)
    if (rightActions.length > 0) {
      handleActionPress(rightActions[0].id);
    }
  }, [rightActions, handleActionPress]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = contextX.value + event.translationX;

      // Clamp: don't allow over-revealing
      // Swiping right (positive) reveals left actions
      // Swiping left (negative) reveals right actions
      if (leftActions.length === 0 && newValue > 0) {
        // No left actions, don't allow right swipe
        translateX.value = 0;
      } else if (rightActions.length === 0 && newValue < 0) {
        // No right actions, don't allow left swipe
        translateX.value = 0;
      } else {
        // Clamp to max reveal widths, with rubber band past full swipe threshold
        const maxRight = leftActionsWidth;
        const maxLeft = -(rightActionsWidth + FULL_SWIPE_THRESHOLD);

        translateX.value = Math.max(maxLeft, Math.min(maxRight, newValue));
      }
    })
    .onEnd((event) => {
      const velocityThreshold = 500;

      // Check for full swipe left (delete trigger)
      if (translateX.value < -FULL_SWIPE_THRESHOLD && rightActions.length > 0) {
        // Animate off screen then trigger action and reset
        translateX.value = withTiming(-FULL_SWIPE_THRESHOLD - 100, { duration: 200 }, () => {
          runOnJS(triggerFullSwipeAction)();
          translateX.value = withSpring(0, SPRING_CONFIG);
          isOpen.value = false;
        });
        return;
      }

      // Determine snap points based on direction
      if (translateX.value > 0) {
        // Swiping right - left actions
        const threshold = leftActionsWidth / 2;
        if (
          translateX.value > threshold ||
          event.velocityX > velocityThreshold
        ) {
          // Snap open to reveal left actions
          translateX.value = withSpring(leftActionsWidth, SPRING_CONFIG);
          isOpen.value = true;
        } else {
          // Snap closed
          translateX.value = withSpring(0, SPRING_CONFIG);
          isOpen.value = false;
        }
      } else if (translateX.value < 0) {
        // Swiping left - right actions
        const threshold = rightActionsWidth / 2;
        if (
          translateX.value < -threshold ||
          event.velocityX < -velocityThreshold
        ) {
          // Snap open to reveal right actions
          translateX.value = withSpring(-rightActionsWidth, SPRING_CONFIG);
          isOpen.value = true;
        } else {
          // Snap closed
          translateX.value = withSpring(0, SPRING_CONFIG);
          isOpen.value = false;
        }
      }
    });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? 1 : 0,
  }));

  const rightActionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? 1 : 0,
  }));

  return (
    <View style={styles.container}>
      {/* Left actions (revealed when swiping right) */}
      {leftActions.length > 0 && (
        <Animated.View
          style={[
            styles.actionsContainer,
            styles.leftActionsContainer,
            leftActionsAnimatedStyle,
          ]}
        >
          {leftActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={() => {
                handleActionPress(action.id);
                translateX.value = withSpring(0, SPRING_CONFIG);
                isOpen.value = false;
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={Colors.text}
              />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Right actions (revealed when swiping left) */}
      {rightActions.length > 0 && (
        <Animated.View
          style={[
            styles.actionsContainer,
            styles.rightActionsContainer,
            rightActionsAnimatedStyle,
          ]}
        >
          {rightActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={() => {
                handleActionPress(action.id);
                translateX.value = withSpring(0, SPRING_CONFIG);
                isOpen.value = false;
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={Colors.text}
              />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Swipeable content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  contentContainer: {
    zIndex: 1,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    zIndex: 0,
  },
  leftActionsContainer: {
    left: 0,
  },
  rightActionsContainer: {
    right: 0,
  },
  actionButton: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  actionLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
});
