import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/achievements - Get all achievements with user progress
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    // Get all achievements with user's earned status
    const result = await sql`
      SELECT
        a.id,
        a.name,
        a.description,
        a.icon,
        a.category,
        a.requirement_type,
        a.requirement_value,
        a.points,
        ua.earned_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ${auth.userId}
      ORDER BY a.category, a.points
    `;

    // Get user stats for progress calculation
    const statsResult = await sql`
      SELECT
        (SELECT COUNT(*) FROM participants WHERE user_id = ${auth.userId} AND status = 'completed') as hunts_completed,
        (SELECT COUNT(*) FROM submissions WHERE participant_id IN (SELECT id FROM participants WHERE user_id = ${auth.userId}) AND status = 'approved') as challenges_completed,
        (SELECT COUNT(*) FROM hunts WHERE creator_id = ${auth.userId}) as hunts_created,
        (SELECT COUNT(*) FROM team_members WHERE user_id = ${auth.userId}) as teams_joined
    `;

    const stats = statsResult.rows[0] || {};

    // Calculate progress for each achievement
    const achievements = result.rows.map(a => {
      let progress = 0;
      const current = parseInt(stats[a.requirement_type] || '0', 10);

      if (a.earned) {
        progress = 100;
      } else {
        progress = Math.min(100, Math.round((current / a.requirement_value) * 100));
      }

      return {
        ...a,
        progress,
        current,
      };
    });

    // Group by category
    const grouped = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as Record<string, typeof achievements>);

    return NextResponse.json({
      achievements,
      grouped,
      stats: {
        total: achievements.length,
        earned: achievements.filter(a => a.earned).length,
        totalPoints: achievements.filter(a => a.earned).reduce((sum, a) => sum + a.points, 0),
      },
    });
  } catch (error) {
    console.error('Achievements fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
