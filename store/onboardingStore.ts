import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  /** True once the user has finished (or skipped) the intro flow. */
  hasCompletedOnboarding: boolean;
  /** False until persisted state has rehydrated - callers must wait on this. */
  isHydrated: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

/**
 * Tracks whether the intro flow has been seen.
 *
 * This lives in a store rather than local state in the root layout so that the
 * onboarding screen can flip the flag the layout's redirect reads. Previously
 * the flag was `useState` in `app/_layout.tsx`, written only by a mount-time
 * effect, so completing onboarding could never update it and the redirect
 * bounced the user straight back.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      isHydrated: false,

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        // Runs after rehydration finishes, including when nothing was stored.
        useOnboardingStore.setState({
          hasCompletedOnboarding: state?.hasCompletedOnboarding ?? false,
          isHydrated: true,
        });
      },
    }
  )
);

export default useOnboardingStore;
