import { NextResponse } from 'next/server';

/**
 * Standardized API response envelope
 * All API responses follow this structure for consistency
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total?: number;
      hasMore: boolean;
    };
    timestamp: string;
  };
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  pagination?: { page: number; limit: number; total?: number; hasMore: boolean }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination }),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Standard error handlers for common scenarios
 */
export const ApiErrors = {
  unauthorized: (message = 'Authentication required') =>
    errorResponse(ErrorCodes.UNAUTHORIZED, message, 401),

  forbidden: (message = 'Access denied') =>
    errorResponse(ErrorCodes.FORBIDDEN, message, 403),

  notFound: (resource = 'Resource') =>
    errorResponse(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  validationError: (message: string, details?: unknown) =>
    errorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, details),

  invalidInput: (field: string, reason?: string) =>
    errorResponse(
      ErrorCodes.INVALID_INPUT,
      reason ? `Invalid ${field}: ${reason}` : `Invalid ${field}`,
      400
    ),

  missingField: (field: string) =>
    errorResponse(ErrorCodes.MISSING_FIELD, `Missing required field: ${field}`, 400),

  conflict: (message: string) =>
    errorResponse(ErrorCodes.CONFLICT, message, 409),

  alreadyExists: (resource: string) =>
    errorResponse(ErrorCodes.ALREADY_EXISTS, `${resource} already exists`, 409),

  rateLimited: (retryAfter?: number) =>
    errorResponse(
      ErrorCodes.RATE_LIMITED,
      'Too many requests. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  internalError: (message = 'An internal error occurred') =>
    errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500),

  databaseError: (message = 'Database operation failed') =>
    errorResponse(ErrorCodes.DATABASE_ERROR, message, 500),
};

/**
 * Log error and return appropriate response
 * Logs full error in development, sanitized in production
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse<ApiResponse> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Always log for debugging (visible in server logs)
  console.error(`API Error${context ? ` [${context}]` : ''}:`, {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });

  // In development, include error details
  if (process.env.NODE_ENV !== 'production') {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      errorMessage,
      500,
      { context, stack: errorStack }
    );
  }

  // In production, return generic error
  return ApiErrors.internalError();
}
