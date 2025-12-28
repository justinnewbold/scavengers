import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '@/components';
import { useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes, AppConfig } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };
  
  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="person-circle-outline" size={80} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>Welcome to Scavengers!</Text>
        <Text style={styles.authText}>
          Sign in to track your hunts, save progress, and compete with friends.
        </Text>
        <Button
          title="Sign In"
          onPress={() => router.push('/auth/login')}
          style={styles.authButton}
        />
        <Button
          title="Create Account"
          onPress={() => router.push('/auth/register')}
          variant="outline"
          style={styles.authButton}
        />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Created</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Played</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Points</Text>
        </Card>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discover</Text>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/marketplace')}>
          <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>Hunt Marketplace</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/gallery')}>
          <Ionicons name="images-outline" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>Photo Gallery</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/achievements')}>
          <Ionicons name="trophy-outline" size={22} color={Colors.warning} />
          <Text style={styles.menuText}>Achievements</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/teams')}>
          <Ionicons name="people-outline" size={22} color={Colors.success} />
          <Text style={styles.menuText}>Teams</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>

        <Card variant="default" style={styles.menuCard} onTouchEnd={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <Card variant="default" style={styles.menuCard}>
          <Ionicons name="help-circle-outline" size={22} color={Colors.text} />
          <Text style={styles.menuText}>Help & Support</Text>
        </Card>

        <Card variant="default" style={styles.menuCard}>
          <Ionicons name="document-text-outline" size={22} color={Colors.text} />
          <Text style={styles.menuText}>Terms of Service</Text>
        </Card>

        <Card variant="default" style={styles.menuCard}>
          <Ionicons name="shield-outline" size={22} color={Colors.text} />
          <Text style={styles.menuText}>Privacy Policy</Text>
        </Card>
      </View>
      
      <Button
        title="Sign Out"
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
