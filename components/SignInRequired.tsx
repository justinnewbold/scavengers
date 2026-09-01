import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

interface SignInRequiredProps {
  title?: string;
  message?: string;
}

/**
 * In-place sign-in prompt for tab screens.
 *
 * Tabs used to call `useRequireAuth()`, which does `router.replace` to the
 * login screen - that replaces the whole `(tabs)` entry, so the tab bar
 * disappeared and login (a modal route) arrived with no way back. Rendering
 * this instead keeps the user inside the tab they tapped.
 */
export function SignInRequired({
  title = 'Sign in to continue',
  message = 'Sign in or create a free account to use this feature.',
}: SignInRequiredProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={64} color={Colors.textTertiary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{message}</Text>
      <Button
        title="Sign In"
        onPress={() => router.push('/auth/login')}
        style={styles.button}
      />
      <Button
        title="Create Account"
        onPress={() => router.push('/auth/register')}
        variant="outline"
        style={styles.button}
      />
    </View>
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
    marginTop: Spacing.sm,
  },
});

export default SignInRequired;
