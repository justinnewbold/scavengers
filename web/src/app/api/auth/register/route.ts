import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  createToken,
  isValidEmail,
  isValidPassword,
  sanitizeEmail,
  sanitizeString,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
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
    // Log error without exposing details
    if (process.env.NODE_ENV !== 'production') {
      console.error('Registration error:', error);
    }
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
