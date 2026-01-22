import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Create a new tag game
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { huntId, mode = 'hunter_hunted', settings = {} } = body;

    if (!huntId) {
      return NextResponse.json({ error: 'Hunt ID required' }, { status: 400 });
    }

    // Check if hunt exists and user has access
    const hunt = await db.query(
      'SELECT * FROM hunts WHERE id = $1 AND (creator_id = $2 OR id IN (SELECT hunt_id FROM participants WHERE user_id = $2))',
      [huntId, user.id]
    );

    if (hunt.rows.length === 0) {
      return NextResponse.json({ error: 'Hunt not found or access denied' }, { status: 404 });
    }

    // Create the tag game
    const result = await db.query(
      `INSERT INTO tag_games (hunt_id, mode, settings, status)
       VALUES ($1, $2, $3, 'waiting')
       RETURNING *`,
      [huntId, mode, JSON.stringify(settings)]
    );

    const game = result.rows[0];

    // Add creator as first player
    await db.query(
      `INSERT INTO tag_players (tag_game_id, user_id, role, status)
       VALUES ($1, $2, 'hunted', 'active')`,
      [game.id, user.id]
    );

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error creating tag game:', error);
    return NextResponse.json({ error: 'Failed to create tag game' }, { status: 500 });
  }
}

// Get tag games for a hunt
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const huntId = searchParams.get('huntId');

    let query = `
      SELECT tg.*,
             COUNT(DISTINCT tp.id) as player_count,
             EXISTS(SELECT 1 FROM tag_players WHERE tag_game_id = tg.id AND user_id = $1) as is_participant
      FROM tag_games tg
      LEFT JOIN tag_players tp ON tg.id = tp.tag_game_id
    `;

    const params: (string | null)[] = [user.id];

    if (huntId) {
      query += ' WHERE tg.hunt_id = $2';
      params.push(huntId);
    }

    query += ' GROUP BY tg.id ORDER BY tg.created_at DESC';

    const result = await db.query(query, params);

    return NextResponse.json({ games: result.rows });
  } catch (error) {
    console.error('Error fetching tag games:', error);
    return NextResponse.json({ error: 'Failed to fetch tag games' }, { status: 500 });
  }
}
