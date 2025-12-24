import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getClientIP, rateLimiters } from '../rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Clear any existing rate limit state between tests
    vi.useFakeTimers();
  });

  it('should allow requests within limit', () => {
    const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'test' };

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('user1', config);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('should block requests exceeding limit', () => {
    const config = { windowMs: 60000, maxRequests: 3, keyPrefix: 'test2' };

    // Use up the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit('user2', config);
    }

    // Next request should be blocked
    const result = checkRateLimit('user2', config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should reset after window expires', () => {
    const config = { windowMs: 1000, maxRequests: 2, keyPrefix: 'test3' };

    // Use up limit
    checkRateLimit('user3', config);
    checkRateLimit('user3', config);

    // Should be blocked
    expect(checkRateLimit('user3', config).success).toBe(false);

    // Advance time past window
    vi.advanceTimersByTime(1001);

    // Should be allowed again
    const result = checkRateLimit('user3', config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should track different keys separately', () => {
    const config = { windowMs: 60000, maxRequests: 2, keyPrefix: 'test4' };

    checkRateLimit('userA', config);
    checkRateLimit('userA', config);
    expect(checkRateLimit('userA', config).success).toBe(false);

    // Different user should still have quota
    const result = checkRateLimit('userB', config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });
});

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    expect(getClientIP(request)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.2' },
    });
    expect(getClientIP(request)).toBe('192.168.1.2');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
      },
    });
    expect(getClientIP(request)).toBe('192.168.1.1');
  });

  it('should return unknown for missing headers', () => {
    const request = new Request('http://localhost');
    expect(getClientIP(request)).toBe('unknown');
  });
});

describe('rateLimiters presets', () => {
  it('should have correct auth limiter config', () => {
    expect(rateLimiters.auth.maxRequests).toBe(5);
    expect(rateLimiters.auth.windowMs).toBe(60 * 1000);
  });

  it('should have correct login limiter config', () => {
    expect(rateLimiters.login.maxRequests).toBe(10);
    expect(rateLimiters.login.windowMs).toBe(15 * 60 * 1000);
  });

  it('should have correct register limiter config', () => {
    expect(rateLimiters.register.maxRequests).toBe(3);
    expect(rateLimiters.register.windowMs).toBe(60 * 60 * 1000);
  });

  it('should have correct AI generate limiter config', () => {
    expect(rateLimiters.aiGenerate.maxRequests).toBe(10);
    expect(rateLimiters.aiGenerate.windowMs).toBe(60 * 60 * 1000);
  });
});
