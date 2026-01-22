import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Track analytics event
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    // Events can be tracked without auth for anonymous users
    const userId = user?.id || null;

    const body = await request.json();
    const {
      type,
      huntId,
      sessionId,
      challengeId,
      data = {},
    } = body;

    if (!type || !huntId) {
      return NextResponse.json({ error: 'Type and huntId required' }, { status: 400 });
    }

    // Insert event
    await db.query(
      `INSERT INTO analytics_events (event_type, hunt_id, user_id, session_id, challenge_id, event_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [type, huntId, userId, sessionId, challengeId, JSON.stringify(data)]
    );

    // Update aggregated analytics based on event type
    switch (type) {
      case 'hunt_started':
        await db.query(
          `INSERT INTO player_sessions (user_id, hunt_id, session_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [userId, huntId, sessionId]
        );
        break;

      case 'challenge_completed':
        if (challengeId) {
          await db.query(
            `INSERT INTO challenge_analytics (challenge_id, hunt_id, total_attempts, successful_completions)
             VALUES ($1, $2, 1, 1)
             ON CONFLICT (challenge_id) DO UPDATE SET
               total_attempts = challenge_analytics.total_attempts + 1,
               successful_completions = challenge_analytics.successful_completions + 1,
               updated_at = NOW()`,
            [challengeId, huntId]
          );

          // Update session
          if (sessionId) {
            await db.query(
              `UPDATE player_sessions
               SET challenges_completed = challenges_completed + 1,
                   last_challenge_id = $1
               WHERE session_id = $2`,
              [challengeId, sessionId]
            );
          }
        }
        break;

      case 'challenge_skipped':
        if (challengeId) {
          await db.query(
            `INSERT INTO challenge_analytics (challenge_id, hunt_id, total_attempts, skip_count)
             VALUES ($1, $2, 1, 1)
             ON CONFLICT (challenge_id) DO UPDATE SET
               total_attempts = challenge_analytics.total_attempts + 1,
               skip_count = challenge_analytics.skip_count + 1,
               updated_at = NOW()`,
            [challengeId, huntId]
          );

          if (sessionId) {
            await db.query(
              `UPDATE player_sessions
               SET challenges_skipped = challenges_skipped + 1
               WHERE session_id = $1`,
              [sessionId]
            );
          }
        }
        break;

      case 'photo_submitted':
        if (sessionId) {
          await db.query(
            `UPDATE player_sessions
             SET photos_submitted = photos_submitted + 1
             WHERE session_id = $1`,
            [sessionId]
          );
        }
        break;

      case 'hint_used':
        if (sessionId) {
          await db.query(
            `UPDATE player_sessions
             SET hints_used = hints_used + 1
             WHERE session_id = $1`,
            [sessionId]
          );
        }
        break;

      case 'share_initiated':
        await db.query(
          `UPDATE hunt_analytics
           SET share_count = share_count + 1
           WHERE hunt_id = $1`,
          [huntId]
        );
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    // Don't fail the request - analytics should be fire and forget
    return NextResponse.json({ success: true });
  }
}
