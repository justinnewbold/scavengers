import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Button, Card } from '@/components';
import { useSoloModeStore, SOLO_HUNT_PRESETS, SOLO_THEMES, type SoloHuntType, type SoloEnvironment, type SoloHuntConfig } from '@/store/soloModeStore';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { triggerHaptic } from '@/hooks';

type DifficultyType = 'easy' | 'medium' | 'hard';

const HUNT_TYPES: Array<{
  id: SoloHuntType;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}> = [
  {
    id: 'quick',
    title: 'Quick Hunt',
    subtitle: '5 challenges • ~10 min',
    icon: 'flash',
    color: Colors.success,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    subtitle: '10 challenges • ~30 min',
    icon: 'compass',
    color: Colors.primary,
  },
  {
    id: 'challenge',
    title: 'Challenge',
    subtitle: '15 challenges • ~45 min',
    icon: 'trophy',
    color: Colors.warning,
  },
  {
    id: 'custom',
    title: 'Custom',
    subtitle: 'Set your own options',
    icon: 'settings',
    color: Colors.secondary,
  },
];

const DIFFICULTIES: Array<{
  id: DifficultyType;
  label: string;
  description: string;
}> = [
  { id: 'easy', label: 'Easy', description: 'Relaxed & fun' },
  { id: 'medium', label: 'Medium', description: 'Balanced challenge' },
  { id: 'hard', label: 'Hard', description: 'Test your skills' },
];

const ENVIRONMENTS: Array<{
  id: SoloEnvironment;
  label: string;
  icon: string;
}> = [
  { id: 'outdoor', label: 'Outdoor', icon: 'sunny' },
  { id: 'indoor', label: 'Indoor', icon: 'home' },
  { id: 'any', label: 'Any', icon: 'shuffle' },
];

