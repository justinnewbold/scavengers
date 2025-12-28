import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Hunt, Challenge } from '@/types';

export default function PlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getHuntById } = useHuntStore();
  
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadHunt();
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
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
  }, [completedChallenges.size, hunt?.challenges?.length]);

  const loadHunt = async () => {
    if (!id) return;
    const huntData = await getHuntById(id);
    setHunt(huntData);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChallengeComplete = async (challenge: Challenge, success: boolean) => {
    if (!success || !challenge.id) return;

    // Celebrate!
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.spring(scoreAnim, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setCompletedChallenges(prev => new Set([...prev, challenge.id!]));
    setScore(prev => prev + challenge.points);

    // Check if hunt is complete
    if (hunt?.challenges && completedChallenges.size + 1 >= hunt.challenges.length) {
      setTimeout(() => {
        Alert.alert(
          '🎉 Hunt Complete!',
          `Congratulations! You scored ${score + challenge.points} points in ${formatTime(timeElapsed)}!`,
          [
            { text: 'Share Results', onPress: shareResults },
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

  const shareResults = async () => {
    // TODO: Implement share
    Alert.alert('Share', 'Sharing results coming soon!');
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
        Alert.alert(
          'Mark Complete?',
          'Have you completed this challenge?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes!', onPress: () => handleChallengeComplete(challenge, true) },
          ]
        );
    }
  };

  const currentChallenge = hunt?.challenges?.[currentChallengeIndex];

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
                Alert.alert(
                  'Leave Hunt?',
                  'Your progress will be saved.',
                  [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Leave', onPress: () => router.replace('/') },
                  ]
                );
              }}
            />
          ),
        }}
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
          </View>
        </View>

        {/* Challenge Card */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <Card style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>
                  Challenge {currentChallengeIndex + 1}
                </Text>
              </View>
              <Text style={styles.challengePoints}>{currentChallenge.points} pts</Text>
            </View>

            <Text style={styles.challengeTitle}>{currentChallenge.title}</Text>
            <Text style={styles.challengeDescription}>
              {currentChallenge.description}
            </Text>

            {currentChallenge.hint && (
              <View style={styles.hintContainer}>
                <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
                <Text style={styles.hintText}>{currentChallenge.hint}</Text>
              </View>
            )}

            <View style={styles.verificationInfo}>
              <Ionicons
                name={
                  currentChallenge.verification_type === 'photo' ? 'camera' :
                  currentChallenge.verification_type === 'gps' ? 'location' :
                  currentChallenge.verification_type === 'qr_code' ? 'qr-code' :
                  currentChallenge.verification_type === 'text_answer' ? 'text' :
                  'checkmark-circle'
                }
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.verificationText}>
                {currentChallenge.verification_type === 'photo' ? 'Take a photo to verify' :
                 currentChallenge.verification_type === 'gps' ? 'Go to location to verify' :
                 currentChallenge.verification_type === 'qr_code' ? 'Scan QR code to verify' :
                 currentChallenge.verification_type === 'text_answer' ? 'Enter answer to verify' :
                 'Mark as complete when done'}
              </Text>
            </View>

            <Button
              title={
                completedChallenges.has(currentChallenge.id!) 
                  ? '✓ Completed' 
                  : 'Verify Challenge'
              }
              onPress={() => handleVerification(currentChallenge)}
              disabled={completedChallenges.has(currentChallenge.id!)}
              style={styles.verifyButton}
            />
          </Card>

          {/* Challenge Navigation */}
          <View style={styles.navigation}>
            <Button
              title="Previous"
              variant="outline"
              onPress={() => setCurrentChallengeIndex(prev => Math.max(0, prev - 1))}
              disabled={currentChallengeIndex === 0}
              style={styles.navButton}
            />
            <Button
              title="Next"
              variant="outline"
              onPress={() => setCurrentChallengeIndex(prev => 
                Math.min((hunt.challenges?.length || 1) - 1, prev + 1)
              )}
              disabled={currentChallengeIndex >= (hunt.challenges?.length || 1) - 1}
              style={styles.navButton}
            />
          </View>

          {/* Challenge List */}
          <View style={styles.challengeList}>
            <Text style={styles.listTitle}>All Challenges</Text>
            {hunt.challenges?.map((challenge, index) => (
              <Card
                key={challenge.id || index}
                style={[
                  styles.listItem,
                  index === currentChallengeIndex && styles.listItemActive,
                  completedChallenges.has(challenge.id!) && styles.listItemCompleted,
                ]}
                onPress={() => setCurrentChallengeIndex(index)}
              >
                <View style={styles.listItemContent}>
                  {completedChallenges.has(challenge.id!) ? (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  ) : (
                    <View style={styles.listItemNumber}>
                      <Text style={styles.listItemNumberText}>{index + 1}</Text>
                    </View>
                  )}
                  <Text 
                    style={[
                      styles.listItemTitle,
                      completedChallenges.has(challenge.id!) && styles.listItemTitleCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {challenge.title}
                  </Text>
                  <Text style={styles.listItemPoints}>{challenge.points}</Text>
                </View>
              </Card>
            ))}
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
  challengePoints: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary,
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
