import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Deploy a sabotage
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const body = await request.json();
    const { type, latitude, longitude } = body;

    if (!type || !latitude || !longitude) {
      return NextResponse.json({ error: 'Type and location required' }, { status: 400 });
    }

    const validTypes = [
      'decoy_challenge',
      'location_scramble',
      'point_drain',
      'challenge_intercept',
      'speed_trap',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid sabotage type' }, { status: 400 });
    }

    // Get player
    const playerResult = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const player = playerResult.rows[0];

    // Check cooldown - can only deploy every 5 minutes
    const recentSabotage = await db.query(
      `SELECT * FROM tag_sabotages
       WHERE tag_game_id = $1 AND deployed_by = $2
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [gameId, user.id]
    );

    if (recentSabotage.rows.length > 0) {
      return NextResponse.json({ error: 'Sabotage on cooldown' }, { status: 429 });
    }

    // Get sabotage duration and radius based on type
    const config = getSabotageConfig(type);

    // Create sabotage
    const result = await db.query(
      `INSERT INTO tag_sabotages
       (tag_game_id, deployed_by, sabotage_type, latitude, longitude, radius_meters, expires_at, data)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + $7::INTERVAL, $8)
       RETURNING *`,
      [
        gameId,
        user.id,
        type,
        latitude,
        longitude,
        config.radius,
        config.duration,
        JSON.stringify(config.data),
      ]
    );

    // Update player stats
    await db.query(
      'UPDATE tag_players SET sabotages_deployed = sabotages_deployed + 1 WHERE id = $1',
      [player.id]
    );

    // Log event
    await db.query(
      `INSERT INTO tag_events (tag_game_id, event_type, actor_id, data)
       VALUES ($1, 'sabotage_deployed', $2, $3)`,
      [gameId, user.id, JSON.stringify({ type })]
    );

    return NextResponse.json({
      success: true,
      sabotage: result.rows[0],
    });
  } catch (error) {
    console.error('Error deploying sabotage:', error);
    return NextResponse.json({ error: 'Failed to deploy sabotage' }, { status: 500 });
  }
}

// Get active sabotages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

    // Only return player's own sabotages
    const result = await db.query(
      `SELECT * FROM tag_sabotages
       WHERE tag_game_id = $1 AND deployed_by = $2
       ORDER BY created_at DESC`,
      [gameId, user.id]
    );

    return NextResponse.json({ sabotages: result.rows });
  } catch (error) {
    console.error('Error fetching sabotages:', error);
    return NextResponse.json({ error: 'Failed to fetch sabotages' }, { status: 500 });
  }
}

function getSabotageConfig(type: string): {
  duration: string;
  radius: number;
  data: Record<string, unknown>;
} {
  switch (type) {
    case 'decoy_challenge':
      return { duration: '10 minutes', radius: 30, data: {} };
    case 'location_scramble':
      return { duration: '2 minutes', radius: 50, data: {} };
    case 'point_drain':
      return { duration: '5 minutes', radius: 30, data: { points: 50 } };
    case 'challenge_intercept':
      return { duration: '3 minutes', radius: 40, data: {} };
    case 'speed_trap':
      return { duration: '2 minutes', radius: 30, data: { slowdown: 0.5 } };
    default:
      return { duration: '5 minutes', radius: 30, data: {} };
  }
}
