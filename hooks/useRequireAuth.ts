import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store';

/**
 * Sends unauthenticated users to the login screen.
 *
 * Use only on *pushed* routes. Tab screens should render `<SignInRequired />`
 * in place instead - redirecting out of a tab replaces the whole `(tabs)`
 * entry, which takes the tab bar with it.
 *
 * Uses `push`, not `replace`, so login stays on top of the current screen and
 * the user can back out of it. With `replace` there was no back button and no
 * way to return to what they were looking at.
 *
 * @returns { isAuthenticated, isInitialized } for conditional rendering
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isInitialized, router]);

  return { isAuthenticated, isInitialized };
}
