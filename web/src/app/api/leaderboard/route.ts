import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/leaderboard - Get leaderboard for a hunt
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const huntId = searchParams.get('hunt_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    if (!huntId) {
      return NextResponse.json(
        { error: 'hunt_id required' },
        { status: 400 }
      );
    }

    // Verify hunt exists
    const huntCheck = await sql`SELECT id FROM hunts WHERE id = ${huntId}`;
    if (huntCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found' },
        { status: 404 }
      );
    }

    // Optimized leaderboard query - pre-compute challenges_completed in a CTE
    const result = await sql`
      WITH submission_counts AS (
        SELECT participant_id, COUNT(*) as challenges_completed
        FROM submissions
        WHERE status = 'approved'
        GROUP BY participant_id
      )
      SELECT
        p.id,
        p.user_id,
        p.score,
        p.status,
        p.started_at,
        p.completed_at,
        u.display_name,
        u.avatar_url,
        COALESCE(sc.challenges_completed, 0) as challenges_completed,
        RANK() OVER (ORDER BY p.score DESC, p.completed_at ASC NULLS LAST) as rank
      FROM participants p
      LEFT JOIN users u ON u.id::text = p.user_id
      LEFT JOIN submission_counts sc ON sc.participant_id = p.id
      WHERE p.hunt_id = ${huntId}
      ORDER BY p.score DESC, p.completed_at ASC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Add cache headers for performance
    const response = NextResponse.json({
      leaderboard: result.rows.map((row) => ({
        rank: Number(row.rank),
        participant_id: row.id,
        user_id: row.user_id,
        display_name:
          row.display_name ||
          (row.user_id.startsWith('anon_')
            ? `Anonymous ${row.user_id.slice(5, 9)}`
            : `Player ${row.user_id.slice(0, 6)}`),
        avatar_url: row.avatar_url,
        score: row.score,
        challenges_completed: Number(row.challenges_completed),
        status: row.status,
        started_at: row.started_at,
        completed_at: row.completed_at,
      })),
      pagination: { page, limit, hasMore: result.rows.length === limit },
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=10, stale-while-revalidate=30'
    );

    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Leaderboard error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
