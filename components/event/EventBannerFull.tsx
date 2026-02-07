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
import { EVENT_THEMES, RARITY_COLORS } from '@/types/events';
import { CountdownTimer } from './CountdownTimer';

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

interface EventBannerFullProps {
  event: SeasonalEvent;
  onPress: () => void;
}

export function EventBannerFull({ event, onPress }: EventBannerFullProps) {
  const themeConfig = EVENT_THEMES[event.theme];
  const colors = [event.primaryColor, event.secondaryColor] as [string, string];
  const progress = event.userProgress;
  const isJoined = !!progress;
  const progressPercent = progress
    ? (progress.challengesCompleted / event.exclusiveChallenges.length) * 100
    : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <ImageBackground
        source={{ uri: event.bannerImageUrl }}
        style={styles.banner}
        imageStyle={styles.bannerImage}
      >
        <Gradient
          colors={[colors[0] + '99', colors[1] + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overlay}
        >
          {/* Event badge */}
          <View style={styles.eventBadge}>
            <Ionicons
              name={themeConfig.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color="#fff"
            />
            <Text style={styles.eventBadgeText}>LIMITED TIME</Text>
          </View>

          {/* Event content */}
          <View style={styles.content}>
            <Text style={styles.title}>{event.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {event.description}
            </Text>

            {/* Countdown */}
            <CountdownTimer endDate={event.endDate} />

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={styles.statText}>
                  {event.participantCount.toLocaleString()} joined
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="trophy" size={16} color="#fff" />
                <Text style={styles.statText}>
                  {event.exclusiveChallenges.length} challenges
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="gift" size={16} color="#fff" />
                <Text style={styles.statText}>
                  {event.rewards.length} rewards
                </Text>
              </View>
            </View>

            {/* Progress or Join button */}
            {isJoined ? (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Your Progress</Text>
                  <Text style={styles.progressPoints}>
                    {progress.totalPoints.toLocaleString()} pts
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${progressPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {progress.challengesCompleted}/{event.exclusiveChallenges.length} challenges
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.joinEventButton} onPress={onPress}>
                <Text style={styles.joinEventButtonText}>Join Event</Text>
                <Ionicons name="arrow-forward" size={18} color={colors[0]} />
              </TouchableOpacity>
            )}

            {/* Featured rewards preview */}
            <View style={styles.rewardsPreview}>
              <Text style={styles.rewardsLabel}>Exclusive Rewards</Text>
              <View style={styles.rewardsList}>
                {event.rewards.slice(0, 4).map((reward, index) => (
                  <View
                    key={reward.id}
                    style={[
                      styles.rewardItem,
                      { borderColor: RARITY_COLORS[reward.rarity] },
                    ]}
                  >
                    <Ionicons
                      name={
                        reward.type === 'badge' ? 'ribbon' :
                        reward.type === 'title' ? 'text' :
                        reward.type === 'avatar_frame' ? 'person-circle' :
                        'gift'
                      }
                      size={20}
                      color={RARITY_COLORS[reward.rarity]}
                    />
                  </View>
                ))}
                {event.rewards.length > 4 && (
                  <View style={styles.moreRewards}>
                    <Text style={styles.moreRewardsText}>+{event.rewards.length - 4}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Gradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  banner: {
    minHeight: 340,
  },
  bannerImage: {
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  eventBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  content: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSizes.sm,
    color: '#fff',
    fontWeight: '500',
  },
  progressSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  progressPoints: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#fff',
  },
  progressBarContainer: {
    gap: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  joinEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#fff',
    paddingVertical: Spacing.sm,
    borderRadius: 24,
  },
  joinEventButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  rewardsPreview: {
    marginTop: Spacing.xs,
  },
  rewardsLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  rewardsList: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  rewardItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreRewards: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreRewardsText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
});
