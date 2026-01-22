-- Hunt Analytics Tables

-- Hunt-level analytics (aggregated)
CREATE TABLE IF NOT EXISTS hunt_analytics (
  hunt_id UUID PRIMARY KEY REFERENCES hunts(id) ON DELETE CASCADE,
  total_plays INTEGER DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  average_time INTEGER DEFAULT 0, -- seconds
  plays_today INTEGER DEFAULT 0,
  plays_this_week INTEGER DEFAULT 0,
  plays_this_month INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  rating_1 INTEGER DEFAULT 0,
  rating_2 INTEGER DEFAULT 0,
  rating_3 INTEGER DEFAULT 0,
  rating_4 INTEGER DEFAULT 0,
  rating_5 INTEGER DEFAULT 0,
  repeat_players INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge-level analytics
CREATE TABLE IF NOT EXISTS challenge_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  successful_completions INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  average_time INTEGER DEFAULT 0, -- seconds
  fastest_time INTEGER,
  slowest_time INTEGER,
  verification_success_rate DECIMAL(5,2) DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  abandon_count INTEGER DEFAULT 0,
  average_difficulty DECIMAL(3,2) DEFAULT 0,
  base_points INTEGER DEFAULT 0,
  average_points_awarded DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id)
);

-- Player session analytics
CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time INTEGER DEFAULT 0, -- seconds
  challenges_attempted INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  challenges_skipped INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  verification_score DECIMAL(5,2) DEFAULT 0,
  photos_submitted INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  last_challenge_id UUID,
  drop_off_reason TEXT CHECK (drop_off_reason IN ('completed', 'quit', 'timeout', 'error')),
  device_type TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events (raw event stream)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  hunt_id UUID REFERENCES hunts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  challenge_id UUID,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregated stats for trending
CREATE TABLE IF NOT EXISTS daily_hunt_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  plays INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  average_time INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  sum_ratings INTEGER DEFAULT 0,
  UNIQUE(hunt_id, date)
);

-- Hunt ratings
CREATE TABLE IF NOT EXISTS hunt_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hunt_id, user_id)
);

-- Challenge feedback
CREATE TABLE IF NOT EXISTS challenge_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hunt_analytics_hunt ON hunt_analytics(hunt_id);
CREATE INDEX IF NOT EXISTS idx_challenge_analytics_hunt ON challenge_analytics(hunt_id);
CREATE INDEX IF NOT EXISTS idx_challenge_analytics_challenge ON challenge_analytics(challenge_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_user ON player_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_hunt ON player_sessions(hunt_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_session ON player_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_hunt ON analytics_events(hunt_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_daily_hunt_stats_hunt_date ON daily_hunt_stats(hunt_id, date);
CREATE INDEX IF NOT EXISTS idx_hunt_ratings_hunt ON hunt_ratings(hunt_id);

-- Function to update hunt analytics after a play
CREATE OR REPLACE FUNCTION update_hunt_analytics_on_play()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hunt_analytics (hunt_id, total_plays, unique_players, last_played_at)
  VALUES (NEW.hunt_id, 1, 1, NOW())
  ON CONFLICT (hunt_id) DO UPDATE SET
    total_plays = hunt_analytics.total_plays + 1,
    last_played_at = NOW(),
    updated_at = NOW();

  -- Update daily stats
  INSERT INTO daily_hunt_stats (hunt_id, date, plays, unique_players)
  VALUES (NEW.hunt_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (hunt_id, date) DO UPDATE SET
    plays = daily_hunt_stats.plays + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating analytics when a session starts
DROP TRIGGER IF EXISTS trigger_update_hunt_analytics ON player_sessions;
CREATE TRIGGER trigger_update_hunt_analytics
  AFTER INSERT ON player_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_hunt_analytics_on_play();

-- Function to update completion stats
CREATE OR REPLACE FUNCTION update_completion_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.drop_off_reason = 'completed' AND (OLD.drop_off_reason IS NULL OR OLD.drop_off_reason != 'completed') THEN
    -- Update daily stats
    UPDATE daily_hunt_stats
    SET completions = completions + 1
    WHERE hunt_id = NEW.hunt_id AND date = CURRENT_DATE;

    -- Recalculate completion rate
    UPDATE hunt_analytics
    SET
      completion_rate = (
        SELECT (COUNT(*) FILTER (WHERE drop_off_reason = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) * 100)
        FROM player_sessions WHERE hunt_id = NEW.hunt_id
      ),
      average_score = (
        SELECT AVG(total_score) FROM player_sessions WHERE hunt_id = NEW.hunt_id AND drop_off_reason = 'completed'
      ),
      average_time = (
        SELECT AVG(total_time) FROM player_sessions WHERE hunt_id = NEW.hunt_id AND drop_off_reason = 'completed'
      ),
      updated_at = NOW()
    WHERE hunt_id = NEW.hunt_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating completion analytics
DROP TRIGGER IF EXISTS trigger_update_completion_analytics ON player_sessions;
CREATE TRIGGER trigger_update_completion_analytics
  AFTER UPDATE ON player_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_completion_analytics();
