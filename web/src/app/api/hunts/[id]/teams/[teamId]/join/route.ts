import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

// POST /api/hunts/[id]/teams/[teamId]/join - Join a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id: huntId, teamId } = await params;

    if (!isValidUUID(huntId) || !isValidUUID(teamId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Verify team exists and belongs to this hunt
    const teamResult = await sql`
      SELECT t.id, t.hunt_id, h.max_participants
      FROM teams t
      JOIN hunts h ON h.id = t.hunt_id
      WHERE t.id = ${teamId} AND t.hunt_id = ${huntId}
    `;

    if (teamResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is already a participant
    const participantResult = await sql`
      SELECT id, team_id, status FROM participants
      WHERE hunt_id = ${huntId} AND user_id = ${auth.user.id}
    `;

    if (participantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'You must join the hunt first before joining a team' },
        { status: 400 }
      );
    }

    const participant = participantResult.rows[0];

    if (participant.status === 'left') {
      return NextResponse.json(
        { error: 'You have left this hunt' },
        { status: 400 }
      );
    }

    // Update participant's team
    const result = await sql`
      UPDATE participants
      SET team_id = ${teamId}
      WHERE id = ${participant.id}
      RETURNING *
    `;

    // Get team details to return
    const updatedTeamResult = await sql`
      SELECT t.*, COUNT(p.id) as member_count
      FROM teams t
      LEFT JOIN participants p ON p.team_id = t.id AND p.status != 'left'
      WHERE t.id = ${teamId}
      GROUP BY t.id
    `;

    return NextResponse.json({
      participant: result.rows[0],
      team: updatedTeamResult.rows[0] ? {
        ...updatedTeamResult.rows[0],
        memberCount: Number(updatedTeamResult.rows[0].member_count),
      } : null,
    });
  } catch (error) {
    console.error('Failed to join team:', error);
    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}

// DELETE /api/hunts/[id]/teams/[teamId]/join - Leave a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id: huntId, teamId } = await params;

    if (!isValidUUID(huntId) || !isValidUUID(teamId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Find participant and verify they're on this team
    const participantResult = await sql`
      SELECT id, team_id FROM participants
      WHERE hunt_id = ${huntId} AND user_id = ${auth.user.id} AND team_id = ${teamId}
    `;

    if (participantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'You are not on this team' },
        { status: 400 }
      );
    }

    // Remove from team (set team_id to null)
    const result = await sql`
      UPDATE participants
      SET team_id = NULL
      WHERE id = ${participantResult.rows[0].id}
      RETURNING *
    `;

    return NextResponse.json({
      participant: result.rows[0],
      message: 'Left team successfully',
    });
  } catch (error) {
    console.error('Failed to leave team:', error);
    return NextResponse.json(
      { error: 'Failed to leave team' },
      { status: 500 }
    );
  }
}
