import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuth, sanitizeString } from '@/lib/auth';

// GET /api/hunts/[id] - Get hunt by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      SELECT h.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'title', c.title,
              'description', c.description,
              'points', c.points,
              'verification_type', c.verification_type,
              'verification_data', c.verification_data,
              'hint', c.hint,
              'order_index', c.order_index
            ) ORDER BY c.order_index
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as challenges,
        (SELECT COUNT(*) FROM participants p WHERE p.hunt_id = h.id) as participant_count
      FROM hunts h
      LEFT JOIN challenges c ON c.hunt_id = h.id
      WHERE h.id = ${id}
      GROUP BY h.id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json(result.rows[0]);
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to fetch hunt:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch hunt' },
      { status: 500 }
    );
  }
}

// PATCH /api/hunts/[id] - Update hunt (requires auth + ownership)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id } = await params;

    // Check ownership
    const huntCheck = await sql`
      SELECT creator_id FROM hunts WHERE id = ${id}
    `;

    if (huntCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found' },
        { status: 404 }
      );
    }

    if (huntCheck.rows[0].creator_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own hunts' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate and sanitize input
    const title = body.title ? sanitizeString(body.title, 255) : null;
    const description = body.description !== undefined
      ? sanitizeString(body.description, 2000)
      : null;
    const difficulty = body.difficulty && ['easy', 'medium', 'hard'].includes(body.difficulty)
      ? body.difficulty
      : null;
    const isPublic = body.is_public !== undefined ? body.is_public : null;
    const status = body.status && ['draft', 'active', 'completed', 'archived'].includes(body.status)
      ? body.status
      : null;

    const result = await sql`
      UPDATE hunts
      SET
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        difficulty = COALESCE(${difficulty}, difficulty),
        is_public = COALESCE(${isPublic}, is_public),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to update hunt:', error);
    }
    return NextResponse.json(
      { error: 'Failed to update hunt' },
      { status: 500 }
    );
  }
}

// DELETE /api/hunts/[id] - Delete hunt (requires auth + ownership)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id } = await params;

    // Check ownership
    const huntCheck = await sql`
      SELECT creator_id FROM hunts WHERE id = ${id}
    `;

    if (huntCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found' },
        { status: 404 }
      );
    }

    if (huntCheck.rows[0].creator_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own hunts' },
        { status: 403 }
      );
    }

    // Delete hunt (cascades to challenges, participants, submissions)
    await sql`DELETE FROM hunts WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to delete hunt:', error);
    }
    return NextResponse.json(
      { error: 'Failed to delete hunt' },
      { status: 500 }
    );
  }
}
