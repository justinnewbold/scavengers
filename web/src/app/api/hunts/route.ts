import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { optionalAuth, requireAuth, sanitizeString } from '@/lib/auth';

// GET /api/hunts - List hunts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get('public') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get optional auth to show user's own hunts
    const user = await optionalAuth(request);

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
          ) as challenges,
          (SELECT COUNT(*) FROM participants p WHERE p.hunt_id = h.id) as participant_count
        FROM hunts h
        LEFT JOIN challenges c ON c.hunt_id = h.id
        WHERE h.is_public = true AND h.status = 'active'
        GROUP BY h.id
        ORDER BY h.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (user) {
      // If authenticated, show user's hunts
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
          ) as challenges,
          (SELECT COUNT(*) FROM participants p WHERE p.hunt_id = h.id) as participant_count
        FROM hunts h
        LEFT JOIN challenges c ON c.hunt_id = h.id
        WHERE h.creator_id = ${user.id} OR h.is_public = true
        GROUP BY h.id
        ORDER BY h.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Default to public hunts
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
          ) as challenges,
          (SELECT COUNT(*) FROM participants p WHERE p.hunt_id = h.id) as participant_count
        FROM hunts h
        LEFT JOIN challenges c ON c.hunt_id = h.id
        WHERE h.is_public = true AND h.status = 'active'
        GROUP BY h.id
        ORDER BY h.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Add cache headers for public requests
    const response = NextResponse.json({
      hunts: result.rows,
      pagination: { page, limit, hasMore: result.rows.length === limit },
    });

    if (isPublic) {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }

    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to fetch hunts:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch hunts' },
      { status: 500 }
    );
  }
}

// POST /api/hunts - Create hunt (requires auth)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();

    // Validate and sanitize input
    const title = sanitizeString(body.title || '', 255);
    const description = sanitizeString(body.description || '', 2000);
    const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty)
      ? body.difficulty
      : 'medium';
    const isPublic = body.is_public !== false;
    const status = ['draft', 'active'].includes(body.status) ? body.status : 'active';
    const location = body.location ? sanitizeString(body.location, 255) : null;
    const durationMinutes = body.duration_minutes
      ? Math.min(1440, Math.max(1, parseInt(body.duration_minutes, 10)))
      : null;
    const maxParticipants = body.max_participants
      ? Math.min(1000, Math.max(1, parseInt(body.max_participants, 10)))
      : null;

    if (!title || title.length < 3) {
      return NextResponse.json(
        { error: 'Title must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Insert hunt with creator_id
    const huntResult = await sql`
      INSERT INTO hunts (title, description, difficulty, is_public, status, creator_id, location, duration_minutes, max_participants, created_at, updated_at)
      VALUES (${title}, ${description}, ${difficulty}, ${isPublic}, ${status}, ${auth.user.id}, ${location}, ${durationMinutes}, ${maxParticipants}, NOW(), NOW())
      RETURNING *
    `;

    const hunt = huntResult.rows[0];

    // Insert challenges if provided
    const challenges = body.challenges || [];
    if (challenges.length > 0) {
      for (let i = 0; i < Math.min(challenges.length, 50); i++) {
        const c = challenges[i];
        const challengeTitle = sanitizeString(c.title || '', 255);
        const challengeDesc = sanitizeString(c.description || '', 1000);
        const points = Math.min(1000, Math.max(1, parseInt(c.points, 10) || 10));
        const verificationType = ['photo', 'gps', 'qr_code', 'text_answer', 'manual'].includes(
          c.verification_type
        )
          ? c.verification_type
          : 'manual';
        const hint = c.hint ? sanitizeString(c.hint, 500) : null;

        if (!challengeTitle) continue;

        await sql`
          INSERT INTO challenges (hunt_id, title, description, points, verification_type, verification_data, hint, order_index, created_at)
          VALUES (${hunt.id}, ${challengeTitle}, ${challengeDesc}, ${points}, ${verificationType}, ${JSON.stringify(c.verification_data || {})}, ${hint}, ${i}, NOW())
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to create hunt:', error);
    }
    return NextResponse.json(
      { error: 'Failed to create hunt' },
      { status: 500 }
    );
  }
}
