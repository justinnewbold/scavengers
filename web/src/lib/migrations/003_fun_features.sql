-- Migration 003: Fun Features (Mystery Challenges, Reactions, Streak Support)
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- ===========================================
-- 1. Add mystery challenge support to challenges
-- ===========================================
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS is_mystery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reveal_distance_meters INTEGER DEFAULT 50;

-- Index for finding mystery challenges
CREATE INDEX IF NOT EXISTS idx_challenges_is_mystery ON challenges(is_mystery) WHERE is_mystery = true;

-- ===========================================
-- 2. Create reactions table for photo feed
-- ===========================================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('fire', 'laugh', 'wow', 'love', 'clap')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Each user can only have one reaction per submission
  CONSTRAINT unique_user_reaction_per_submission UNIQUE (submission_id, user_id)
);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_reactions_submission_id ON reactions(submission_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- ===========================================
-- 3. Add streak tracking to participants
-- ===========================================
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_completion_at TIMESTAMP WITH TIME ZONE;

-- ===========================================
-- 4. Add bonus_points to submissions for streak bonuses
-- ===========================================
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_multiplier DECIMAL(3,2) DEFAULT 1.0;

-- ===========================================
-- 5. Update sample challenges with mystery challenges
-- ===========================================
-- Make some existing challenges into mysteries (for demo)
UPDATE challenges
SET is_mystery = true, reveal_distance_meters = 100
WHERE title IN ('Street Art Hunter', 'Summit View', 'The Hidden Safe');

-- ===========================================
-- 6. Create feed view for efficient querying
-- ===========================================
CREATE OR REPLACE VIEW feed_view AS
SELECT
  s.id as submission_id,
  s.participant_id,
  s.challenge_id,
  s.submission_data,
  s.points_awarded,
  s.bonus_points,
  s.streak_multiplier,
  s.created_at as submitted_at,
  p.user_id,
  u.display_name,
  u.avatar_url,
  c.title as challenge_title,
  c.description as challenge_description,
  h.id as hunt_id,
  h.title as hunt_title
FROM submissions s
INNER JOIN participants p ON s.participant_id = p.id
INNER JOIN users u ON p.user_id::uuid = u.id
INNER JOIN challenges c ON s.challenge_id = c.id
INNER JOIN hunts h ON c.hunt_id = h.id
WHERE s.status = 'approved'
  AND s.submission_type = 'photo'
ORDER BY s.created_at DESC;

-- ===========================================
-- 7. Function to get reaction counts
-- ===========================================
CREATE OR REPLACE FUNCTION get_reaction_counts(p_submission_id UUID)
RETURNS TABLE (
  fire_count BIGINT,
  laugh_count BIGINT,
  wow_count BIGINT,
  love_count BIGINT,
  clap_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE reaction_type = 'fire') as fire_count,
    COUNT(*) FILTER (WHERE reaction_type = 'laugh') as laugh_count,
    COUNT(*) FILTER (WHERE reaction_type = 'wow') as wow_count,
    COUNT(*) FILTER (WHERE reaction_type = 'love') as love_count,
    COUNT(*) FILTER (WHERE reaction_type = 'clap') as clap_count,
    COUNT(*) as total_count
  FROM reactions
  WHERE submission_id = p_submission_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Complete!
-- ===========================================
-- This migration adds:
-- 1. Mystery challenges with reveal distance
-- 2. Reactions table for photo feed engagement
-- 3. Streak tracking fields for gamification
-- 4. Feed view for efficient photo feed queries
-- 5. Helper function for reaction counts
