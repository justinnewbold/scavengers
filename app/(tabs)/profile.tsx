import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes, AppConfig } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRequireAuth } from '@/hooks';
import { useI18n } from '@/hooks/useI18n';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://scavengers.newbold.cloud/api';

interface UserStats {
  huntsCreated: number;
  huntsPlayed: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  useRequireAuth();
  const { t } = useI18n();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE}/auth/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch stats:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoadingStats(true);
      fetchStats().finally(() => setIsLoadingStats(false));
    }
  }, [user, fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('auth.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.signOut'), style: 'destructive', onPress: logout },
      ]
    );
  };
  
  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="person-circle-outline" size={80} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>{t('profile.welcomeTitle')}</Text>
        <Text style={styles.authText}>
          {t('profile.welcomeText')}
        </Text>
        <Button
          title={t('auth.signIn')}
          onPress={() => router.push('/auth/login')}
          style={styles.authButton}
        />
        <Button
          title={t('auth.signUp')}
          onPress={() => router.push('/auth/register')}
          variant="outline"
          style={styles.authButton}
        />
      </View>
    );
  }
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.display_name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user.display_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
      
      
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          {isLoadingStats ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{stats?.huntsCreated ?? 0}</Text>
          )}
          <Text style={styles.statLabel}>{t('profile.created')}</Text>
        </Card>
        <Card style={styles.statCard}>
          {isLoadingStats ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{stats?.huntsPlayed ?? 0}</Text>
          )}
          <Text style={styles.statLabel}>{t('profile.played')}</Text>
        </Card>
        <Card style={styles.statCard}>
          {isLoadingStats ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{stats?.totalPoints ?? 0}</Text>
          )}
          <Text style={styles.statLabel}>{t('profile.points')}</Text>
        </Card>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.discover')}</Text>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/marketplace')}>
          <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>{t('profile.huntMarketplace')}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.features')}</Text>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/gallery')}>
          <Ionicons name="images-outline" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>{t('profile.photoGallery')}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/achievements')}>
          <Ionicons name="trophy-outline" size={22} color={Colors.warning} />
          <Text style={styles.menuText}>{t('profile.achievements')}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/teams')}>
          <Ionicons name="people-outline" size={22} color={Colors.success} />
          <Text style={styles.menuText}>{t('teams.title')}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>{t('profile.settings')}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.account')}</Text>

        <Card variant="default" style={styles.menuCard}>
          <Ionicons name="help-circle-outline" size={22} color={Colors.text} />
          <Text style={styles.menuText}>{t('profile.helpSupport')}</Text>
        </Card>

        <Card variant="default" style={styles.menuCard}>
          <Ionicons name="document-text-outline" size={22} color={Colors.text} />
          <Text style={styles.menuText}>{t('profile.termsOfService')}</Text>
        </Card>

        <Card variant="default" style={styles.menuCard}>
          <Ionicons name="shield-outline" size={22} color={Colors.text} />
          <Text style={styles.menuText}>{t('profile.privacyPolicy')}</Text>
        </Card>
      </View>
      
      <Button
        title={t('auth.signOut')}
        onPress={handleSignOut}
        variant="ghost"
        style={styles.signOutButton}
        textStyle={styles.signOutText}
      />
      
      <Text style={styles.version}>Version {AppConfig.version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.text },
  name: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  email: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statNumber: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: Spacing.xs },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  menuText: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  signOutButton: { marginTop: Spacing.lg },
  signOutText: { color: Colors.error },
  version: { textAlign: 'center', color: Colors.textTertiary, fontSize: FontSizes.xs, marginTop: Spacing.lg },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  authTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  authText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  authButton: { minWidth: 200, marginBottom: Spacing.md },
});
