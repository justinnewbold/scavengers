import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function CreateScreen() {
  const router = useRouter();
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create a Hunt</Text>
      <Text style={styles.subtitle}>
        Choose how you want to create your scavenger hunt
      </Text>
      
      {/* AI Quick Create */}
      <Card variant="elevated" style={styles.optionCard}>
        <View style={styles.optionIcon}>
          <Ionicons name="sparkles" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.optionTitle}>AI Quick Create ✨</Text>
        <Text style={styles.optionText}>
          Let AI generate a complete scavenger hunt in seconds. Just describe your theme and we'll do the rest!
        </Text>
        <View style={styles.optionFeatures}>
          <Text style={styles.feature}>⚡ Generate in 30 seconds</Text>
          <Text style={styles.feature}>🎯 Smart challenge creation</Text>
          <Text style={styles.feature}>📍 Location-aware suggestions</Text>
        </View>
        <Button
          title="Create with AI"
          onPress={() => router.push('/hunt/ai-create')}
          style={styles.optionButton}
        />
      </Card>
      
      {/* Manual Create */}
      <Card variant="outlined" style={styles.optionCard}>
        <View style={styles.optionIcon}>
          <Ionicons name="create-outline" size={32} color={Colors.secondary} />
        </View>
        <Text style={styles.optionTitle}>Manual Create</Text>
        <Text style={styles.optionText}>
          Design every detail yourself. Perfect for custom hunts with specific locations and challenges.
        </Text>
        <View style={styles.optionFeatures}>
          <Text style={styles.feature}>🎨 Full creative control</Text>
          <Text style={styles.feature}>📸 Custom verification</Text>
          <Text style={styles.feature}>🗺️ Precise GPS points</Text>
        </View>
        <Button
          title="Create Manually"
          onPress={() => router.push('/hunt/create')}
          variant="outline"
          style={styles.optionButton}
        />
      </Card>
      
      {/* Templates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Templates</Text>
        
        <Card 
          variant="default" 
          style={styles.templateCard}
          onPress={() => router.push({
            pathname: '/hunt/ai-create',
            params: { template: 'birthday' }
          })}
        >
          <Text style={styles.templateEmoji}>🎂</Text>
          <View style={styles.templateContent}>
            <Text style={styles.templateTitle}>Birthday Party</Text>
            <Text style={styles.templateText}>Fun party games for all ages</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
        
        <Card 
          variant="default" 
          style={styles.templateCard}
          onPress={() => router.push({
            pathname: '/hunt/ai-create',
            params: { template: 'nature' }
          })}
        >
          <Text style={styles.templateEmoji}>🌲</Text>
          <View style={styles.templateContent}>
            <Text style={styles.templateTitle}>Nature Explorer</Text>
            <Text style={styles.templateText}>Outdoor adventure challenges</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
        
        <Card 
          variant="default" 
          style={styles.templateCard}
          onPress={() => router.push({
            pathname: '/hunt/ai-create',
            params: { template: 'city' }
          })}
        >
          <Text style={styles.templateEmoji}>🏙️</Text>
          <View style={styles.templateContent}>
            <Text style={styles.templateTitle}>City Explorer</Text>
            <Text style={styles.templateText}>Urban discovery challenges</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
        
        <Card 
          variant="default" 
          style={styles.templateCard}
          onPress={() => router.push({
            pathname: '/hunt/ai-create',
            params: { template: 'team' }
          })}
        >
          <Text style={styles.templateEmoji}>👥</Text>
          <View style={styles.templateContent}>
            <Text style={styles.templateTitle}>Team Building</Text>
            <Text style={styles.templateText}>Corporate & group activities</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  optionCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  optionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  optionText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  optionFeatures: {
    marginBottom: Spacing.lg,
  },
  feature: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  optionButton: {
    width: '100%',
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  templateEmoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  templateText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
