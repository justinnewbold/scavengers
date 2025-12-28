import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useAuthStore } from '@/store';

interface MarketplaceHunt {
  id: string;
  title: string;
  description: string;
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challenge_count: number;
  estimated_duration: number;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string;
  rating: number;
  review_count: number;
  play_count: number;
  featured: boolean;
  tags: string[];
  preview_image?: string;
}

const { width } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = width * 0.75;

const DIFFICULTY_COLORS = {
  easy: Colors.success,
  medium: Colors.warning,
  hard: Colors.error,
};

const THEME_ICONS: Record<string, string> = {
  Nature: '🌿',
  Urban: '🏙️',
  History: '🏛️',
  Art: '🎨',
  Food: '🍕',
  Sports: '⚽',
  Mystery: '🔍',
  Adventure: '🧭',
};

export default function MarketplaceScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [hunts, setHunts] = useState<MarketplaceHunt[]>([]);
  const [featured, setFeatured] = useState<MarketplaceHunt[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular');

  useEffect(() => {
    fetchMarketplace();
  }, [selectedTheme, selectedDifficulty, sortBy]);

  const fetchMarketplace = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedTheme) params.append('theme', selectedTheme);
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
      params.append('sort', sortBy);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/marketplace?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        setHunts(data.hunts || []);
        setFeatured(data.featured || []);
        setThemes(data.themes || []);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = useCallback(() => {
    setLoading(true);
    fetchMarketplace();
  }, [searchQuery, selectedTheme, selectedDifficulty, sortBy]);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={12}
          color={Colors.warning}
        />
      );
    }
    return stars;
  };

  const renderFeaturedItem = ({ item }: { item: MarketplaceHunt }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => router.push(`/hunt/${item.id}`)}
    >
      <View style={styles.featuredImageContainer}>
        {item.preview_image ? (
          <Image source={{ uri: item.preview_image }} style={styles.featuredImage} />
        ) : (
          <View style={[styles.featuredImage, styles.featuredPlaceholder]}>
            <Text style={styles.themeIcon}>{THEME_ICONS[item.theme] || '🎯'}</Text>
          </View>
        )}
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color={Colors.text} />
          <Text style={styles.featuredBadgeText}>Featured</Text>
        </View>
      </View>
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.featuredCreator}>by {item.creator_name}</Text>
        <View style={styles.featuredStats}>
          <View style={styles.ratingContainer}>
            {renderStars(item.rating)}
            <Text style={styles.reviewCount}>({item.review_count})</Text>
          </View>
          <Text style={styles.playCount}>{item.play_count} plays</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHuntItem = ({ item }: { item: MarketplaceHunt }) => (
    <TouchableOpacity onPress={() => router.push(`/hunt/${item.id}`)}>
      <Card style={styles.huntCard}>
        <View style={styles.huntHeader}>
          <View style={styles.huntTheme}>
            <Text style={styles.themeIconSmall}>{THEME_ICONS[item.theme] || '🎯'}</Text>
          </View>
          <View style={styles.huntHeaderInfo}>
            <Text style={styles.huntTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.huntCreator}>by {item.creator_name}</Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty] }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.huntDescription} numberOfLines={2}>{item.description}</Text>

        <View style={styles.huntFooter}>
          <View style={styles.huntStats}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{item.challenge_count} spots</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{item.estimated_duration} min</Text>
            </View>
          </View>

          <View style={styles.huntRating}>
            <View style={styles.ratingContainer}>{renderStars(item.rating)}</View>
            <Text style={styles.playCountSmall}>{item.play_count} plays</Text>
          </View>
        </View>

        {item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search hunts..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {/* Sort Options */}
        <TouchableOpacity
          style={[styles.filterChip, sortBy === 'popular' && styles.filterChipActive]}
          onPress={() => setSortBy('popular')}
        >
          <Ionicons name="trending-up" size={14} color={sortBy === 'popular' ? Colors.text : Colors.textSecondary} />
          <Text style={[styles.filterText, sortBy === 'popular' && styles.filterTextActive]}>Popular</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortBy === 'rating' && styles.filterChipActive]}
          onPress={() => setSortBy('rating')}
        >
          <Ionicons name="star" size={14} color={sortBy === 'rating' ? Colors.text : Colors.textSecondary} />
          <Text style={[styles.filterText, sortBy === 'rating' && styles.filterTextActive]}>Top Rated</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortBy === 'recent' && styles.filterChipActive]}
          onPress={() => setSortBy('recent')}
        >
          <Ionicons name="time" size={14} color={sortBy === 'recent' ? Colors.text : Colors.textSecondary} />
          <Text style={[styles.filterText, sortBy === 'recent' && styles.filterTextActive]}>New</Text>
        </TouchableOpacity>

        <View style={styles.filterDivider} />

        {/* Theme Filters */}
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme}
            style={[styles.filterChip, selectedTheme === theme && styles.filterChipActive]}
            onPress={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
          >
            <Text style={styles.themeIconTiny}>{THEME_ICONS[theme] || '🎯'}</Text>
            <Text style={[styles.filterText, selectedTheme === theme && styles.filterTextActive]}>{theme}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={hunts}
        renderItem={renderHuntItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMarketplace(); }} />
        }
        ListHeaderComponent={
          featured.length > 0 ? (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Featured Hunts</Text>
              <FlatList
                horizontal
                data={featured}
                renderItem={renderFeaturedItem}
                keyExtractor={(item) => `featured-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={60} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No hunts found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or search terms</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  placeholder: { width: 32 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  filterTextActive: { color: Colors.text, fontWeight: '600' },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  themeIconTiny: { fontSize: 14 },
  listContent: { padding: Spacing.md, paddingTop: 0 },
  featuredSection: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  featuredList: { gap: Spacing.md },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredImageContainer: { position: 'relative' },
  featuredImage: { width: '100%', height: 120 },
  featuredPlaceholder: {
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: { fontSize: 40 },
  themeIconSmall: { fontSize: 24 },
  featuredBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  featuredBadgeText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.text },
  featuredInfo: { padding: Spacing.md },
  featuredTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  featuredCreator: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  featuredStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  reviewCount: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginLeft: 4 },
  playCount: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  huntCard: { marginBottom: Spacing.md, padding: Spacing.md },
  huntHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  huntTheme: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  huntHeaderInfo: { flex: 1 },
  huntTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  huntCreator: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  difficultyText: { fontSize: FontSizes.xs, color: Colors.text, fontWeight: '600' },
  huntDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  huntFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  huntStats: { flexDirection: 'row', gap: Spacing.md },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  huntRating: { alignItems: 'flex-end' },
  playCountSmall: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  tagsContainer: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  tag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  tagText: { fontSize: FontSizes.xs, color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
});
