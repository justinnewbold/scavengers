import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET /api/leaderboard - Get leaderboard for a hunt
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const huntId = searchParams.get('hunt_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!huntId) {
      return NextResponse.json(
        { error: 'hunt_id required' },
        { status: 400 }
      );
    }
    
    // Get leaderboard with participant info
    const result = await sql`
      SELECT 
        p.id,
        p.user_id,
        p.score,
        p.status,
        p.started_at,
        p.completed_at,
        u.display_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM submissions s WHERE s.participant_id = p.id AND s.status = 'approved') as challenges_completed,
        RANK() OVER (ORDER BY p.score DESC, p.completed_at ASC NULLS LAST) as rank
      FROM participants p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.hunt_id = ${huntId}
      ORDER BY p.score DESC, p.completed_at ASC NULLS LAST
      LIMIT ${limit}
    `;
    
    return NextResponse.json({
      leaderboard: result.rows.map(row => ({
        rank: Number(row.rank),
        participant_id: row.id,
        user_id: row.user_id,
        display_name: row.display_name || `Player ${row.user_id.slice(0, 6)}`,
        avatar_url: row.avatar_url,
        score: row.score,
        challenges_completed: Number(row.challenges_completed),
        status: row.status,
        started_at: row.started_at,
        completed_at: row.completed_at,
      })),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
