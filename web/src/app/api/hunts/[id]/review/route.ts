import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

// GET /api/hunts/[id]/review - Get pending photo submissions for review
export async function GET(
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
        { error: 'Invalid hunt ID format' },
        { status: 400 }
      );
    }

    // Verify user is hunt creator
    const huntResult = await sql`
      SELECT id, creator_id, title FROM hunts WHERE id = ${huntId}
    `;

    if (huntResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found' },
        { status: 404 }
      );
    }

    if (huntResult.rows[0].creator_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Only the hunt creator can review submissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get submissions pending review (photo type only for now)
    const result = await sql`
      SELECT
        s.id,
        s.participant_id,
        s.challenge_id,
        s.submission_type,
        s.submission_data,
        s.status,
        s.points_awarded,
        s.created_at,
        s.verified_at,
        c.title as challenge_title,
        c.description as challenge_description,
        c.points as challenge_points,
        p.user_id,
        COALESCE(u.display_name, 'Anonymous') as participant_name,
        u.avatar_url as participant_avatar
      FROM submissions s
      JOIN challenges c ON c.id = s.challenge_id
      JOIN participants p ON p.id = s.participant_id
      LEFT JOIN users u ON u.id::text = p.user_id
      WHERE c.hunt_id = ${huntId}
        AND s.status = ${status}
        AND s.submission_type = 'photo'
      ORDER BY s.created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get counts by status
    const countsResult = await sql`
      SELECT
        s.status,
        COUNT(*) as count
      FROM submissions s
      JOIN challenges c ON c.id = s.challenge_id
      WHERE c.hunt_id = ${huntId}
        AND s.submission_type = 'photo'
      GROUP BY s.status
    `;

    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const row of countsResult.rows) {
      counts[row.status as keyof typeof counts] = Number(row.count);
    }

    return NextResponse.json({
      hunt: {
        id: huntResult.rows[0].id,
        title: huntResult.rows[0].title,
      },
      submissions: result.rows.map((row) => ({
        id: row.id,
        participantId: row.participant_id,
        challengeId: row.challenge_id,
        submissionType: row.submission_type,
        submissionData: row.submission_data,
        status: row.status,
        pointsAwarded: row.points_awarded,
        createdAt: row.created_at,
        verifiedAt: row.verified_at,
        challenge: {
          title: row.challenge_title,
          description: row.challenge_description,
          points: row.challenge_points,
        },
        participant: {
          userId: row.user_id,
          name: row.participant_name,
          avatarUrl: row.participant_avatar,
        },
      })),
      counts,
      pagination: {
        page,
        limit,
        hasMore: result.rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}
