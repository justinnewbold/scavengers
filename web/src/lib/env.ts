import { z } from 'zod';

/**
 * Environment variable schema
 * Validates required and optional env vars at startup
 */
const envSchema = z.object({
  // Required in production
  POSTGRES_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),

  // Optional - AI features
  GEMINI_API_KEY: z.string().optional(),

  // Runtime info
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PHASE: z.string().optional(),

  // Vercel-specific (populated by Vercel)
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parsed and validated environment variables
 */
let env: Env | null = null;

/**
 * Get validated environment variables
 * Throws if validation fails in production
 */
export function getEnv(): Env {
  if (env) return env;

  // Skip validation during build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      NEXT_PHASE: process.env.NEXT_PHASE,
    } as Env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(', ')}`)
      .join('\n');

    console.error('Environment validation failed:\n' + errorMessages);

    // In production, this should fail loudly
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration');
    }

    // In development, log warning but continue with partial config
    console.warn('Continuing with partial environment configuration...');
  }

  env = result.success ? result.data : (envSchema.parse({}) as Env);
  return env;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if AI features are available
 */
export function hasAIFeatures(): boolean {
  return !!getEnv().GEMINI_API_KEY;
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  const env = getEnv();

  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }

  if (isProduction()) {
    // Add your production URL here
    return 'https://scavengers.app';
  }

  return 'http://localhost:3000';
}
