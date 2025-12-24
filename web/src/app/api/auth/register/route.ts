import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  createToken,
  isValidEmail,
  isValidPassword,
  sanitizeEmail,
  sanitizeString,
} from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimiters, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (stricter for registration)
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, rateLimiters.register);

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const email = sanitizeEmail(body.email || '');
    const password = body.password || '';
    const displayName = sanitizeString(body.display_name || '', 100);

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create user with bcrypt hashed password
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const finalDisplayName = displayName || email.split('@')[0];

    const result = await sql`
      INSERT INTO users (id, email, password_hash, display_name, created_at)
      VALUES (${userId}, ${email}, ${passwordHash}, ${finalDisplayName}, NOW())
      RETURNING id, email, display_name, avatar_url, created_at
    `;

    const user = result.rows[0] as {
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
    };

    // Generate JWT
    const token = await createToken({ id: user.id, email: user.email });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error) {
    // Log error details for debugging (visible in Vercel logs)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Registration error:', {
      message: errorMessage,
      stack: errorStack,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    });

    // Return more specific error in non-production
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json(
        { error: `Registration failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
