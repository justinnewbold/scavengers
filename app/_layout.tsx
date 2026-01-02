import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store';
import { Colors } from '@/constants/theme';
import { ErrorBoundary, OfflineIndicator } from '@/components';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, isInitialized } = useAuthStore();
  
  useEffect(() => {
    async function setup() {
      await initialize();
      await SplashScreen.hideAsync();
    }
    setup();
  }, [initialize]);
  
  if (!isInitialized) {
    return <View style={styles.loading} />;
  }
  
  return (
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
