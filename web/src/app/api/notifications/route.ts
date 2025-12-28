import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    let result;
    if (unreadOnly) {
      result = await sql`
        SELECT id, type, title, body, data, created_at
        FROM notifications
        WHERE user_id = ${auth.userId} AND read_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      result = await sql`
        SELECT id, type, title, body, data, read_at, created_at
        FROM notifications
        WHERE user_id = ${auth.userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get unread count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${auth.userId} AND read_at IS NULL
    `;

    return NextResponse.json({
      notifications: result.rows,
      unreadCount: parseInt(countResult.rows[0]?.count || '0', 10),
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await sql`
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = ${auth.userId} AND read_at IS NULL
      `;
    } else if (notificationIds && Array.isArray(notificationIds)) {
      const validIds = notificationIds.filter(id => isValidUUID(id));
      if (validIds.length > 0) {
        await sql`
          UPDATE notifications
          SET read_at = NOW()
          WHERE user_id = ${auth.userId}
            AND id = ANY(${validIds}::uuid[])
            AND read_at IS NULL
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
