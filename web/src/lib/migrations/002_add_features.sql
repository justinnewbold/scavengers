-- Migration: Add Teams, Achievements, Scheduling, and Templates
-- Run this against your Supabase database

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team participation in hunts
CREATE TABLE IF NOT EXISTS team_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(hunt_id, team_id)
);

-- Achievements/Badges table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements junction table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Add scheduling columns to hunts
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES hunts(id) ON DELETE SET NULL;
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS clone_count INTEGER DEFAULT 0;

-- Hunt templates metadata
CREATE TABLE IF NOT EXISTS hunt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  featured BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add photo verification confidence tracking
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE;

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  hunt_id UUID REFERENCES hunts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_participants_hunt ON team_participants(hunt_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_hunt ON analytics_events(hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunts_scheduled ON hunts(scheduled_start) WHERE scheduled_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hunts_template ON hunts(is_template) WHERE is_template = TRUE;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points) VALUES
  ('First Hunt', 'Complete your first scavenger hunt', 'trophy', 'milestones', 'hunts_completed', 1, 10),
  ('Explorer', 'Complete 5 scavenger hunts', 'compass', 'milestones', 'hunts_completed', 5, 25),
  ('Veteran Hunter', 'Complete 25 scavenger hunts', 'medal', 'milestones', 'hunts_completed', 25, 100),
  ('Challenge Master', 'Complete 100 challenges', 'star', 'milestones', 'challenges_completed', 100, 50),
  ('Photo Pro', 'Complete 50 photo challenges', 'camera', 'skills', 'photo_challenges', 50, 40),
  ('Navigator', 'Complete 25 GPS challenges', 'navigate', 'skills', 'gps_challenges', 25, 40),
  ('Code Cracker', 'Complete 25 QR code challenges', 'qr-code', 'skills', 'qr_challenges', 25, 40),
  ('Speed Demon', 'Complete a hunt in under 10 minutes', 'flash', 'special', 'fast_completion', 1, 30),
  ('Hunt Creator', 'Create your first hunt', 'add-circle', 'creator', 'hunts_created', 1, 15),
  ('Popular Creator', 'Have 50 players complete your hunts', 'people', 'creator', 'hunt_completions', 50, 75),
  ('Team Player', 'Join a team', 'people-circle', 'social', 'team_joined', 1, 10),
  ('Team Leader', 'Create a team', 'flag', 'social', 'team_created', 1, 20)
ON CONFLICT DO NOTHING;
