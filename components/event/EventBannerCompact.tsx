import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { SeasonalEvent } from '@/types/events';
import { EVENT_THEMES } from '@/types/events';

// Try to import expo-linear-gradient, provide fallback
let LinearGradient: React.ComponentType<any> | null = null;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  // expo-linear-gradient not available
}

// Fallback gradient component using View
const GradientFallback = ({ colors, style, children, ...props }: any) => (
  <View style={[style, { backgroundColor: colors?.[0] || Colors.primary }]} {...props}>
    {children}
  </View>
);

const Gradient = LinearGradient || GradientFallback;

interface EventBannerCompactProps {
  event: SeasonalEvent;
  onPress: () => void;
}

export function EventBannerCompact({ event, onPress }: EventBannerCompactProps) {
  const themeConfig = EVENT_THEMES[event.theme];
  const colors = [event.primaryColor, event.secondaryColor] as [string, string];
  const progress = event.userProgress;
  const isJoined = !!progress;

  return (
    <TouchableOpacity
      style={styles.compactContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={{ uri: event.bannerImageUrl }}
        style={styles.compactBanner}
        imageStyle={styles.compactBannerImage}
      >
        <Gradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.compactOverlay}
        >
          <View style={styles.compactContent}>
            <View style={[styles.iconCircle, { backgroundColor: colors[0] }]}>
              <Ionicons
                name={themeConfig.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color="#fff"
              />
            </View>

            <View style={styles.compactInfo}>
              <Text style={styles.compactTitle}>{event.name}</Text>
              <Text style={styles.compactParticipants}>
                {event.participantCount.toLocaleString()} participants
              </Text>
            </View>

            {isJoined ? (
              <View style={styles.compactProgress}>
                <Text style={styles.compactProgressText}>
                  {progress.challengesCompleted}/{event.exclusiveChallenges.length}
                </Text>
              </View>
            ) : (
              <View style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
              </View>
            )}
          </View>
        </Gradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
  },
  compactBanner: {
    height: 80,
  },
  compactBannerImage: {
    borderRadius: 12,
  },
  compactOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  compactParticipants: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  compactProgress: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactProgressText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  joinButton: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
});
