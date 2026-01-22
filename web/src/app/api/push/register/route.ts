import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/push/register - Register push notification token
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Push token is required' },
        { status: 400 }
      );
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json(
        { error: 'Valid platform (ios, android, web) is required' },
        { status: 400 }
      );
    }

    // Upsert push token for this user
    await sql`
      INSERT INTO push_tokens (user_id, token, platform, created_at, updated_at)
      VALUES (${auth.user.id}, ${token}, ${platform}, NOW(), NOW())
      ON CONFLICT (user_id, token)
      DO UPDATE SET
        platform = ${platform},
        updated_at = NOW(),
        is_active = true
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register push token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/register - Unregister push notification token
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Push token is required' },
        { status: 400 }
      );
    }

    // Mark token as inactive (soft delete)
    await sql`
      UPDATE push_tokens
      SET is_active = false, updated_at = NOW()
      WHERE user_id = ${auth.user.id} AND token = ${token}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unregistration error:', error);
    return NextResponse.json(
      { error: 'Failed to unregister push token' },
      { status: 500 }
    );
  }
}
