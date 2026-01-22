import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Get user's achievements and progress
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unlocked achievements
    const achievementsResult = await db.query(
      `SELECT
        ua.id,
        ua.user_id,
        ua.achievement_id,
        ua.unlocked_at,
        ua.progress,
        ua.notified,
        a.name,
        a.description,
        a.icon,
        a.category,
        a.rarity,
        a.points,
        a.requirement_type,
        a.requirement_threshold
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC`,
      [user.id]
    );

    // Get progress for all achievements
    const progressResult = await db.query(
      `SELECT
        ap.achievement_id,
        ap.current_progress,
        a.requirement_threshold,
        a.name,
        a.description,
        a.icon,
        a.category,
        a.rarity,
        a.points
      FROM achievement_progress ap
      JOIN achievements a ON ap.achievement_id = a.id
      WHERE ap.user_id = $1`,
      [user.id]
    );

    return NextResponse.json({
      achievements: achievementsResult.rows.map(row => ({
        id: row.id,
        oduserId: row.user_id,
        odachievementId: row.achievement_id,
        unlockedAt: row.unlocked_at,
        progress: row.progress,
        notified: row.notified,
      })),
      progress: progressResult.rows.map(row => ({
        odachievementId: row.achievement_id,
        odachievement: {
          id: row.achievement_id,
          name: row.name,
          description: row.description,
          icon: row.icon,
          category: row.category,
          rarity: row.rarity,
          points: row.points,
        },
        currentProgress: row.current_progress,
        threshold: row.requirement_threshold,
        percentComplete: Math.min(100, (row.current_progress / row.requirement_threshold) * 100),
        isUnlocked: false,
      })),
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}
