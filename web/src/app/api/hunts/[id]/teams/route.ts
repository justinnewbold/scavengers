import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isValidUUID, sanitizeString } from '@/lib/auth';

// Team colors for visual distinction
const TEAM_COLORS = [
  '#FF6B35', // Orange
  '#1A535C', // Teal
  '#FFE66D', // Gold
  '#4ECDC4', // Cyan
  '#FF6B6B', // Coral
  '#95E1D3', // Mint
  '#F38181', // Pink
  '#AA96DA', // Purple
];

// GET /api/hunts/[id]/teams - List teams for a hunt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: huntId } = await params;

    if (!isValidUUID(huntId)) {
      return NextResponse.json(
        { error: 'Invalid hunt ID format' },
        { status: 400 }
      );
    }

    // Get teams with member count and total score
    const result = await sql`
      SELECT
        t.id,
        t.name,
        t.color,
        t.created_at,
        COUNT(DISTINCT p.id) as member_count,
        COALESCE(SUM(p.score), 0) as total_score
      FROM teams t
      LEFT JOIN participants p ON p.team_id = t.id AND p.status != 'left'
      WHERE t.hunt_id = ${huntId}
      GROUP BY t.id
      ORDER BY total_score DESC, t.created_at ASC
    `;

    return NextResponse.json({
      teams: result.rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        memberCount: Number(row.member_count),
        totalScore: Number(row.total_score),
        rank: index + 1,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST /api/hunts/[id]/teams - Create a new team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id: huntId } = await params;

    if (!isValidUUID(huntId)) {
      return NextResponse.json(
        { error: 'Invalid hunt ID format' },
        { status: 400 }
      );
    }

    // Verify hunt exists and user is creator or admin
    const huntResult = await sql`
      SELECT id, creator_id FROM hunts WHERE id = ${huntId}
    `;

    if (huntResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Hunt not found' },
        { status: 404 }
      );
    }

    const hunt = huntResult.rows[0];
    if (hunt.creator_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Only the hunt creator can create teams' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = sanitizeString(body.name || '', 50);

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Team name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Check for duplicate team name in this hunt
    const existingResult = await sql`
      SELECT id FROM teams WHERE hunt_id = ${huntId} AND LOWER(name) = LOWER(${name})
    `;

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'A team with this name already exists' },
        { status: 409 }
      );
    }

    // Get team count to assign color
    const countResult = await sql`
      SELECT COUNT(*) as count FROM teams WHERE hunt_id = ${huntId}
    `;
    const teamCount = Number(countResult.rows[0].count);
    const color = body.color || TEAM_COLORS[teamCount % TEAM_COLORS.length];

    // Create team
    const teamId = uuidv4();
    const result = await sql`
      INSERT INTO teams (id, hunt_id, name, color, created_at)
      VALUES (${teamId}, ${huntId}, ${name}, ${color}, NOW())
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
