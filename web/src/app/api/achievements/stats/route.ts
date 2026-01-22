import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Get user stats for achievements
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user stats
    let result = await db.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      // Create initial stats
      await db.query(
        'INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [user.id]
      );
      result = await db.query(
        'SELECT * FROM user_stats WHERE user_id = $1',
        [user.id]
      );
    }

    const stats = result.rows[0];

    return NextResponse.json({
      stats: {
        huntsCompleted: stats.hunts_completed,
        challengesCompleted: stats.challenges_completed,
        totalPoints: stats.total_points,
        streakDays: stats.streak_days,
        maxStreak: stats.max_streak,
        huntsCreated: stats.hunts_created,
        totalHuntPlays: stats.total_hunt_plays,
        groupHunts: stats.group_hunts,
        soloHunts: stats.solo_hunts,
        citiesVisited: stats.cities_visited,
        nightHunts: stats.night_hunts,
        perfectHunts: stats.perfect_hunts,
        photosTaken: stats.photos_taken,
        tagsMade: stats.tags_made,
        bountiesClaimed: stats.bounties_claimed,
        alliancesFormed: stats.alliances_formed,
        sabotagesDeployed: stats.sabotages_deployed,
        fastestHuntMinutes: stats.fastest_hunt_minutes,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

// Update user stats
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate fields
    const allowedFields = [
      'hunts_completed', 'challenges_completed', 'total_points',
      'streak_days', 'max_streak', 'hunts_created', 'total_hunt_plays',
      'group_hunts', 'solo_hunts', 'cities_visited', 'night_hunts',
      'perfect_hunts', 'photos_taken', 'tags_made', 'bounties_claimed',
      'alliances_formed', 'sabotages_deployed',
    ];

    const updates: string[] = [];
    const values: unknown[] = [user.id];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(body)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey) && typeof value === 'number') {
        updates.push(`${snakeKey} = ${snakeKey} + $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    // Ensure user stats exist
    await db.query(
      'INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.id]
    );

    // Apply updates
    await db.query(
      `UPDATE user_stats
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $1`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user stats:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
