-- Scavengers Database Schema for Vercel Postgres
-- Run this in your Vercel Postgres dashboard or via the CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hunts table
CREATE TABLE IF NOT EXISTS hunts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_public BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  creator_id VARCHAR(255),
  location VARCHAR(255),
  duration_minutes INTEGER,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges table
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
);

-- Participants table
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
);

-- Submissions table
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
);

-- Teams table (optional)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hunts_status ON hunts(status);
CREATE INDEX IF NOT EXISTS idx_hunts_is_public ON hunts(is_public);
CREATE INDEX IF NOT EXISTS idx_hunts_created_at ON hunts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_hunt_id ON challenges(hunt_id);
CREATE INDEX IF NOT EXISTS idx_participants_hunt_id ON participants(hunt_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant_id ON submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions(challenge_id);

-- Insert sample data
INSERT INTO hunts (title, description, difficulty, is_public, status)
VALUES 
  ('Downtown Discovery', 'Explore the heart of the city with this exciting urban adventure!', 'medium', true, 'active'),
  ('Nature Trail Challenge', 'Connect with nature and find hidden treasures along the trail.', 'easy', true, 'active'),
  ('Mystery Manor Hunt', 'Solve puzzles and uncover secrets in this thrilling indoor adventure.', 'hard', true, 'active')
ON CONFLICT DO NOTHING;

-- Get the hunt IDs and insert challenges
DO $$
DECLARE
  hunt1_id UUID;
  hunt2_id UUID;
  hunt3_id UUID;
BEGIN
  SELECT id INTO hunt1_id FROM hunts WHERE title = 'Downtown Discovery' LIMIT 1;
  SELECT id INTO hunt2_id FROM hunts WHERE title = 'Nature Trail Challenge' LIMIT 1;
  SELECT id INTO hunt3_id FROM hunts WHERE title = 'Mystery Manor Hunt' LIMIT 1;
  
  -- Downtown Discovery challenges
  IF hunt1_id IS NOT NULL THEN
    INSERT INTO challenges (hunt_id, title, description, points, verification_type, order_index)
    VALUES
      (hunt1_id, 'Find the Clock Tower', 'Take a photo of the historic clock tower in the town square.', 20, 'photo', 0),
      (hunt1_id, 'Coffee Shop Secret', 'What is the name of the oldest coffee shop on Main Street?', 15, 'text_answer', 1),
      (hunt1_id, 'Park Bench Poetry', 'Find the bench with a poem engraved on it and photograph it.', 25, 'photo', 2)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Nature Trail challenges
  IF hunt2_id IS NOT NULL THEN
    INSERT INTO challenges (hunt_id, title, description, points, verification_type, order_index)
    VALUES
      (hunt2_id, 'Trailhead Start', 'Check in at the trailhead entrance.', 10, 'gps', 0),
      (hunt2_id, 'Spot a Squirrel', 'Take a photo of a squirrel in its natural habitat.', 30, 'photo', 1),
      (hunt2_id, 'Bridge Crossing', 'Find and photograph the wooden bridge over the creek.', 20, 'photo', 2)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Mystery Manor challenges
  IF hunt3_id IS NOT NULL THEN
    INSERT INTO challenges (hunt_id, title, description, points, verification_type, order_index)
    VALUES
      (hunt3_id, 'The Hidden Safe', 'Find the safe hidden behind the painting. What is the combination?', 50, 'text_answer', 0),
      (hunt3_id, 'Library Secrets', 'Which book on the third shelf opens the secret passage?', 40, 'text_answer', 1),
      (hunt3_id, 'Final Clue', 'Scan the QR code on the grandfather clock.', 35, 'qr_code', 2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
