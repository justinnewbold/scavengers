import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Place a bounty
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const body = await request.json();
    const { targetId, amount, reason } = body;

    if (!targetId || !amount) {
      return NextResponse.json({ error: 'Target and amount required' }, { status: 400 });
    }

    if (amount < 50 || amount > 500) {
      return NextResponse.json({ error: 'Bounty must be between 50-500 points' }, { status: 400 });
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

    // Check if player has enough points
    if (player.score < amount) {
      return NextResponse.json({ error: 'Not enough points' }, { status: 400 });
    }

    // Verify target exists and is in game
    const targetResult = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, targetId]
    );

    if (targetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    // Can't place bounty on yourself
    if (targetId === user.id) {
      return NextResponse.json({ error: 'Cannot place bounty on yourself' }, { status: 400 });
    }

    // Can't place bounty on alliance member
    const target = targetResult.rows[0];
    if (player.alliance_id && player.alliance_id === target.alliance_id) {
      return NextResponse.json({ error: 'Cannot place bounty on alliance member' }, { status: 400 });
    }

    // Deduct points from player
    await db.query(
      'UPDATE tag_players SET score = score - $1 WHERE id = $2',
      [amount, player.id]
    );

    // Create bounty (expires in 30 minutes)
    const result = await db.query(
      `INSERT INTO tag_bounties
       (tag_game_id, target_id, placed_by, reward, reason, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 minutes')
       RETURNING *`,
      [gameId, targetId, user.id, amount, reason || null]
    );

    // Log event
    await db.query(
      `INSERT INTO tag_events (tag_game_id, event_type, actor_id, target_id, data)
       VALUES ($1, 'bounty_placed', $2, $3, $4)`,
      [gameId, user.id, targetId, JSON.stringify({ amount, reason })]
    );

    return NextResponse.json({
      success: true,
      bounty: result.rows[0],
    });
  } catch (error) {
    console.error('Error placing bounty:', error);
    return NextResponse.json({ error: 'Failed to place bounty' }, { status: 500 });
  }
}

// Get active bounties
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

    const result = await db.query(
      `SELECT tb.*,
              u_target.display_name as target_name,
              u_placed.display_name as placed_by_name
       FROM tag_bounties tb
       JOIN users u_target ON tb.target_id = u_target.id
       JOIN users u_placed ON tb.placed_by = u_placed.id
       WHERE tb.tag_game_id = $1
       AND tb.claimed = FALSE
       AND tb.expires_at > NOW()
       ORDER BY tb.reward DESC`,
      [gameId]
    );

    return NextResponse.json({ bounties: result.rows });
  } catch (error) {
    console.error('Error fetching bounties:', error);
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 });
  }
}
