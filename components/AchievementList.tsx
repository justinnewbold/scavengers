import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { AchievementBadge, AchievementUnlockModal } from './AchievementBadge';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useAchievementStore } from '@/store/achievementStore';
import type { Achievement, AchievementCategory } from '@/types/achievements';
import { RARITY_COLORS } from '@/types/achievements';

interface AchievementListProps {
  category?: AchievementCategory;
  showUnlockedOnly?: boolean;
  showProgress?: boolean;
}

const CATEGORY_INFO: Record<AchievementCategory, { label: string; icon: string }> = {
  exploration: { label: 'Exploration', icon: 'globe-outline' },
  completion: { label: 'Completion', icon: 'checkmark-done-outline' },
  speed: { label: 'Speed', icon: 'flash-outline' },
  social: { label: 'Social', icon: 'people-outline' },
  creator: { label: 'Creator', icon: 'create-outline' },
  streak: { label: 'Streaks', icon: 'flame-outline' },
  mastery: { label: 'Mastery', icon: 'ribbon-outline' },
  special: { label: 'Special', icon: 'star-outline' },
};

export function AchievementList({
  category,
  showUnlockedOnly = false,
  showProgress = true,
}: AchievementListProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>(
    category || 'all'
  );
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const {
    achievements,
    userAchievements,
    getUnlockedAchievements,
    getLockedAchievements,
    getProgressForAchievement,
    getTotalAchievementPoints,
    getCompletionPercentage,
  } = useAchievementStore();

  const unlockedIds = new Set(userAchievements.map(ua => ua.odachievementId));

  const getFilteredAchievements = () => {
    let filtered = achievements;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    if (showUnlockedOnly) {
      filtered = filtered.filter(a => unlockedIds.has(a.id));
    }

    // Sort: unlocked first, then by rarity
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return filtered.sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
      const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
      if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  };

  const filteredAchievements = getFilteredAchievements();
  const totalPoints = getTotalAchievementPoints();
  const completionPct = getCompletionPercentage();

  const renderAchievementDetail = () => {
    if (!selectedAchievement) return null;

    const isUnlocked = unlockedIds.has(selectedAchievement.id);
    const progress = getProgressForAchievement(selectedAchievement.id);
    const rarityColor = RARITY_COLORS[selectedAchievement.rarity];

    return (
      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <AchievementBadge
            achievement={selectedAchievement}
            isUnlocked={isUnlocked}
            size="lg"
          />
          <View style={styles.detailInfo}>
            <Text style={styles.detailName}>{selectedAchievement.name}</Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '30' }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {selectedAchievement.rarity.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.detailDescription}>{selectedAchievement.description}</Text>

        {!isUnlocked && progress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>
                {progress.currentProgress} / {progress.threshold}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progress.percentComplete}%` },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.detailFooter}>
          <View style={styles.pointsDisplay}>
            <Ionicons name="star" size={18} color={Colors.warning} />
            <Text style={styles.pointsValue}>{selectedAchievement.points} pts</Text>
          </View>
          {isUnlocked && (
            <View style={styles.unlockedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.unlockedText}>Unlocked</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.closeDetail}
          onPress={() => setSelectedAchievement(null)}
        >
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats header */}
      <Card style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userAchievements.length}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(completionPct)}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </Card>

      {/* Category filters */}
      {!category && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'all' && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === 'all' && styles.categoryTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {(Object.keys(CATEGORY_INFO) as AchievementCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Ionicons
                name={CATEGORY_INFO[cat].icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={selectedCategory === cat ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {CATEGORY_INFO[cat].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Selected achievement detail */}
      {selectedAchievement && renderAchievementDetail()}

      {/* Achievement grid */}
      <View style={styles.grid}>
        {filteredAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const progress = getProgressForAchievement(achievement.id);

          return (
            <View key={achievement.id} style={styles.gridItem}>
              <AchievementBadge
                achievement={achievement}
                isUnlocked={isUnlocked}
                progress={progress?.percentComplete}
                showProgress={showProgress && !isUnlocked}
                onPress={() => setSelectedAchievement(achievement)}
              />
            </View>
          );
        })}
      </View>

      {filteredAchievements.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No achievements found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  detailCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  rarityText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailDescription: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  detailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.warning,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlockedText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.success,
  },
  closeDetail: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});

export default AchievementList;
