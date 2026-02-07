import React, { useRef, useEffect, memo } from 'react';
import { Text, StyleSheet, Animated, Dimensions } from 'react-native';
import type { SpectatorReaction, ReactionType } from '@/types/liveMultiplayer';
import { REACTION_CONFIG } from '@/types/liveMultiplayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Floating reaction animation component
export const FloatingReaction = memo(function FloatingReaction({ reaction, onComplete }: { reaction: SpectatorReaction; onComplete: () => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start(onComplete);
  }, []);

  const config = REACTION_CONFIG[reaction.type as ReactionType];

  return (
    <Animated.View
      style={[
        styles.floatingReaction,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          left: Math.random() * (SCREEN_WIDTH - 60) + 10,
        },
      ]}
    >
      <Text style={styles.floatingEmoji}>{config.emoji}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  floatingReaction: {
    position: 'absolute',
    bottom: 150,
    zIndex: 1000,
  },
  floatingEmoji: {
    fontSize: 32,
  },
});
