import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

// POST /api/submissions - Create submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participant_id, challenge_id, submission_type, submission_data, status, points_awarded } = body;
    
    const submissionId = uuidv4();
    
    const result = await sql`
      INSERT INTO submissions (id, participant_id, challenge_id, submission_type, submission_data, status, points_awarded, created_at)
      VALUES (${submissionId}, ${participant_id}, ${challenge_id}, ${submission_type || 'manual'}, ${JSON.stringify(submission_data || {})}, ${status || 'approved'}, ${points_awarded || 0}, NOW())
      RETURNING *
    `;
    
    // If approved, update participant score
    if (status === 'approved' && points_awarded) {
      await sql`
        UPDATE participants 
        SET score = score + ${points_awarded}
        WHERE id = ${participant_id}
      `;
    }
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}

// GET /api/submissions - List submissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participant_id');
    const challengeId = searchParams.get('challenge_id');
    
    let result;
    if (participantId) {
      result = await sql`
        SELECT * FROM submissions WHERE participant_id = ${participantId} ORDER BY created_at DESC
      `;
    } else if (challengeId) {
      result = await sql`
        SELECT * FROM submissions WHERE challenge_id = ${challengeId} ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM submissions ORDER BY created_at DESC LIMIT 100
      `;
    }
    
    return NextResponse.json({ submissions: result.rows });
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
