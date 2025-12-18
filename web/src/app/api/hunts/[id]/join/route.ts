import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { optionalAuth } from '@/lib/auth';

// POST /api/hunts/[id]/join - Join a hunt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check hunt exists and is active
    const huntResult = await sql`
      SELECT id, max_participants FROM hunts WHERE id = ${id} AND status = 'active'
    `;

    if (huntResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found or not active' },
        { status: 404 }
      );
    }

    const hunt = huntResult.rows[0];

    // Check max participants if set
    if (hunt.max_participants) {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM participants WHERE hunt_id = ${id}
      `;
      if (Number(countResult.rows[0].count) >= hunt.max_participants) {
        return NextResponse.json(
          { error: 'Hunt is full' },
          { status: 400 }
        );
      }
    }

    // Get authenticated user if available
    const user = await optionalAuth(request);
    const userId = user ? user.id : `anon_${uuidv4().slice(0, 8)}`;

    // Check if user already joined (prevent duplicates)
    const existingResult = await sql`
      SELECT id, status FROM participants
      WHERE hunt_id = ${id} AND user_id = ${userId}
    `;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      // If they left, let them rejoin
      if (existing.status === 'left') {
        const result = await sql`
          UPDATE participants
          SET status = 'playing', started_at = NOW()
          WHERE id = ${existing.id}
          RETURNING *
        `;
        return NextResponse.json(result.rows[0]);
      }
      // Already participating
      return NextResponse.json(existing);
    }

    // Create new participant
    const participantId = uuidv4();
    const result = await sql`
      INSERT INTO participants (id, hunt_id, user_id, status, score, started_at)
      VALUES (${participantId}, ${id}, ${userId}, 'playing', 0, NOW())
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to join hunt:', error);
    }
    return NextResponse.json(
      { error: 'Failed to join hunt' },
      { status: 500 }
    );
  }
}
