/**
 * Error tracking utilities
 * Ready to integrate with Sentry, LogRocket, or other services
 */

interface ErrorContext {
  userId?: string;
  action?: string;
  component?: string;
  extra?: Record<string, unknown>;
}

interface TrackedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

// In-memory error buffer (for development/debugging)
const errorBuffer: TrackedError[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Capture an error for tracking
 */
export function captureError(error: Error | unknown, context: ErrorContext = {}): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  const trackedError: TrackedError = {
    message: errorObj.message,
    stack: errorObj.stack,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // Add to buffer
  errorBuffer.unshift(trackedError);
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.pop();
  }

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Tracking]', trackedError);
  }

  // In production, send to error tracking service
  // Uncomment and configure when Sentry is set up:
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(errorObj, {
  //     extra: context,
  //   });
  // }
}

/**
 * Capture a message for tracking (non-error events)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: ErrorContext = {}
): void {
  const trackedError: TrackedError = {
    message: `[${level.toUpperCase()}] ${message}`,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  errorBuffer.unshift(trackedError);
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.pop();
  }

  if (process.env.NODE_ENV !== 'production') {
    console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](
      '[Tracking]',
      message,
      context
    );
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; name?: string }): void {
  // When Sentry is configured:
  // Sentry.setUser(user);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Error Tracking] User context set:', user.id);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  // When Sentry is configured:
  // Sentry.setUser(null);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Error Tracking] User context cleared');
  }
}

/**
 * Get recent errors (for debugging)
 */
export function getRecentErrors(): TrackedError[] {
  return [...errorBuffer];
}

/**
 * Clear error buffer
 */
export function clearErrors(): void {
  errorBuffer.length = 0;
}

/**
 * Error boundary handler for React
 */
export function handleReactError(error: Error, errorInfo: { componentStack: string }): void {
  captureError(error, {
    component: 'ErrorBoundary',
    extra: { componentStack: errorInfo.componentStack },
  });
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, context);
      throw error;
    }
  }) as T;
}
