import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useDiscoveryStore } from '@/store/discoveryStore';
import type { DiscoveryFilters as DiscoveryFiltersType, DiscoverySort, HuntDifficulty, HuntEnvironment } from '@/types/discovery';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface DiscoveryFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
}

const DIFFICULTY_OPTIONS: { value: HuntDifficulty; label: string; color: string }[] = [
  { value: 'easy', label: 'Easy', color: Colors.success },
  { value: 'medium', label: 'Medium', color: Colors.warning },
  { value: 'hard', label: 'Hard', color: Colors.error },
];

const ENVIRONMENT_OPTIONS: { value: HuntEnvironment; label: string; icon: string }[] = [
  { value: 'urban', label: 'Urban', icon: 'business' },
  { value: 'nature', label: 'Nature', icon: 'leaf' },
  { value: 'indoor', label: 'Indoor', icon: 'home' },
  { value: 'beach', label: 'Beach', icon: 'sunny' },
  { value: 'historical', label: 'Historical', icon: 'library' },
];

const SORT_OPTIONS: { value: DiscoverySort; label: string; icon: string }[] = [
  { value: 'distance', label: 'Distance', icon: 'navigate' },
  { value: 'rating', label: 'Rating', icon: 'star' },
  { value: 'popularity', label: 'Popularity', icon: 'trending-up' },
  { value: 'newest', label: 'Newest', icon: 'time' },
  { value: 'duration', label: 'Duration', icon: 'hourglass' },
];

const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3+ hours' },
];

const POPULAR_TAGS = [
  'family-friendly', 'photo-worthy', 'historical', 'food',
  'art', 'adventure', 'educational', 'nightlife',
  'romantic', 'fitness', 'team-building', 'free',
];

export function DiscoveryFilters({ visible, onClose, onApply }: DiscoveryFiltersProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const { filters, setFilters, resetFilters } = useDiscoveryStore();

  // Local state for editing
  const [localFilters, setLocalFilters] = useState<Partial<DiscoveryFiltersType>>({});

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const updateLocalFilter = <K extends keyof DiscoveryFiltersType>(
    key: K,
    value: DiscoveryFiltersType[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleDifficultyFilter = (value: HuntDifficulty) => {
    const current = localFilters.difficulty || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateLocalFilter('difficulty', updated);
  };

  const toggleEnvironmentFilter = (value: HuntEnvironment) => {
    const current = localFilters.environment || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateLocalFilter('environment', updated);
  };

  const toggleTagFilter = (value: string) => {
    const current = localFilters.tags || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateLocalFilter('tags', updated);
  };

  const handleApply = () => {
    setFilters(localFilters);
    onApply();
    onClose();
  };

  const handleReset = () => {
    resetFilters();
    setLocalFilters({
      sort: 'distance',
      maxDistance: 50,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.difficulty?.length) count += localFilters.difficulty.length;
    if (localFilters.environment?.length) count += localFilters.environment.length;
    if (localFilters.tags?.length) count += localFilters.tags.length;
    if (localFilters.minRating) count++;
    if (localFilters.maxDuration) count++;
    if (localFilters.maxDistance && localFilters.maxDistance !== 50) count++;
    return count;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={handleApply}>
              <Text style={styles.applyButton}>
                Apply{getActiveFilterCount() > 0 ? ` (${getActiveFilterCount()})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Sort */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                {SORT_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      localFilters.sort === option.value && styles.sortOptionActive,
                    ]}
                    onPress={() => updateLocalFilter('sort', option.value)}
                  >
                    <Ionicons
                      name={option.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={localFilters.sort === option.value ? '#fff' : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilters.sort === option.value && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distance</Text>
              <View style={styles.chipRow}>
                {DISTANCE_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      localFilters.maxDistance === option.value && styles.chipActive,
                    ]}
                    onPress={() => updateLocalFilter('maxDistance', option.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.maxDistance === option.value && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Difficulty */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Difficulty</Text>
              <View style={styles.chipRow}>
                {DIFFICULTY_OPTIONS.map(option => {
                  const isActive = localFilters.difficulty?.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        isActive && { backgroundColor: option.color },
                      ]}
                      onPress={() => toggleDifficultyFilter(option.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isActive && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duration</Text>
              <View style={styles.chipRow}>
                {DURATION_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      localFilters.maxDuration === option.value && styles.chipActive,
                    ]}
                    onPress={() => updateLocalFilter(
                      'maxDuration',
                      localFilters.maxDuration === option.value ? undefined : option.value
                    )}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.maxDuration === option.value && styles.chipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Environment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment</Text>
              <View style={styles.chipRow}>
                {ENVIRONMENT_OPTIONS.map(option => {
                  const isActive = localFilters.environment?.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        styles.chipWithIcon,
                        isActive && styles.chipActive,
                      ]}
                      onPress={() => toggleEnvironmentFilter(option.value)}
                    >
                      <Ionicons
                        name={option.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={isActive ? '#fff' : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          isActive && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Minimum Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingOption,
                      localFilters.minRating === rating && styles.ratingOptionActive,
                    ]}
                    onPress={() => updateLocalFilter(
                      'minRating',
                      localFilters.minRating === rating ? undefined : rating
                    )}
                  >
                    <Ionicons
                      name="star"
                      size={18}
                      color={
                        localFilters.minRating && rating <= localFilters.minRating
                          ? Colors.warning
                          : Colors.textTertiary
                      }
                    />
                    <Text style={styles.ratingText}>{rating}+</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Tags</Text>
              <View style={styles.tagGrid}>
                {POPULAR_TAGS.map(tag => {
                  const isActive = localFilters.tags?.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tag,
                        isActive && styles.tagActive,
                      ]}
                      onPress={() => toggleTagFilter(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          isActive && styles.tagTextActive,
                        ]}
                      >
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resetButton: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  applyButton: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  sortOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ratingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingOptionActive: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + '10',
  },
  ratingText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  tagActive: {
    backgroundColor: Colors.primary + '20',
  },
  tagText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  tagTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});

export default DiscoveryFilters;
