-- Team Management Tables

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  max_members INTEGER DEFAULT 10,
  hunts_completed INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'left')),
  hunt_role TEXT DEFAULT 'none' CHECK (hunt_role IN ('captain', 'navigator', 'photographer', 'scout', 'none')),
  hunts_participated INTEGER DEFAULT 0,
  points_contributed INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invites
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team hunts (scheduled and completed)
CREATE TABLE IF NOT EXISTS team_hunts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_score INTEGER DEFAULT 0,
  rank INTEGER,
  participant_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team stats
CREATE TABLE IF NOT EXISTS team_stats (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  total_hunts INTEGER DEFAULT 0,
  completed_hunts INTEGER DEFAULT 0,
  average_score DECIMAL(10, 2) DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  total_challenges INTEGER DEFAULT 0,
  average_completion_time INTEGER DEFAULT 0, -- seconds
  win_rate DECIMAL(5, 2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'location', 'photo', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat read receipts
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_hunts_team ON team_hunts(team_id);
CREATE INDEX IF NOT EXISTS idx_team_hunts_hunt ON team_hunts(hunt_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_team ON chat_rooms(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Functions
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams SET member_count = member_count - 1 WHERE id = OLD.team_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for member count
DROP TRIGGER IF EXISTS trigger_team_member_count ON team_members;
CREATE TRIGGER trigger_team_member_count
  AFTER INSERT OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create default chat room when team is created
CREATE OR REPLACE FUNCTION create_team_chat_room()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_rooms (team_id, name)
  VALUES (NEW.id, 'General');

  INSERT INTO team_stats (team_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create chat room
DROP TRIGGER IF EXISTS trigger_create_team_chat ON teams;
CREATE TRIGGER trigger_create_team_chat
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_chat_room();
