import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Unlock achievements
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { achievementIds } = body;

    if (!achievementIds || !Array.isArray(achievementIds) || achievementIds.length === 0) {
      return NextResponse.json({ error: 'Achievement IDs required' }, { status: 400 });
    }

    const unlocked = [];

    for (const achievementId of achievementIds) {
      // Check if achievement exists
      const achievementResult = await db.query(
        'SELECT * FROM achievements WHERE id = $1',
        [achievementId]
      );

      if (achievementResult.rows.length === 0) {
        continue;
      }

      // Check if already unlocked
      const existingResult = await db.query(
        'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [user.id, achievementId]
      );

      if (existingResult.rows.length > 0) {
        continue;
      }

      // Unlock achievement
      const result = await db.query(
        `INSERT INTO user_achievements (user_id, achievement_id, progress, notified)
         VALUES ($1, $2, $3, FALSE)
         RETURNING *`,
        [user.id, achievementId, achievementResult.rows[0].requirement_threshold]
      );

      unlocked.push({
        id: result.rows[0].id,
        achievementId,
        achievement: achievementResult.rows[0],
      });

      // Update user stats with achievement points
      await db.query(
        `UPDATE user_stats
         SET total_points = total_points + $1, updated_at = NOW()
         WHERE user_id = $2`,
        [achievementResult.rows[0].points, user.id]
      );
    }

    return NextResponse.json({
      success: true,
      unlocked,
    });
  } catch (error) {
    console.error('Error unlocking achievements:', error);
    return NextResponse.json({ error: 'Failed to unlock achievements' }, { status: 500 });
  }
}
