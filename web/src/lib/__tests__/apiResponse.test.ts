import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  ApiErrors,
  ErrorCodes,
} from '../apiResponse';

describe('successResponse', () => {
  it('should create a success response with data', async () => {
    const data = { id: 1, name: 'Test' };
    const response = successResponse(data);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
    expect(body.meta.timestamp).toBeDefined();
  });

  it('should support custom status codes', async () => {
    const response = successResponse({ created: true }, 201);
    expect(response.status).toBe(201);
  });

  it('should include pagination when provided', async () => {
    const pagination = { page: 1, limit: 10, total: 100, hasMore: true };
    const response = successResponse([], 200, pagination);

    const body = await response.json();
    expect(body.meta.pagination).toEqual(pagination);
  });
});

describe('errorResponse', () => {
  it('should create an error response', async () => {
    const response = errorResponse(ErrorCodes.NOT_FOUND, 'Resource not found', 404);

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Resource not found');
  });

  it('should include details when provided', async () => {
    const details = { field: 'email', reason: 'invalid format' };
    const response = errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details);

    const body = await response.json();
    expect(body.error.details).toEqual(details);
  });
});

describe('ApiErrors helpers', () => {
  it('should create unauthorized response', async () => {
    const response = ApiErrors.unauthorized();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should create forbidden response', async () => {
    const response = ApiErrors.forbidden('Custom message');
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error.message).toBe('Custom message');
  });

  it('should create not found response', async () => {
    const response = ApiErrors.notFound('User');
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.message).toBe('User not found');
  });

  it('should create validation error response', async () => {
    const response = ApiErrors.validationError('Invalid input', { fields: ['email'] });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ fields: ['email'] });
  });

  it('should create rate limited response', async () => {
    const response = ApiErrors.rateLimited(60);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.details).toEqual({ retryAfter: 60 });
  });

  it('should create conflict response', async () => {
    const response = ApiErrors.conflict('Resource already exists');
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('should create internal error response', async () => {
    const response = ApiErrors.internalError();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('ErrorCodes', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});
