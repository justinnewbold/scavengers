import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

// PATCH /api/hunts/[id]/schedule - Update hunt schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id: huntId } = await params;

    if (!isValidUUID(huntId)) {
      return NextResponse.json(
        { error: 'Invalid hunt ID' },
        { status: 400 }
      );
    }

    // Verify ownership
    const huntCheck = await sql`
      SELECT id FROM hunts WHERE id = ${huntId} AND creator_id = ${auth.userId}
    `;

    if (huntCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found or not owned by you' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { scheduled_start, scheduled_end } = body;

    // Validate dates
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (scheduled_start) {
      startDate = new Date(scheduled_start);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date' },
          { status: 400 }
        );
      }
    }

    if (scheduled_end) {
      endDate = new Date(scheduled_end);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid end date' },
          { status: 400 }
        );
      }
    }

    // Validate end is after start
    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Update schedule
    const result = await sql`
      UPDATE hunts
      SET
        scheduled_start = ${startDate?.toISOString() || null},
        scheduled_end = ${endDate?.toISOString() || null},
        updated_at = NOW()
      WHERE id = ${huntId}
      RETURNING id, title, scheduled_start, scheduled_end
    `;

    return NextResponse.json({
      hunt: result.rows[0],
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    console.error('Schedule update error:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// GET /api/hunts/[id]/schedule - Get scheduled hunts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get('upcoming') === 'true';
    const active = searchParams.get('active') === 'true';

    let result;

    if (upcoming) {
      // Get hunts starting in the future
      result = await sql`
        SELECT h.id, h.title, h.description, h.difficulty, h.location,
               h.scheduled_start, h.scheduled_end,
               (SELECT COUNT(*) FROM challenges WHERE hunt_id = h.id) as challenge_count,
               u.display_name as creator_name
        FROM hunts h
        LEFT JOIN users u ON u.id::text = h.creator_id
        WHERE h.scheduled_start > NOW()
          AND h.is_public = true
          AND h.status = 'active'
        ORDER BY h.scheduled_start ASC
        LIMIT 20
      `;
    } else if (active) {
      // Get currently active scheduled hunts
      result = await sql`
        SELECT h.id, h.title, h.description, h.difficulty, h.location,
               h.scheduled_start, h.scheduled_end,
               (SELECT COUNT(*) FROM challenges WHERE hunt_id = h.id) as challenge_count,
               u.display_name as creator_name
        FROM hunts h
        LEFT JOIN users u ON u.id::text = h.creator_id
        WHERE h.scheduled_start <= NOW()
          AND (h.scheduled_end IS NULL OR h.scheduled_end > NOW())
          AND h.is_public = true
          AND h.status = 'active'
        ORDER BY h.scheduled_start DESC
        LIMIT 20
      `;
    } else {
      // Get all scheduled hunts
      result = await sql`
        SELECT h.id, h.title, h.description, h.difficulty, h.location,
               h.scheduled_start, h.scheduled_end,
               (SELECT COUNT(*) FROM challenges WHERE hunt_id = h.id) as challenge_count,
               u.display_name as creator_name
        FROM hunts h
        LEFT JOIN users u ON u.id::text = h.creator_id
        WHERE h.scheduled_start IS NOT NULL
          AND h.is_public = true
          AND h.status = 'active'
        ORDER BY h.scheduled_start ASC
        LIMIT 50
      `;
    }

    return NextResponse.json({ hunts: result.rows });
  } catch (error) {
    console.error('Scheduled hunts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled hunts' },
      { status: 500 }
    );
  }
}
