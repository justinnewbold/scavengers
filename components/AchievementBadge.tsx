import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Achievement, AchievementRarity } from '@/types/achievements';
import { RARITY_COLORS } from '@/types/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onPress?: () => void;
}

export function AchievementBadge({
  achievement,
  isUnlocked,
  progress = 0,
  size = 'md',
  showProgress = false,
  onPress,
}: AchievementBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const rarityColor = RARITY_COLORS[achievement.rarity];

  const sizeStyles = {
    sm: { badge: 48, icon: 20, fontSize: FontSizes.xs },
    md: { badge: 64, icon: 28, fontSize: FontSizes.sm },
    lg: { badge: 80, icon: 36, fontSize: FontSizes.md },
  }[size];

  useEffect(() => {
    if (isUnlocked && achievement.rarity === 'legendary') {
      // Glow animation for legendary achievements
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isUnlocked, achievement.rarity, glowAnim]);

  const handlePress = () => {
    if (onPress) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onPress();
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', rarityColor + '40'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Glow effect for legendary */}
        {isUnlocked && achievement.rarity === 'legendary' && (
          <Animated.View
            style={[
              styles.glow,
              {
                width: sizeStyles.badge + 16,
                height: sizeStyles.badge + 16,
                borderRadius: (sizeStyles.badge + 16) / 2,
                backgroundColor: glowColor,
              },
            ]}
          />
        )}

        <View
          style={[
            styles.badge,
            {
              width: sizeStyles.badge,
              height: sizeStyles.badge,
              borderRadius: sizeStyles.badge / 2,
              borderColor: isUnlocked ? rarityColor : Colors.border,
              backgroundColor: isUnlocked ? rarityColor + '20' : Colors.surface,
            },
          ]}
        >
          <Ionicons
            name={achievement.icon as keyof typeof Ionicons.glyphMap}
            size={sizeStyles.icon}
            color={isUnlocked ? rarityColor : Colors.textTertiary}
          />

          {!isUnlocked && achievement.isSecret && (
            <View style={styles.secretOverlay}>
              <Ionicons name="help" size={sizeStyles.icon} color={Colors.textTertiary} />
            </View>
          )}
        </View>

        {showProgress && !isUnlocked && progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(progress, 100)}%` },
              ]}
            />
          </View>
        )}

        {size !== 'sm' && (
          <Text
            style={[styles.name, { fontSize: sizeStyles.fontSize }]}
            numberOfLines={1}
          >
            {achievement.isSecret && !isUnlocked ? '???' : achievement.name}
          </Text>
        )}

        {isUnlocked && (
          <View style={[styles.checkmark, { backgroundColor: rarityColor }]}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  visible: boolean;
  onClose: () => void;
}

export function AchievementUnlockModal({
  achievement,
  visible,
  onClose,
}: AchievementUnlockModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [visible, achievement, scaleAnim, opacityAnim]);

  if (!achievement) return null;

  const rarityColor = RARITY_COLORS[achievement.rarity];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.unlockTitle}>Achievement Unlocked!</Text>

          <View
            style={[
              styles.unlockBadge,
              { borderColor: rarityColor, backgroundColor: rarityColor + '20' },
            ]}
          >
            <Ionicons
              name={achievement.icon as keyof typeof Ionicons.glyphMap}
              size={48}
              color={rarityColor}
            />
          </View>

          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={styles.achievementDescription}>{achievement.description}</Text>

          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '30' }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {achievement.rarity.toUpperCase()}
            </Text>
          </View>

          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={20} color={Colors.warning} />
            <Text style={styles.pointsText}>+{achievement.points} points</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
  badge: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secretOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 100,
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  name: {
    marginTop: 4,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
  },
  checkmark: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
  },
  unlockTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  unlockBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  achievementName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  rarityText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  pointsText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.warning,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AchievementBadge;
