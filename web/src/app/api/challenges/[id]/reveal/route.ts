import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

/**
 * POST /api/challenges/[id]/reveal
 * Records that a player has revealed a mystery challenge by getting close enough.
 * This prevents players from seeing mystery challenge content without physically approaching.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params;

    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    // Validate UUID
    if (!isValidUUID(challengeId)) {
      return NextResponse.json(
        { error: 'Invalid challenge ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { participant_id, latitude, longitude } = body;

    // Validate required fields
    if (!participant_id || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: participant_id, latitude, longitude' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Verify the challenge exists and is a mystery challenge
    const challengeResult = await sql`
      SELECT
        c.id, c.hunt_id, c.is_mystery, c.reveal_distance_meters,
        c.verification_data, c.title, c.description, c.points, c.hint
      FROM challenges c
      WHERE c.id = ${challengeId}
    `;

    if (challengeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    const challenge = challengeResult.rows[0];

    if (!challenge.is_mystery) {
      // Not a mystery challenge - just return the challenge data
      return NextResponse.json({
        revealed: true,
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          points: challenge.points,
          hint: challenge.hint,
        },
      });
    }

    // Verify participant belongs to the user and is in this hunt
    const participantResult = await sql`
      SELECT p.id, p.hunt_id, p.user_id, p.status
      FROM participants p
      WHERE p.id = ${participant_id}
    `;

    if (participantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    const participant = participantResult.rows[0];

    if (participant.user_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'You can only reveal challenges for your own participation' },
        { status: 403 }
      );
    }

    if (participant.hunt_id !== challenge.hunt_id) {
      return NextResponse.json(
        { error: 'Challenge does not belong to this hunt' },
        { status: 400 }
      );
    }

    if (participant.status !== 'playing') {
      return NextResponse.json(
        { error: 'Participant is not actively playing' },
        { status: 400 }
      );
    }

    // Check if already revealed
    const existingReveal = await sql`
      SELECT id FROM mystery_reveals
      WHERE participant_id = ${participant_id} AND challenge_id = ${challengeId}
    `;

    if (existingReveal.rows.length > 0) {
      // Already revealed - return challenge data
      return NextResponse.json({
        revealed: true,
        already_revealed: true,
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          points: challenge.points,
          hint: challenge.hint,
        },
      });
    }

    // Calculate distance from target location
    const targetLat = challenge.verification_data?.latitude;
    const targetLng = challenge.verification_data?.longitude;
    const revealDistance = challenge.reveal_distance_meters || 50;

    if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
      // No target location - auto-reveal
      await sql`
        INSERT INTO mystery_reveals (participant_id, challenge_id, revealed_at, reveal_latitude, reveal_longitude, distance_meters)
        VALUES (${participant_id}, ${challengeId}, NOW(), ${latitude}, ${longitude}, 0)
      `;

      return NextResponse.json({
        revealed: true,
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          points: challenge.points,
          hint: challenge.hint,
        },
      });
    }

    // Calculate distance using Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (latitude * Math.PI) / 180;
    const φ2 = (targetLat * Math.PI) / 180;
    const Δφ = ((targetLat - latitude) * Math.PI) / 180;
    const Δλ = ((targetLng - longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance > revealDistance) {
      return NextResponse.json({
        revealed: false,
        reason: `Too far from reveal location (${Math.round(distance)}m away, need to be within ${revealDistance}m)`,
        distance: Math.round(distance),
        required_distance: revealDistance,
      });
    }

    // Record the reveal
    await sql`
      INSERT INTO mystery_reveals (participant_id, challenge_id, revealed_at, reveal_latitude, reveal_longitude, distance_meters)
      VALUES (${participant_id}, ${challengeId}, NOW(), ${latitude}, ${longitude}, ${Math.round(distance)})
    `;

    return NextResponse.json({
      revealed: true,
      distance: Math.round(distance),
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        points: challenge.points,
        hint: challenge.hint,
      },
    });
  } catch (error) {
    console.error('Mystery reveal error:', error);
    return NextResponse.json(
      { error: 'Failed to reveal challenge' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/challenges/[id]/reveal
 * Check if a mystery challenge has been revealed for a participant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params;
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participant_id');

    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    if (!challengeId || !participantId) {
      return NextResponse.json(
        { error: 'Missing challenge_id or participant_id' },
        { status: 400 }
      );
    }

    // Check for reveal record
    const revealResult = await sql`
      SELECT mr.*, c.title, c.description, c.points, c.hint
      FROM mystery_reveals mr
      JOIN challenges c ON mr.challenge_id = c.id
      WHERE mr.participant_id = ${participantId} AND mr.challenge_id = ${challengeId}
    `;

    if (revealResult.rows.length === 0) {
      return NextResponse.json({ revealed: false });
    }

    const reveal = revealResult.rows[0];
    return NextResponse.json({
      revealed: true,
      revealed_at: reveal.revealed_at,
      distance: reveal.distance_meters,
      challenge: {
        title: reveal.title,
        description: reveal.description,
        points: reveal.points,
        hint: reveal.hint,
      },
    });
  } catch (error) {
    console.error('Check reveal error:', error);
    return NextResponse.json(
      { error: 'Failed to check reveal status' },
      { status: 500 }
    );
  }
}
