import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Get tag game details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

    // Get game details
    const gameResult = await db.query(
      'SELECT * FROM tag_games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameResult.rows[0];

    // Get players with user info
    const playersResult = await db.query(
      `SELECT tp.*, u.display_name, u.avatar_url
       FROM tag_players tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.tag_game_id = $1`,
      [gameId]
    );

    // Get current player
    const currentPlayer = playersResult.rows.find(p => p.user_id === user.id);

    // Get safe zones
    const safeZonesResult = await db.query(
      'SELECT * FROM tag_safe_zones WHERE tag_game_id = $1',
      [gameId]
    );

    // Get active bounties
    const bountiesResult = await db.query(
      `SELECT tb.*, u.display_name as placed_by_name
       FROM tag_bounties tb
       JOIN users u ON tb.placed_by = u.id
       WHERE tb.tag_game_id = $1 AND tb.claimed = FALSE AND tb.expires_at > NOW()`,
      [gameId]
    );

    // Get alliances
    const alliancesResult = await db.query(
      `SELECT ta.*, array_agg(tam.user_id) as members
       FROM tag_alliances ta
       LEFT JOIN tag_alliance_members tam ON ta.id = tam.alliance_id
       WHERE ta.tag_game_id = $1 AND ta.betrayed_at IS NULL
       GROUP BY ta.id`,
      [gameId]
    );

    // Get active sabotages (only show own sabotages)
    const sabotagesResult = await db.query(
      `SELECT * FROM tag_sabotages
       WHERE tag_game_id = $1 AND deployed_by = $2 AND expires_at > NOW()`,
      [gameId, user.id]
    );

    return NextResponse.json({
      game,
      players: playersResult.rows.map(p => ({
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        status: p.status,
        currentZone: p.current_zone,
        tagsCompleted: p.tags_completed,
        timesTagged: p.times_tagged,
        challengesCompleted: p.challenges_completed,
        sabotagesDeployed: p.sabotages_deployed,
        bountiesClaimed: p.bounties_claimed,
        score: p.score,
        immuneUntil: p.immune_until,
        stealthUntil: p.stealth_until,
        allianceId: p.alliance_id,
      })),
      currentPlayer: currentPlayer ? {
        id: currentPlayer.id,
        userId: currentPlayer.user_id,
        role: currentPlayer.role,
        score: currentPlayer.score,
        tagsCompleted: currentPlayer.tags_completed,
        timesTagged: currentPlayer.times_tagged,
        challengesCompleted: currentPlayer.challenges_completed,
        immuneUntil: currentPlayer.immune_until,
        stealthUntil: currentPlayer.stealth_until,
        allianceId: currentPlayer.alliance_id,
      } : null,
      safeZones: safeZonesResult.rows,
      bounties: bountiesResult.rows,
      alliances: alliancesResult.rows,
      sabotages: sabotagesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching tag game:', error);
    return NextResponse.json({ error: 'Failed to fetch tag game' }, { status: 500 });
  }
}

// Update game (start, end, settings)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const body = await request.json();
    const { action, settings } = body;

    const gameResult = await db.query(
      'SELECT * FROM tag_games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameResult.rows[0];

    if (action === 'start') {
      // Randomly assign first hunter
      const playersResult = await db.query(
        'SELECT id FROM tag_players WHERE tag_game_id = $1',
        [gameId]
      );

      if (playersResult.rows.length < 2) {
        return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 });
      }

      const randomIndex = Math.floor(Math.random() * playersResult.rows.length);
      const hunterId = playersResult.rows[randomIndex].id;

      // Set hunter
      await db.query(
        'UPDATE tag_players SET role = $1 WHERE tag_game_id = $2',
        ['hunted', gameId]
      );
      await db.query(
        'UPDATE tag_players SET role = $1 WHERE id = $2',
        ['hunter', hunterId]
      );

      // Start game
      await db.query(
        `UPDATE tag_games SET status = 'active', started_at = NOW(), current_hunter_id = $1
         WHERE id = $2`,
        [hunterId, gameId]
      );

      // Log event
      await db.query(
        `INSERT INTO tag_events (tag_game_id, event_type, data)
         VALUES ($1, 'game_started', $2)`,
        [gameId, JSON.stringify({ hunterId })]
      );

      return NextResponse.json({ success: true, hunterId });
    }

    if (action === 'end') {
      await db.query(
        `UPDATE tag_games SET status = 'ended', ended_at = NOW() WHERE id = $1`,
        [gameId]
      );

      return NextResponse.json({ success: true });
    }

    if (settings) {
      await db.query(
        'UPDATE tag_games SET settings = $1 WHERE id = $2',
        [JSON.stringify(settings), gameId]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating tag game:', error);
    return NextResponse.json({ error: 'Failed to update tag game' }, { status: 500 });
  }
}
