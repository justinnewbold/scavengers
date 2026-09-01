import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useDeepLinks } from '@/hooks';
import { Colors } from '@/constants/theme';
import { ErrorBoundary, OfflineIndicator } from '@/components';
import { ToastContainer } from '@/components/Toast';
import { initSentry, setUser } from '@/lib/sentry';
import { i18n } from '@/lib/i18n';

// Initialize Sentry as early as possible
initSentry();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Activates deep-link handling. useDeepLinks was exported but never called by
 * any screen, so shared links did nothing. Mounted only once the app is ready,
 * so an incoming link is not immediately clobbered by the onboarding redirect.
 */
function DeepLinkHandler() {
  useDeepLinks();
  return null;
}

export default function RootLayout() {
  const { initialize, isInitialized, user } = useAuthStore();
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const isOnboardingHydrated = useOnboardingStore((s) => s.isHydrated);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function setup() {
      try {
        await i18n.initialize();
        await initialize();

        // Migrate the pre-store flag so users who already finished onboarding
        // aren't shown it again. Safe to run repeatedly.
        const legacyComplete = await AsyncStorage.getItem('onboarding_complete');
        if (legacyComplete === 'true') {
          useOnboardingStore.getState().completeOnboarding();
          await AsyncStorage.removeItem('onboarding_complete');
        }
      } finally {
        setIsSetupComplete(true);
        await SplashScreen.hideAsync();
      }
    }
    setup();
  }, []);

  const isReady = isInitialized && isSetupComplete && isOnboardingHydrated;

  // Navigate to onboarding when ready and needed
  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [isReady, hasCompletedOnboarding, segments, router]);

  // Update Sentry user context when user changes
  useEffect(() => {
    if (user) {
      setUser({ id: user.id, email: user.email, username: user.display_name });
    } else {
      setUser(null);
    }
  }, [user]);
  
  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="light" />
        <DeepLinkHandler />
        <OfflineIndicator />
        <ToastContainer />
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
            name="leaderboards"
            options={{
              title: 'Leaderboards',
              presentation: 'card',
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
