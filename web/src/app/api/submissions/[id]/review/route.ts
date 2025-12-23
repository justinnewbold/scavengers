import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, isValidUUID } from '@/lib/auth';

// PATCH /api/submissions/[id]/review - Approve or reject a submission
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id: submissionId } = await params;

    if (!isValidUUID(submissionId)) {
      return NextResponse.json(
        { error: 'Invalid submission ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get submission with hunt creator info
    const submissionResult = await sql`
      SELECT
        s.*,
        c.hunt_id,
        c.points as challenge_points,
        h.creator_id as hunt_creator_id
      FROM submissions s
      JOIN challenges c ON c.id = s.challenge_id
      JOIN hunts h ON h.id = c.hunt_id
      WHERE s.id = ${submissionId}
    `;

    if (submissionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const submission = submissionResult.rows[0];

    // Verify user is hunt creator
    if (submission.hunt_creator_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Only the hunt creator can review submissions' },
        { status: 403 }
      );
    }

    // Check if already reviewed
    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Submission has already been reviewed' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const pointsAwarded = action === 'approve' ? submission.challenge_points : 0;

    // Update submission
    const updateResult = await sql`
      UPDATE submissions
      SET
        status = ${newStatus},
        points_awarded = ${pointsAwarded},
        verified_at = NOW(),
        review_reason = ${reason || null}
      WHERE id = ${submissionId}
      RETURNING *
    `;

    // If approved, update participant score
    if (action === 'approve') {
      await sql`
        UPDATE participants
        SET score = score + ${pointsAwarded}
        WHERE id = ${submission.participant_id}
      `;

      // Check if hunt is now complete for this participant
      const challengeCountResult = await sql`
        SELECT COUNT(*) as total FROM challenges WHERE hunt_id = ${submission.hunt_id}
      `;
      const completedCountResult = await sql`
        SELECT COUNT(*) as completed FROM submissions
        WHERE participant_id = ${submission.participant_id} AND status = 'approved'
      `;

      const totalChallenges = Number(challengeCountResult.rows[0].total);
      const completedChallenges = Number(completedCountResult.rows[0].completed);

      if (completedChallenges >= totalChallenges) {
        await sql`
          UPDATE participants
          SET status = 'completed', completed_at = NOW()
          WHERE id = ${submission.participant_id}
        `;
      }
    }

    return NextResponse.json({
      submission: updateResult.rows[0],
      action,
      pointsAwarded,
    });
  } catch (error) {
    console.error('Failed to review submission:', error);
    return NextResponse.json(
      { error: 'Failed to review submission' },
      { status: 500 }
    );
  }
}
