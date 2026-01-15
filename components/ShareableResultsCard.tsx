import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ShareableResultsCardProps {
  huntTitle: string;
  score: number;
  totalPoints?: number;
  challengesCompleted: number;
  totalChallenges: number;
  timeElapsed: number; // in seconds
  streak?: number;
  personalBest?: boolean;
  rank?: number;
  totalPlayers?: number;
  onShare?: () => void;
}

export function ShareableResultsCard({
  huntTitle,
  score,
  totalPoints,
  challengesCompleted,
  totalChallenges,
  timeElapsed,
  streak = 0,
  personalBest = false,
  rank,
  totalPlayers,
  onShare,
}: ShareableResultsCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const secsStr = secs < 10 ? '0' + secs : String(secs);
    return mins + ':' + secsStr;
  };

  const completionPercent = Math.round((challengesCompleted / totalChallenges) * 100);
  const displayPoints = totalPoints || score;

  const shareAsImage = useCallback(async () => {
    if (!viewShotRef.current?.capture) return false;

    try {
      const uri = await viewShotRef.current.capture();

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return false;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your results!',
      });
      return true;
    } catch (error) {
      console.error('Failed to share as image:', error);
      return false;
    }
  }, []);

  const shareAsText = useCallback(async () => {
    const message = [
      `🏆 I just completed "${huntTitle}"!`,
      '',
      `📊 Score: ${displayPoints} points`,
      `✅ Challenges: ${challengesCompleted}/${totalChallenges} (${completionPercent}%)`,
      `⏱️ Time: ${formatTime(timeElapsed)}`,
      streak > 0 ? `🔥 Streak: ${streak}` : '',
      personalBest ? '⭐ NEW PERSONAL BEST!' : '',
      rank ? `🥇 Rank: #${rank} of ${totalPlayers}` : '',
      '',
      'Play Scavengers and challenge me! 🗺️',
    ].filter(Boolean).join('\n');

    try {
      await Share.share({
        message,
        title: 'My Scavengers Results',
      });
      return true;
    } catch (error) {
      console.error('Failed to share as text:', error);
      return false;
    }
  }, [huntTitle, displayPoints, challengesCompleted, totalChallenges, completionPercent, timeElapsed, streak, personalBest, rank, totalPlayers]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      // Try image share first, fall back to text
      const imageShared = await shareAsImage();
      if (!imageShared) {
        await shareAsText();
      }
      onShare?.();
    } finally {
      setIsSharing(false);
    }
  }, [shareAsImage, shareAsText, onShare]);

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1 }}
        style={styles.cardWrapper}
      >
        <LinearGradient
          colors={['#FF6B35', '#FF8F5A', '#FFB347']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>SCAVENGERS</Text>
            {personalBest && (
              <View style={styles.personalBestBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.personalBestText}>NEW BEST!</Text>
              </View>
            )}
          </View>

          {/* Hunt Title */}
          <Text style={styles.huntTitle} numberOfLines={2}>
            {huntTitle}
          </Text>

          {/* Main Score */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{displayPoints}</Text>
            <Text style={styles.scoreLabel}>POINTS</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.statValue}>
                {challengesCompleted}/{totalChallenges}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="white" />
              <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>

            {streak > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="flame" size={24} color="white" />
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            )}

            {rank && (
              <View style={styles.statItem}>
                <Ionicons name="trophy" size={24} color="white" />
                <Text style={styles.statValue}>#{rank}</Text>
                <Text style={styles.statLabel}>of {totalPlayers}</Text>
              </View>
            )}
          </View>

          {/* Completion Bar */}
          <View style={styles.completionBar}>
            <View style={styles.completionTrack}>
              <View
                style={[styles.completionFill, { width: `${completionPercent}%` }]}
              />
            </View>
            <Text style={styles.completionText}>{completionPercent}% Complete</Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>scavengers.newbold.cloud</Text>
        </LinearGradient>
      </ViewShot>

      {/* Share Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
        disabled={isSharing}
      >
        {isSharing ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="share-outline" size={20} color="white" />
            <Text style={styles.shareButtonText}>Share Results</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    width: 300,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
  },
  personalBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  personalBestText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
  },
  huntTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  completionBar: {
    marginBottom: 16,
  },
  completionTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  completionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 6,
  },
  footer: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 16,
    gap: 8,
    minWidth: 160,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ShareableResultsCard;
