import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

// GET /api/csrf - Get a new CSRF token
export async function GET() {
  const token = await generateCsrfToken();

  const response = NextResponse.json({ token });

  // Also set in cookie for convenience
  response.cookies.set('csrf-token', token, {
    httpOnly: true, // Prevent XSS attacks from accessing the token
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });

  return response;
}
