import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

interface EventBannerMiniProps {
  event: SeasonalEvent;
  onPress: () => void;
}

export function EventBannerMini({ event, onPress }: EventBannerMiniProps) {
  const themeConfig = EVENT_THEMES[event.theme];
  const colors = [event.primaryColor, event.secondaryColor] as [string, string];

  return (
    <TouchableOpacity
      style={styles.miniContainer}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Gradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.miniGradient}
      >
        <Ionicons
          name={themeConfig.icon as keyof typeof Ionicons.glyphMap}
          size={16}
          color="#fff"
        />
        <Text style={styles.miniText} numberOfLines={1}>
          {event.name}
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#fff" />
      </Gradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  miniContainer: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: 20,
    overflow: 'hidden',
  },
  miniGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  miniText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
