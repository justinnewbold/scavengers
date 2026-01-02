import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '@/components';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { Hunt } from '@/types';

export default function HuntDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getHuntById, joinHunt, isLoading } = useHuntStore();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHunt = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const huntData = await getHuntById(id);
    setHunt(huntData);
    setLoading(false);
  }, [id, getHuntById]);

  useEffect(() => {
    loadHunt();
  }, [id, loadHunt]);

  const handleJoinHunt = async () => {
    if (!hunt) return;
    
    try {
      await joinHunt(hunt.id);
      router.push(`/play/${hunt.id}`);
    } catch (_error) {
      Alert.alert('Error', 'Failed to join hunt. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!hunt) return;
    
    try {
      await Share.share({
        message: `Join my scavenger hunt "${hunt.title}" on Scavengers! 🎯\n\nhttps://scavengers.newbold.cloud/hunt/${hunt.id}`,
        title: hunt.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return Colors.success;
      case 'medium': return Colors.warning;
      case 'hard': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getVerificationIcon = (type: string) => {
    switch (type) {
      case 'photo': return 'camera';
      case 'gps': return 'location';
      case 'qr_code': return 'qr-code';
      case 'text_answer': return 'text';
      default: return 'checkmark-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading hunt...</Text>
      </View>
    );
  }

  if (!hunt) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Hunt not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="outline"
        />
      </View>
    );
  }

  const totalPoints = hunt.challenges?.reduce((sum, c) => sum + c.points, 0) || 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: hunt.title,
          headerRight: () => (
            <Ionicons
              name="share-outline"
              size={24}
              color={Colors.primary}
              onPress={handleShare}
              style={{ marginRight: Spacing.sm }}
            />
          ),
        }}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hunt Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{hunt.title}</Text>
          <Text style={styles.description}>{hunt.description}</Text>
          
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="trophy" size={20} color={Colors.primary} />
              <Text style={styles.metaText}>{totalPoints} points</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="list" size={20} color={Colors.secondary} />
              <Text style={styles.metaText}>
                {hunt.challenges?.length || 0} challenges
              </Text>
            </View>
            <View style={styles.metaItem}>
              <View style={[
                styles.difficultyBadge,
                { backgroundColor: getDifficultyColor(hunt.difficulty) + '20' }
              ]}>
                <Text style={[
                  styles.difficultyText,
                  { color: getDifficultyColor(hunt.difficulty) }
                ]}>
                  {hunt.difficulty?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Challenges Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenges</Text>
          
          {hunt.challenges?.map((challenge, index) => (
            <Card key={challenge.id || index} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeNumber}>
                  <Text style={styles.challengeNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengePoints}>{challenge.points} pts</Text>
                </View>
                <Ionicons
                  name={getVerificationIcon(challenge.verification_type)}
                  size={20}
                  color={Colors.textSecondary}
                />
              </View>
              <Text style={styles.challengeDescription} numberOfLines={2}>
                {challenge.description}
              </Text>
            </Card>
          ))}
        </View>

        {/* Join Button */}
        <View style={styles.joinSection}>
          <Button
            title="Start Hunt 🎯"
            onPress={handleJoinHunt}
            size="lg"
            loading={isLoading}
            style={styles.joinButton}
          />
          <Text style={styles.joinHint}>
            Free for groups up to 15 people
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    marginVertical: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  challengeCard: {
    marginBottom: Spacing.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  challengeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  challengeNumberText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  challengePoints: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  joinSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  joinButton: {
    minWidth: 250,
  },
  joinHint: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
});
