import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isValidUUID } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimiters, rateLimitResponse } from '@/lib/rateLimit';

interface VerificationData {
  correct_answer?: string;
  case_sensitive?: boolean;
  location?: { lat: number; lng: number; radius?: number };
  qrCode?: string;
}

// Maximum photo size: 5MB (base64 encoded = ~6.67MB)
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_BASE64_SIZE = Math.ceil(MAX_PHOTO_SIZE * 1.37); // base64 overhead

// Valid image MIME types
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate photo submission data
 */
function validatePhotoSubmission(submissionData: Record<string, unknown>): { valid: boolean; error?: string } {
  const photoData = submissionData.photoData as string | undefined;
  const photoUrl = submissionData.photoUrl as string | undefined;

  // Either photoData or photoUrl must be provided
  if (!photoData && !photoUrl) {
    return { valid: false, error: 'No photo provided' };
  }

  // If photoUrl is provided, validate it's a valid URL
  if (photoUrl) {
    try {
      new URL(photoUrl);
    } catch {
      return { valid: false, error: 'Invalid photo URL format' };
    }
  }

  // If photoData is provided (base64), validate it
  if (photoData) {
    // Check size
    if (photoData.length > MAX_BASE64_SIZE) {
      return { valid: false, error: `Photo too large. Maximum size is ${MAX_PHOTO_SIZE / (1024 * 1024)}MB` };
    }

    // Check format (should be a data URL)
    if (!photoData.startsWith('data:image/')) {
      return { valid: false, error: 'Invalid photo format. Must be a data URL' };
    }

    // Extract MIME type
    const mimeMatch = photoData.match(/^data:(image\/[a-z]+);base64,/);
    if (!mimeMatch) {
      return { valid: false, error: 'Invalid photo data URL format' };
    }

    const mimeType = mimeMatch[1];
    if (!VALID_IMAGE_TYPES.includes(mimeType)) {
      return { valid: false, error: `Invalid image type. Allowed: ${VALID_IMAGE_TYPES.join(', ')}` };
    }
  }

  return { valid: true };
}

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Server-side verification of submissions
function verifySubmission(
  submissionType: string,
  submissionData: Record<string, unknown>,
  verificationData: VerificationData
): { verified: boolean; reason?: string } {
  switch (submissionType) {
    case 'text_answer': {
      const answer = submissionData.answer as string;
      const correctAnswer = verificationData.correct_answer;
      if (!correctAnswer) {
        return { verified: false, reason: 'No correct answer configured for this challenge' };
      }
      const caseSensitive = verificationData.case_sensitive ?? false;
      const isCorrect = caseSensitive
        ? answer === correctAnswer
        : answer?.toLowerCase() === correctAnswer.toLowerCase();
      return isCorrect
        ? { verified: true }
        : { verified: false, reason: 'Incorrect answer' };
    }

    case 'gps': {
      const userLat = submissionData.latitude as number;
      const userLng = submissionData.longitude as number;
      const targetLocation = verificationData.location;

      if (!targetLocation) {
        return { verified: false, reason: 'No GPS location configured for this challenge' };
      }

      const distance = calculateDistance(
        userLat,
        userLng,
        targetLocation.lat,
        targetLocation.lng
      );
      const radius = targetLocation.radius || 50; // Default 50 meters

      return distance <= radius
        ? { verified: true }
        : { verified: false, reason: `Too far from target (${Math.round(distance)}m away)` };
    }

    case 'qr_code': {
      const code = submissionData.code as string;
      const expectedCode = verificationData.qrCode;

      if (!expectedCode) {
        return { verified: false, reason: 'No QR code configured for this challenge' };
      }

      const isCorrect = code?.toLowerCase() === expectedCode.toLowerCase();
      return isCorrect
        ? { verified: true }
        : { verified: false, reason: 'Invalid QR code' };
    }

    case 'photo': {
      // Validate photo data (size, format, MIME type)
      const photoValidation = validatePhotoSubmission(submissionData);
      if (!photoValidation.valid) {
        return { verified: false, reason: photoValidation.error };
      }
      // Photo passes validation - auto-approve (in production, integrate with moderation service)
      return { verified: true };
    }

    case 'manual':
      // Manual challenges are always auto-verified
      return { verified: true };

    default:
      return { verified: false, reason: 'Unknown verification type' };
  }
}

