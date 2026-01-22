import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ huntId: string }>;
}

// Get challenge-level analytics for a hunt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { huntId } = await params;

    // Verify user owns this hunt
    const huntResult = await db.query(
      'SELECT * FROM hunts WHERE id = $1',
      [huntId]
    );

    if (huntResult.rows.length === 0) {
      return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
    }

    if (huntResult.rows[0].creator_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get challenge analytics
    const challengeResult = await db.query(
      `SELECT
        ca.*,
        c.title as challenge_title,
        c.points as base_points
      FROM challenge_analytics ca
      JOIN challenges c ON ca.challenge_id = c.id
      WHERE ca.hunt_id = $1
      ORDER BY ca.order_index ASC`,
      [huntId]
    );

    // If no analytics yet, generate from challenges
    if (challengeResult.rows.length === 0) {
      const challenges = huntResult.rows[0].challenges || [];

      return NextResponse.json({
        challenges: challenges.map((c: { id: string; title: string; points: number }, index: number) => ({
          challengeId: c.id || `challenge-${index}`,
          challengeTitle: c.title,
          huntId,
          orderIndex: index,
          totalAttempts: 0,
          successfulCompletions: 0,
          completionRate: 0,
          averageTime: 0,
          fastestTime: null,
          slowestTime: null,
          verificationSuccessRate: 0,
          skipCount: 0,
          abandonCount: 0,
          averageDifficulty: 0,
          basePoints: c.points,
          averagePointsAwarded: 0,
        })),
      });
    }

    return NextResponse.json({
      challenges: challengeResult.rows.map(row => ({
        challengeId: row.challenge_id,
        challengeTitle: row.challenge_title,
        huntId: row.hunt_id,
        orderIndex: row.order_index,
        totalAttempts: parseInt(row.total_attempts) || 0,
        successfulCompletions: parseInt(row.successful_completions) || 0,
        completionRate: parseFloat(row.completion_rate) || 0,
        averageTime: parseInt(row.average_time) || 0,
        fastestTime: row.fastest_time ? parseInt(row.fastest_time) : null,
        slowestTime: row.slowest_time ? parseInt(row.slowest_time) : null,
        verificationSuccessRate: parseFloat(row.verification_success_rate) || 0,
        skipCount: parseInt(row.skip_count) || 0,
        abandonCount: parseInt(row.abandon_count) || 0,
        averageDifficulty: parseFloat(row.average_difficulty) || 0,
        basePoints: parseInt(row.base_points) || 0,
        averagePointsAwarded: parseFloat(row.average_points_awarded) || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching challenge analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch challenge analytics' }, { status: 500 });
  }
}
