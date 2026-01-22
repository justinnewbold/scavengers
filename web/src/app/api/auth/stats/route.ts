import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    if ('error' in auth) {
      return auth.error;
    }

    const userId = auth.user.id;

    // Fetch user statistics in parallel
    const [createdResult, playedResult, pointsResult, streakResult] = await Promise.all([
      // Count hunts created by user
      sql`
        SELECT COUNT(*)::int as count
        FROM hunts
        WHERE creator_id = ${userId}
      `,
      // Count hunts played (via hunt_participants)
      sql`
        SELECT COUNT(DISTINCT hp.hunt_id)::int as count
        FROM hunt_participants hp
        WHERE hp.user_id = ${userId}
      `,
      // Total points earned across all participations
      sql`
        SELECT COALESCE(SUM(hp.score), 0)::int as total
        FROM hunt_participants hp
        WHERE hp.user_id = ${userId}
      `,
      // Get current streak from user_streaks table if exists
      sql`
        SELECT current_streak, longest_streak, last_activity_date
        FROM user_streaks
        WHERE user_id = ${userId}
      `,
    ]);

    // Calculate if streak is still active (within 24 hours)
    let currentStreak = 0;
    let longestStreak = 0;

    if (streakResult.rows.length > 0) {
      const streakData = streakResult.rows[0];
      const lastActivity = new Date(streakData.last_activity_date);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      // Streak is still valid if within 48 hours (generous window)
      if (hoursSinceActivity <= 48) {
        currentStreak = streakData.current_streak || 0;
      }
      longestStreak = streakData.longest_streak || 0;
    }

    return NextResponse.json({
      huntsCreated: createdResult.rows[0]?.count || 0,
      huntsPlayed: playedResult.rows[0]?.count || 0,
      totalPoints: pointsResult.rows[0]?.total || 0,
      currentStreak,
      longestStreak,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Stats fetch error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
