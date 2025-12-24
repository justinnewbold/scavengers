import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isValidUUID, sanitizeString } from '@/lib/auth';

interface TemplateChallenge {
  title: string;
  description: string;
  points: number;
  verificationType: string;
  verificationData?: Record<string, unknown>;
  hint?: string;
  orderIndex: number;
}

interface TemplateData {
  hunt: {
    title: string;
    description: string;
    difficulty: string;
    duration_minutes: number;
    location?: string;
  };
  challenges: TemplateChallenge[];
}

// POST /api/templates/[id]/use - Create a hunt from a template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id: templateId } = await params;

    if (!isValidUUID(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Get optional customizations from body
    const body = await request.json().catch(() => ({}));
    const customTitle = body.title ? sanitizeString(body.title, 255) : null;
    const customDescription = body.description ? sanitizeString(body.description, 2000) : null;
    const customLocation = body.location ? sanitizeString(body.location, 255) : null;
    const isPublic = body.isPublic ?? true;

    // Fetch template
    const templateResult = await sql`
      SELECT * FROM hunt_templates
      WHERE id = ${templateId}
        AND (is_public = true OR creator_id = ${auth.user.id})
    `;

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = templateResult.rows[0];
    const templateData = template.template_data as TemplateData;

    // Create hunt from template
    const huntId = uuidv4();
    const huntResult = await sql`
      INSERT INTO hunts (
        id, title, description, difficulty, status, is_public,
        creator_id, location, duration_minutes, template_id, created_at, updated_at
      )
      VALUES (
        ${huntId},
        ${customTitle || templateData.hunt.title},
        ${customDescription || templateData.hunt.description},
        ${templateData.hunt.difficulty},
        'draft',
        ${isPublic},
        ${auth.user.id},
        ${customLocation || templateData.hunt.location || null},
        ${templateData.hunt.duration_minutes || 60},
        ${templateId},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    // Create challenges from template
    const challenges = templateData.challenges || [];
    for (const challenge of challenges) {
      const challengeId = uuidv4();
      await sql`
        INSERT INTO challenges (
          id, hunt_id, title, description, points,
          verification_type, verification_data, hint, order_index, created_at
        )
        VALUES (
          ${challengeId},
          ${huntId},
          ${challenge.title},
          ${challenge.description},
          ${challenge.points},
          ${challenge.verificationType},
          ${JSON.stringify(challenge.verificationData || {})},
          ${challenge.hint || null},
          ${challenge.orderIndex},
          NOW()
        )
      `;
    }

    // Increment template use count (for analytics)
    await sql`
      UPDATE hunt_templates
      SET use_count = COALESCE(use_count, 0) + 1
      WHERE id = ${templateId}
    `;

    // Fetch the complete hunt with challenges
    const completeHuntResult = await sql`
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
      WHERE h.id = ${huntId}
      GROUP BY h.id
    `;

    return NextResponse.json({
      hunt: completeHuntResult.rows[0],
      template: {
        id: template.id,
        name: template.name,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to use template:', error);
    return NextResponse.json(
      { error: 'Failed to create hunt from template' },
      { status: 500 }
    );
  }
}
