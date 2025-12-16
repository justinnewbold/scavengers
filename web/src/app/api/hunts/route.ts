import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/hunts - List hunts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('public') === 'true';
    
    let result;
    if (isPublic) {
      result = await sql`
        SELECT h.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', c.id,
                'title', c.title,
                'description', c.description,
                'points', c.points,
                'verification_type', c.verification_type,
                'hint', c.hint,
                'order_index', c.order_index
              ) ORDER BY c.order_index
            ) FILTER (WHERE c.id IS NOT NULL), 
            '[]'
          ) as challenges
        FROM hunts h
        LEFT JOIN challenges c ON c.hunt_id = h.id
        WHERE h.is_public = true AND h.status = 'active'
        GROUP BY h.id
        ORDER BY h.created_at DESC
        LIMIT 50
      `;
    } else {
      result = await sql`
        SELECT h.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', c.id,
                'title', c.title,
                'description', c.description,
                'points', c.points,
                'verification_type', c.verification_type,
                'hint', c.hint,
                'order_index', c.order_index
              ) ORDER BY c.order_index
            ) FILTER (WHERE c.id IS NOT NULL), 
            '[]'
          ) as challenges
        FROM hunts h
        LEFT JOIN challenges c ON c.hunt_id = h.id
        GROUP BY h.id
        ORDER BY h.created_at DESC
        LIMIT 100
      `;
    }
    
    return NextResponse.json({ hunts: result.rows });
  } catch (error) {
    console.error('Failed to fetch hunts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hunts' },
      { status: 500 }
    );
  }
}

// POST /api/hunts - Create hunt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, difficulty, is_public, status, challenges } = body;
    
    // Insert hunt
    const huntResult = await sql`
      INSERT INTO hunts (title, description, difficulty, is_public, status, created_at, updated_at)
      VALUES (${title}, ${description}, ${difficulty || 'medium'}, ${is_public ?? true}, ${status || 'active'}, NOW(), NOW())
      RETURNING *
    `;
    
    const hunt = huntResult.rows[0];
    
    // Insert challenges if provided
    if (challenges && challenges.length > 0) {
      for (let i = 0; i < challenges.length; i++) {
        const c = challenges[i];
        await sql`
          INSERT INTO challenges (hunt_id, title, description, points, verification_type, verification_data, hint, order_index, created_at)
          VALUES (${hunt.id}, ${c.title}, ${c.description}, ${c.points || 10}, ${c.verification_type || 'manual'}, ${JSON.stringify(c.verification_data || {})}, ${c.hint || null}, ${i}, NOW())
        `;
      }
      
      // Fetch challenges
      const challengeResult = await sql`
        SELECT * FROM challenges WHERE hunt_id = ${hunt.id} ORDER BY order_index
      `;
      hunt.challenges = challengeResult.rows;
    } else {
      hunt.challenges = [];
    }
    
    return NextResponse.json(hunt, { status: 201 });
  } catch (error) {
    console.error('Failed to create hunt:', error);
    return NextResponse.json(
      { error: 'Failed to create hunt' },
      { status: 500 }
    );
  }
}
