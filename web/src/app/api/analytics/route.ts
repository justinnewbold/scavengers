import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

// GET /api/analytics - Get analytics for user's hunts
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const huntId = searchParams.get('hunt_id');

    if (huntId) {
      if (!isValidUUID(huntId)) {
        return NextResponse.json(
          { error: 'Invalid hunt_id' },
          { status: 400 }
        );
      }

      // Verify ownership
      const huntCheck = await sql`
        SELECT id FROM hunts WHERE id = ${huntId} AND creator_id = ${auth.userId}
      `;

      if (huntCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Hunt not found or not owned by you' },
          { status: 404 }
        );
      }

      // Hunt-specific analytics
      const stats = await sql`
        SELECT
          (SELECT COUNT(*) FROM participants WHERE hunt_id = ${huntId}) as total_participants,
          (SELECT COUNT(*) FROM participants WHERE hunt_id = ${huntId} AND status = 'completed') as completed_participants,
          (SELECT COUNT(*) FROM submissions WHERE challenge_id IN (SELECT id FROM challenges WHERE hunt_id = ${huntId})) as total_submissions,
          (SELECT COUNT(*) FROM submissions WHERE challenge_id IN (SELECT id FROM challenges WHERE hunt_id = ${huntId}) AND status = 'approved') as approved_submissions,
          (SELECT AVG(score) FROM participants WHERE hunt_id = ${huntId} AND status = 'completed') as avg_score,
          (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FROM participants WHERE hunt_id = ${huntId} AND completed_at IS NOT NULL) as avg_completion_time_minutes
      `;

      // Challenge completion rates
      const challengeStats = await sql`
        SELECT
          c.id,
          c.title,
          c.verification_type,
          COUNT(s.id) as submission_count,
          SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
          ROUND(AVG(s.ai_confidence)::numeric, 2) as avg_confidence
        FROM challenges c
        LEFT JOIN submissions s ON s.challenge_id = c.id
        WHERE c.hunt_id = ${huntId}
        GROUP BY c.id, c.title, c.verification_type
        ORDER BY c.order_index
      `;

      // Participants over time (last 30 days)
      const participantTrend = await sql`
        SELECT
          DATE(started_at) as date,
          COUNT(*) as count
        FROM participants
        WHERE hunt_id = ${huntId}
          AND started_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(started_at)
        ORDER BY date
      `;

      return NextResponse.json({
        overview: stats.rows[0],
        challengeStats: challengeStats.rows,
        participantTrend: participantTrend.rows,
      });
    }

    // Overall creator analytics
    const overallStats = await sql`
      SELECT
        (SELECT COUNT(*) FROM hunts WHERE creator_id = ${auth.userId}) as total_hunts,
        (SELECT COUNT(*) FROM participants WHERE hunt_id IN (SELECT id FROM hunts WHERE creator_id = ${auth.userId})) as total_participants,
        (SELECT COUNT(*) FROM participants WHERE hunt_id IN (SELECT id FROM hunts WHERE creator_id = ${auth.userId}) AND status = 'completed') as total_completions,
        (SELECT SUM(clone_count) FROM hunts WHERE creator_id = ${auth.userId}) as total_clones
    `;

    // Hunts performance
    const huntPerformance = await sql`
      SELECT
        h.id,
        h.title,
        h.created_at,
        COUNT(DISTINCT p.id) as participant_count,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completion_count,
        ROUND(AVG(p.score)::numeric, 1) as avg_score
      FROM hunts h
      LEFT JOIN participants p ON p.hunt_id = h.id
      WHERE h.creator_id = ${auth.userId}
      GROUP BY h.id, h.title, h.created_at
      ORDER BY h.created_at DESC
      LIMIT 10
    `;

    // Verification type breakdown
    const verificationBreakdown = await sql`
      SELECT
        c.verification_type,
        COUNT(*) as count
      FROM challenges c
      JOIN hunts h ON h.id = c.hunt_id
      WHERE h.creator_id = ${auth.userId}
      GROUP BY c.verification_type
    `;

    return NextResponse.json({
      overview: overallStats.rows[0],
      hunts: huntPerformance.rows,
      verificationBreakdown: verificationBreakdown.rows,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/event - Track an analytics event
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const body = await request.json();
    const { eventType, eventData, huntId } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO analytics_events (user_id, event_type, event_data, hunt_id)
      VALUES (
        ${'error' in auth ? null : auth.userId},
        ${eventType},
        ${JSON.stringify(eventData || {})},
        ${huntId && isValidUUID(huntId) ? huntId : null}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics event error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
