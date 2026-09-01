import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

/**
 * Shown for any route that does not resolve - most often a shared link that
 * points somewhere the app cannot open. Without this, expo-router falls back
 * to its bare "Unmatched Route" screen, which offers no way back.
 */
export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.title}>We couldn&apos;t find that</Text>
        <Text style={styles.text}>
          This link may be out of date, or the hunt may have been removed.
        </Text>
        <Button
          title="Go to Discover"
          onPress={() => router.replace('/(tabs)')}
          style={styles.button}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  text: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
    maxWidth: 320,
  },
});
