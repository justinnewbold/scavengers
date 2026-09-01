import { useOnboardingStore } from '../onboardingStore';

describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ hasCompletedOnboarding: false, isHydrated: true });
  });

  it('starts with onboarding not completed', () => {
    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(false);
  });

  /**
   * The regression this guards: the flag used to live in `useState` inside
   * app/_layout.tsx with a single write site in a mount-only effect, so
   * completing onboarding could not update what the redirect read. The user
   * was bounced back to onboarding forever.
   */
  it('reflects completion immediately, so the layout redirect stops firing', () => {
    useOnboardingStore.getState().completeOnboarding();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true);
  });

  it('notifies subscribers when onboarding completes', () => {
    const seen: boolean[] = [];
    const unsubscribe = useOnboardingStore.subscribe((state) =>
      seen.push(state.hasCompletedOnboarding)
    );

    useOnboardingStore.getState().completeOnboarding();
    unsubscribe();

    // A subscribed component (the root layout) must actually re-render.
    expect(seen).toContain(true);
  });

  it('can be reset, so onboarding shows again', () => {
    useOnboardingStore.getState().completeOnboarding();
    useOnboardingStore.getState().resetOnboarding();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('exposes a hydration flag so the redirect can wait for stored state', () => {
    expect(useOnboardingStore.getState()).toHaveProperty('isHydrated');
  });
});
