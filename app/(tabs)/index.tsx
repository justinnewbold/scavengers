import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HuntCard, Button } from '@/components';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function DiscoverScreen() {
  const router = useRouter();
  const { publicHunts, isLoading, fetchPublicHunts } = useHuntStore();
  
  useEffect(() => {
    fetchPublicHunts();
  }, [fetchPublicHunts]);
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchPublicHunts}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>🎯 Scavengers</Text>
        <Text style={styles.heroSubtitle}>
          AI-Powered Scavenger Hunts{'\n'}Free • Offline • Fun
        </Text>
        
        <Button
          title="Create with AI ✨"
          onPress={() => router.push('/hunt/ai-create')}
          size="lg"
          style={styles.heroButton}
        />
      </View>
      
      {/* Quick Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{publicHunts.length}</Text>
          <Text style={styles.statLabel}>Public Hunts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>Free</Text>
          <Text style={styles.statLabel}>Up to 15 players</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>🔒</Text>
          <Text style={styles.statLabel}>Works Offline</Text>
        </View>
      </View>
      
      {/* Public Hunts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discover Hunts</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} />
        </View>
        
        {publicHunts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No public hunts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to create one!</Text>
          </View>
        ) : (
          publicHunts.map((hunt) => (
            <HuntCard
              key={hunt.id}
              hunt={hunt}
              onPress={() => router.push(`/hunt/${hunt.id}`)}
            />
          ))
        )}
      </View>
      
      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Scavengers?</Text>
        
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="sparkles" size={24} color={Colors.primary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI-Powered Creation</Text>
            <Text style={styles.featureText}>
              Generate complete hunts in seconds with Google Gemini AI
            </Text>
          </View>
        </View>
        
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="camera" size={24} color={Colors.secondary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Smart Verification</Text>
            <Text style={styles.featureText}>
              Photo AI, GPS, QR codes - multiple ways to verify challenges
            </Text>
          </View>
        </View>
        
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="wallet-outline" size={24} color={Colors.success} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Affordable & Fair</Text>
            <Text style={styles.featureText}>
              Free for small groups, $4.99/mo for unlimited - no ads ever
            </Text>
          </View>
        </View>
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
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  heroButton: {
    minWidth: 200,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
