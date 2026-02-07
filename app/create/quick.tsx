import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useTemplateStore } from '@/store/templateStore';
import { HUNT_TEMPLATES, type HuntTemplate, type TemplateCategory } from '@/types/templates';
import * as Location from 'expo-location';

const CATEGORIES: { key: TemplateCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'birthday', label: 'Birthday', icon: 'balloon' },
  { key: 'team_building', label: 'Team', icon: 'people' },
  { key: 'tourist', label: 'Tourist', icon: 'camera' },
  { key: 'date_night', label: 'Date', icon: 'heart' },
  { key: 'kids', label: 'Kids', icon: 'happy' },
  { key: 'fitness', label: 'Fitness', icon: 'fitness' },
];

export default function QuickCreateScreen() {
  const [step, setStep] = useState<'template' | 'configure' | 'preview'>('template');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<HuntTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [challengeCount, setChallengeCount] = useState(8);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [customTheme, setCustomTheme] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);

  const { isGenerating, generatedHunt, generateHunt, saveGeneratedHunt, clearGenerated, error } = useTemplateStore();

  const filteredTemplates = selectedCategory === 'all'
    ? HUNT_TEMPLATES
    : HUNT_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: HuntTemplate) => {
    setSelectedTemplate(template);
    setTitle(`${template.name} Hunt`);
    setDuration(template.defaultDuration);
    setChallengeCount(template.suggestedChallengeCount);
    setDifficulty(template.defaultDifficulty);
    setStep('configure');
  };

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to create location-based hunts');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: address ? `${address.city || address.region}, ${address.country}` : undefined,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !location) {
      Alert.alert('Missing info', 'Please select your location first');
      return;
    }

    const result = await generateHunt({
      templateId: selectedTemplate.id,
      title,
      location,
      duration,
      difficulty,
      challengeCount,
      customTheme: customTheme || undefined,
      includePhotoChallenges: true,
      includeLocationChallenges: selectedTemplate.indoorOutdoor !== 'indoor',
    });

    if (result) {
      setStep('preview');
    }
  };

  const handleSave = async () => {
    const huntId = await saveGeneratedHunt();
    if (huntId) {
      Alert.alert('Success', 'Hunt created successfully!', [
        { text: 'View Hunt', onPress: () => router.replace(`/hunt/${huntId}`) },
        { text: 'Create Another', onPress: () => {
          clearGenerated();
          setStep('template');
          setSelectedTemplate(null);
        }},
      ]);
    }
  };

  const renderTemplateSelection = () => (
    <>
      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Ionicons
              name={cat.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={selectedCategory === cat.key ? '#fff' : Colors.textSecondary}
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === cat.key && styles.categoryTextActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Template grid */}
      <View style={styles.templateGrid}>
        {filteredTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => handleSelectTemplate(template)}
          >
            <View style={[styles.templateIcon, { backgroundColor: template.color + '20' }]}>
              <Ionicons
                name={template.icon as keyof typeof Ionicons.glyphMap}
                size={32}
                color={template.color}
              />
            </View>
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateDesc} numberOfLines={2}>
              {template.description}
            </Text>
            <View style={styles.templateMeta}>
              <Text style={styles.templateMetaText}>
                ~{template.defaultDuration}min
              </Text>
              <Text style={styles.templateMetaText}>
                {template.suggestedChallengeCount} challenges
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderConfiguration = () => (
    <View style={styles.configContainer}>
      <Card style={styles.configCard}>
        <Text style={styles.configLabel}>Hunt Title</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter hunt title"
          placeholderTextColor={Colors.textTertiary}
          maxLength={100}
        />
      </Card>

      <Card style={styles.configCard}>
        <Text style={styles.configLabel}>Location</Text>
        {location ? (
          <View style={styles.locationDisplay}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.locationText}>
              {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
            </Text>
            <TouchableOpacity onPress={handleGetLocation}>
              <Ionicons name="refresh" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            title="Get Current Location"
            variant="outline"
            onPress={handleGetLocation}
            icon={<Ionicons name="locate" size={18} color={Colors.primary} />}
          />
        )}
      </Card>

      <Card style={styles.configCard}>
        <View style={styles.sliderHeader}>
          <Text style={styles.configLabel}>Duration</Text>
          <Text style={styles.sliderValue}>{duration} min</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => setDuration(Math.max(15, duration - 15))}
          >
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.stepperTrack}>
            <View style={[styles.stepperFill, { width: `${((duration - 15) / 165) * 100}%` }]} />
          </View>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => setDuration(Math.min(180, duration + 15))}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.configCard}>
        <View style={styles.sliderHeader}>
          <Text style={styles.configLabel}>Challenges</Text>
          <Text style={styles.sliderValue}>{challengeCount}</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => setChallengeCount(Math.max(3, challengeCount - 1))}
          >
            <Ionicons name="remove" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.stepperTrack}>
            <View style={[styles.stepperFill, { width: `${((challengeCount - 3) / 17) * 100}%` }]} />
          </View>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => setChallengeCount(Math.min(20, challengeCount + 1))}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.configCard}>
        <Text style={styles.configLabel}>Difficulty</Text>
        <View style={styles.difficultyRow}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.difficultyButton,
                difficulty === d && styles.difficultyButtonActive,
              ]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={[
                styles.difficultyText,
                difficulty === d && styles.difficultyTextActive,
              ]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.configCard}>
        <Text style={styles.configLabel}>Custom Theme (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={customTheme}
          onChangeText={setCustomTheme}
          placeholder="e.g., 'Harry Potter', 'Sports', 'Art'"
          placeholderTextColor={Colors.textTertiary}
          maxLength={200}
        />
      </Card>

      <Button
        title={isGenerating ? 'Generating...' : 'Generate Hunt'}
        onPress={handleGenerate}
        disabled={isGenerating || !location}
        style={styles.generateButton}
        icon={isGenerating ? <ActivityIndicator color="#fff" size="small" /> : undefined}
      />
    </View>
  );

  const renderPreview = () => {
    if (!generatedHunt) return null;

    return (
      <View style={styles.previewContainer}>
        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>{generatedHunt.title}</Text>
          <Text style={styles.previewDesc}>{generatedHunt.description}</Text>

          <View style={styles.previewMeta}>
            <View style={styles.previewMetaItem}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.previewMetaText}>{generatedHunt.estimatedDuration} min</Text>
            </View>
            <View style={styles.previewMetaItem}>
              <Ionicons name="list-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.previewMetaText}>{generatedHunt.challenges.length} challenges</Text>
            </View>
            <View style={styles.previewMetaItem}>
              <Ionicons name="speedometer-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.previewMetaText}>{generatedHunt.difficulty}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Challenges</Text>
        {generatedHunt.challenges.map((challenge, index) => (
          <Card key={index} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeNumber}>
                <Text style={styles.challengeNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengePoints}>{challenge.points} pts</Text>
              </View>
            </View>
            <Text style={styles.challengeDesc}>{challenge.description}</Text>
            <View style={styles.challengeType}>
              <Ionicons
                name={challenge.verificationType === 'photo' ? 'camera' : 'location'}
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.challengeTypeText}>{challenge.verificationType}</Text>
            </View>
          </Card>
        ))}

        <View style={styles.previewActions}>
          <Button
            title="Edit"
            variant="outline"
            onPress={() => setStep('configure')}
            style={styles.editButton}
          />
          <Button
            title="Save Hunt"
            onPress={handleSave}
            style={styles.saveButton}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: step === 'template' ? 'Choose Template' : step === 'configure' ? 'Configure' : 'Preview',
          headerLeft: step !== 'template' ? () => (
            <TouchableOpacity onPress={() => setStep(step === 'preview' ? 'configure' : 'template')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
        {step === 'template' && renderTemplateSelection()}
        {step === 'configure' && renderConfiguration()}
        {step === 'preview' && renderPreview()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  categoryContainer: {
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
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
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  templateCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  templateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  templateName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  templateMetaText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  configContainer: {
    gap: Spacing.md,
  },
  configCard: {
    padding: Spacing.md,
  },
  configLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: 8,
  },
  locationText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stepperFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  difficultyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  difficultyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  difficultyTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  generateButton: {
    marginTop: Spacing.md,
  },
  previewContainer: {
    gap: Spacing.md,
  },
  previewCard: {
    padding: Spacing.md,
  },
  previewTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  previewDesc: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  previewMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  challengeCard: {
    padding: Spacing.md,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  challengeNumberText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  challengeInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  challengePoints: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  challengeDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  challengeType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeTypeText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  editButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
