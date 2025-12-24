import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  sanitizeString,
  sanitizeEmail,
  isValidUUID,
} from '../auth';

describe('isValidEmail', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('should return valid for strong passwords', () => {
    expect(isValidPassword('Password123')).toEqual({ valid: true });
    expect(isValidPassword('MySecure1Pass')).toEqual({ valid: true });
    expect(isValidPassword('Test1234Aa')).toEqual({ valid: true });
  });

  it('should reject passwords shorter than 8 characters', () => {
    const result = isValidPassword('Pass1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });

  it('should reject passwords without uppercase', () => {
    const result = isValidPassword('password123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('uppercase');
  });

  it('should reject passwords without lowercase', () => {
    const result = isValidPassword('PASSWORD123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase');
  });

  it('should reject passwords without numbers', () => {
    const result = isValidPassword('PasswordABC');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('number');
  });
});

describe('sanitizeString', () => {
  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\n\ttest\n')).toBe('test');
  });

  it('should limit length', () => {
    const longString = 'a'.repeat(300);
    expect(sanitizeString(longString, 100).length).toBe(100);
    expect(sanitizeString(longString).length).toBe(255); // default max
  });

  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString('   ')).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('should lowercase and trim emails', () => {
    expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    expect(sanitizeEmail('User@Domain.ORG')).toBe('user@domain.org');
  });
});

describe('isValidUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false); // too short
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false);
    expect(isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false); // no dashes
  });

  it('should be case insensitive', () => {
    expect(isValidUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
    expect(isValidUUID('123e4567-E89B-12d3-A456-426614174000')).toBe(true);
  });
});
