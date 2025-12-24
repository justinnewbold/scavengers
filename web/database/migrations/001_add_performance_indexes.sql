-- Migration: Add performance indexes
-- Run this to add additional indexes for common query patterns

-- Composite index for leaderboard queries (hunt_id + score DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_leaderboard
  ON participants(hunt_id, score DESC)
  WHERE status IN ('playing', 'completed');

-- Index for teams by hunt
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_hunt_id
  ON teams(hunt_id);

-- Index for recent submissions (useful for review queue)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_created_at
  ON submissions(created_at DESC);

-- Index for pending submissions (review queue)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_pending
  ON submissions(status, created_at DESC)
  WHERE status = 'pending';

-- Index for user's active participations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_user_active
  ON participants(user_id, status)
  WHERE status IN ('joined', 'playing');

-- Composite index for hunt discovery (public + active + recent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hunts_discovery
  ON hunts(is_public, status, created_at DESC)
  WHERE is_public = true AND status = 'active';

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to hunts table
DROP TRIGGER IF EXISTS update_hunts_updated_at ON hunts;
CREATE TRIGGER update_hunts_updated_at
  BEFORE UPDATE ON hunts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON INDEX idx_participants_leaderboard IS 'Optimizes leaderboard queries by hunt';
COMMENT ON INDEX idx_submissions_pending IS 'Optimizes photo review queue queries';
COMMENT ON INDEX idx_hunts_discovery IS 'Optimizes public hunt discovery page';
