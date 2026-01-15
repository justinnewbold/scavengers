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
  BackHandler,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, MysteryChallenge, StreakDisplay, Confetti } from '@/components';
import { useSoloModeStore, type SoloHuntResult } from '@/store/soloModeStore';
import { useStreak, useProximityHaptics, triggerHaptic } from '@/hooks';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Challenge } from '@/types';

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

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [revealedMysteries, setRevealedMysteries] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [result, setResult] = useState<SoloHuntResult | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const { distance, isRevealed: proximityRevealed, intensity } = useProximityHaptics({
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
      updateSession({ timeElapsed: (activeSession?.timeElapsed || 0) + 1 });
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
      setTimeout(() => {
        const huntResult = finishSoloHunt();
        if (huntResult) {
          setResult(huntResult);
        }
      }, 1000);
    } else {
      // Move to next challenge
      const nextIndex = currentChallengeIndex + 1;
      if (nextIndex < (hunt?.challenges?.length || 0)) {
        setCurrentChallengeIndex(nextIndex);
      }
    }
  };

  const handleVerification = (challenge: Challenge) => {
    // For solo mode, we simplify verification - just confirm and complete
    Alert.alert(
      'Complete Challenge?',
      `Did you find and photograph: "${challenge.title}"?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Done!',
          onPress: () => handleChallengeComplete(challenge),
        },
      ]
    );
  };

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
      '#Scavengers #SoloMode`,
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
            title="Back to Home"
            variant="ghost"
            onPress={() => router.replace('/')}
            style={styles.homeButton}
          />
        </ScrollView>
      </>
    );
  }

  if (!hunt || !currentChallenge || !activeSession) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isMystery = currentChallenge.is_mystery;
  const isCurrentRevealed = !isMystery || revealedMysteries.has(currentChallenge.id || '') || proximityRevealed;
  const score = activeSession.score + activeSession.bonusPoints;

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

        {/* Challenge Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Streak Display */}
          {isStreakActive && streak.count >= 2 && (
            <StreakDisplay
              streak={streak.count}
              multiplier={currentMultiplier}
              timeRemaining={timeRemaining}
              timeRemainingFormatted={timeRemainingFormatted}
              isActive={isStreakActive}
            />
          )}

          {/* Challenge Card */}
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
                    {currentChallengeIndex + 1} of {hunt.challenges?.length}
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

              {isMystery && (
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
                <Ionicons name="camera" size={20} color={Colors.primary} />
                <Text style={styles.verificationText}>
                  Take a photo when you find it!
                </Text>
              </View>

              <Button
                title={
                  completedChallenges.has(currentChallenge.id!)
                    ? '✓ Completed'
                    : 'Mark as Complete'
                }
                onPress={() => handleVerification(currentChallenge)}
                disabled={completedChallenges.has(currentChallenge.id!)}
                style={styles.verifyButton}
              />
            </Card>
          )}

          {/* Navigation */}
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
              const isRevealed = !isMysteryChallenge || revealedMysteries.has(challenge.id || '');
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
                      style={[styles.listItemTitle, isCompleted && styles.listItemTitleCompleted]}
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
    marginBottom: Spacing.md,
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
  verifyButton: {
    marginTop: Spacing.sm,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  navButton: {
    flex: 1,
  },
  challengeList: {
    marginTop: Spacing.md,
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
