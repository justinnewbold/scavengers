import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Share,
  BackHandler,
  AppState,
  TouchableOpacity,
  Dimensions,
  type AppStateStatus,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, Card, CardStack, StreakDisplay, Confetti, RatingModal } from '@/components';
import { useSoloModeStore, type SoloHuntResult } from '@/store/soloModeStore';
import { useStreak, useProximityHaptics, triggerHaptic } from '@/hooks';
import { useHapticPatterns } from '@/hooks/useHapticPatterns';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Challenge, VerificationType } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_STACK_HEIGHT = SCREEN_HEIGHT * 0.55;

const getVerificationIcon = (type: VerificationType): string => {
  switch (type) {
    case 'photo': return 'camera';
    case 'gps': return 'location';
    case 'qr_code': return 'qr-code';
    case 'text_answer': return 'text';
    case 'manual': return 'checkmark-circle';
    default: return 'help-circle';
  }
};

const getVerificationLabel = (type: VerificationType): string => {
  switch (type) {
    case 'photo': return 'Photo Verify';
    case 'gps': return 'GPS Verify';
    case 'qr_code': return 'QR Code';
    case 'text_answer': return 'Text Answer';
    case 'manual': return 'Self Verify';
    default: return 'Verify';
  }
};

export default function SoloPlayScreen() {
  const router = useRouter();
  const {
    activeSession,
    updateSession,
    completeChallenge,
    finishSoloHunt,
    abandonSoloHunt,
    pauseSession,
    resumeSession,
  } = useSoloModeStore();

  const { celebration } = useHapticPatterns();

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [revealedMysteries, setRevealedMysteries] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [result, setResult] = useState<SoloHuntResult | null>(null);
  const [showRating, setShowRating] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasManuallyPausedRef = useRef(false);

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
    resetStreak,
  } = useStreak({
    onStreakLost: () => triggerHaptic('warning'),
  });

  const hunt = activeSession?.hunt;
  const currentChallenge = hunt?.challenges?.[currentChallengeIndex];
  const completedChallenges = new Set(activeSession?.completedChallenges || []);

  // Proximity tracking for mystery challenges
  const proximityTarget = currentChallenge?.verification_data?.latitude
    ? {
        latitude: currentChallenge.verification_data.latitude,
        longitude: currentChallenge.verification_data.longitude,
        revealRadius: currentChallenge.reveal_distance_meters || 50,
      }
    : null;

  const { distance, isRevealed: proximityRevealed } = useProximityHaptics({
    enabled: Boolean(currentChallenge?.is_mystery),
    target: proximityTarget,
    onReveal: useCallback(() => {
      if (currentChallenge?.id && currentChallenge.is_mystery) {
        setRevealedMysteries((prev) => new Set([...prev, currentChallenge.id!]));
        triggerHaptic('success');
      }
    }, [currentChallenge?.id, currentChallenge?.is_mystery]),
  });

  // Timer effect
  useEffect(() => {
    if (!activeSession || activeSession.isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTime = useSoloModeStore.getState().activeSession?.timeElapsed || 0;
      updateSession({ timeElapsed: currentTime + 1 });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeSession?.isPaused, updateSession]);

  // Progress animation
  useEffect(() => {
    if (!hunt?.challenges?.length) return;
    const progress = completedChallenges.size / hunt.challenges.length;
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
    }).start();
  }, [completedChallenges.size, hunt?.challenges?.length, progressAnim]);

  // Clean up completion timeout on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle app state changes (pause when backgrounded)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App going to background - pause if not already paused
        if (!activeSession?.isPaused) {
          wasManuallyPausedRef.current = false;
          pauseSession();
        } else {
          wasManuallyPausedRef.current = true;
        }
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App coming to foreground - resume if we auto-paused
        if (!wasManuallyPausedRef.current && activeSession?.isPaused) {
          resumeSession();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [activeSession?.isPaused, pauseSession, resumeSession]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePause();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Redirect if no active session
  useEffect(() => {
    if (!activeSession && !result) {
      router.replace('/solo');
    }
  }, [activeSession, result, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePause = () => {
    wasManuallyPausedRef.current = true; // Track that user manually paused
    pauseSession();
    Alert.alert(
      'Hunt Paused',
      'Your progress is saved. What would you like to do?',
      [
        {
          text: 'Continue',
          onPress: () => {
            wasManuallyPausedRef.current = false;
            resumeSession();
          },
        },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => {
            abandonSoloHunt();
            resetStreak();
            router.replace('/solo');
          },
        },
      ]
    );
  };

  const handleChallengeComplete = async (challenge: Challenge) => {
    if (!challenge.id || !activeSession) return;

    // Record streak
    recordCompletion();

    // Calculate points
    const basePoints = challenge.points;
    const totalPoints = calculatePoints(basePoints);
    const bonus = getBonusPoints(basePoints);

    // Celebrate
    triggerHaptic('success');
    celebration();
    Animated.sequence([
      Animated.spring(scoreAnim, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    // Update store
    completeChallenge(challenge.id, totalPoints, bonus);

    // Update session with best streak
    const newStreak = (activeSession.currentStreak || 0) + 1;
    updateSession({
      currentStreak: newStreak,
      bestStreak: Math.max(activeSession.bestStreak || 0, newStreak),
    });

    // Check if hunt is complete
    const newCompletedCount = completedChallenges.size + 1;
    if (hunt?.challenges && newCompletedCount >= hunt.challenges.length) {
      setShowConfetti(true);
      celebration();
      completionTimeoutRef.current = setTimeout(() => {
        const huntResult = finishSoloHunt();
        if (huntResult) {
          setResult(huntResult);
        }
      }, 1000);
    }
  };

  const handleShowHint = useCallback((challenge: Challenge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (challenge.hint) {
      Alert.alert('Hint', challenge.hint);
    } else {
      Alert.alert('No Hint', 'No hint is available for this challenge.');
    }
  }, []);

  const handleSwipeRightAction = useCallback(
    (challenge: Challenge, _index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (completedChallenges.has(challenge.id!)) return;

      // Complete the challenge in solo mode store
      handleChallengeComplete(challenge);

      // For challenges requiring device verification, also navigate to the verification screen
      switch (challenge.verification_type) {
        case 'photo':
          router.push({
            pathname: '/play/camera',
            params: {
              challengeId: challenge.id!,
              challengeTitle: challenge.title,
              challengeDescription: challenge.description,
            },
          });
          break;
        case 'gps':
          router.push({
            pathname: '/play/location',
            params: {
              challengeId: challenge.id!,
              targetLat: String(challenge.verification_data?.latitude || 0),
              targetLng: String(challenge.verification_data?.longitude || 0),
              radius: String(challenge.verification_data?.radius_meters || 50),
            },
          });
          break;
        case 'qr_code':
          router.push({
            pathname: '/play/qr-scanner',
            params: {
              challengeId: challenge.id!,
              expectedCode: challenge.verification_data?.expected_code || '',
            },
          });
          break;
      }
    },
    [completedChallenges, handleChallengeComplete, router]
  );

  const handleSwipeLeftAction = useCallback(
    (_challenge: Challenge, _index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Skip challenge - CardStack handles index advancement automatically
    },
    []
  );

  const handleSwipeUpAction = useCallback(
    (challenge: Challenge, _index: number) => {
      handleShowHint(challenge);
    },
    [handleShowHint]
  );

  const handleCardIndexChange = useCallback((newIndex: number) => {
    setCurrentChallengeIndex(newIndex);
  }, []);

  const renderChallengeCard = useCallback(
    (challenge: Challenge, index: number) => {
      const isMysteryChallenge = challenge.is_mystery;
      const isRevealed =
        !isMysteryChallenge ||
        revealedMysteries.has(challenge.id || '') ||
        (index === currentChallengeIndex && proximityRevealed);
      const isCompleted = completedChallenges.has(challenge.id!);

      if (isMysteryChallenge && !isRevealed) {
        return (
          <View style={styles.cardContent}>
            <View style={styles.mysteryCardContent}>
              <Ionicons name="help-circle" size={48} color={Colors.primary} />
              <Text style={styles.mysteryCardTitle}>Mystery Challenge</Text>
              <Text style={styles.mysteryCardDescription}>
                Get closer to reveal this challenge!
              </Text>
              {distance !== null && (
                <Text style={styles.mysteryCardDistance}>
                  ~{Math.round(distance)}m away
                </Text>
              )}
            </View>
          </View>
        );
      }

      return (
        <View style={styles.cardContent}>
          {/* Challenge header: number and points */}
          <View style={styles.cardHeader}>
            <View style={styles.challengeBadge}>
              <Text style={styles.challengeBadgeText}>
                {index + 1} of {hunt?.challenges?.length}
              </Text>
            </View>
            <View style={styles.pointsContainer}>
              <Text style={styles.challengePoints}>
                {currentMultiplier > 1
                  ? `${calculatePoints(challenge.points)} pts`
                  : `${challenge.points} pts`}
              </Text>
              {currentMultiplier > 1 && (
                <Text style={styles.bonusLabel}>({currentMultiplier}x)</Text>
              )}
            </View>
          </View>

          {/* Mystery revealed badge */}
          {isMysteryChallenge && (
            <View style={styles.revealedBadge}>
              <Ionicons name="sparkles" size={14} color={Colors.warning} />
              <Text style={styles.revealedBadgeText}>Mystery Revealed!</Text>
            </View>
          )}

          {/* Title and description */}
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeDescription}>{challenge.description}</Text>

          {/* Verification type badge */}
          <View style={styles.verificationBadge}>
            <Ionicons
              name={getVerificationIcon(challenge.verification_type) as any}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.verificationBadgeText}>
              {getVerificationLabel(challenge.verification_type)}
            </Text>
          </View>

          {/* Hint button */}
          {challenge.hint && (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={() => handleShowHint(challenge)}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={18} color={Colors.warning} />
              <Text style={styles.hintButtonText}>Show Hint</Text>
            </TouchableOpacity>
          )}

          {/* Completed indicator */}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>
      );
    },
    [
      hunt?.challenges?.length,
      currentMultiplier,
      calculatePoints,
      completedChallenges,
      revealedMysteries,
      proximityRevealed,
      distance,
      currentChallengeIndex,
      handleShowHint,
    ]
  );

  const handleShare = async () => {
    if (!result) return;

    const message = [
      `🎯 I completed "${result.huntTitle}" on Scavengers!`,
      '',
      `📊 Results:`,
      `   🏆 Score: ${result.totalPoints} points`,
      result.bonusPoints > 0 ? `   🔥 Streak Bonus: +${result.bonusPoints} pts` : null,
      `   ✅ Challenges: ${result.challengesCompleted}/${result.totalChallenges}`,
      `   ⏱️ Time: ${formatTime(result.timeElapsed)}`,
      result.bestStreak > 1 ? `   ⚡ Best Streak: ${result.bestStreak}x` : null,
      result.personalBest ? `   🥇 NEW PERSONAL BEST!` : null,
      '',
      `Try solo mode on Scavengers!`,
      '#Scavengers #SoloMode',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({ message, title: 'My Solo Hunt Results' });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Show results screen
  if (result) {
    return (
      <>
        <Stack.Screen options={{ title: 'Hunt Complete!', headerBackVisible: false }} />
        {showConfetti && <Confetti />}

        <ScrollView style={styles.container} contentContainerStyle={styles.resultsContent}>
          <View style={styles.resultsHeader}>
            <Ionicons name="trophy" size={64} color={Colors.warning} />
            <Text style={styles.resultsTitle}>Hunt Complete!</Text>
            {result.personalBest && (
              <View style={styles.pbBadge}>
                <Ionicons name="medal" size={16} color={Colors.warning} />
                <Text style={styles.pbBadgeText}>NEW PERSONAL BEST!</Text>
              </View>
            )}
          </View>

          <Card style={styles.resultsCard}>
            <Text style={styles.huntTitle}>{result.huntTitle}</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{result.totalPoints}</Text>
                <Text style={styles.statBoxLabel}>Total Points</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{formatTime(result.timeElapsed)}</Text>
                <Text style={styles.statBoxLabel}>Time</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>
                  {result.challengesCompleted}/{result.totalChallenges}
                </Text>
                <Text style={styles.statBoxLabel}>Completed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxValue}>{result.bestStreak}x</Text>
                <Text style={styles.statBoxLabel}>Best Streak</Text>
              </View>
            </View>

            {result.bonusPoints > 0 && (
              <View style={styles.bonusRow}>
                <Ionicons name="flame" size={20} color={Colors.warning} />
                <Text style={styles.bonusText}>
                  +{result.bonusPoints} streak bonus points!
                </Text>
              </View>
            )}
          </Card>

          <View style={styles.resultsActions}>
            <Button
              title="Share Results"
              variant="outline"
              onPress={handleShare}
              icon={<Ionicons name="share-outline" size={20} color={Colors.primary} />}
              style={styles.actionButton}
            />
            <Button
              title="Play Again"
              onPress={() => {
                setResult(null);
                router.replace('/solo');
              }}
              icon={<Ionicons name="refresh" size={20} color="#fff" />}
              style={styles.actionButton}
            />
          </View>

          <Button
            title="Rate This Hunt"
            variant="outline"
            onPress={() => setShowRating(true)}
            icon={<Ionicons name="star-outline" size={20} color={Colors.primary} />}
            style={styles.actionButton}
          />

          <Button
            title="Back to Home"
            variant="ghost"
            onPress={() => router.replace('/')}
            style={styles.homeButton}
          />

          <RatingModal
            visible={showRating}
            huntId={result.huntId || activeSession?.hunt?.id || ''}
            huntTitle={result.huntTitle}
            onClose={() => setShowRating(false)}
          />
        </ScrollView>
      </>
    );
  }

  if (!hunt || !activeSession) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const score = activeSession.score + activeSession.bonusPoints;
  const challenges = hunt.challenges || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Solo Hunt',
          headerBackVisible: false,
          headerRight: () => (
            <Ionicons
              name="pause-circle-outline"
              size={28}
              color={Colors.text}
              onPress={handlePause}
            />
          ),
        }}
      />

      {showConfetti && <Confetti />}

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
              <Text style={styles.statText}>{formatTime(activeSession.timeElapsed)}</Text>
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

        {/* Streak Display */}
        {isStreakActive && streak.count >= 2 && (
          <View style={styles.streakContainer}>
            <StreakDisplay
              streak={streak.count}
              multiplier={currentMultiplier}
              timeRemaining={timeRemaining}
              timeRemainingFormatted={timeRemainingFormatted}
              isActive={isStreakActive}
            />
          </View>
        )}

        {/* Card Stack */}
        <View style={styles.cardStackContainer}>
          {currentChallengeIndex < challenges.length ? (
            <CardStack
              items={challenges}
              currentIndex={currentChallengeIndex}
              onIndexChange={handleCardIndexChange}
              renderItem={renderChallengeCard}
              onSwipeRight={handleSwipeRightAction}
              onSwipeLeft={handleSwipeLeftAction}
              onSwipeUp={handleSwipeUpAction}
            />
          ) : (
            <View style={styles.allCardsSwipedContainer}>
              <Ionicons name="checkmark-done-circle" size={64} color={Colors.success} />
              <Text style={styles.allCardsSwipedTitle}>All challenges reviewed!</Text>
              <Text style={styles.allCardsSwipedSubtitle}>
                {completedChallenges.size} of {challenges.length} completed
              </Text>
              <Button
                title="Finish Hunt"
                onPress={() => {
                  const huntResult = finishSoloHunt();
                  if (huntResult) {
                    celebration();
                    setShowConfetti(true);
                    setResult(huntResult);
                  }
                }}
                style={styles.finishButton}
              />
            </View>
          )}
        </View>

        {/* Swipe Instructions */}
        {currentChallengeIndex < challenges.length && (
          <View style={styles.swipeInstructions}>
            <View style={styles.swipeHint}>
              <Ionicons name="arrow-forward" size={14} color={Colors.success} />
              <Text style={styles.swipeHintText}>Complete</Text>
            </View>
            <View style={styles.swipeHint}>
              <Ionicons name="arrow-back" size={14} color={Colors.error} />
              <Text style={styles.swipeHintText}>Skip</Text>
            </View>
            <View style={styles.swipeHint}>
              <Ionicons name="arrow-up" size={14} color={Colors.warning} />
              <Text style={styles.swipeHintText}>Hint</Text>
            </View>
          </View>
        )}
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
  streakContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cardStackContainer: {
    flex: 1,
    height: CARD_STACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  cardContent: {
    minHeight: 280,
  },
  cardHeader: {
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
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  verificationBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 48,
  },
  hintButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.warning,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  completedBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.success,
  },
  mysteryCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  mysteryCardTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  mysteryCardDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mysteryCardDistance: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  allCardsSwipedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  allCardsSwipedTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  allCardsSwipedSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  finishButton: {
    marginTop: Spacing.md,
    minWidth: 200,
  },
  swipeInstructions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  swipeHintText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Results styles
  resultsContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  resultsTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  pbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  pbBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.warning,
  },
  resultsCard: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  huntTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  statBoxLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  bonusText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.warning,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  homeButton: {
    marginTop: Spacing.md,
  },
});
