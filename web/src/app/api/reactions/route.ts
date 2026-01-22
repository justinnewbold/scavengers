import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isValidUUID } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimiters, rateLimitResponse } from '@/lib/rateLimit';

const VALID_REACTION_TYPES = ['fire', 'laugh', 'wow', 'love', 'clap'];

// POST /api/reactions - Add or update reaction
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, rateLimiters.submissions);

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { submission_id, reaction_type } = body;

    // Validate required fields
    if (!submission_id || !reaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: submission_id, reaction_type' },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!isValidUUID(submission_id)) {
      return NextResponse.json(
        { error: 'Invalid submission_id format' },
        { status: 400 }
      );
    }

    // Validate reaction type
    if (!VALID_REACTION_TYPES.includes(reaction_type)) {
      return NextResponse.json(
        { error: `Invalid reaction_type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify submission exists
    const submissionResult = await sql`
      SELECT id FROM submissions WHERE id = ${submission_id}
    `;

    if (submissionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check for existing reaction from this user
    const existingResult = await sql`
      SELECT id, reaction_type FROM reactions
      WHERE submission_id = ${submission_id} AND user_id = ${auth.user.id}
    `;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      // If same reaction, remove it (toggle off)
      if (existing.reaction_type === reaction_type) {
        await sql`
          DELETE FROM reactions WHERE id = ${existing.id}
        `;
        return NextResponse.json({ removed: true, reaction_type });
      }

      // Otherwise, update to new reaction
      await sql`
        UPDATE reactions
        SET reaction_type = ${reaction_type}, created_at = NOW()
        WHERE id = ${existing.id}
      `;

      return NextResponse.json({
        updated: true,
        previous_type: existing.reaction_type,
        reaction_type,
      });
    }

    // Create new reaction
    const reactionId = uuidv4();
    await sql`
      INSERT INTO reactions (id, submission_id, user_id, reaction_type, created_at)
      VALUES (${reactionId}, ${submission_id}, ${auth.user.id}, ${reaction_type}, NOW())
    `;

    return NextResponse.json(
      { id: reactionId, submission_id, reaction_type, created: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create reaction:', error);
    return NextResponse.json(
      { error: 'Failed to create reaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/reactions - Remove reaction
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submission_id');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submission_id query parameter' },
        { status: 400 }
      );
    }

    if (!isValidUUID(submissionId)) {
      return NextResponse.json(
        { error: 'Invalid submission_id format' },
        { status: 400 }
      );
    }

    // Delete the user's reaction for this submission
    const result = await sql`
      DELETE FROM reactions
      WHERE submission_id = ${submissionId} AND user_id = ${auth.user.id}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No reaction found to delete' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete reaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete reaction' },
      { status: 500 }
    );
  }
}

// GET /api/reactions - Get reactions for a submission
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submission_id');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submission_id query parameter' },
        { status: 400 }
      );
    }

    if (!isValidUUID(submissionId)) {
      return NextResponse.json(
        { error: 'Invalid submission_id format' },
        { status: 400 }
      );
    }

    // Get reaction counts
    const countsResult = await sql<{ reaction_type: string; count: string }>`
      SELECT reaction_type, COUNT(*) as count
      FROM reactions
      WHERE submission_id = ${submissionId}
      GROUP BY reaction_type
    `;

    const reactions: Record<string, number> = {
      fire: 0,
      laugh: 0,
      wow: 0,
      love: 0,
      clap: 0,
    };

    countsResult.rows.forEach((row) => {
      reactions[row.reaction_type] = parseInt(row.count);
    });

    const total = Object.values(reactions).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      submission_id: submissionId,
      reactions: { ...reactions, total },
    });
  } catch (error) {
    console.error('Failed to get reactions:', error);
    return NextResponse.json(
      { error: 'Failed to get reactions' },
      { status: 500 }
    );
  }
}
