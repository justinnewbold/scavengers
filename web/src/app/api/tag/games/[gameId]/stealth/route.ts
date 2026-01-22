import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Toggle stealth mode
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const player = playerResult.rows[0];

    // Check if stealth is currently active
    const isStealthActive = player.stealth_until && new Date(player.stealth_until) > new Date();

    if (isStealthActive) {
      // Deactivate stealth
      await db.query(
        'UPDATE tag_players SET stealth_until = NULL WHERE id = $1',
        [player.id]
      );

      return NextResponse.json({
        success: true,
        stealthActive: false,
      });
    }

    // Check cooldown (can only use stealth every 10 minutes)
    // We track this by checking recent stealth events
    const recentStealth = await db.query(
      `SELECT * FROM tag_events
       WHERE tag_game_id = $1 AND actor_id = $2 AND event_type = 'stealth_activated'
       AND created_at > NOW() - INTERVAL '10 minutes'`,
      [gameId, user.id]
    );

    if (recentStealth.rows.length > 0) {
      const lastUsed = new Date(recentStealth.rows[0].created_at);
      const cooldownEnds = new Date(lastUsed.getTime() + 10 * 60 * 1000);
      const remaining = Math.ceil((cooldownEnds.getTime() - Date.now()) / 1000);

      return NextResponse.json({
        error: 'Stealth on cooldown',
        cooldownRemaining: remaining,
      }, { status: 429 });
    }

    // Activate stealth (2 minutes duration)
    const stealthUntil = new Date(Date.now() + 2 * 60 * 1000);

    await db.query(
      'UPDATE tag_players SET stealth_until = $1 WHERE id = $2',
      [stealthUntil, player.id]
    );

    // Log event
    await db.query(
      `INSERT INTO tag_events (tag_game_id, event_type, actor_id, data)
       VALUES ($1, 'stealth_activated', $2, $3)`,
      [gameId, user.id, JSON.stringify({ duration: 120 })]
    );

    return NextResponse.json({
      success: true,
      stealthActive: true,
      stealthUntil: stealthUntil.toISOString(),
    });
  } catch (error) {
    console.error('Error toggling stealth:', error);
    return NextResponse.json({ error: 'Failed to toggle stealth' }, { status: 500 });
  }
}
