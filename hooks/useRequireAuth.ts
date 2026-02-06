import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store';

/**
 * Hook that redirects unauthenticated users to the login screen.
 * Use at the top of any screen that requires authentication.
 *
 * @returns { isAuthenticated, isInitialized } for conditional rendering
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isInitialized]);

  return { isAuthenticated, isInitialized };
}