export default function SoloModeScreen() {
  const router = useRouter();
  const {
    startSoloHunt,
    isGenerating,
    error,
    clearError,
    personalRecords,
    totalSoloHuntsCompleted,
    currentDailyStreak,
    activeSession,
  } = useSoloModeStore();

  const [selectedType, setSelectedType] = useState<SoloHuntType>('quick');
  const [selectedTheme, setSelectedTheme] = useState('surprise');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyType>('medium');
  const [selectedEnvironment, setSelectedEnvironment] = useState<SoloEnvironment>('any');
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [customChallengeCount, setCustomChallengeCount] = useState(8);
  const [useLocation, setUseLocation] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  // Get user's location
  useEffect(() => {
    if (useLocation) {
      getLocation();
    }
  }, [useLocation]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUseLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get location name
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address) {
          const parts = [address.name, address.city].filter(Boolean);
          setLocationName(parts.join(', '));
        }
      } catch {
        // Ignore geocoding errors
      }
    } catch (err) {
      console.error('Location error:', err);
      setUseLocation(false);
    }
  };

  // Check for active session
  useEffect(() => {
    if (activeSession) {
      Alert.alert(
        'Active Hunt',
        'You have an unfinished solo hunt. Would you like to continue?',
        [
          {
            text: 'Abandon',
            style: 'destructive',
            onPress: () => useSoloModeStore.getState().abandonSoloHunt(),
          },
          {
            text: 'Continue',
            onPress: () => router.push('/solo/play'),
          },
        ]
      );
    }
  }, [activeSession, router]);

  const handleTypeSelect = (type: SoloHuntType) => {
    triggerHaptic('light');
    setSelectedType(type);
    setShowCustomOptions(type === 'custom');

    // Apply preset
    const preset = SOLO_HUNT_PRESETS[type];
    if (preset.difficulty) setSelectedDifficulty(preset.difficulty as DifficultyType);
  };

  const handleStartHunt = async () => {
    triggerHaptic('medium');
    clearError();

    const preset = SOLO_HUNT_PRESETS[selectedType];
    const config: SoloHuntConfig = {
      type: selectedType,
      theme: selectedTheme,
      difficulty: selectedDifficulty,
      challengeCount: selectedType === 'custom' ? customChallengeCount : preset.challengeCount!,
      environment: selectedEnvironment,
      duration: selectedType === 'custom' ? customChallengeCount * 3 : preset.duration!,
      useCurrentLocation: useLocation,
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
      locationName,
    };

    const hunt = await startSoloHunt(config);

    if (hunt) {
      triggerHaptic('success');
      router.push('/solo/play');
    }
  };

  // Get personal best for selected type and difficulty
  const personalBest = personalRecords[`${selectedType}_${selectedDifficulty}`];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Solo Mode',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/solo/history')}
              style={styles.headerButton}
            >
              <Ionicons name="time-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSoloHuntsCompleted}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.streakContainer}>
              <Ionicons name="flame" size={20} color={currentDailyStreak > 0 ? Colors.warning : Colors.textTertiary} />
              <Text style={[styles.statValue, currentDailyStreak > 0 && styles.streakActive]}>
                {currentDailyStreak}
              </Text>
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Hunt Type Selection */}
        <Text style={styles.sectionTitle}>Choose Your Hunt</Text>
        <View style={styles.typeGrid}>
          {HUNT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                selectedType === type.id && styles.typeCardSelected,
                { borderColor: selectedType === type.id ? type.color : Colors.border },
              ]}
              onPress={() => handleTypeSelect(type.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                <Ionicons name={type.icon as any} size={28} color={type.color} />
              </View>
              <Text style={styles.typeTitle}>{type.title}</Text>
              <Text style={styles.typeSubtitle}>{type.subtitle}</Text>
              {selectedType === type.id && (
                <View style={[styles.selectedBadge, { backgroundColor: type.color }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme Selection */}
        <Text style={styles.sectionTitle}>Theme</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.themeScroll}
          contentContainerStyle={styles.themeContainer}
        >
          {SOLO_THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeChip,
                selectedTheme === theme.id && styles.themeChipSelected,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedTheme(theme.id);
              }}
            >
              <Ionicons
                name={theme.icon as any}
                size={18}
                color={selectedTheme === theme.id ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.themeLabel,
                  selectedTheme === theme.id && styles.themeLabelSelected,
                ]}
              >
                {theme.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Difficulty Selection */}
        <Text style={styles.sectionTitle}>Difficulty</Text>
        <View style={styles.difficultyContainer}>
          {DIFFICULTIES.map((diff) => (
            <TouchableOpacity
              key={diff.id}
              style={[
                styles.difficultyButton,
                selectedDifficulty === diff.id && styles.difficultyButtonSelected,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedDifficulty(diff.id);
              }}
            >
              <Text
                style={[
                  styles.difficultyLabel,
                  selectedDifficulty === diff.id && styles.difficultyLabelSelected,
                ]}
              >
                {diff.label}
              </Text>
              <Text style={styles.difficultyDescription}>{diff.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Environment Selection */}
        <Text style={styles.sectionTitle}>Environment</Text>
        <View style={styles.environmentContainer}>
          {ENVIRONMENTS.map((env) => (
            <TouchableOpacity
              key={env.id}
              style={[
                styles.envButton,
                selectedEnvironment === env.id && styles.envButtonSelected,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedEnvironment(env.id);
              }}
            >
              <Ionicons
                name={env.icon as any}
                size={20}
                color={selectedEnvironment === env.id ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.envLabel,
                  selectedEnvironment === env.id && styles.envLabelSelected,
                ]}
              >
                {env.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Options */}
        {showCustomOptions && (
          <Card style={styles.customCard}>
            <Text style={styles.customTitle}>Custom Options</Text>
            <View style={styles.customRow}>
              <Text style={styles.customLabel}>Challenges</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setCustomChallengeCount((c) => Math.max(3, c - 1))}
                >
                  <Ionicons name="remove" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{customChallengeCount}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setCustomChallengeCount((c) => Math.min(20, c + 1))}
                >
                  <Ionicons name="add" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}

        {/* Location Toggle */}
        <TouchableOpacity
          style={styles.locationToggle}
          onPress={() => setUseLocation(!useLocation)}
        >
          <View style={styles.locationInfo}>
            <Ionicons
              name={useLocation ? 'location' : 'location-outline'}
              size={20}
              color={useLocation ? Colors.success : Colors.textSecondary}
            />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>
                {useLocation ? 'Using your location' : 'Location disabled'}
              </Text>
              {useLocation && locationName && (
                <Text style={styles.locationName}>{locationName}</Text>
              )}
            </View>
          </View>
          <View style={[styles.toggle, useLocation && styles.toggleActive]}>
            <View style={[styles.toggleKnob, useLocation && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>

        {/* Personal Best */}
        {personalBest && (
          <Card style={styles.personalBestCard}>
            <View style={styles.pbHeader}>
              <Ionicons name="medal" size={20} color={Colors.warning} />
              <Text style={styles.pbTitle}>Personal Best</Text>
            </View>
            <View style={styles.pbStats}>
              <View style={styles.pbStat}>
                <Text style={styles.pbValue}>{personalBest.bestScore}</Text>
                <Text style={styles.pbLabel}>Score</Text>
              </View>
              <View style={styles.pbStat}>
                <Text style={styles.pbValue}>
                  {Math.floor(personalBest.bestTime / 60)}:{(personalBest.bestTime % 60).toString().padStart(2, '0')}
                </Text>
                <Text style={styles.pbLabel}>Time</Text>
              </View>
              <View style={styles.pbStat}>
                <Text style={styles.pbValue}>{personalBest.bestStreak}x</Text>
                <Text style={styles.pbLabel}>Streak</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Start Button */}
        <Button
          title={isGenerating ? 'Generating Hunt...' : 'Start Solo Hunt'}
          onPress={handleStartHunt}
          disabled={isGenerating}
          style={styles.startButton}
          icon={
            isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="play" size={20} color="#fff" />
            )
          }
        />

        <Text style={styles.disclaimer}>
          AI generates unique challenges based on your settings
        </Text>
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
    paddingBottom: Spacing.xxl,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  streakActive: {
    color: Colors.warning,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  typeCardSelected: {
    backgroundColor: Colors.surface,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  typeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  typeSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeScroll: {
    marginHorizontal: -Spacing.md,
  },
  themeContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  themeChipSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  themeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  themeLabelSelected: {
    color: Colors.primary,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  difficultyButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  difficultyLabel: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  difficultyLabelSelected: {
    color: Colors.primary,
  },
  difficultyDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  environmentContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  envButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  envButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  envLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  envLabelSelected: {
    color: Colors.primary,
  },
  customCard: {
    marginTop: Spacing.md,
  },
  customTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  locationName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: Colors.success,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  personalBestCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.warning + '10',
    borderColor: Colors.warning,
    borderWidth: 1,
  },
  pbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pbTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.warning,
  },
  pbStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pbStat: {
    alignItems: 'center',
  },
  pbValue: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  pbLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  startButton: {
    marginTop: Spacing.xl,
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
