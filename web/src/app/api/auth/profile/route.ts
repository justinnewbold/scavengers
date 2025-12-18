import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuth, sanitizeString } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const displayName = body.display_name
      ? sanitizeString(body.display_name, 100)
      : null;
    const avatarUrl = body.avatar_url
      ? sanitizeString(body.avatar_url, 500)
      : null;

    // Validate avatar URL if provided
    if (avatarUrl && !avatarUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Avatar URL must be a valid HTTPS URL' },
        { status: 400 }
      );
    }

    // Update user
    const result = await sql`
      UPDATE users
      SET
        display_name = COALESCE(${displayName}, display_name),
        avatar_url = COALESCE(${avatarUrl}, avatar_url)
      WHERE id = ${auth.user.id}
      RETURNING id, email, display_name, avatar_url, created_at
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return wrapped in user object for AuthContext compatibility
    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Profile update error:', error);
    }
    return NextResponse.json(
      { error: 'Update failed. Please try again.' },
      { status: 500 }
    );
  }
}