// POST /api/submissions - Create submission
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, rateLimiters.submissions);

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { participant_id, challenge_id, submission_type, submission_data } = body;

    // Validate required fields
    if (!participant_id || !challenge_id || !submission_type) {
      return NextResponse.json(
        { error: 'Missing required fields: participant_id, challenge_id, submission_type' },
        { status: 400 }
      );
    }

    // Validate UUID formats
    if (!isValidUUID(participant_id) || !isValidUUID(challenge_id)) {
      return NextResponse.json(
        { error: 'Invalid participant_id or challenge_id format' },
        { status: 400 }
      );
    }

    // Verify participant exists, is playing, and belongs to the authenticated user
    const participantResult = await sql`
      SELECT p.id, p.hunt_id, p.status, p.user_id
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

    // Verify participant belongs to the authenticated user
    if (participant.user_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'You can only submit for your own participation' },
        { status: 403 }
      );
    }

    if (participant.status !== 'playing') {
      return NextResponse.json(
        { error: 'Participant is not actively playing' },
        { status: 400 }
      );
    }

    // Verify challenge exists and belongs to this hunt
    const challengeResult = await sql`
      SELECT c.id, c.hunt_id, c.points, c.verification_type, c.verification_data
      FROM challenges c
      WHERE c.id = ${challenge_id}
    `;

    if (challengeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    const challenge = challengeResult.rows[0];
    if (challenge.hunt_id !== participant.hunt_id) {
      return NextResponse.json(
        { error: 'Challenge does not belong to this hunt' },
        { status: 400 }
      );
    }

    // Validate submission type matches challenge verification type
    if (submission_type !== challenge.verification_type) {
      return NextResponse.json(
        { error: `Invalid submission type. Expected ${challenge.verification_type}, got ${submission_type}` },
        { status: 400 }
      );
    }

    // Check if already submitted and approved
    const existingResult = await sql`
      SELECT id, status FROM submissions
      WHERE participant_id = ${participant_id}
        AND challenge_id = ${challenge_id}
        AND status = 'approved'
    `;

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Challenge already completed' },
        { status: 400 }
      );
    }

    // Server-side verification
    const verificationResult = verifySubmission(
      submission_type,
      submission_data || {},
      (challenge.verification_data as VerificationData) || {}
    );

    const status = verificationResult.verified ? 'approved' : 'rejected';
    const pointsAwarded = verificationResult.verified ? challenge.points : 0;

    // Create submission
    const submissionId = uuidv4();
    const result = await sql`
      INSERT INTO submissions (
        id, participant_id, challenge_id, submission_type, submission_data,
        status, points_awarded, verified_at, created_at
      )
      VALUES (
        ${submissionId}, ${participant_id}, ${challenge_id}, ${submission_type},
        ${JSON.stringify(submission_data || {})}, ${status}, ${pointsAwarded},
        ${verificationResult.verified ? new Date().toISOString() : null}, NOW()
      )
      RETURNING *
    `;

    // If approved, update participant score
    if (status === 'approved') {
      await sql`
        UPDATE participants
        SET score = score + ${pointsAwarded}
        WHERE id = ${participant_id}
      `;

      // Check if all challenges are completed
      const challengeCountResult = await sql`
        SELECT COUNT(*) as total FROM challenges WHERE hunt_id = ${participant.hunt_id}
      `;
      const completedCountResult = await sql`
        SELECT COUNT(*) as completed FROM submissions
        WHERE participant_id = ${participant_id} AND status = 'approved'
      `;

      const totalChallenges = Number(challengeCountResult.rows[0].total);
      const completedChallenges = Number(completedCountResult.rows[0].completed);

      if (completedChallenges >= totalChallenges) {
        await sql`
          UPDATE participants
          SET status = 'completed', completed_at = NOW()
          WHERE id = ${participant_id}
        `;
      }
    }

    return NextResponse.json(
      {
        ...result.rows[0],
        verified: verificationResult.verified,
        reason: verificationResult.reason,
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to create submission:', error);
    }
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}

// GET /api/submissions - List submissions (requires auth, returns only user's submissions)
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participant_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Only return submissions for participants that belong to the authenticated user
    let result;
    if (participantId) {
      // Verify the participant belongs to the user
      const participantCheck = await sql`
        SELECT id FROM participants WHERE id = ${participantId} AND user_id = ${auth.user.id}
      `;
      if (participantCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Participant not found or access denied' },
          { status: 403 }
        );
      }
      result = await sql`
        SELECT * FROM submissions
        WHERE participant_id = ${participantId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Return all submissions for the user's participants
      result = await sql`
        SELECT s.* FROM submissions s
        INNER JOIN participants p ON s.participant_id = p.id
        WHERE p.user_id = ${auth.user.id}
        ORDER BY s.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return NextResponse.json({
      submissions: result.rows,
      pagination: { page, limit, hasMore: result.rows.length === limit },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to fetch submissions:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
