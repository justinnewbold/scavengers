import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store';
import { Colors } from '@/constants/theme';
import { ErrorBoundary, OfflineIndicator } from '@/components';
import { initSentry, setUser } from '@/lib/sentry';
import { i18n } from '@/lib/i18n';

// Initialize Sentry as early as possible
initSentry();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, isInitialized, user } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function setup() {
      try {
        await i18n.initialize();
        await initialize();

        // Check if onboarding has been completed
        const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
        setShowOnboarding(onboardingComplete !== 'true');
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    setup();
  }, []);

  // Navigate to onboarding when ready and needed
  useEffect(() => {
    if (!isInitialized || showOnboarding === null) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (showOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [isInitialized, showOnboarding, segments]);

  // Update Sentry user context when user changes
  useEffect(() => {
    if (user) {
      setUser({ id: user.id, email: user.email, username: user.display_name });
    } else {
      setUser(null);
    }
  }, [user]);
  
  if (!isInitialized || showOnboarding === null) {
    return <View style={styles.loading} />;
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="light" />
        <OfflineIndicator />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: Colors.background,
            },
          }}
        >
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false,
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="hunt/[id]"
            options={{
              title: 'Hunt Details',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="hunt/create"
            options={{
              title: 'Create Hunt',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="hunt/ai-create"
            options={{
              title: 'AI Quick Create',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              title: 'Sign In',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="auth/register"
            options={{
              title: 'Create Account',
              presentation: 'modal',
            }}
          />
        </Stack>
      </View>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
