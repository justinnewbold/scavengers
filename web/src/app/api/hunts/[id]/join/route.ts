import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// POST /api/hunts/[id]/join - Join a hunt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check hunt exists and is active
    const huntResult = await sql`
      SELECT * FROM hunts WHERE id = ${id} AND status = 'active'
    `;
    
    if (huntResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found or not active' },
        { status: 404 }
      );
    }
    
    // Create anonymous participant (or use user_id if authenticated)
    const participantId = uuidv4();
    const anonymousUserId = `anon_${uuidv4().slice(0, 8)}`;
    
    const result = await sql`
      INSERT INTO participants (id, hunt_id, user_id, status, score, started_at)
      VALUES (${participantId}, ${id}, ${anonymousUserId}, 'playing', 0, NOW())
      RETURNING *
    `;
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to join hunt:', error);
    return NextResponse.json(
      { error: 'Failed to join hunt' },
      { status: 500 }
    );
  }
}
