-- Tag Mode Database Schema
-- Competitive location-based chase game inspired by the movie "Tag"

-- Tag game sessions
CREATE TABLE IF NOT EXISTS tag_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL DEFAULT 'hunter_hunted',
  settings JSONB NOT NULL DEFAULT '{}',
  current_hunter_id UUID REFERENCES users(id),
  hunter_rotates_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag game participants
CREATE TABLE IF NOT EXISTS tag_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_game_id UUID NOT NULL REFERENCES tag_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'hunted',
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  -- Fuzzy location (zone-based for privacy)
  current_zone VARCHAR(100),
  zone_updated_at TIMESTAMPTZ,

  -- Exact location (only shared with close friends/allies)
  last_latitude DECIMAL(10, 8),
  last_longitude DECIMAL(11, 8),
  location_updated_at TIMESTAMPTZ,

  -- Stats
  tags_completed INT DEFAULT 0,
  times_tagged INT DEFAULT 0,
  challenges_completed INT DEFAULT 0,
  sabotages_deployed INT DEFAULT 0,
  bounties_claimed INT DEFAULT 0,
  score INT DEFAULT 0,
  bonus_points INT DEFAULT 0,

  -- State
  immune_until TIMESTAMPTZ,
  stealth_until TIMESTAMPTZ,
  alliance_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tag_game_id, user_id)
);

-- Tag events log
CREATE TABLE IF NOT EXISTS tag_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_game_id UUID NOT NULL REFERENCES tag_games(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_id UUID REFERENCES users(id),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe zones
CREATE TABLE IF NOT EXISTS tag_safe_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_game_id UUID NOT NULL REFERENCES tag_games(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INT NOT NULL DEFAULT 50,
  active_start_hour INT, -- 0-23, NULL = always active
  active_end_hour INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sabotages
CREATE TABLE IF NOT EXISTS tag_sabotages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_game_id UUID NOT NULL REFERENCES tag_games(id) ON DELETE CASCADE,
  deployed_by UUID NOT NULL REFERENCES users(id),
  sabotage_type VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INT NOT NULL DEFAULT 30,
  expires_at TIMESTAMPTZ NOT NULL,
  triggered BOOLEAN DEFAULT FALSE,
  triggered_by UUID REFERENCES users(id),
  triggered_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bounties
CREATE TABLE IF NOT EXISTS tag_bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_game_id UUID NOT NULL REFERENCES tag_games(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id),
  placed_by UUID NOT NULL REFERENCES users(id),
  reward INT NOT NULL,
  reason VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_by UUID REFERENCES users(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alliances
CREATE TABLE IF NOT EXISTS tag_alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_game_id UUID NOT NULL REFERENCES tag_games(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  leader_id UUID NOT NULL REFERENCES users(id),
  shared_progress BOOLEAN DEFAULT TRUE,
  betrayed_at TIMESTAMPTZ,
  betrayed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alliance members
CREATE TABLE IF NOT EXISTS tag_alliance_members (
  alliance_id UUID NOT NULL REFERENCES tag_alliances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (alliance_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tag_games_hunt ON tag_games(hunt_id);
CREATE INDEX IF NOT EXISTS idx_tag_games_status ON tag_games(status);
CREATE INDEX IF NOT EXISTS idx_tag_players_game ON tag_players(tag_game_id);
CREATE INDEX IF NOT EXISTS idx_tag_players_user ON tag_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_players_alliance ON tag_players(alliance_id);
CREATE INDEX IF NOT EXISTS idx_tag_events_game ON tag_events(tag_game_id);
CREATE INDEX IF NOT EXISTS idx_tag_events_type ON tag_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tag_sabotages_game ON tag_sabotages(tag_game_id) WHERE NOT triggered;
CREATE INDEX IF NOT EXISTS idx_tag_sabotages_location ON tag_sabotages(latitude, longitude) WHERE NOT triggered;
CREATE INDEX IF NOT EXISTS idx_tag_bounties_game ON tag_bounties(tag_game_id) WHERE NOT claimed;
CREATE INDEX IF NOT EXISTS idx_tag_bounties_target ON tag_bounties(target_id) WHERE NOT claimed;
