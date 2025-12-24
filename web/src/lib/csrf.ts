import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

// CSRF token expiration (1 hour)
const CSRF_EXPIRATION = 60 * 60;

// Get CSRF secret (derived from JWT secret)
function getCsrfSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'dev-csrf-secret';
  return new TextEncoder().encode(`csrf-${secret}`);
}

/**
 * Generate a CSRF token
 */
export async function generateCsrfToken(sessionId?: string): Promise<string> {
  const token = await new SignJWT({
    type: 'csrf',
    sessionId: sessionId || crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${CSRF_EXPIRATION}s`)
    .sign(getCsrfSecret());

  return token;
}

/**
 * Verify a CSRF token
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getCsrfSecret());
    return payload.type === 'csrf';
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers
 */
export function extractCsrfToken(request: NextRequest): string | null {
  // Check header first (preferred)
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) return headerToken;

  // Check cookies as fallback
  const cookieToken = request.cookies.get('csrf-token')?.value;
  return cookieToken || null;
}

/**
 * CSRF protection middleware for API routes
 * Use this for state-changing operations (POST, PUT, PATCH, DELETE)
 */
export async function csrfProtection(
  request: NextRequest
): Promise<{ valid: true } | { valid: false; error: NextResponse }> {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Extract token
  const token = extractCsrfToken(request);
  if (!token) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      ),
    };
  }

  // Verify token
  const isValid = await verifyCsrfToken(token);
  if (!isValid) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Invalid or expired CSRF token' },
        { status: 403 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Create a response with CSRF token set in cookie
 */
export async function withCsrfToken(response: NextResponse): Promise<NextResponse> {
  const token = await generateCsrfToken();

  response.cookies.set('csrf-token', token, {
    httpOnly: false, // Needs to be accessible by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_EXPIRATION,
    path: '/',
  });

  return response;
}
