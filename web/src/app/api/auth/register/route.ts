import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'scavengers-secret-key-change-in-production'
);

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, display_name } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Create user
    const userId = uuidv4();
    const passwordHash = hashPassword(password);
    const displayName = display_name || email.split('@')[0];
    
    const result = await sql`
      INSERT INTO users (id, email, password_hash, display_name, created_at)
      VALUES (${userId}, ${email.toLowerCase()}, ${passwordHash}, ${displayName}, NOW())
      RETURNING id, email, display_name, avatar_url, created_at
    `;
    
    const user = result.rows[0];
    
    // Generate JWT
    const token = await new SignJWT({ 
      userId: user.id,
      email: user.email 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
    
    return NextResponse.json({
      user,
      token,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
