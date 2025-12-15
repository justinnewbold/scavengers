import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Card } from '@/components';
import { gemini } from '@/lib/gemini';
import { db } from '@/lib/supabase';
import { useAuthStore, useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import type { AIGenerationRequest } from '@/types';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
] as const;

const TEMPLATES: Record<string, Partial<AIGenerationRequest>> = {
  birthday: { theme: 'Birthday Party scavenger hunt with party games and decorations', difficulty: 'easy', challenge_count: 10 },
  nature: { theme: 'Nature exploration and wildlife discovery', difficulty: 'medium', challenge_count: 12 },
  city: { theme: 'Urban exploration and city landmarks discovery', difficulty: 'medium', challenge_count: 15 },
  team: { theme: 'Team building activities and collaborative challenges', difficulty: 'medium', challenge_count: 10 },
};

export default function AICreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ template?: string }>();
  const { user } = useAuthStore();
  const { setCurrentHunt } = useHuntStore();
  
  const template = params.template ? TEMPLATES[params.template] : null;
  
  const [theme, setTheme] = useState(template?.theme || '');
  const [location, setLocation] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(template?.difficulty || 'medium');
  const [challengeCount, setChallengeCount] = useState(String(template?.challenge_count || 10));
  const [includePhoto, setIncludePhoto] = useState(true);
  const [includeGPS, setIncludeGPS] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = async () => {
    if (!theme.trim()) {
      Alert.alert('Missing Theme', 'Please describe your scavenger hunt theme');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const request: AIGenerationRequest = {
        theme: theme.trim(),
        location: location.trim() || undefined,
        difficulty,
        challenge_count: parseInt(challengeCount) || 10,
        include_photo_challenges: includePhoto,
        include_gps_challenges: includeGPS,
      };
      
      const generated = await gemini.generateHunt(request);
      
      if (user) {
        const { data: hunt, error } = await db.hunts.create({
          title: generated.title,
          description: generated.description,
          creator_id: user.id,
          is_public: false,
          max_participants: 15,
          status: 'draft',
          settings: {
            allow_hints: true,
            points_for_hints: 5,
            require_photo_verification: includePhoto,
            allow_team_play: false,
            shuffle_challenges: false,
          },
        });
        
        if (error) throw error;
        
        if (hunt) {
          const challenges = generated.challenges.map((c, index) => ({
            hunt_id: hunt.id,
            title: c.title,
            description: c.description,
            points: c.points,
            order_index: index,
            verification_type: c.verification_type,
            verification_data: c.verification_data,
            hint: c.hint,
          }));
          
          await db.challenges.createBulk(challenges);
          
          const fullHunt = await db.hunts.getById(hunt.id);
          if (fullHunt.data) {
            setCurrentHunt(fullHunt.data);
            router.replace(`/hunt/${hunt.id}`);
          }
        }
      } else {
        Alert.alert(
          'Hunt Generated!',
          `"${generated.title}" with ${generated.challenges.length} challenges. Sign in to save it!`,
          [
            { text: 'Sign In', onPress: () => router.push('/auth/login') },
            { text: 'OK' },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'Please try again');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={48} color={Colors.primary} />
        <Text style={styles.title}>AI Quick Create</Text>
        <Text style={styles.subtitle}>
          Describe your perfect hunt and let AI do the rest
        </Text>
      </View>
      
      <Input
        label="Theme *"
        placeholder="e.g., Birthday party, Nature walk, City exploration..."
        value={theme}
        onChangeText={setTheme}
        multiline
        numberOfLines={3}
        style={styles.themeInput}
      />
      
      <Input
        label="Location (optional)"
        placeholder="e.g., Central Park, Downtown, Beach..."
        value={location}
        onChangeText={setLocation}
      />
      
      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.optionsRow}>
        {DIFFICULTY_OPTIONS.map((opt) => (
          <Card
            key={opt.value}
            variant={difficulty === opt.value ? 'elevated' : 'outlined'}
            style={[styles.optionCard, difficulty === opt.value && styles.optionSelected]}
            onPress={() => setDifficulty(opt.value)}
          >
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <Text style={styles.optionLabel}>{opt.label}</Text>
          </Card>
        ))}
      </View>
      
      <Input
        label="Number of Challenges"
        placeholder="10"
        value={challengeCount}
        onChangeText={setChallengeCount}
        keyboardType="number-pad"
        helper="Recommended: 8-15 challenges"
      />
      
      <Text style={styles.label}>Verification Types</Text>
      <View style={styles.togglesRow}>
        <Card
          variant={includePhoto ? 'elevated' : 'outlined'}
          style={[styles.toggleCard, includePhoto && styles.toggleSelected]}
          onPress={() => setIncludePhoto(!includePhoto)}
        >
          <Ionicons name="camera" size={24} color={includePhoto ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.toggleLabel, includePhoto && styles.toggleLabelActive]}>
            Photo Challenges
          </Text>
        </Card>
        
        <Card
          variant={includeGPS ? 'elevated' : 'outlined'}
          style={[styles.toggleCard, includeGPS && styles.toggleSelected]}
          onPress={() => setIncludeGPS(!includeGPS)}
        >
          <Ionicons name="location" size={24} color={includeGPS ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.toggleLabel, includeGPS && styles.toggleLabelActive]}>
            GPS Challenges
          </Text>
        </Card>
      </View>
      
      <Button
        title={isGenerating ? 'Generating...' : 'Generate Hunt ✨'}
        onPress={handleGenerate}
        loading={isGenerating}
        disabled={isGenerating || !theme.trim()}
        size="lg"
        style={styles.generateButton}
      />
      
      <Text style={styles.disclaimer}>
        Powered by Google Gemini AI. Generation typically takes 10-30 seconds.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
  themeInput: { minHeight: 80, textAlignVertical: 'top' },
  label: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  optionsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  optionCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  optionSelected: { borderColor: Colors.primary, borderWidth: 2 },
  optionEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  optionLabel: { fontSize: FontSizes.sm, color: Colors.text },
  togglesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  toggleCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  toggleSelected: { borderColor: Colors.primary, borderWidth: 2 },
  toggleLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  toggleLabelActive: { color: Colors.text },
  generateButton: { marginTop: Spacing.lg },
  disclaimer: { fontSize: FontSizes.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg },
});
