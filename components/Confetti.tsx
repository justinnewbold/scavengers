import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 50;

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
}

interface ConfettiProps {
  visible: boolean;
  duration?: number;
  onComplete?: () => void;
}

const COLORS = [
  '#FF6B35', // Primary orange
  '#FFE66D', // Yellow accent
  '#4ECDC4', // Teal
  '#FF6B6B', // Coral
  '#95E1D3', // Mint
  '#F38181', // Pink
  '#AA96DA', // Purple
  '#FCBAD3', // Light pink
];

export function Confetti({ visible, duration = 3000, onComplete }: ConfettiProps) {
  const pieces = useRef<ConfettiPiece[]>([]);

  useEffect(() => {
    if (visible) {
      // Create confetti pieces
      pieces.current = Array.from({ length: CONFETTI_COUNT }, () => ({
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(-50),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(1),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
      }));

      // Animate each piece
      const animations = pieces.current.map((piece, index) => {
        const delay = index * 20;
        const fallDuration = duration + Math.random() * 1000;

        return Animated.parallel([
          // Fall animation
          Animated.timing(piece.y, {
            toValue: height + 100,
            duration: fallDuration,
            delay,
            easing: Easing.quad,
            useNativeDriver: true,
          }),
          // Horizontal drift
          Animated.sequence([
            Animated.timing(piece.x, {
              toValue: (piece.x as unknown as { _value: number })._value + (Math.random() - 0.5) * 200,
              duration: fallDuration / 2,
              delay,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(piece.x, {
              toValue: (piece.x as unknown as { _value: number })._value + (Math.random() - 0.5) * 200,
              duration: fallDuration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          // Rotation
          Animated.timing(piece.rotation, {
            toValue: Math.random() * 10 - 5,
            duration: fallDuration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Scale down as it falls
          Animated.timing(piece.scale, {
            toValue: 0.3,
            duration: fallDuration,
            delay,
            easing: Easing.quad,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(animations).start(() => {
        onComplete?.();
      });
    }
  }, [visible, duration, onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.current.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              backgroundColor: piece.color,
              width: piece.size,
              height: piece.size * 1.5,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [-5, 5],
                    outputRange: ['-180deg', '180deg'],
                  }),
                },
                { scale: piece.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
});

export default Confetti;
