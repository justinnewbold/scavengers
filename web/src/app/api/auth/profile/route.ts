import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'scavengers-secret-key-change-in-production'
);

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    
    const { display_name, avatar_url } = await request.json();
    
    // Update user
    const result = await sql`
      UPDATE users
      SET 
        display_name = COALESCE(${display_name}, display_name),
        avatar_url = COALESCE(${avatar_url}, avatar_url)
      WHERE id = ${userId}
      RETURNING id, email, display_name, avatar_url, created_at
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}
