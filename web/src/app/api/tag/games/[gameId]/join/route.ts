import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Join a tag game
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

    // Check if game exists
    const gameResult = await db.query(
      'SELECT * FROM tag_games WHERE id = $1',
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameResult.rows[0];

    // Check if game is joinable
    if (game.status === 'ended') {
      return NextResponse.json({ error: 'Game has ended' }, { status: 400 });
    }

    // Check if already in game
    const existingPlayer = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (existingPlayer.rows.length > 0) {
      return NextResponse.json({
        success: true,
        player: existingPlayer.rows[0],
        message: 'Already in game',
      });
    }

    // Check max players (from settings or default to 20)
    const settings = game.settings || {};
    const maxPlayers = settings.maxPlayers || 20;

    const playerCount = await db.query(
      'SELECT COUNT(*) FROM tag_players WHERE tag_game_id = $1',
      [gameId]
    );

    if (parseInt(playerCount.rows[0].count) >= maxPlayers) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Determine role based on game state
    let role = 'hunted';
    if (game.status === 'waiting') {
      role = 'hunted'; // Will be assigned when game starts
    } else if (game.status === 'active') {
      // Late joiners start as hunted
      role = 'hunted';
    }

    // Add player
    const result = await db.query(
      `INSERT INTO tag_players (tag_game_id, user_id, role, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [gameId, user.id, role]
    );

    // Log event
    await db.query(
      `INSERT INTO tag_events (tag_game_id, event_type, actor_id, data)
       VALUES ($1, 'player_joined', $2, $3)`,
      [gameId, user.id, JSON.stringify({})]
    );

    return NextResponse.json({
      success: true,
      player: result.rows[0],
    });
  } catch (error) {
    console.error('Error joining tag game:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}

// Leave a tag game
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

    // Get player
    const playerResult = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not in game' }, { status: 400 });
    }

    const player = playerResult.rows[0];

    // If player is hunter, assign new hunter
    if (player.role === 'hunter') {
      const otherPlayer = await db.query(
        `SELECT id, user_id FROM tag_players
         WHERE tag_game_id = $1 AND user_id != $2 AND status = 'active'
         ORDER BY RANDOM() LIMIT 1`,
        [gameId, user.id]
      );

      if (otherPlayer.rows.length > 0) {
        await db.query(
          'UPDATE tag_players SET role = $1 WHERE id = $2',
          ['hunter', otherPlayer.rows[0].id]
        );
        await db.query(
          'UPDATE tag_games SET current_hunter_id = $1 WHERE id = $2',
          [otherPlayer.rows[0].user_id, gameId]
        );
      }
    }

    // Leave any alliance
    if (player.alliance_id) {
      await db.query(
        'DELETE FROM tag_alliance_members WHERE alliance_id = $1 AND user_id = $2',
        [player.alliance_id, user.id]
      );

      const remaining = await db.query(
        'SELECT COUNT(*) FROM tag_alliance_members WHERE alliance_id = $1',
        [player.alliance_id]
      );

      if (parseInt(remaining.rows[0].count) === 0) {
        await db.query('DELETE FROM tag_alliances WHERE id = $1', [player.alliance_id]);
      }
    }

    // Remove player
    await db.query(
      'DELETE FROM tag_players WHERE id = $1',
      [player.id]
    );

    // Log event
    await db.query(
      `INSERT INTO tag_events (tag_game_id, event_type, actor_id, data)
       VALUES ($1, 'player_left', $2, $3)`,
      [gameId, user.id, JSON.stringify({})]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving tag game:', error);
    return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 });
  }
}
