/**
 * Database Setup Script
 *
 * Run this script to initialize the database schema.
 * Requires POSTGRES_URL environment variable to be set.
 *
 * Usage:
 *   npx tsx scripts/setup-db.ts
 *
 * For local development, pull env vars from Vercel first:
 *   vercel env pull .env.local
 *   npx tsx scripts/setup-db.ts
 */

import { sql } from '@vercel/postgres';

async function setupDatabase() {
  console.log('🚀 Setting up Scavengers database...\n');

  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL environment variable is not set');
    console.log('\nTo set up your database:');
    console.log('1. Create a Vercel Postgres database in your Vercel dashboard');
    console.log('2. Run: vercel env pull .env.local');
    console.log('3. Run this script again');
    process.exit(1);
  }

  try {
    // Test connection
    console.log('📡 Testing connection...');
    const testResult = await sql`SELECT NOW() as time`;
    console.log(`✅ Connected at ${testResult.rows[0].time}\n`);

    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✅ UUID extension enabled\n');

    // Create tables
    console.log('📦 Creating tables...\n');

    // Users table
    console.log('  → Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Hunts table
    console.log('  → Creating hunts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS hunts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
        is_public BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
        creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
        location VARCHAR(255),
        duration_minutes INTEGER,
        max_participants INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Challenges table
    console.log('  → Creating challenges table...');
    await sql`
      CREATE TABLE IF NOT EXISTS challenges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        points INTEGER DEFAULT 10,
        verification_type VARCHAR(20) DEFAULT 'manual' CHECK (verification_type IN ('photo', 'gps', 'qr_code', 'text_answer', 'manual')),
        verification_data JSONB DEFAULT '{}',
        hint TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Participants table
    console.log('  → Creating participants table...');
    await sql`
      CREATE TABLE IF NOT EXISTS participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        team_id UUID,
        status VARCHAR(20) DEFAULT 'joined' CHECK (status IN ('joined', 'playing', 'completed', 'left')),
        score INTEGER DEFAULT 0,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Submissions table
    console.log('  → Creating submissions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
        submission_type VARCHAR(20) NOT NULL,
        submission_data JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        points_awarded INTEGER DEFAULT 0,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Teams table
    console.log('  → Creating teams table...');
    await sql`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('✅ All tables created\n');

    // Create indexes
    console.log('📑 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hunts_status ON hunts(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hunts_is_public ON hunts(is_public)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hunts_creator ON hunts(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_hunts_created_at ON hunts(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_challenges_hunt_id ON challenges(hunt_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_participants_hunt_id ON participants(hunt_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_participants_score ON participants(score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_submissions_participant_id ON submissions(participant_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions(challenge_id)`;
    console.log('✅ Indexes created\n');

    // Insert sample data
    console.log('🌱 Inserting sample data...');

    // Sample hunts
    await sql`
      INSERT INTO hunts (id, title, description, difficulty, is_public, status) VALUES
        ('11111111-1111-1111-1111-111111111111', 'Downtown Discovery', 'Explore the heart of the city with this exciting urban adventure! Find hidden gems and historic landmarks.', 'medium', true, 'active'),
        ('22222222-2222-2222-2222-222222222222', 'Nature Trail Challenge', 'Connect with nature and find hidden treasures along the trail. Perfect for outdoor enthusiasts!', 'easy', true, 'active'),
        ('33333333-3333-3333-3333-333333333333', 'Mystery Manor Hunt', 'Solve puzzles and uncover secrets in this thrilling indoor adventure. Not for the faint of heart!', 'hard', true, 'active')
      ON CONFLICT (id) DO NOTHING
    `;

    // Sample challenges
    await sql`
      INSERT INTO challenges (hunt_id, title, description, points, verification_type, hint, order_index) VALUES
        ('11111111-1111-1111-1111-111111111111', 'Find the Clock Tower', 'Take a photo of the historic clock tower in the town square.', 20, 'photo', 'Look for the tallest building in the old town area', 0),
        ('11111111-1111-1111-1111-111111111111', 'Coffee Shop Secret', 'What year was the oldest coffee shop on Main Street established?', 15, 'text_answer', 'Check the sign above the door', 1),
        ('11111111-1111-1111-1111-111111111111', 'Park Bench Poetry', 'Find the bench with a poem engraved on it and photograph it.', 25, 'photo', 'It is near the fountain', 2),
        ('22222222-2222-2222-2222-222222222222', 'Trailhead Start', 'Check in at the trailhead entrance sign.', 10, 'photo', 'Take a selfie with the sign!', 0),
        ('22222222-2222-2222-2222-222222222222', 'Spot Wildlife', 'Take a photo of any wildlife you encounter.', 30, 'photo', 'Be patient and quiet', 1),
        ('22222222-2222-2222-2222-222222222222', 'Bridge Crossing', 'Find and photograph the wooden bridge over the creek.', 20, 'photo', 'Follow the sound of water', 2),
        ('33333333-3333-3333-3333-333333333333', 'The Hidden Safe', 'Find the safe hidden behind the painting. What is the 4-digit combination?', 50, 'text_answer', 'The clue is in the book on the desk', 0),
        ('33333333-3333-3333-3333-333333333333', 'Library Secrets', 'Which book title on the third shelf opens the secret passage?', 40, 'text_answer', 'It is written in red', 1),
        ('33333333-3333-3333-3333-333333333333', 'Portrait Mystery', 'Whose eyes in the portrait gallery follow you around the room?', 35, 'text_answer', 'Count the portraits carefully', 2)
      ON CONFLICT DO NOTHING
    `;

    console.log('✅ Sample data inserted\n');

    // Verify setup
    console.log('🔍 Verifying setup...');
    const counts = await sql`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM hunts) as hunts,
        (SELECT COUNT(*) FROM challenges) as challenges
    `;
    const stats = counts.rows[0];
    console.log(`   Users: ${stats.users}`);
    console.log(`   Hunts: ${stats.hunts}`);
    console.log(`   Challenges: ${stats.challenges}`);

    console.log('\n✨ Database setup complete!\n');
    console.log('Next steps:');
    console.log('1. Run your app with: npm run dev');
    console.log('2. Test the health endpoint: http://localhost:3000/api/health');
    console.log('3. View hunts at: http://localhost:3000');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
