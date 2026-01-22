import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Get analytics dashboard for all hunts created by user
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all hunts by this creator with their analytics
    const result = await db.query(
      `SELECT
        h.id as hunt_id,
        h.title as hunt_title,
        h.created_at,
        h.is_public,
        COALESCE(ha.total_plays, 0) as total_plays,
        COALESCE(ha.unique_players, 0) as unique_players,
        COALESCE(ha.completion_rate, 0) as completion_rate,
        COALESCE(ha.average_score, 0) as average_score,
        COALESCE(ha.average_time, 0) as average_time,
        COALESCE(ha.average_rating, 0) as average_rating,
        COALESCE(ha.total_ratings, 0) as total_ratings,
        COALESCE(ha.plays_today, 0) as plays_today,
        COALESCE(ha.plays_this_week, 0) as plays_this_week,
        COALESCE(ha.plays_this_month, 0) as plays_this_month,
        COALESCE(ha.share_count, 0) as share_count,
        ha.last_played_at
      FROM hunts h
      LEFT JOIN hunt_analytics ha ON h.id = ha.hunt_id
      WHERE h.creator_id = $1
      ORDER BY COALESCE(ha.total_plays, 0) DESC, h.created_at DESC`,
      [user.id]
    );

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, row) => ({
        totalPlays: acc.totalPlays + parseInt(row.total_plays),
        totalPlayers: acc.totalPlayers + parseInt(row.unique_players),
        totalRatings: acc.totalRatings + parseInt(row.total_ratings),
        ratingSum: acc.ratingSum + (parseFloat(row.average_rating) * parseInt(row.total_ratings)),
      }),
      { totalPlays: 0, totalPlayers: 0, totalRatings: 0, ratingSum: 0 }
    );

    // Get trending data (last 7 days)
    const trendResult = await db.query(
      `SELECT
        date,
        SUM(plays) as plays,
        SUM(completions) as completions
      FROM daily_hunt_stats dhs
      JOIN hunts h ON dhs.hunt_id = h.id
      WHERE h.creator_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date
      ORDER BY date ASC`,
      [user.id]
    );

    return NextResponse.json({
      hunts: result.rows.map(row => ({
        huntId: row.hunt_id,
        huntTitle: row.hunt_title,
        creatorId: user.id,
        totalPlays: parseInt(row.total_plays),
        uniquePlayers: parseInt(row.unique_players),
        completionRate: parseFloat(row.completion_rate),
        averageScore: parseFloat(row.average_score),
        averageTime: parseInt(row.average_time),
        playsToday: parseInt(row.plays_today),
        playsThisWeek: parseInt(row.plays_this_week),
        playsThisMonth: parseInt(row.plays_this_month),
        averageRating: parseFloat(row.average_rating),
        totalRatings: parseInt(row.total_ratings),
        shareCount: parseInt(row.share_count),
        createdAt: row.created_at,
        lastPlayedAt: row.last_played_at,
        isPublic: row.is_public,
      })),
      totals: {
        totalHunts: result.rows.length,
        totalPlays: totals.totalPlays,
        totalPlayers: totals.totalPlayers,
        averageRating: totals.totalRatings > 0
          ? (totals.ratingSum / totals.totalRatings).toFixed(1)
          : 0,
      },
      trend: trendResult.rows.map(row => ({
        date: row.date,
        plays: parseInt(row.plays),
        completions: parseInt(row.completions),
      })),
    });
  } catch (error) {
    console.error('Error fetching creator dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
