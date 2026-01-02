import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'exploration' | 'social' | 'mastery' | 'special';
  points: number;
  requirement_type: string;
  requirement_value: number;
  earned: boolean;
  earned_at?: string;
  progress?: number;
}

const CATEGORY_COLORS = {
  exploration: '#4CAF50',
  social: '#2196F3',
  mastery: '#FF9800',
  special: '#9C27B0',
};

const CATEGORY_ICONS = {
  exploration: 'compass',
  social: 'people',
  mastery: 'trophy',
  special: 'star',
};

export default function AchievementsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, session } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/achievements`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const filteredAchievements = selectedCategory
    ? achievements.filter((a) => a.category === selectedCategory)
    : achievements;

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalPoints = achievements.filter((a) => a.earned).reduce((sum, a) => sum + a.points, 0);

  const categories = ['exploration', 'social', 'mastery', 'special'] as const;

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="trophy-outline" size={80} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>{t('achievements.title')}</Text>
        <Text style={styles.authText}>Sign in to track your achievements</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAchievements(); }} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('achievements.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats Overview */}
      <Card style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{earnedCount}/{achievements.length}</Text>
          <Text style={styles.statLabel}>{t('achievements.earned')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalPoints}</Text>
          <Text style={styles.statLabel}>{t('profile.totalPoints')}</Text>
        </View>
      </Card>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
              { borderColor: CATEGORY_COLORS[cat] },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Ionicons
              name={CATEGORY_ICONS[cat] as any}
              size={16}
              color={selectedCategory === cat ? Colors.text : CATEGORY_COLORS[cat]}
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === cat && styles.categoryTextActive,
            ]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements Grid */}
      {loading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : (
        <View style={styles.achievementsList}>
          {filteredAchievements.map((achievement) => (
            <Card
              key={achievement.id}
              style={[
                styles.achievementCard,
                !achievement.earned && styles.lockedCard,
              ]}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: achievement.earned ? CATEGORY_COLORS[achievement.category] : Colors.border },
              ]}>
                <Ionicons
                  name={achievement.earned ? (achievement.icon as any) || 'trophy' : 'lock-closed'}
                  size={28}
                  color={achievement.earned ? Colors.text : Colors.textTertiary}
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementName, !achievement.earned && styles.lockedText]}>
                  {achievement.name}
                </Text>
                <Text style={styles.achievementDesc} numberOfLines={2}>
                  {achievement.description}
                </Text>
                {!achievement.earned && achievement.progress !== undefined && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, (achievement.progress / achievement.requirement_value) * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {t('achievements.progress', {
                        current: achievement.progress,
                        total: achievement.requirement_value,
                      })}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={12} color={Colors.warning} />
                <Text style={styles.pointsText}>{achievement.points}</Text>
              </View>
              {achievement.earned && achievement.earned_at && (
                <View style={styles.earnedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                </View>
              )}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: { padding: Spacing.xs },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  placeholder: { width: 32 },
  statsCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  categoryScroll: { marginBottom: Spacing.lg },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  categoryTextActive: { color: Colors.text, fontWeight: '600' },
  loadingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xl },
  achievementsList: { gap: Spacing.md },
  achievementCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
    position: 'relative',
  },
  lockedCard: { opacity: 0.6 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  lockedText: { color: Colors.textSecondary },
  achievementDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  progressContainer: { marginTop: Spacing.sm },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  pointsText: { fontSize: FontSizes.xs, color: Colors.warning, fontWeight: '600' },
  earnedBadge: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  authTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg },
  authText: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.sm },
});
