/**
 * Production-safe logger that gates console output to development mode only
 */

const isDev = __DEV__ || process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors, but could be sent to error tracking in production
    if (isDev) {
      console.error(...args);
    } else {
      // In production, you might want to send to Sentry, LogRocket, etc.
      // For now, we still log errors but without full stack traces
      console.error('[Error]', args[0]);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  // Group logging for better organization
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  // Time tracking for performance debugging
  time: (label: string) => {
    if (isDev) {
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(label);
    }
  },
};

export default logger;
