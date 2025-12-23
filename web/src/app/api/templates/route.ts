import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, sanitizeString, isValidUUID } from '@/lib/auth';

// GET /api/templates - List templates (public + user's private)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get auth user if available (for private templates)
    let userId: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { verifyToken } = await import('@/lib/auth');
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);
      userId = payload?.userId || null;
    }

    let result;
    if (category) {
      result = await sql`
        SELECT
          t.*,
          u.display_name as creator_name,
          (SELECT COUNT(*) FROM hunts h WHERE h.template_id = t.id) as use_count
        FROM hunt_templates t
        LEFT JOIN users u ON u.id = t.creator_id
        WHERE (t.is_public = true OR t.creator_id = ${userId})
          AND t.category = ${category}
        ORDER BY use_count DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      result = await sql`
        SELECT
          t.*,
          u.display_name as creator_name,
          (SELECT COUNT(*) FROM hunts h WHERE h.template_id = t.id) as use_count
        FROM hunt_templates t
        LEFT JOIN users u ON u.id = t.creator_id
        WHERE t.is_public = true OR t.creator_id = ${userId}
        ORDER BY use_count DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return NextResponse.json({
      templates: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        challengeCount: row.challenge_count,
        estimatedTime: row.estimated_time,
        isPublic: row.is_public,
        creatorId: row.creator_id,
        creatorName: row.creator_name || 'Scavengers Team',
        useCount: Number(row.use_count),
        tags: row.tags || [],
        createdAt: row.created_at,
      })),
      pagination: {
        page,
        limit,
        hasMore: result.rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template from an existing hunt
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { huntId, name, description, category, isPublic = false, tags = [] } = body;

    // Validate required fields
    if (!huntId || !name) {
      return NextResponse.json(
        { error: 'Hunt ID and name are required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(huntId)) {
      return NextResponse.json(
        { error: 'Invalid hunt ID format' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeString(name, 100);
    const sanitizedDescription = description ? sanitizeString(description, 500) : null;
    const sanitizedCategory = category ? sanitizeString(category, 50) : 'general';

    // Verify hunt exists and user owns it
    const huntResult = await sql`
      SELECT h.*,
        (SELECT COUNT(*) FROM challenges c WHERE c.hunt_id = h.id) as challenge_count
      FROM hunts h
      WHERE h.id = ${huntId} AND h.creator_id = ${auth.user.id}
    `;

    if (huntResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found or you do not have permission' },
        { status: 404 }
      );
    }

    const hunt = huntResult.rows[0];

    // Get challenges for the template
    const challengesResult = await sql`
      SELECT title, description, points, verification_type, verification_data, hint, order_index
      FROM challenges
      WHERE hunt_id = ${huntId}
      ORDER BY order_index
    `;

    // Create template
    const templateId = uuidv4();
    const templateData = {
      hunt: {
        title: hunt.title,
        description: hunt.description,
        difficulty: hunt.difficulty,
        duration_minutes: hunt.duration_minutes,
        location: hunt.location,
      },
      challenges: challengesResult.rows.map((c) => ({
        title: c.title,
        description: c.description,
        points: c.points,
        verificationType: c.verification_type,
        verificationData: c.verification_data,
        hint: c.hint,
        orderIndex: c.order_index,
      })),
    };

    const result = await sql`
      INSERT INTO hunt_templates (
        id, name, description, category, difficulty, challenge_count,
        estimated_time, is_public, creator_id, template_data, tags, created_at
      )
      VALUES (
        ${templateId}, ${sanitizedName}, ${sanitizedDescription}, ${sanitizedCategory},
        ${hunt.difficulty}, ${Number(hunt.challenge_count)}, ${hunt.duration_minutes || 60},
        ${isPublic}, ${auth.user.id}, ${JSON.stringify(templateData)},
        ${JSON.stringify(tags)}, NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
