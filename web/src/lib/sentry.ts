import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for the server
export function initSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Set release version
    release: process.env.npm_package_version || '1.0.0',
    // Enable debug mode in development
    debug: process.env.NODE_ENV === 'development',
    // Filter out expected errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Skip authentication errors (expected)
        if (error.message.includes('Invalid credentials')) {
          return null;
        }
        // Skip rate limit errors (expected behavior)
        if (error.message.includes('Rate limit')) {
          return null;
        }
      }
      return event;
    },
  });
}

// Capture exception with context
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

// Capture message
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.captureMessage(message, level);
}

// Set user context
export function setUser(user: { id: string; email?: string } | null) {
  Sentry.setUser(user);
}

// Add breadcrumb
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

// Set tag
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// Wrap API route handler with Sentry
export function withSentry<T>(
  handler: (req: Request) => Promise<T>
): (req: Request) => Promise<T> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      captureException(error, {
        url: req.url,
        method: req.method,
      });
      throw error;
    }
  };
}

export { Sentry };
