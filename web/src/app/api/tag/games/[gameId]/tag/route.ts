import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Attempt to tag a player
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const body = await request.json();
    const { targetPlayerId, latitude, longitude } = body;

    if (!targetPlayerId) {
      return NextResponse.json({ error: 'Target player ID required' }, { status: 400 });
    }

    // Get current player
    const currentPlayerResult = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (currentPlayerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const currentPlayer = currentPlayerResult.rows[0];

    // Verify player is hunter
    if (currentPlayer.role !== 'hunter') {
      return NextResponse.json({ error: 'Only hunters can tag' }, { status: 403 });
    }

    // Get target player
    const targetResult = await db.query(
      'SELECT * FROM tag_players WHERE id = $1 AND tag_game_id = $2',
      [targetPlayerId, gameId]
    );

    if (targetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    const target = targetResult.rows[0];

    // Check if target is immune
    if (target.immune_until && new Date(target.immune_until) > new Date()) {
      return NextResponse.json({ error: 'Target is immune' }, { status: 400 });
    }

    // Check if target is in stealth
    if (target.stealth_until && new Date(target.stealth_until) > new Date()) {
      return NextResponse.json({ error: 'Target is in stealth mode' }, { status: 400 });
    }

    // Check if target is in safe zone
    const safeZoneResult = await db.query(
      `SELECT * FROM tag_safe_zones
       WHERE tag_game_id = $1
       AND (
         (active_start_hour IS NULL) OR
         (EXTRACT(HOUR FROM NOW()) BETWEEN active_start_hour AND active_end_hour)
       )`,
      [gameId]
    );

    if (target.last_latitude && target.last_longitude) {
      for (const zone of safeZoneResult.rows) {
        const distance = calculateDistance(
          target.last_latitude,
          target.last_longitude,
          zone.latitude,
          zone.longitude
        );
        if (distance <= zone.radius_meters) {
          return NextResponse.json({ error: 'Target is in a safe zone' }, { status: 400 });
        }
      }
    }

    // Check if target is in same alliance
    if (currentPlayer.alliance_id && currentPlayer.alliance_id === target.alliance_id) {
      return NextResponse.json({ error: 'Cannot tag alliance member' }, { status: 400 });
    }

    // Check proximity (within 50 meters)
    if (latitude && longitude && target.last_latitude && target.last_longitude) {
      const distance = calculateDistance(
        latitude,
        longitude,
        target.last_latitude,
        target.last_longitude
      );

      if (distance > 50) {
        return NextResponse.json({ error: 'Target is too far away' }, { status: 400 });
      }
    }

    // Perform the tag
    const pointsStolen = Math.floor(target.score * 0.1); // Steal 10% of points

    // Update tagger stats
    await db.query(
      `UPDATE tag_players
       SET tags_completed = tags_completed + 1,
           score = score + 100 + $1,
           role = 'hunted'
       WHERE id = $2`,
      [pointsStolen, currentPlayer.id]
    );

    // Update target stats
    await db.query(
      `UPDATE tag_players
       SET times_tagged = times_tagged + 1,
           score = score - $1,
           role = 'hunter',
           immune_until = NOW() + INTERVAL '30 seconds'
       WHERE id = $2`,
      [pointsStolen, target.id]
    );

    // Update game's current hunter
    await db.query(
      'UPDATE tag_games SET current_hunter_id = $1 WHERE id = $2',
      [target.user_id, gameId]
    );

    // Log event
    await db.query(
      `INSERT INTO tag_events (tag_game_id, event_type, actor_id, target_id, data)
       VALUES ($1, 'tag', $2, $3, $4)`,
      [gameId, user.id, target.user_id, JSON.stringify({ pointsStolen })]
    );

    // Check for bounty claims
    const bountyResult = await db.query(
      `SELECT * FROM tag_bounties
       WHERE tag_game_id = $1 AND target_id = $2 AND claimed = FALSE AND expires_at > NOW()`,
      [gameId, target.user_id]
    );

    let bountyReward = 0;
    for (const bounty of bountyResult.rows) {
      bountyReward += bounty.reward;
      await db.query(
        `UPDATE tag_bounties SET claimed = TRUE, claimed_by = $1, claimed_at = NOW() WHERE id = $2`,
        [user.id, bounty.id]
      );
    }

    if (bountyReward > 0) {
      await db.query(
        'UPDATE tag_players SET score = score + $1, bounties_claimed = bounties_claimed + 1 WHERE id = $2',
        [bountyReward, currentPlayer.id]
      );
    }

    return NextResponse.json({
      success: true,
      pointsEarned: 100 + pointsStolen + bountyReward,
      bountyReward,
      newHunter: target.user_id,
    });
  } catch (error) {
    console.error('Error tagging player:', error);
    return NextResponse.json({ error: 'Failed to tag player' }, { status: 500 });
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
