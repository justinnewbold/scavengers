import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

/**
 * A wrapper component that animates list items entering and exiting.
 *
 * - Entering: items fade in and slide up from below with a spring animation
 * - Exiting: items fade out and slide upward with a spring animation
 * - Layout: smooth spring-based position transitions when siblings change
 *
 * The `index` prop is used to stagger the entrance delay (capped at 5 items
 * to avoid long delays for large lists).
 *
 * Each instance must receive a unique `key` prop so Reanimated can correctly
 * detect additions and removals.
 */
export function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
  const staggerDelay = Math.min(index, 5) * 50;

  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(15)
        .stiffness(100)
        .delay(staggerDelay)}
      exiting={FadeOutUp.springify()
        .damping(15)
        .stiffness(100)}
      layout={LinearTransition.springify()
        .damping(15)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
