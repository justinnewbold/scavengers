import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HuntCard, Button, DiscoverSkeleton, HuntCardSkeleton } from '@/components';
import { useHuntStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useI18n } from '@/hooks/useI18n';

export default function DiscoverScreen() {
  const router = useRouter();
  const { publicHunts, isLoading, fetchPublicHunts } = useHuntStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    fetchPublicHunts().finally(() => setHasLoaded(true));
  }, []);

  // Show full skeleton on initial load
  if (!hasLoaded && isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DiscoverSkeleton />
      </ScrollView>
    );
  }
  
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
          {t('home.subtitleFull')}
        </Text>

        <View style={styles.heroButtons}>
          <Button
            title={t('home.soloMode')}
            onPress={() => router.push('/solo')}
            variant="outline"
            style={styles.heroButtonHalf}
            icon={<Ionicons name="person" size={18} color={Colors.primary} />}
          />
          <Button
            title={t('home.createHunt')}
            onPress={() => router.push('/hunt/ai-create')}
            style={styles.heroButtonHalf}
            icon={<Ionicons name="sparkles" size={18} color="#fff" />}
          />
        </View>
      </View>

      {/* Solo Mode Promo Card */}
      <View style={styles.soloPromo}>
        <View style={styles.soloPromoContent}>
          <View style={styles.soloPromoIcon}>
            <Ionicons name="flash" size={24} color={Colors.warning} />
          </View>
          <View style={styles.soloPromoText}>
            <Text style={styles.soloPromoTitle}>{t('home.playSolo')}</Text>
            <Text style={styles.soloPromoSubtitle}>
              {t('home.playSoloSubtitle')}
            </Text>
          </View>
        </View>
        <Button
          title={t('home.start')}
          size="sm"
          onPress={() => router.push('/solo')}
          style={styles.soloPromoButton}
        />
      </View>
      
      {/* Quick Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{publicHunts.length}</Text>
          <Text style={styles.statLabel}>{t('home.publicHunts')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>Free</Text>
          <Text style={styles.statLabel}>{t('home.upTo15Players')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>🔒</Text>
          <Text style={styles.statLabel}>{t('home.worksOffline')}</Text>
        </View>
      </View>
      
      {/* Public Hunts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.discoverHunts')}</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} />
        </View>
        
        {publicHunts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>{t('home.noPublicHunts')}</Text>
            <Text style={styles.emptySubtext}>{t('home.beFirstToCreate')}</Text>
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
        <Text style={styles.sectionTitle}>{t('home.whyScavengers')}</Text>
        
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="sparkles" size={24} color={Colors.primary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t('home.aiPoweredCreation')}</Text>
            <Text style={styles.featureText}>
              {t('home.aiPoweredDesc')}
            </Text>
          </View>
        </View>
        
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="camera" size={24} color={Colors.secondary} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t('home.smartVerification')}</Text>
            <Text style={styles.featureText}>
              {t('home.smartVerificationDesc')}
            </Text>
          </View>
        </View>
        
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Ionicons name="wallet-outline" size={24} color={Colors.success} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{t('home.affordableAndFair')}</Text>
            <Text style={styles.featureText}>
              {t('home.affordableDesc')}
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
  heroButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  heroButtonHalf: {
    flex: 1,
  },
  soloPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warning + '15',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  soloPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  soloPromoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warning + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  soloPromoText: {
    flex: 1,
  },
  soloPromoTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  soloPromoSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  soloPromoButton: {
    minWidth: 70,
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
