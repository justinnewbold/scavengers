import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SwipeableCard } from './SwipeableCard';
import { Colors, Spacing } from '@/constants/theme';

const MAX_VISIBLE_CARDS = 3;
const BEHIND_CARD_SCALE_STEP = 0.05;
const BEHIND_CARD_TRANSLATE_STEP = 10;

interface CardStackProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onSwipeLeft?: (item: T, index: number) => void;
  onSwipeRight?: (item: T, index: number) => void;
  onSwipeUp?: (item: T, index: number) => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

function BackCard({
  depth,
  children,
}: {
  depth: number;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(1 - depth * BEHIND_CARD_SCALE_STEP, {
      damping: 15,
      stiffness: 120,
    });
    const translateY = withSpring(depth * BEHIND_CARD_TRANSLATE_STEP, {
      damping: 15,
      stiffness: 120,
    });
    const opacity = interpolate(
      depth,
      [0, 1, 2],
      [1, 0.85, 0.7],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity: withSpring(opacity, { damping: 15, stiffness: 120 }),
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { zIndex: MAX_VISIBLE_CARDS - depth },
        animatedStyle,
      ]}
      pointerEvents={depth === 0 ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

export function CardStack<T>({
  items,
  renderItem,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  currentIndex,
  onIndexChange,
}: CardStackProps<T>) {
  const advanceIndex = useCallback(() => {
    if (currentIndex < items.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, items.length, onIndexChange]);

  const handleSwipeLeft = useCallback(
    (item: T, index: number) => {
      onSwipeLeft?.(item, index);
      advanceIndex();
    },
    [onSwipeLeft, advanceIndex],
  );

  const handleSwipeRight = useCallback(
    (item: T, index: number) => {
      onSwipeRight?.(item, index);
      advanceIndex();
    },
    [onSwipeRight, advanceIndex],
  );

  const handleSwipeUp = useCallback(
    (item: T, index: number) => {
      onSwipeUp?.(item, index);
      advanceIndex();
    },
    [onSwipeUp, advanceIndex],
  );

  // Determine which cards to render (current + up to 2 behind)
  const visibleCards: { item: T; absoluteIndex: number; depth: number }[] = [];
  for (let i = 0; i < MAX_VISIBLE_CARDS; i++) {
    const absoluteIndex = currentIndex + i;
    if (absoluteIndex < items.length) {
      visibleCards.push({
        item: items[absoluteIndex],
        absoluteIndex,
        depth: i,
      });
    }
  }

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Render cards in reverse order so the top card is rendered last (on top in paint order) */}
      {[...visibleCards].reverse().map(({ item, absoluteIndex, depth }) => (
        <BackCard key={absoluteIndex} depth={depth}>
          {depth === 0 ? (
            <SwipeableCard
              onSwipeLeft={() => handleSwipeLeft(item, absoluteIndex)}
              onSwipeRight={() => handleSwipeRight(item, absoluteIndex)}
              onSwipeUp={() => handleSwipeUp(item, absoluteIndex)}
            >
              {renderItem(item, absoluteIndex)}
            </SwipeableCard>
          ) : (
            <View style={styles.inertCard}>
              {renderItem(item, absoluteIndex)}
            </View>
          )}
        </BackCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  inertCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 8,
  },
});
