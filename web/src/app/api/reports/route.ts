import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isValidUUID, sanitizeString } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimiters, rateLimitResponse } from '@/lib/rateLimit';

/** Reasons the mobile client is allowed to send. */
const VALID_REASONS = [
  'inappropriate',
  'spam',
  'harassment',
  'copyright',
  'other',
] as const;

// POST /api/reports - Report a submission's photo for moderation
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, rateLimiters.api);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const submissionId = body.submission_id;
    const reason = String(body.reason || '').toLowerCase().trim();
    const details = sanitizeString(String(body.details || ''), 1000);

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submission_id is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(submissionId)) {
      return NextResponse.json(
        { error: 'Invalid submission_id format' },
        { status: 400 }
      );
    }

    if (!(VALID_REASONS as readonly string[]).includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Allowed: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Confirm the submission exists before recording a report against it.
    const submission = await sql`
      SELECT id FROM submissions WHERE id = ${submissionId}
    `;

    if (submission.rows.length === 0) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Re-reporting the same submission is a no-op rather than an error - the
    // user's intent is already recorded, and surfacing a failure would just
    // invite them to retry.
    const result = await sql`
      INSERT INTO reports (id, submission_id, reporter_id, reason, details, status, created_at)
      VALUES (
        ${uuidv4()}, ${submissionId}, ${auth.user.id}, ${reason},
        ${details || null}, 'pending', NOW()
      )
      ON CONFLICT (submission_id, reporter_id) DO NOTHING
      RETURNING id, status, created_at
    `;

    const alreadyReported = result.rows.length === 0;

    return NextResponse.json(
      {
        reported: true,
        already_reported: alreadyReported,
        ...(alreadyReported ? {} : result.rows[0]),
      },
      { status: alreadyReported ? 200 : 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to create report:', error);
    }
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}
