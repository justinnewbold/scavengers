import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { randomBytes, createHash } from 'crypto';

// Rate limiting: track recent requests by IP
const recentRequests = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const lastRequest = recentRequests.get(ip);

  // Clean up old entries
  for (const [key, time] of recentRequests.entries()) {
    if (now - time > RATE_LIMIT_WINDOW) {
      recentRequests.delete(key);
    }
  }

  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return true;
  }

  recentRequests.set(ip, now);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userResult = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${email}
    `;

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      // Generate a secure reset token
      const rawToken = randomBytes(32).toString('hex');
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing tokens for this user
      await sql`
        DELETE FROM password_reset_tokens
        WHERE user_id = ${user.id}
      `;

      // Store the hashed token
      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${hashedToken}, ${expiresAt})
      `;

      // In production, you would send an email here
      // For now, log the reset link (in development only)
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://scavengers.newbold.cloud'}/reset-password?token=${rawToken}`;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Password reset link for ${email}: ${resetLink}`);
      }

      // TODO: Integrate with email service (SendGrid, Resend, etc.)
      // await sendPasswordResetEmail(user.email, user.display_name, resetLink);
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      message: 'If an account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Password reset error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
