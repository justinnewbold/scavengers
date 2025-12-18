-- Scavengers Database Schema v3 for Supabase
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hunts table
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
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10 CHECK (points >= 1 AND points <= 1000),
  verification_type VARCHAR(20) DEFAULT 'manual' CHECK (verification_type IN ('photo', 'gps', 'qr_code', 'text_answer', 'manual')),
  verification_data JSONB DEFAULT '{}',
  hint TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
-- Note: user_id is VARCHAR to support both UUID (authenticated) and anon_* (anonymous) users
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  team_id UUID,
  status VARCHAR(20) DEFAULT 'joined' CHECK (status IN ('joined', 'playing', 'completed', 'left')),
  score INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint to prevent duplicate joins
  CONSTRAINT unique_participant_per_hunt UNIQUE (hunt_id, user_id)
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

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_hunts_status ON hunts(status);
CREATE INDEX IF NOT EXISTS idx_hunts_is_public ON hunts(is_public);
CREATE INDEX IF NOT EXISTS idx_hunts_creator ON hunts(creator_id);
CREATE INDEX IF NOT EXISTS idx_hunts_created_at ON hunts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_hunt_id ON challenges(hunt_id);
CREATE INDEX IF NOT EXISTS idx_challenges_order ON challenges(hunt_id, order_index);
CREATE INDEX IF NOT EXISTS idx_participants_hunt_id ON participants(hunt_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_score ON participants(score DESC);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_submissions_participant_id ON submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Unique partial index to prevent race conditions on approved submissions
-- Only one approved submission per participant per challenge is allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_approved_submission
  ON submissions(participant_id, challenge_id)
  WHERE status = 'approved';

-- Insert sample hunts with challenges
INSERT INTO hunts (id, title, description, difficulty, is_public, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Downtown Discovery', 'Explore the heart of the city with this exciting urban adventure! Find hidden gems and historic landmarks.', 'medium', true, 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Nature Trail Challenge', 'Connect with nature and find hidden treasures along the trail. Perfect for outdoor enthusiasts!', 'easy', true, 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Mystery Manor Hunt', 'Solve puzzles and uncover secrets in this thrilling indoor adventure. Not for the faint of heart!', 'hard', true, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample challenges with verification data
INSERT INTO challenges (hunt_id, title, description, points, verification_type, verification_data, hint, order_index) VALUES
  -- Downtown Discovery
  ('11111111-1111-1111-1111-111111111111', 'Find the Clock Tower', 'Take a photo of the historic clock tower in the town square.', 20, 'photo', '{}', 'Look for the tallest building in the old town area', 0),
  ('11111111-1111-1111-1111-111111111111', 'Coffee Shop Secret', 'What year was the oldest coffee shop on Main Street established?', 15, 'text_answer', '{"correct_answer": "1892", "case_sensitive": false}', 'Check the sign above the door', 1),
  ('11111111-1111-1111-1111-111111111111', 'Park Bench Poetry', 'Find the bench with a poem engraved on it and photograph it.', 25, 'photo', '{}', 'It is near the fountain', 2),
  ('11111111-1111-1111-1111-111111111111', 'Street Art Hunter', 'Photograph the mural of the flying fish on 5th Avenue.', 30, 'photo', '{}', 'Look on the east side of the street', 3),
  ('11111111-1111-1111-1111-111111111111', 'History Buff', 'When was the city founded? Find the plaque.', 20, 'text_answer', '{"correct_answer": "1847", "case_sensitive": false}', 'The plaque is near city hall', 4),

  -- Nature Trail
  ('22222222-2222-2222-2222-222222222222', 'Trailhead Start', 'Check in at the trailhead entrance sign.', 10, 'photo', '{}', 'Take a selfie with the sign!', 0),
  ('22222222-2222-2222-2222-222222222222', 'Spot Wildlife', 'Take a photo of any wildlife you encounter.', 30, 'photo', '{}', 'Be patient and quiet', 1),
  ('22222222-2222-2222-2222-222222222222', 'Bridge Crossing', 'Find and photograph the wooden bridge over the creek.', 20, 'photo', '{}', 'Follow the sound of water', 2),
  ('22222222-2222-2222-2222-222222222222', 'Tree Identification', 'What type of tree has the numbered tag #42?', 15, 'text_answer', '{"correct_answer": "Oak", "case_sensitive": false}', 'Look for the nature education area', 3),
  ('22222222-2222-2222-2222-222222222222', 'Summit View', 'Reach the viewpoint and take a panoramic photo.', 25, 'photo', '{}', 'Keep climbing!', 4),

  -- Mystery Manor
  ('33333333-3333-3333-3333-333333333333', 'The Hidden Safe', 'Find the safe hidden behind the painting. What is the 4-digit combination?', 50, 'text_answer', '{"correct_answer": "1742", "case_sensitive": false}', 'The clue is in the book on the desk', 0),
  ('33333333-3333-3333-3333-333333333333', 'Library Secrets', 'Which book title on the third shelf opens the secret passage?', 40, 'text_answer', '{"correct_answer": "The Crimson Key", "case_sensitive": false}', 'It is written in red', 1),
  ('33333333-3333-3333-3333-333333333333', 'Portrait Mystery', 'Whose eyes in the portrait gallery follow you around the room?', 35, 'text_answer', '{"correct_answer": "Lady Victoria", "case_sensitive": false}', 'Count the portraits carefully', 2),
  ('33333333-3333-3333-3333-333333333333', 'Clock Room Puzzle', 'What time do all the clocks in the clock room show?', 30, 'text_answer', '{"correct_answer": "3:15", "case_sensitive": false}', 'They all show the same time', 3),
  ('33333333-3333-3333-3333-333333333333', 'Final Revelation', 'What is written on the scroll in the secret chamber?', 45, 'text_answer', '{"correct_answer": "Truth lies within", "case_sensitive": false}', 'You must solve all other puzzles first', 4)
ON CONFLICT DO NOTHING;
