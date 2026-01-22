import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

// Create or manage alliance
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const body = await request.json();
    const { action, partnerId, name } = body;

    // Get current player
    const playerResult = await db.query(
      'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const player = playerResult.rows[0];

    if (action === 'form') {
      if (!partnerId || !name) {
        return NextResponse.json({ error: 'Partner and name required' }, { status: 400 });
      }

      // Check if already in alliance
      if (player.alliance_id) {
        return NextResponse.json({ error: 'Already in an alliance' }, { status: 400 });
      }

      // Check if partner exists and is not in alliance
      const partnerResult = await db.query(
        'SELECT * FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
        [gameId, partnerId]
      );

      if (partnerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
      }

      const partner = partnerResult.rows[0];
      if (partner.alliance_id) {
        return NextResponse.json({ error: 'Partner is already in an alliance' }, { status: 400 });
      }

      // Create alliance
      const allianceResult = await db.query(
        `INSERT INTO tag_alliances (tag_game_id, name, leader_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [gameId, name, user.id]
      );

      const alliance = allianceResult.rows[0];

      // Add both members
      await db.query(
        `INSERT INTO tag_alliance_members (alliance_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [alliance.id, user.id, partnerId]
      );

      // Update both players
      await db.query(
        'UPDATE tag_players SET alliance_id = $1 WHERE tag_game_id = $2 AND user_id IN ($3, $4)',
        [alliance.id, gameId, user.id, partnerId]
      );

      // Log event
      await db.query(
        `INSERT INTO tag_events (tag_game_id, event_type, actor_id, target_id, data)
         VALUES ($1, 'alliance_formed', $2, $3, $4)`,
        [gameId, user.id, partnerId, JSON.stringify({ name })]
      );

      return NextResponse.json({ success: true, alliance });
    }

    if (action === 'leave') {
      if (!player.alliance_id) {
        return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
      }

      // Remove from alliance
      await db.query(
        'DELETE FROM tag_alliance_members WHERE alliance_id = $1 AND user_id = $2',
        [player.alliance_id, user.id]
      );

      // Clear alliance from player
      await db.query(
        'UPDATE tag_players SET alliance_id = NULL WHERE id = $1',
        [player.id]
      );

      // Check if alliance is now empty and delete it
      const remaining = await db.query(
        'SELECT COUNT(*) FROM tag_alliance_members WHERE alliance_id = $1',
        [player.alliance_id]
      );

      if (parseInt(remaining.rows[0].count) === 0) {
        await db.query('DELETE FROM tag_alliances WHERE id = $1', [player.alliance_id]);
      }

      // Log event
      await db.query(
        `INSERT INTO tag_events (tag_game_id, event_type, actor_id, data)
         VALUES ($1, 'alliance_left', $2, $3)`,
        [gameId, user.id, JSON.stringify({})]
      );

      return NextResponse.json({ success: true });
    }

    if (action === 'betray') {
      if (!player.alliance_id) {
        return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
      }

      // Get ally
      const allyResult = await db.query(
        `SELECT tp.* FROM tag_players tp
         JOIN tag_alliance_members tam ON tp.user_id = tam.user_id
         WHERE tam.alliance_id = $1 AND tp.user_id != $2`,
        [player.alliance_id, user.id]
      );

      if (allyResult.rows.length === 0) {
        return NextResponse.json({ error: 'No ally to betray' }, { status: 400 });
      }

      const ally = allyResult.rows[0];

      // Steal 25% of ally's points
      const pointsStolen = Math.floor(ally.score * 0.25);

      // Update ally (lose points)
      await db.query(
        'UPDATE tag_players SET score = score - $1 WHERE id = $2',
        [pointsStolen, ally.id]
      );

      // Update betrayer (gain points, mark as traitor)
      await db.query(
        `UPDATE tag_players
         SET score = score + $1, alliance_id = NULL
         WHERE id = $2`,
        [pointsStolen, player.id]
      );

      // Mark alliance as betrayed
      await db.query(
        `UPDATE tag_alliances
         SET betrayed_at = NOW(), betrayed_by = $1
         WHERE id = $2`,
        [user.id, player.alliance_id]
      );

      // Clear ally's alliance
      await db.query(
        'UPDATE tag_players SET alliance_id = NULL WHERE id = $1',
        [ally.id]
      );

      // Log event
      await db.query(
        `INSERT INTO tag_events (tag_game_id, event_type, actor_id, target_id, data)
         VALUES ($1, 'alliance_betrayed', $2, $3, $4)`,
        [gameId, user.id, ally.user_id, JSON.stringify({ pointsStolen })]
      );

      return NextResponse.json({
        success: true,
        pointsStolen,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing alliance:', error);
    return NextResponse.json({ error: 'Failed to manage alliance' }, { status: 500 });
  }
}

// Get current alliance
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;

    // Get player's alliance
    const playerResult = await db.query(
      'SELECT alliance_id FROM tag_players WHERE tag_game_id = $1 AND user_id = $2',
      [gameId, user.id]
    );

    if (playerResult.rows.length === 0 || !playerResult.rows[0].alliance_id) {
      return NextResponse.json({ alliance: null });
    }

    const allianceId = playerResult.rows[0].alliance_id;

    // Get alliance details
    const allianceResult = await db.query(
      `SELECT ta.*,
              array_agg(tam.user_id) as members,
              array_agg(u.display_name) as member_names
       FROM tag_alliances ta
       JOIN tag_alliance_members tam ON ta.id = tam.alliance_id
       JOIN users u ON tam.user_id = u.id
       WHERE ta.id = $1
       GROUP BY ta.id`,
      [allianceId]
    );

    if (allianceResult.rows.length === 0) {
      return NextResponse.json({ alliance: null });
    }

    return NextResponse.json({ alliance: allianceResult.rows[0] });
  } catch (error) {
    console.error('Error fetching alliance:', error);
    return NextResponse.json({ error: 'Failed to fetch alliance' }, { status: 500 });
  }
}
