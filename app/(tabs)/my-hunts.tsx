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
import { useHuntStore, useAuthStore } from '@/store';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function MyHuntsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myHunts, isLoading, fetchMyHunts } = useHuntStore();
  
  useEffect(() => {
    if (user) {
      fetchMyHunts();
    }
  }, [user]);
  
  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="lock-closed-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.authTitle}>Sign in to view your hunts</Text>
        <Text style={styles.authText}>
          Create and manage your scavenger hunts by signing in
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchMyHunts}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Hunts</Text>
        <Button
          title="+ New"
          onPress={() => router.push('/hunt/create')}
          size="sm"
        />
      </View>
      
      {myHunts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No hunts yet</Text>
          <Text style={styles.emptyText}>
            Create your first scavenger hunt and share it with friends!
          </Text>
          <Button
            title="Create Hunt"
            onPress={() => router.push('/hunt/create')}
            style={styles.emptyButton}
          />
          <Button
            title="AI Quick Create ✨"
            onPress={() => router.push('/hunt/ai-create')}
            variant="outline"
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <>
          {/* Active Hunts */}
          {myHunts.filter(h => h.status === 'active').length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🟢 Active</Text>
              {myHunts
                .filter(h => h.status === 'active')
                .map((hunt) => (
                  <HuntCard
                    key={hunt.id}
                    hunt={hunt}
                    onPress={() => router.push(`/hunt/${hunt.id}`)}
                  />
                ))}
            </View>
          )}
          
          {/* Draft Hunts */}
          {myHunts.filter(h => h.status === 'draft').length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Drafts</Text>
              {myHunts
                .filter(h => h.status === 'draft')
                .map((hunt) => (
                  <HuntCard
                    key={hunt.id}
                    hunt={hunt}
                    onPress={() => router.push(`/hunt/${hunt.id}`)}
                  />
                ))}
            </View>
          )}
          
          {/* Completed Hunts */}
          {myHunts.filter(h => h.status === 'completed').length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Completed</Text>
              {myHunts
                .filter(h => h.status === 'completed')
                .map((hunt) => (
                  <HuntCard
                    key={hunt.id}
                    hunt={hunt}
                    onPress={() => router.push(`/hunt/${hunt.id}`)}
                  />
                ))}
            </View>
          )}
        </>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  emptyButton: {
    minWidth: 200,
    marginBottom: Spacing.md,
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  authTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  authText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  authButton: {
    minWidth: 200,
    marginBottom: Spacing.md,
  },
});
