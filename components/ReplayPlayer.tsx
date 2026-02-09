import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useLiveMultiplayerStore } from '@/store/liveMultiplayerStore';
import type { RaceReplay, ReplayHighlight, ReplaySnapshot } from '@/types/liveMultiplayer';
import { TimelineMarker } from './replay/TimelineMarker';
import { HighlightCard } from './replay/HighlightCard';
import { LeaderboardSnapshot } from './replay/LeaderboardSnapshot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReplayPlayerProps {
  replay: RaceReplay;
  onClose?: () => void;
  autoPlay?: boolean;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ReplayPlayer({ replay, onClose, autoPlay = false }: ReplayPlayerProps) {
  const {
    replayPlaybackTime,
    isPlayingReplay,
    playReplay,
    pauseReplay,
    seekReplay,
    shareReplay,
  } = useLiveMultiplayerStore();

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showHighlights, setShowHighlights] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const playbackInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build participant names map
  const participantNames: Record<string, string> = {};
  replay.events.forEach(e => {
    if (e.data && typeof e.data === 'object' && 'displayName' in e.data) {
      participantNames[e.userId] = e.data.displayName as string;
    }
  });

  useEffect(() => {
    if (autoPlay) {
      playReplay();
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [autoPlay]);

  // Use refs to avoid stale closures in the interval callback
  const replayPlaybackTimeRef = useRef(replayPlaybackTime);
  replayPlaybackTimeRef.current = replayPlaybackTime;
  const replayDurationRef = useRef(replay.duration);
  replayDurationRef.current = replay.duration;

  useEffect(() => {
    if (isPlayingReplay) {
      playbackInterval.current = setInterval(() => {
        const newTime = replayPlaybackTimeRef.current + (100 * playbackSpeed);
        if (newTime >= replayDurationRef.current) {
          pauseReplay();
          seekReplay(replayDurationRef.current);
        } else {
          seekReplay(newTime);
        }
      }, 100);
    } else if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlayingReplay, playbackSpeed, pauseReplay, seekReplay]);

  useEffect(() => {
    const progress = replayPlaybackTime / replay.duration;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 50,
      useNativeDriver: false,
    }).start();
  }, [replayPlaybackTime]);

  const handleSeek = (event: { nativeEvent: { locationX: number } }) => {
    const progress = event.nativeEvent.locationX / (SCREEN_WIDTH - 32);
    const newTime = Math.max(0, Math.min(progress * replay.duration, replay.duration));
    seekReplay(newTime);
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleShare = async () => {
    try {
      const shareUrl = await shareReplay(replay.id);
      // Would typically open share sheet here
    } catch (error) {
      // Handle error
    }
  };

  const jumpToHighlight = (highlight: ReplayHighlight) => {
    seekReplay(highlight.startTime);
    if (!isPlayingReplay) {
      playReplay();
    }
  };

  const getCurrentSnapshot = (): ReplaySnapshot | null => {
    const snapshots = replay.snapshots;
    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i].timestamp <= replayPlaybackTime) {
        return snapshots[i];
      }
    }
    return snapshots[0] || null;
  };

  const currentSnapshot = getCurrentSnapshot();

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.replayTitle} numberOfLines={1}>{replay.huntTitle}</Text>
          <Text style={styles.replayMeta}>
            {replay.participantCount} racers • {formatTime(replay.duration)}
          </Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Video/Map placeholder */}
      <View style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={64} color={Colors.textTertiary} />
          <Text style={styles.placeholderText}>Race Replay</Text>
        </View>

        {/* Current leaderboard overlay */}
        {currentSnapshot && (
          <View style={styles.leaderboardOverlay}>
            <LeaderboardSnapshot
              snapshot={currentSnapshot}
              participantNames={participantNames}
            />
          </View>
        )}

        {/* Timestamp overlay */}
        <View style={styles.timestampOverlay}>
          <Text style={styles.timestampText}>{formatTime(replayPlaybackTime)}</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        <TouchableOpacity
          style={styles.timeline}
          onPress={handleSeek}
          activeOpacity={1}
        >
          <View style={styles.timelineTrack}>
            <Animated.View style={[styles.timelineProgress, { width: progressWidth }]} />
          </View>

          {/* Event markers */}
          {replay.events
            .filter(e => ['position_change', 'streak_achieved', 'finish'].includes(e.type))
            .map((event, index) => (
              <TimelineMarker
                key={index}
                event={event}
                duration={replay.duration}
                onPress={() => seekReplay(event.timestamp)}
              />
            ))}

          {/* Scrubber */}
          <Animated.View
            style={[
              styles.scrubber,
              {
                left: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_WIDTH - 48],
                }),
              },
            ]}
          />
        </TouchableOpacity>

        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>{formatTime(replayPlaybackTime)}</Text>
          <Text style={styles.timeLabel}>{formatTime(replay.duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => seekReplay(Math.max(0, replayPlaybackTime - 10000))}
        >
          <Ionicons name="play-back" size={24} color={Colors.text} />
          <Text style={styles.controlLabel}>-10s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={isPlayingReplay ? pauseReplay : playReplay}
        >
          <Ionicons
            name={isPlayingReplay ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => seekReplay(Math.min(replay.duration, replayPlaybackTime + 10000))}
        >
          <Ionicons name="play-forward" size={24} color={Colors.text} />
          <Text style={styles.controlLabel}>+10s</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.speedButton} onPress={handleSpeedChange}>
          <Text style={styles.speedText}>{playbackSpeed}x</Text>
        </TouchableOpacity>
      </View>

      {/* Highlights */}
      <View style={styles.highlightsSection}>
        <TouchableOpacity
          style={styles.highlightsHeader}
          onPress={() => setShowHighlights(!showHighlights)}
        >
          <View style={styles.highlightsTitle}>
            <Ionicons name="sparkles" size={18} color={Colors.warning} />
            <Text style={styles.highlightsTitleText}>
              Highlights ({replay.highlights.length})
            </Text>
          </View>
          <Ionicons
            name={showHighlights ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {showHighlights && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.highlightsList}
          >
            {replay.highlights.map(highlight => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                onPress={() => jumpToHighlight(highlight)}
                isActive={
                  replayPlaybackTime >= highlight.startTime &&
                  replayPlaybackTime <= highlight.endTime
                }
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="eye" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{replay.viewCount.toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="heart" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{replay.likeCount.toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="share-social" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{replay.shareCount.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  replayTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  replayMeta: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  shareButton: {
    padding: Spacing.xs,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  leaderboardOverlay: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: Spacing.sm,
    minWidth: 150,
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timestampText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timelineContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  timeline: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  timelineTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  scrubber: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    top: 4,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  speedButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
  },
  speedText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  highlightsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  highlightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  highlightsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  highlightsTitleText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  highlightsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});

export default ReplayPlayer;
