-- Migration 016: Enable Row Level Security (RLS) on all tables
-- Fixes Supabase Security Advisor warnings about unauthorized data access
--
-- Architecture context:
--   - Mobile app uses Supabase anon key (client-side, exposed in app bundle)
--   - Web API uses service_role key or direct PostgreSQL (both bypass RLS)
--   - Auth is custom JWT-based, not Supabase Auth, so auth.uid() is unavailable
--   - All authenticated writes go through the API; anon key only needs read access
--     to public data

-- ============================================================================
-- CORE TABLES (from schema.sql)
-- ============================================================================

-- USERS: Contains password hashes and emails - no anon access at all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- HUNTS: Anon can read public active hunts for discovery/browse
ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hunts_public_read" ON hunts
  FOR SELECT
  TO anon
  USING (is_public = true AND status = 'active');

-- CHALLENGES: Anon can read challenges belonging to public active hunts
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_public_read" ON challenges
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hunts
      WHERE hunts.id = challenges.hunt_id
        AND hunts.is_public = true
        AND hunts.status = 'active'
    )
  );

-- PARTICIPANTS: Contains user IDs and scores - no anon access
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- SUBMISSIONS: Contains user submission data - no anon access
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- TEAMS: Anon can read teams for public hunts (leaderboards)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_public_read" ON teams
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hunts
      WHERE hunts.id = teams.hunt_id
        AND hunts.is_public = true
    )
  );

-- ============================================================================
-- SERVICE ROLE POLICIES
-- The service_role bypasses RLS by default in Supabase, so these are not
-- strictly necessary. They are included as documentation of intent.
-- ============================================================================

-- Grant full access to authenticated role for tables that need it
-- (In case Supabase Auth is added in the future)
CREATE POLICY "users_service_all" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "hunts_service_all" ON hunts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "challenges_service_all" ON challenges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "participants_service_all" ON participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "submissions_service_all" ON submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teams_service_all" ON teams
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TABLES FROM MIGRATIONS (enable RLS if they exist)
-- These use DO blocks so they don't fail if tables haven't been created yet
-- ============================================================================

