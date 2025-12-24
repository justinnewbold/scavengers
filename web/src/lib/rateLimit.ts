/**
 * Simple in-memory rate limiter for API routes
 * Uses a sliding window algorithm
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyPrefix?: string;    // Prefix for rate limit keys
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;   // Seconds until rate limit resets
}

/**
 * Check rate limit for a given key (typically IP address or user ID)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests, keyPrefix = '' } = config;
  const fullKey = `${keyPrefix}:${key}`;
  const now = Date.now();

  const entry = rateLimitStore.get(fullKey);

  // If no entry or entry expired, create new one
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(fullKey, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default (in production, you'd want to configure this)
  return 'unknown';
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Auth endpoints: 5 attempts per minute
  auth: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 5,
    keyPrefix: 'auth',
  },
  // Login specifically: 10 attempts per 15 minutes
  login: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,
    keyPrefix: 'login',
  },
  // Registration: 3 per hour
  register: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,
    keyPrefix: 'register',
  },
  // General API: 100 requests per minute
  api: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 100,
    keyPrefix: 'api',
  },
  // AI generation: 10 per hour
  aiGenerate: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 10,
    keyPrefix: 'ai',
  },
};

/**
 * Create rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetTime),
        'Retry-After': String(result.retryAfter || 60),
      },
    }
  );
}
