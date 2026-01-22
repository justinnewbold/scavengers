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

    // Insert sample data (only if no hunts exist)
    console.log('🌱 Checking for existing data...');
    const existingHunts = await sql`SELECT COUNT(*) as count FROM hunts`;

    if (existingHunts.rows[0].count === '0') {
      console.log('   No existing hunts found, inserting sample data...\n');

      // Create sample hunts with proper UUIDs
      const hunt1 = await sql`
        INSERT INTO hunts (title, description, difficulty, is_public, status, location, duration_minutes)
        VALUES (
          'City Explorer Challenge',
          'Discover hidden gems and iconic landmarks in the heart of downtown. Perfect for tourists and locals alike who want to see the city from a new perspective.',
          'medium',
          true,
          'active',
          'Downtown Area',
          60
        )
        RETURNING id
      `;

      const hunt2 = await sql`
        INSERT INTO hunts (title, description, difficulty, is_public, status, location, duration_minutes)
        VALUES (
          'Park Adventure',
          'Explore nature and enjoy the outdoors with this family-friendly scavenger hunt. Look for wildlife, interesting plants, and scenic viewpoints.',
          'easy',
          true,
          'active',
          'Central Park',
          45
        )
        RETURNING id
      `;

      const hunt3 = await sql`
        INSERT INTO hunts (title, description, difficulty, is_public, status, location, duration_minutes)
        VALUES (
          'History Detective',
          'Uncover the stories behind historic buildings and monuments. Test your knowledge of local history while exploring the old town district.',
          'hard',
          true,
          'active',
          'Historic District',
          90
        )
        RETURNING id
      `;

      const huntId1 = hunt1.rows[0].id;
      const huntId2 = hunt2.rows[0].id;
      const huntId3 = hunt3.rows[0].id;

      // Insert challenges for Hunt 1 - City Explorer
      await sql`
        INSERT INTO challenges (hunt_id, title, description, points, verification_type, verification_data, hint, order_index) VALUES
          (${huntId1}, 'Town Hall Selfie', 'Take a photo in front of the main entrance of Town Hall.', 15, 'photo', '{"ai_prompt": "Photo should show a government building entrance", "required_objects": ["building", "entrance"]}', 'Look for the building with the flag', 0),
          (${huntId1}, 'Coffee Culture', 'Find a local coffee shop and photograph their specialty drink menu.', 10, 'photo', '{"ai_prompt": "Photo should show a menu board or coffee drinks", "required_objects": ["menu", "coffee"]}', 'There are several on Main Street', 1),
          (${huntId1}, 'Street Art Hunt', 'Photograph a piece of street art or mural in the downtown area.', 20, 'photo', '{"ai_prompt": "Photo should show street art, graffiti, or a mural", "required_objects": ["art", "wall"]}', 'Check the alleyways between buildings', 2),
          (${huntId1}, 'Fountain Find', 'Take a photo of the main fountain in the city square.', 15, 'photo', '{"ai_prompt": "Photo should show a fountain with water", "required_objects": ["fountain", "water"]}', 'Listen for the sound of water', 3),
          (${huntId1}, 'Book Lovers Spot', 'Find the oldest bookstore downtown. What year does the sign say it opened?', 25, 'text_answer', '{"correct_answer": "1952", "case_sensitive": false}', 'Look for a wooden storefront', 4)
      `;

      // Insert challenges for Hunt 2 - Park Adventure
      await sql`
        INSERT INTO challenges (hunt_id, title, description, points, verification_type, verification_data, hint, order_index) VALUES
          (${huntId2}, 'Park Entrance', 'Start your adventure by photographing the main park entrance sign.', 10, 'photo', '{"ai_prompt": "Photo should show a park entrance or welcome sign", "required_objects": ["sign"]}', 'It is next to the parking area', 0),
          (${huntId2}, 'Wildlife Watch', 'Spot and photograph any bird or squirrel in the park.', 20, 'photo', '{"ai_prompt": "Photo should show wildlife like a bird or squirrel", "required_objects": ["animal"]}', 'Try near the picnic areas', 1),
          (${huntId2}, 'Scenic Viewpoint', 'Find the highest point in the park and photograph the view.', 15, 'photo', '{"ai_prompt": "Photo should show a scenic landscape view", "keywords": ["view", "landscape", "overlook"]}', 'Follow the hill trail', 2),
          (${huntId2}, 'Nature Find', 'Photograph an interesting leaf, flower, or plant.', 10, 'photo', '{"ai_prompt": "Photo should show plants, flowers, or leaves", "required_objects": ["plant"]}', 'Gardens are near the visitor center', 3),
          (${huntId2}, 'Bench Break', 'Find a park bench with a memorial plaque and read the inscription.', 15, 'manual', '{}', 'Near the rose garden', 4)
      `;

      // Insert challenges for Hunt 3 - History Detective
      await sql`
        INSERT INTO challenges (hunt_id, title, description, points, verification_type, verification_data, hint, order_index) VALUES
          (${huntId3}, 'Oldest Building', 'Find the oldest building in the historic district. What year was it built?', 30, 'text_answer', '{"correct_answer": "1847", "case_sensitive": false}', 'Look for a plaque on the brick building near the corner', 0),
          (${huntId3}, 'War Memorial', 'Photograph the war memorial and count the names listed. How many are there?', 35, 'text_answer', '{"correct_answer": "127", "case_sensitive": false}', 'It is in the small park behind the library', 1),
          (${huntId3}, 'Historic Marker', 'Find a blue historic marker sign and photograph it.', 25, 'photo', '{"ai_prompt": "Photo should show a historic marker or informational plaque", "required_objects": ["sign", "plaque"]}', 'There are several along Main Street', 2),
          (${huntId3}, 'Clock Tower Time', 'The clock tower chimes every hour. What time is shown on the north face?', 20, 'manual', '{}', 'Stand at the intersection to see all faces', 3),
          (${huntId3}, 'Architecture Details', 'Photograph an example of Victorian architecture in the district.', 30, 'photo', '{"ai_prompt": "Photo should show Victorian architectural features like ornate trim or bay windows", "keywords": ["victorian", "ornate", "historic"]}', 'Look for buildings with decorative trim', 4),
          (${huntId3}, 'Founders Statue', 'Find the statue of the town founder. What is written at the base?', 40, 'text_answer', '{"correct_answer": "In service to all", "case_sensitive": false}', 'Near the old courthouse', 5)
      `;

      console.log('✅ Sample hunts and challenges created\n');
    } else {
      console.log(`   Found ${existingHunts.rows[0].count} existing hunts, skipping sample data\n`);
    }

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
