import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ huntId: string }>;
}

// Get hunt analytics
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

    const hunt = huntResult.rows[0];
    if (hunt.creator_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to view analytics' }, { status: 403 });
    }

    // Get or create analytics record
    let analyticsResult = await db.query(
      'SELECT * FROM hunt_analytics WHERE hunt_id = $1',
      [huntId]
    );

    if (analyticsResult.rows.length === 0) {
      // Create initial analytics record
      await db.query(
        'INSERT INTO hunt_analytics (hunt_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [huntId]
      );
      analyticsResult = await db.query(
        'SELECT * FROM hunt_analytics WHERE hunt_id = $1',
        [huntId]
      );
    }

    const analytics = analyticsResult.rows[0];

    // Get additional computed stats
    const sessionStats = await db.query(
      `SELECT
        COUNT(DISTINCT user_id) as unique_players,
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE drop_off_reason = 'completed') as completions,
        AVG(total_score) FILTER (WHERE drop_off_reason = 'completed') as avg_score,
        AVG(total_time) FILTER (WHERE drop_off_reason = 'completed') as avg_time
      FROM player_sessions
      WHERE hunt_id = $1`,
      [huntId]
    );

    const stats = sessionStats.rows[0];

    return NextResponse.json({
      analytics: {
        huntId,
        huntTitle: hunt.title,
        creatorId: hunt.creator_id,
        totalPlays: parseInt(analytics.total_plays) || 0,
        uniquePlayers: parseInt(stats.unique_players) || 0,
        completionRate: stats.total_sessions > 0
          ? (parseInt(stats.completions) / parseInt(stats.total_sessions) * 100).toFixed(1)
          : 0,
        averageScore: parseFloat(stats.avg_score) || 0,
        averageTime: parseInt(stats.avg_time) || 0,
        playsToday: parseInt(analytics.plays_today) || 0,
        playsThisWeek: parseInt(analytics.plays_this_week) || 0,
        playsThisMonth: parseInt(analytics.plays_this_month) || 0,
        averageRating: parseFloat(analytics.average_rating) || 0,
        totalRatings: parseInt(analytics.total_ratings) || 0,
        ratingDistribution: {
          '1': parseInt(analytics.rating_1) || 0,
          '2': parseInt(analytics.rating_2) || 0,
          '3': parseInt(analytics.rating_3) || 0,
          '4': parseInt(analytics.rating_4) || 0,
          '5': parseInt(analytics.rating_5) || 0,
        },
        repeatPlayers: parseInt(analytics.repeat_players) || 0,
        shareCount: parseInt(analytics.share_count) || 0,
        createdAt: hunt.created_at,
        lastPlayedAt: analytics.last_played_at,
        updatedAt: analytics.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching hunt analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
