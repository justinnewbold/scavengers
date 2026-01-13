// Sentry types and initialization for React Native
// The @sentry/react-native package must be installed for this to work
let Sentry: typeof import('@sentry/react-native') | null = null;

// Lazy load Sentry to avoid import errors when package is not installed
async function loadSentry() {
  if (!Sentry) {
    try {
      Sentry = await import('@sentry/react-native');
    } catch {
      console.warn('Sentry SDK not available. Error tracking disabled.');
    }
  }
  return Sentry;
}

// Type for severity levels
type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

// Initialize Sentry
export async function initSentry() {
  const SentryModule = await loadSentry();
  if (!SentryModule) return;

  const Constants = await import('expo-constants');
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  SentryModule.init({
    dsn,
    // Set environment based on release channel
    environment: __DEV__ ? 'development' : 'production',
    // Enable performance monitoring
    enableTracing: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Set the release version
    release: Constants.default.expoConfig?.version || '1.0.0',
    // Set the distribution (build number)
    dist: Constants.default.expoConfig?.ios?.buildNumber
      || Constants.default.expoConfig?.android?.versionCode?.toString()
      || '1',
    // Enable automatic session tracking
    enableAutoSessionTracking: true,
    // Session timeout in milliseconds
    sessionTrackingIntervalMillis: 30000,
    // Attach stack traces to messages
    attachStacktrace: true,
    // Don't send events in development unless explicitly enabled
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_DEBUG === 'true',
  });
}

// Capture exception with additional context
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  if (!Sentry) return;
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// Capture message
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info'
) {
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
}

// Set user information for error tracking
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (!Sentry) return;
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  message: string,
  category: string,
  level: SeverityLevel = 'info',
  data?: Record<string, unknown>
) {
  if (!Sentry) return;
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

// Set tag for filtering
export function setTag(key: string, value: string) {
  if (!Sentry) return;
  Sentry.setTag(key, value);
}

// Export getter for Sentry instance
export function getSentry() {
  return Sentry;
}