DO $$ BEGIN
  -- Migration 002: Features
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members' AND table_schema = 'public') THEN
    ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_participants' AND table_schema = 'public') THEN
    ALTER TABLE team_participants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements' AND table_schema = 'public') THEN
    ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
    -- Achievements are public reference data
    CREATE POLICY IF NOT EXISTS "achievements_public_read" ON achievements FOR SELECT TO anon USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements' AND table_schema = 'public') THEN
    ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_templates' AND table_schema = 'public') THEN
    ALTER TABLE hunt_templates ENABLE ROW LEVEL SECURITY;
    -- Templates are public reference data
    CREATE POLICY IF NOT EXISTS "hunt_templates_public_read" ON hunt_templates FOR SELECT TO anon USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_tokens' AND table_schema = 'public') THEN
    ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events' AND table_schema = 'public') THEN
    ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 003: Fun features
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reactions' AND table_schema = 'public') THEN
    ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 004: Mystery reveals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystery_reveals' AND table_schema = 'public') THEN
    ALTER TABLE mystery_reveals ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 006: Password reset tokens - sensitive!
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens' AND table_schema = 'public') THEN
    ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 007: Tag mode
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_games' AND table_schema = 'public') THEN
    ALTER TABLE tag_games ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_players' AND table_schema = 'public') THEN
    ALTER TABLE tag_players ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_events' AND table_schema = 'public') THEN
    ALTER TABLE tag_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_safe_zones' AND table_schema = 'public') THEN
    ALTER TABLE tag_safe_zones ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_sabotages' AND table_schema = 'public') THEN
    ALTER TABLE tag_sabotages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_bounties' AND table_schema = 'public') THEN
    ALTER TABLE tag_bounties ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_alliances' AND table_schema = 'public') THEN
    ALTER TABLE tag_alliances ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_alliance_members' AND table_schema = 'public') THEN
    ALTER TABLE tag_alliance_members ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 008: Achievements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievement_progress' AND table_schema = 'public') THEN
    ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats' AND table_schema = 'public') THEN
    ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_cities' AND table_schema = 'public') THEN
    ALTER TABLE user_cities ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 009: Analytics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_analytics' AND table_schema = 'public') THEN
    ALTER TABLE hunt_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_analytics' AND table_schema = 'public') THEN
    ALTER TABLE challenge_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_sessions' AND table_schema = 'public') THEN
    ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_hunt_stats' AND table_schema = 'public') THEN
    ALTER TABLE daily_hunt_stats ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_ratings' AND table_schema = 'public') THEN
    ALTER TABLE hunt_ratings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_feedback' AND table_schema = 'public') THEN
    ALTER TABLE challenge_feedback ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 010: Teams
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invites' AND table_schema = 'public') THEN
    ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_hunts' AND table_schema = 'public') THEN
    ALTER TABLE team_hunts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_stats' AND table_schema = 'public') THEN
    ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_rooms' AND table_schema = 'public') THEN
    ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages' AND table_schema = 'public') THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_read_receipts' AND table_schema = 'public') THEN
    ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 011: Discovery
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_discovery' AND table_schema = 'public') THEN
    ALTER TABLE hunt_discovery ENABLE ROW LEVEL SECURITY;
    -- Discovery data is public by nature
    CREATE POLICY IF NOT EXISTS "hunt_discovery_public_read" ON hunt_discovery FOR SELECT TO anon USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_reviews' AND table_schema = 'public') THEN
    ALTER TABLE hunt_reviews ENABLE ROW LEVEL SECURITY;
    -- Reviews are public
    CREATE POLICY IF NOT EXISTS "hunt_reviews_public_read" ON hunt_reviews FOR SELECT TO anon USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_helpful_votes' AND table_schema = 'public') THEN
    ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_play_history' AND table_schema = 'public') THEN
    ALTER TABLE user_play_history ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences' AND table_schema = 'public') THEN
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featured_hunts' AND table_schema = 'public') THEN
    ALTER TABLE featured_hunts ENABLE ROW LEVEL SECURITY;
    -- Featured hunts are curated public data
    CREATE POLICY IF NOT EXISTS "featured_hunts_public_read" ON featured_hunts FOR SELECT TO anon USING (true);
  END IF;

  -- Migration 012: Social
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friendships' AND table_schema = 'public') THEN
    ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_requests' AND table_schema = 'public') THEN
    ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocked_users' AND table_schema = 'public') THEN
    ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed' AND table_schema = 'public') THEN
    ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_likes' AND table_schema = 'public') THEN
    ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_comments' AND table_schema = 'public') THEN
    ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_challenges' AND table_schema = 'public') THEN
    ALTER TABLE friend_challenges ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'creator_follows' AND table_schema = 'public') THEN
    ALTER TABLE creator_follows ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_suggestions' AND table_schema = 'public') THEN
    ALTER TABLE friend_suggestions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 013: Events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seasonal_events' AND table_schema = 'public') THEN
    ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
    -- Active events are public
    CREATE POLICY IF NOT EXISTS "seasonal_events_public_read" ON seasonal_events FOR SELECT TO anon USING (status = 'active');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_featured_hunts' AND table_schema = 'public') THEN
    ALTER TABLE event_featured_hunts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_challenges' AND table_schema = 'public') THEN
    ALTER TABLE event_challenges ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_rewards' AND table_schema = 'public') THEN
    ALTER TABLE event_rewards ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participation' AND table_schema = 'public') THEN
    ALTER TABLE event_participation ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboards' AND table_schema = 'public') THEN
    ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
    -- Public leaderboards are readable
    CREATE POLICY IF NOT EXISTS "leaderboards_public_read" ON leaderboards FOR SELECT TO anon USING (visibility = 'public');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboard_entries' AND table_schema = 'public') THEN
    ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboard_rewards' AND table_schema = 'public') THEN
    ALTER TABLE leaderboard_rewards ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_titles' AND table_schema = 'public') THEN
    ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 014: Series
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_series' AND table_schema = 'public') THEN
    ALTER TABLE hunt_series ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'series_chapters' AND table_schema = 'public') THEN
    ALTER TABLE series_chapters ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapter_branches' AND table_schema = 'public') THEN
    ALTER TABLE chapter_branches ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'choice_points' AND table_schema = 'public') THEN
    ALTER TABLE choice_points ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'choice_options' AND table_schema = 'public') THEN
    ALTER TABLE choice_options ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_endings' AND table_schema = 'public') THEN
    ALTER TABLE story_endings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'series_items' AND table_schema = 'public') THEN
    ALTER TABLE series_items ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'series_progress' AND table_schema = 'public') THEN
    ALTER TABLE series_progress ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_story_choices' AND table_schema = 'public') THEN
    ALTER TABLE user_story_choices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_series_inventory' AND table_schema = 'public') THEN
    ALTER TABLE user_series_inventory ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'series_collections' AND table_schema = 'public') THEN
    ALTER TABLE series_collections ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Migration 015: Live multiplayer
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'live_races' AND table_schema = 'public') THEN
    ALTER TABLE live_races ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'race_participants' AND table_schema = 'public') THEN
    ALTER TABLE race_participants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'race_checkpoints' AND table_schema = 'public') THEN
    ALTER TABLE race_checkpoints ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spectator_sessions' AND table_schema = 'public') THEN
    ALTER TABLE spectator_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spectator_reactions' AND table_schema = 'public') THEN
    ALTER TABLE spectator_reactions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spectator_comments' AND table_schema = 'public') THEN
    ALTER TABLE spectator_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments' AND table_schema = 'public') THEN
    ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_participants' AND table_schema = 'public') THEN
    ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_brackets' AND table_schema = 'public') THEN
    ALTER TABLE tournament_brackets ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_matches' AND table_schema = 'public') THEN
    ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'race_replays' AND table_schema = 'public') THEN
    ALTER TABLE race_replays ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'replay_events' AND table_schema = 'public') THEN
    ALTER TABLE replay_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'replay_highlights' AND table_schema = 'public') THEN
    ALTER TABLE replay_highlights ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matchmaking_queue' AND table_schema = 'public') THEN
    ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_racing_stats' AND table_schema = 'public') THEN
    ALTER TABLE user_racing_stats ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
