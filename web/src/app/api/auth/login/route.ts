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
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    // Find user
    const result = await sql`
      SELECT id, email, display_name, avatar_url, password_hash, created_at
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    const user = result.rows[0];
    
    // Verify password
    const passwordHash = hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT
    const token = await new SignJWT({ 
      userId: user.id,
      email: user.email 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
    
    // Return user (without password)
    const { password_hash, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
