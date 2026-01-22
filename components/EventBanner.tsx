import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useEventsStore } from '@/store/eventsStore';
import type { SeasonalEvent } from '@/types/events';
import { EVENT_THEMES, RARITY_COLORS } from '@/types/events';

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

interface EventBannerProps {
  event: SeasonalEvent;
  variant?: 'full' | 'compact' | 'mini';
  onPress?: () => void;
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.timeUnit}>
      <Text style={styles.timeValue}>{value.toString().padStart(2, '0')}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.countdown}>
      <TimeUnit value={timeLeft.days} label="DAYS" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.hours} label="HRS" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.minutes} label="MIN" />
      <Text style={styles.timeSeparator}>:</Text>
      <TimeUnit value={timeLeft.seconds} label="SEC" />
    </View>
  );
}

export function EventBanner({ event, variant = 'full', onPress }: EventBannerProps) {
  const router = useRouter();
  const themeConfig = EVENT_THEMES[event.theme];
  const colors = [event.primaryColor, event.secondaryColor] as [string, string];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/events/${event.id}`);
    }
  };

  const progress = event.userProgress;
  const isJoined = !!progress;
  const progressPercent = progress
    ? (progress.challengesCompleted / event.exclusiveChallenges.length) * 100
    : 0;

  if (variant === 'mini') {
    return (
      <TouchableOpacity
        style={styles.miniContainer}
        onPress={handlePress}
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

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={handlePress}
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

  // Full variant
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
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
              <TouchableOpacity style={styles.joinEventButton} onPress={handlePress}>
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
  // Full variant
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
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginVertical: Spacing.xs,
  },
  timeUnit: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginHorizontal: 2,
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

  // Compact variant
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

  // Mini variant
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

export default EventBanner;
