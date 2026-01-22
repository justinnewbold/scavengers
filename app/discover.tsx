import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import SkeletonLoader from '@/components/SkeletonLoader';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useDiscoveryStore } from '@/store/discoveryStore';
import type { DiscoverableHunt, DiscoveryFilters, HuntDifficulty, HuntEnvironment } from '@/types/discovery';
import { POPULAR_TAGS } from '@/types/discovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    sections,
    nearbyHunts,
    searchResults,
    recommendations,
    featuredHunt,
    filters,
    userLocation,
    isLoading,
    isSearching,
    hasMoreResults,
    fetchDiscovery,
    fetchNearbyHunts,
    fetchRecommendations,
    searchHunts,
    setFilters,
    resetFilters,
    applyFilters,
    updateLocation,
    clearSearch,
  } = useDiscoveryStore();

  useEffect(() => {
    updateLocation().then(() => {
      fetchDiscovery();
      fetchNearbyHunts();
      fetchRecommendations();
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDiscovery(),
      fetchNearbyHunts(),
      fetchRecommendations(),
    ]);
    setRefreshing(false);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchHunts(searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
  };

  const handleHuntPress = (huntId: string) => {
    router.push(`/hunt/${huntId}`);
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderHuntCard = (hunt: DiscoverableHunt, width = CARD_WIDTH) => (
    <TouchableOpacity
      key={hunt.id}
      style={[styles.huntCard, { width }]}
      onPress={() => handleHuntPress(hunt.id)}
      activeOpacity={0.8}
    >
      {hunt.coverImageUrl ? (
        <Image source={{ uri: hunt.coverImageUrl }} style={styles.huntImage} />
      ) : (
        <View style={[styles.huntImage, styles.huntImagePlaceholder]}>
          <Ionicons name="map" size={32} color={Colors.textTertiary} />
        </View>
      )}

      {hunt.isFeatured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}

      {hunt.distance !== undefined && (
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={12} color="#fff" />
          <Text style={styles.distanceText}>{formatDistance(hunt.distance)}</Text>
        </View>
      )}

      <View style={styles.huntInfo}>
        <Text style={styles.huntTitle} numberOfLines={1}>{hunt.title}</Text>
        <Text style={styles.huntCreator} numberOfLines={1}>
          by {hunt.creatorName}
        </Text>

        <View style={styles.huntMeta}>
          <View style={styles.huntRating}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.huntRatingText}>
              {hunt.averageRating.toFixed(1)} ({hunt.reviewCount})
            </Text>
          </View>
          <Text style={styles.huntDuration}>
            ~{hunt.estimatedDuration}min
          </Text>
        </View>

        <View style={styles.huntTags}>
          <View style={[
            styles.difficultyTag,
            hunt.difficulty === 'easy' && styles.difficultyEasy,
            hunt.difficulty === 'hard' && styles.difficultyHard,
          ]}>
            <Text style={styles.difficultyTagText}>{hunt.difficulty}</Text>
          </View>
          <View style={styles.environmentTag}>
            <Ionicons
              name={hunt.environment === 'indoor' ? 'home' : hunt.environment === 'outdoor' ? 'leaf' : 'apps'}
              size={12}
              color={Colors.textSecondary}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: DiscoverableHunt }) => (
    <TouchableOpacity
      style={styles.searchResultCard}
      onPress={() => handleHuntPress(item.id)}
    >
      {item.coverImageUrl ? (
        <Image source={{ uri: item.coverImageUrl }} style={styles.searchResultImage} />
      ) : (
        <View style={[styles.searchResultImage, styles.huntImagePlaceholder]}>
          <Ionicons name="map" size={24} color={Colors.textTertiary} />
        </View>
      )}

      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.searchResultCreator}>by {item.creatorName}</Text>

        <View style={styles.searchResultMeta}>
          <View style={styles.huntRating}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.searchResultRating}>{item.averageRating.toFixed(1)}</Text>
          </View>
          {item.distance !== undefined && (
            <Text style={styles.searchResultDistance}>
              {formatDistance(item.distance)}
            </Text>
          )}
          <Text style={styles.searchResultDuration}>~{item.estimatedDuration}min</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Difficulty</Text>
        <View style={styles.filterOptions}>
          {(['easy', 'medium', 'hard'] as HuntDifficulty[]).map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.filterChip,
                filters.difficulty?.includes(d) && styles.filterChipActive,
              ]}
              onPress={() => {
                const current = filters.difficulty || [];
                setFilters({
                  difficulty: current.includes(d)
                    ? current.filter(x => x !== d)
                    : [...current, d],
                });
              }}
            >
              <Text style={[
                styles.filterChipText,
                filters.difficulty?.includes(d) && styles.filterChipTextActive,
              ]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Environment</Text>
        <View style={styles.filterOptions}>
          {(['indoor', 'outdoor', 'both'] as HuntEnvironment[]).map((e) => (
            <TouchableOpacity
              key={e}
              style={[
                styles.filterChip,
                filters.environment?.includes(e) && styles.filterChipActive,
              ]}
              onPress={() => {
                const current = filters.environment || [];
                setFilters({
                  environment: current.includes(e)
                    ? current.filter(x => x !== e)
                    : [...current, e],
                });
              }}
            >
              <Ionicons
                name={e === 'indoor' ? 'home' : e === 'outdoor' ? 'leaf' : 'apps'}
                size={14}
                color={filters.environment?.includes(e) ? '#fff' : Colors.textSecondary}
              />
              <Text style={[
                styles.filterChipText,
                filters.environment?.includes(e) && styles.filterChipTextActive,
              ]}>
                {e}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterActions}>
        <Button title="Reset" variant="outline" size="sm" onPress={resetFilters} />
        <Button title="Apply Filters" size="sm" onPress={() => {
          applyFilters();
          setShowFilters(false);
        }} />
      </View>
    </Card>
  );

  if (isLoading && !sections.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Discover' }} />
        <View style={styles.loadingContainer}>
          <SkeletonLoader width={SCREEN_WIDTH - 32} height={200} />
          <SkeletonLoader width={SCREEN_WIDTH - 32} height={150} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Discover' }} />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search hunts..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name="options"
            size={20}
            color={showFilters ? '#fff' : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {showFilters && renderFilters()}

      {/* Search results */}
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.searchResultsList}
          onEndReached={() => hasMoreResults && searchHunts(searchQuery, true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isSearching ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : null}
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.content}
        >
          {/* Featured hunt */}
          {featuredHunt && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Hunt</Text>
              {renderHuntCard(featuredHunt, SCREEN_WIDTH - 32)}
            </View>
          )}

          {/* Nearby hunts */}
          {nearbyHunts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Near You</Text>
                <TouchableOpacity onPress={() => router.push('/discover/nearby')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {nearbyHunts.slice(0, 5).map((hunt) => renderHuntCard(hunt))}
              </ScrollView>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>For You</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {recommendations.map((rec) => renderHuntCard(rec.hunt))}
              </ScrollView>
            </View>
          )}

          {/* Dynamic sections */}
          {sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.viewAllLink && (
                  <TouchableOpacity onPress={() => router.push(section.viewAllLink as string)}>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {section.hunts.map((hunt) => renderHuntCard(hunt))}
              </ScrollView>
            </View>
          ))}

          {/* Popular tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Tag</Text>
            <View style={styles.tagsContainer}>
              {POPULAR_TAGS.slice(0, 12).map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => {
                    setFilters({ tags: [tag] });
                    applyFilters();
                  }}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filtersCard: {
    margin: Spacing.md,
    padding: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  huntCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  huntImage: {
    width: '100%',
    height: 120,
  },
  huntImagePlaceholder: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    borderRadius: 8,
  },
  featuredText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#fff',
  },
  distanceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: '#fff',
  },
  huntInfo: {
    padding: Spacing.sm,
  },
  huntTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  huntCreator: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  huntMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  huntRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  huntRatingText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  huntDuration: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  huntTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  difficultyTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.secondary + '20',
  },
  difficultyEasy: {
    backgroundColor: Colors.success + '20',
  },
  difficultyHard: {
    backgroundColor: Colors.error + '20',
  },
  difficultyTagText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  environmentTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  tagChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  searchResultsList: {
    padding: Spacing.md,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  searchResultTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  searchResultCreator: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  searchResultRating: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  searchResultDistance: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  searchResultDuration: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  loadingMore: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
