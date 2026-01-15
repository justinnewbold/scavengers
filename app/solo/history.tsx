import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { useSoloModeStore, type SoloHuntResult } from '@/store/soloModeStore';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function SoloHistoryScreen() {
  const {
    history,
    personalRecords,
    totalSoloHuntsCompleted,
    totalSoloPointsEarned,
    currentDailyStreak,
    clearHistory,
  } = useSoloModeStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return Colors.success;
      case 'medium': return Colors.warning;
      case 'hard': return Colors.error;
      default: return Colors.primary;
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all solo hunt history? Personal records will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: SoloHuntResult }) => (
    <Card style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyTitleRow}>
          <Text style={styles.historyTitle} numberOfLines={1}>
            {item.huntTitle}
          </Text>
          {item.personalBest && (
            <View style={styles.pbTag}>
              <Ionicons name="medal" size={12} color={Colors.warning} />
              <Text style={styles.pbTagText}>PB</Text>
            </View>
          )}
        </View>
        <Text style={styles.historyDate}>{formatDate(item.completedAt)}</Text>
      </View>

      <View style={styles.historyStats}>
        <View style={styles.historyStat}>
          <Ionicons name="trophy" size={16} color={Colors.primary} />
          <Text style={styles.historyStatValue}>{item.totalPoints}</Text>
        </View>
        <View style={styles.historyStat}>
          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.historyStatValue}>{formatTime(item.timeElapsed)}</Text>
        </View>
        <View style={styles.historyStat}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.historyStatValue}>
            {item.challengesCompleted}/{item.totalChallenges}
          </Text>
        </View>
        {item.bestStreak > 1 && (
          <View style={styles.historyStat}>
            <Ionicons name="flame" size={16} color={Colors.warning} />
            <Text style={styles.historyStatValue}>{item.bestStreak}x</Text>
          </View>
        )}
      </View>

      <View style={styles.historyMeta}>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(item.config.difficulty) + '20' },
          ]}
        >
          <Text
            style={[
              styles.difficultyText,
              { color: getDifficultyColor(item.config.difficulty) },
            ]}
          >
            {item.config.difficulty}
          </Text>
        </View>
        <Text style={styles.typeText}>{item.config.type}</Text>
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No History Yet</Text>
      <Text style={styles.emptyText}>
        Complete solo hunts to see your history here!
      </Text>
    </View>
  );

  // Get unique record keys
  const recordKeys = Object.keys(personalRecords);

  return (
    <>
      <Stack.Screen options={{ title: 'Solo History' }} />

      <View style={styles.container}>
        {/* Overall Stats */}
        <Card style={styles.overallStats}>
          <Text style={styles.overallTitle}>Overall Stats</Text>
          <View style={styles.overallGrid}>
            <View style={styles.overallStat}>
              <Text style={styles.overallValue}>{totalSoloHuntsCompleted}</Text>
              <Text style={styles.overallLabel}>Hunts</Text>
            </View>
            <View style={styles.overallStat}>
              <Text style={styles.overallValue}>{totalSoloPointsEarned}</Text>
              <Text style={styles.overallLabel}>Points</Text>
            </View>
            <View style={styles.overallStat}>
              <View style={styles.streakValue}>
                <Ionicons
                  name="flame"
                  size={20}
                  color={currentDailyStreak > 0 ? Colors.warning : Colors.textTertiary}
                />
                <Text style={styles.overallValue}>{currentDailyStreak}</Text>
              </View>
              <Text style={styles.overallLabel}>Day Streak</Text>
            </View>
          </View>
        </Card>

        {/* Personal Records */}
        {recordKeys.length > 0 && (
          <View style={styles.recordsSection}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <View style={styles.recordsGrid}>
              {recordKeys.map((key) => {
                const record = personalRecords[key];
                const [type, difficulty] = key.split('_');
                return (
                  <Card key={key} style={styles.recordCard}>
                    <View style={styles.recordHeader}>
                      <Text style={styles.recordType}>{type}</Text>
                      <View
                        style={[
                          styles.recordDifficulty,
                          { backgroundColor: getDifficultyColor(difficulty) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.recordDifficultyText,
                            { color: getDifficultyColor(difficulty) },
                          ]}
                        >
                          {difficulty}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recordStats}>
                      <View style={styles.recordStat}>
                        <Ionicons name="trophy" size={14} color={Colors.warning} />
                        <Text style={styles.recordStatValue}>{record.bestScore}</Text>
                      </View>
                      <View style={styles.recordStat}>
                        <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.recordStatValue}>{formatTime(record.bestTime)}</Text>
                      </View>
                    </View>
                    <Text style={styles.recordPlayed}>
                      {record.totalCompleted} completed
                    </Text>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {/* History List */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Hunts</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={history.length === 0 ? styles.emptyList : styles.historyList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overallStats: {
    margin: Spacing.md,
    marginBottom: 0,
  },
  overallTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  overallGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overallStat: {
    alignItems: 'center',
  },
  overallValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  overallLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recordsSection: {
    margin: Spacing.md,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  recordCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recordType: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  recordDifficulty: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordDifficultyText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  recordStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  recordStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recordStatValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  recordPlayed: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  historySection: {
    flex: 1,
    margin: Spacing.md,
    marginTop: Spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clearButton: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: '600',
  },
  historyList: {
    paddingBottom: Spacing.xl,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  historyCard: {
    marginBottom: Spacing.sm,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  historyTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  pbTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  pbTagText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.warning,
  },
  historyDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  historyStats: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  historyStatValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
