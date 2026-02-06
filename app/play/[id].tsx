import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, MysteryChallenge, StreakDisplay, Confetti, StreakMilestone, getMilestoneForStreak } from '@/components';
import { useHuntStore } from '@/store';
import { useStreak, useProximityHaptics, triggerHaptic, useAccessibility, useRequireAuth } from '@/hooks';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Hunt, Challenge } from '@/types';

export default function PlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getHuntById } = useHuntStore();
  useRequireAuth();

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [revealedMysteries, setRevealedMysteries] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [lastMilestoneStreak, setLastMilestoneStreak] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const bonusAnim = useRef(new Animated.Value(0)).current;

  // Accessibility announcements
  const { announceChallenge, announceStreak, announceHuntComplete } = useAccessibility();

  // Streak tracking
  const {
    streak,
    timeRemaining,
    timeRemainingFormatted,
    isStreakActive,
    recordCompletion,
    calculatePoints,
    getBonusPoints,
    currentMultiplier,
  } = useStreak({
    onStreakStart: () => {
      triggerHaptic('medium');
    },
    onStreakIncrease: (newStreak) => {
      // Check if this is a milestone streak
      const milestone = getMilestoneForStreak(newStreak.count);
      if (milestone && newStreak.count > lastMilestoneStreak) {
        setLastMilestoneStreak(newStreak.count);
        setShowStreakMilestone(true);
      } else if (newStreak.count >= 3) {
        triggerHaptic('success');
      }
      // Announce streak for accessibility
      announceStreak(newStreak.count, newStreak.multiplier);
    },
    onStreakLost: () => {
      triggerHaptic('warning');
      setLastMilestoneStreak(0); // Reset milestone tracking
      announceStreak(0, 1);
    },
    onMultiplierChange: (multiplier) => {
      if (multiplier > 1) {
        // Show bonus animation
        Animated.sequence([
          Animated.timing(bonusAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1000),
          Animated.timing(bonusAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    },
  });

  const currentChallenge = hunt?.challenges?.[currentChallengeIndex];

  // Proximity tracking for GPS/mystery challenges
  const proximityTarget = currentChallenge?.verification_data?.latitude && currentChallenge?.verification_data?.longitude
    ? {
        latitude: currentChallenge.verification_data.latitude,
        longitude: currentChallenge.verification_data.longitude,
        revealRadius: currentChallenge.reveal_distance_meters || 50,
      }
    : null;

  const {
    distance,
    isRevealed: proximityRevealed,
    intensity,
  } = useProximityHaptics({
    enabled: Boolean(currentChallenge?.is_mystery || currentChallenge?.verification_type === 'gps'),
    target: proximityTarget,
    onReveal: useCallback(() => {
      if (currentChallenge?.id && currentChallenge.is_mystery) {
        setRevealedMysteries((prev) => new Set([...prev, currentChallenge.id!]));
        triggerHaptic('success');
      }
    }, [currentChallenge?.id, currentChallenge?.is_mystery]),
  });

  useEffect(() => {
    loadHunt();
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const progress = hunt?.challenges?.length
      ? completedChallenges.size / hunt.challenges.length
      : 0;
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
    }).start();
  }, [completedChallenges.size, hunt?.challenges?.length, progressAnim]);

  // Fisher-Yates shuffle for challenge randomization
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadHunt = async () => {
    if (!id) return;
    const huntData = await getHuntById(id);

    if (huntData) {
      // Apply shuffle_challenges setting if enabled
      if (huntData.settings?.shuffle_challenges && huntData.challenges) {
        huntData.challenges = shuffleArray(huntData.challenges);
      }
    }

    setHunt(huntData);
  };

  // Check if skip is allowed
  const canSkip = hunt?.settings?.allowSkip ?? false;

  const handleSkipChallenge = () => {
    if (!canSkip || !hunt?.challenges) return;

    const nextIndex = currentChallengeIndex + 1;
    if (nextIndex < hunt.challenges.length) {
      setCurrentChallengeIndex(nextIndex);
      triggerHaptic('light');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChallengeComplete = async (challenge: Challenge, success: boolean) => {
    if (!success || !challenge.id) return;

    // Record streak completion
    recordCompletion();

    // Calculate points with streak bonus
    const basePoints = challenge.points;
    const totalPoints = calculatePoints(basePoints);
    const bonus = getBonusPoints(basePoints);

    // Celebrate!
    triggerHaptic('success');
    Animated.sequence([
      Animated.spring(scoreAnim, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setCompletedChallenges((prev) => new Set([...prev, challenge.id!]));
    setScore((prev) => prev + totalPoints);
    setBonusPoints((prev) => prev + bonus);

    // Check if hunt is complete
    if (hunt?.challenges && completedChallenges.size + 1 >= hunt.challenges.length) {
      setShowConfetti(true);
      setTimeout(() => {
        const finalScore = score + totalPoints;
        const finalBonus = bonusPoints + bonus;
        Alert.alert(
          '🎉 Hunt Complete!',
          `Congratulations!\n\n` +
            `🏆 Score: ${finalScore} points\n` +
            (finalBonus > 0 ? `🔥 Streak Bonus: +${finalBonus} pts\n` : '') +
            `⏱️ Time: ${formatTime(timeElapsed)}`,
          [
            { text: 'Share Results', onPress: () => shareResults(finalScore, finalBonus) },
            { text: 'Done', onPress: () => router.replace('/') },
          ]
        );
      }, 500);
    } else {
      // Move to next challenge
      const nextIndex = currentChallengeIndex + 1;
      if (nextIndex < (hunt?.challenges?.length || 0)) {
        setCurrentChallengeIndex(nextIndex);
      }
    }
  };

  const shareResults = async (finalScore?: number, finalBonus?: number) => {
    if (!hunt) return;

    const challengeCount = hunt.challenges?.length || 0;
    const completedCount = completedChallenges.size;
    const percentComplete = challengeCount > 0
      ? Math.round((completedCount / challengeCount) * 100)
      : 0;

    const scoreToShare = finalScore || score;
    const bonusToShare = finalBonus || bonusPoints;

    // Build share message
    const title = `I completed "${hunt.title}" on Scavengers!`;
    const message = [
      `🎯 ${title}`,
      '',
      `📊 Results:`,
      `   🏆 Score: ${scoreToShare} points`,
      bonusToShare > 0 ? `   🔥 Streak Bonus: +${bonusToShare} pts` : null,
      `   ✅ Challenges: ${completedCount}/${challengeCount} (${percentComplete}%)`,
      `   ⏱️ Time: ${formatTime(timeElapsed)}`,
      '',
      `Think you can beat my score? Download Scavengers and try this hunt!`,
      '',
      `#Scavengers #ScavengerHunt`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share(
        Platform.OS === 'ios' ? { message, title } : { message, title },
        { dialogTitle: 'Share your hunt results', subject: title }
      );
    } catch (error) {
      console.error('Error sharing results:', error);
      Alert.alert('Error', 'Failed to share results. Please try again.');
    }
  };

  const handleVerification = (challenge: Challenge) => {
    switch (challenge.verification_type) {
      case 'photo':
        router.push({
          pathname: '/play/camera',
          params: {
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            challengeDescription: challenge.description,
          },
        });
        break;
      case 'gps':
        router.push({
          pathname: '/play/location',
          params: {
            challengeId: challenge.id,
            targetLat: challenge.verification_data?.latitude,
            targetLng: challenge.verification_data?.longitude,
            radius: challenge.verification_data?.radius_meters || 50,
          },
        });
        break;
      case 'qr_code':
        router.push({
          pathname: '/play/qr-scanner',
          params: {
            challengeId: challenge.id,
            expectedCode: challenge.verification_data?.expected_code,
          },
        });
        break;
      case 'text_answer':
        Alert.prompt(
          'Enter Answer',
          challenge.description,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Submit',
              onPress: (answer) => {
                const userAnswer = answer?.trim() || '';
                const correctAnswer = challenge.verification_data?.correct_answer || '';

                if (!userAnswer) {
                  Alert.alert('Empty Answer', 'Please enter an answer');
                  return;
                }

                const correct = challenge.verification_data?.case_sensitive
                  ? userAnswer === correctAnswer
                  : userAnswer.toLowerCase() === correctAnswer.toLowerCase();

                if (correct) {
                  handleChallengeComplete(challenge, true);
                } else {
                  triggerHaptic('error');
                  Alert.alert('Incorrect', 'Try again!');
                }
              },
            },
          ],
          'plain-text'
        );
        break;
      default:
        // Manual verification - just mark as complete
        Alert.alert('Mark Complete?', 'Have you completed this challenge?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes!', onPress: () => handleChallengeComplete(challenge, true) },
        ]);
    }
  };

  // Check if current challenge is a mystery and if revealed
  const isMystery = currentChallenge?.is_mystery;
  const isCurrentRevealed = !isMystery || revealedMysteries.has(currentChallenge?.id || '') || proximityRevealed;

  if (!hunt || !currentChallenge) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: hunt.title,
          headerBackVisible: false,
          headerRight: () => (
            <Ionicons
              name="close"
              size={24}
              color={Colors.text}
              onPress={() => {
                Alert.alert('Leave Hunt?', 'Your progress will be saved.', [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Leave', onPress: () => router.replace('/') },
                ]);
              }}
            />
          ),
        }}
      />

      {showConfetti && <Confetti />}

      {/* Streak Milestone Celebration */}
      <StreakMilestone
        streak={streak.count}
        multiplier={currentMultiplier}
        visible={showStreakMilestone}
        onDismiss={() => setShowStreakMilestone(false)}
      />

      <View style={styles.container}>
        {/* Progress Header */}
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{formatTime(timeElapsed)}</Text>
            </View>
            <Animated.View style={[styles.stat, { transform: [{ scale: scoreAnim }] }]}>
              <Ionicons name="trophy" size={16} color={Colors.primary} />
              <Text style={[styles.statText, styles.scoreText]}>{score} pts</Text>
            </Animated.View>
            <View style={styles.stat}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.statText}>
                {completedChallenges.size}/{hunt.challenges?.length}
              </Text>
            </View>
            {/* Compact streak display in header */}
            {isStreakActive && (
              <StreakDisplay
                streak={streak.count}
                multiplier={currentMultiplier}
                timeRemaining={timeRemaining}
                timeRemainingFormatted={timeRemainingFormatted}
                isActive={isStreakActive}
                compact
              />
            )}
          </View>
        </View>

        {/* Challenge Card */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Full Streak Display when active */}
          {isStreakActive && streak.count >= 2 && (
            <StreakDisplay
              streak={streak.count}
              multiplier={currentMultiplier}
              timeRemaining={timeRemaining}
              timeRemainingFormatted={timeRemainingFormatted}
              isActive={isStreakActive}
            />
          )}

          {/* Mystery Challenge or Regular Challenge */}
          {isMystery && !isCurrentRevealed ? (
            <MysteryChallenge
              challenge={currentChallenge}
              isRevealed={false}
              distance={distance}
              intensity={intensity}
            />
          ) : (
            <Card style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeBadge}>
                  <Text style={styles.challengeBadgeText}>
                    Challenge {currentChallengeIndex + 1}
                  </Text>
                </View>
                <View style={styles.pointsContainer}>
                  <Text style={styles.challengePoints}>
                    {currentMultiplier > 1
                      ? `${calculatePoints(currentChallenge.points)} pts`
                      : `${currentChallenge.points} pts`}
                  </Text>
                  {currentMultiplier > 1 && (
                    <Text style={styles.bonusLabel}>({currentMultiplier}x)</Text>
                  )}
                </View>
              </View>

              {isMystery && isCurrentRevealed && (
                <View style={styles.revealedBadge}>
                  <Ionicons name="sparkles" size={14} color={Colors.warning} />
                  <Text style={styles.revealedBadgeText}>Mystery Revealed!</Text>
                </View>
              )}

              <Text style={styles.challengeTitle}>{currentChallenge.title}</Text>
              <Text style={styles.challengeDescription}>{currentChallenge.description}</Text>

              {currentChallenge.hint && (
                <View style={styles.hintContainer}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
                  <Text style={styles.hintText}>{currentChallenge.hint}</Text>
                </View>
              )}

              <View style={styles.verificationInfo}>
                <Ionicons
                  name={
                    currentChallenge.verification_type === 'photo'
                      ? 'camera'
                      : currentChallenge.verification_type === 'gps'
                      ? 'location'
                      : currentChallenge.verification_type === 'qr_code'
                      ? 'qr-code'
                      : currentChallenge.verification_type === 'text_answer'
                      ? 'text'
                      : 'checkmark-circle'
                  }
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.verificationText}>
                  {currentChallenge.verification_type === 'photo'
                    ? 'Take a photo to verify'
                    : currentChallenge.verification_type === 'gps'
                    ? 'Go to location to verify'
                    : currentChallenge.verification_type === 'qr_code'
                    ? 'Scan QR code to verify'
                    : currentChallenge.verification_type === 'text_answer'
                    ? 'Enter answer to verify'
                    : 'Mark as complete when done'}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <Button
                  title={
                    completedChallenges.has(currentChallenge.id!)
                      ? '✓ Completed'
                      : 'Verify Challenge'
                  }
                  onPress={() => handleVerification(currentChallenge)}
                  disabled={completedChallenges.has(currentChallenge.id!)}
                  style={[styles.verifyButton, canSkip && styles.verifyButtonWithSkip]}
                />
                {canSkip && currentChallengeIndex < (hunt.challenges?.length || 1) - 1 && (
                  <Button
                    title="Skip"
                    variant="outline"
                    onPress={handleSkipChallenge}
                    style={styles.skipButton}
                  />
                )}
              </View>
            </Card>
          )}

          {/* Challenge Navigation */}
          <View style={styles.navigation}>
            <Button
              title="Previous"
              variant="outline"
              onPress={() => setCurrentChallengeIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentChallengeIndex === 0}
              style={styles.navButton}
            />
            <Button
              title="Next"
              variant="outline"
              onPress={() =>
                setCurrentChallengeIndex((prev) =>
                  Math.min((hunt.challenges?.length || 1) - 1, prev + 1)
                )
              }
              disabled={currentChallengeIndex >= (hunt.challenges?.length || 1) - 1}
              style={styles.navButton}
            />
          </View>

          {/* Challenge List */}
          <View style={styles.challengeList}>
            <Text style={styles.listTitle}>All Challenges</Text>
            {hunt.challenges?.map((challenge, index) => {
              const isMysteryChallenge = challenge.is_mystery;
              const isRevealed =
                !isMysteryChallenge || revealedMysteries.has(challenge.id || '');
              const isCompleted = completedChallenges.has(challenge.id!);

              return (
                <Card
                  key={challenge.id || index}
                  style={[
                    styles.listItem,
                    index === currentChallengeIndex && styles.listItemActive,
                    isCompleted && styles.listItemCompleted,
                  ]}
                  onPress={() => setCurrentChallengeIndex(index)}
                >
                  <View style={styles.listItemContent}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                    ) : isMysteryChallenge && !isRevealed ? (
                      <Ionicons name="help-circle" size={24} color={Colors.primary} />
                    ) : (
                      <View style={styles.listItemNumber}>
                        <Text style={styles.listItemNumberText}>{index + 1}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.listItemTitle,
                        isCompleted && styles.listItemTitleCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {isMysteryChallenge && !isRevealed ? 'Mystery Challenge' : challenge.title}
                    </Text>
                    <Text style={styles.listItemPoints}>
                      {isMysteryChallenge && !isRevealed ? '?' : challenge.points}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  header: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  scoreText: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  challengeCard: {
    marginBottom: Spacing.lg,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  challengeBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  challengeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  challengePoints: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  bonusLabel: {
    fontSize: FontSizes.xs,
    color: Colors.warning,
    fontWeight: '600',
  },
  revealedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  revealedBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.warning,
  },
  challengeTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  challengeDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warning + '15',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  hintText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.warning,
    lineHeight: 20,
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  verificationText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  verifyButton: {
    flex: 1,
  },
  verifyButtonWithSkip: {
    flex: 3,
  },
  skipButton: {
    flex: 1,
    minWidth: 70,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  navButton: {
    flex: 1,
  },
  challengeList: {
    marginBottom: Spacing.xl,
  },
  listTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  listItem: {
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
  },
  listItemActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  listItemCompleted: {
    opacity: 0.7,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listItemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemNumberText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  listItemTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  listItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  listItemPoints: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
});
