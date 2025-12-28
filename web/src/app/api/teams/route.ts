import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, sanitizeString } from '@/lib/auth';

// GET /api/teams - Get user's teams
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const result = await sql`
      SELECT t.id, t.name, t.description, t.avatar_url, t.created_at,
             tm.role,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ${auth.user.id}
      ORDER BY t.created_at DESC
    `;

    return NextResponse.json({ teams: result.rows });
  } catch (error) {
    console.error('Teams fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const name = sanitizeString(body.name || '', 100);
    const description = sanitizeString(body.description || '', 500);

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Team name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Create team
    const teamResult = await sql`
      INSERT INTO teams (name, description, created_by)
      VALUES (${name}, ${description || null}, ${auth.user.id})
      RETURNING id, name, description, avatar_url, created_at
    `;

    const team = teamResult.rows[0];

    // Add creator as owner
    await sql`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (${team.id}, ${auth.user.id}, 'owner')
    `;

    return NextResponse.json({
      team: { ...team, role: 'owner', member_count: 1 },
    });
  } catch (error) {
    console.error('Team create error:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
