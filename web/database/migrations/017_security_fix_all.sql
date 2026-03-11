-- ============================================================================
-- Migration 017: Comprehensive Security Fix
-- Fixes all 13 Supabase Security Advisor errors
-- Report: 07 Mar 2026 | Project: wkussunmimswffqpbpod
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE RLS ON ALL CORE TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: DROP OLD POLICIES (clean slate to avoid conflicts)
-- ============================================================================

-- Users
DROP POLICY IF EXISTS "users_service_all" ON users;
DROP POLICY IF EXISTS "users_public_read" ON users;

-- Hunts
DROP POLICY IF EXISTS "hunts_service_all" ON hunts;
DROP POLICY IF EXISTS "hunts_public_read" ON hunts;

-- Challenges
DROP POLICY IF EXISTS "challenges_service_all" ON challenges;
DROP POLICY IF EXISTS "challenges_public_read" ON challenges;

-- Participants
DROP POLICY IF EXISTS "participants_service_all" ON participants;

-- Submissions
DROP POLICY IF EXISTS "submissions_service_all" ON submissions;

-- Teams
DROP POLICY IF EXISTS "teams_service_all" ON teams;
DROP POLICY IF EXISTS "teams_public_read" ON teams;

-- ============================================================================
-- SECTION 3: CREATE SECURE RLS POLICIES
--
-- Architecture:
--   • Web API uses POSTGRES_URL (direct DB / pooler) — bypasses RLS entirely
--   • Mobile app uses Supabase anon key — goes through RLS
--   • No Supabase Auth (custom JWT) so auth.uid() is not available
--   • Anon should ONLY read public, non-sensitive data
-- ============================================================================

-- USERS: Contains passwords & emails — NO anon access ever
-- (API handles all auth writes directly, bypasses RLS)

-- HUNTS: Anon can browse public active hunts
CREATE POLICY "hunts_public_read" ON hunts
  FOR SELECT TO anon
  USING (is_public = true AND status = 'active');

-- CHALLENGES: Anon can read challenges for public active hunts
CREATE POLICY "challenges_public_read" ON challenges
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hunts
      WHERE hunts.id = challenges.hunt_id
        AND hunts.is_public = true
        AND hunts.status = 'active'
    )
  );

-- PARTICIPANTS: No anon access (contains user data & scores)

-- SUBMISSIONS: No anon access (contains user submission data)

-- TEAMS: Anon can see team names for public hunts (leaderboards)
CREATE POLICY "teams_public_read" ON teams
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM hunts
      WHERE hunts.id = teams.hunt_id
        AND hunts.is_public = true
    )
  );

-- ============================================================================
-- SECTION 4: ENABLE RLS ON ALL MIGRATION TABLES (safe — skips if missing)
-- ============================================================================

DO $$ BEGIN

  -- password_reset_tokens: HIGHLY SENSITIVE — no anon access
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens' AND table_schema = 'public') THEN
    ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
  END IF;

  -- push_tokens
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_tokens' AND table_schema = 'public') THEN
    ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
  END IF;

  -- notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  END IF;

  -- achievements (public reference data)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements' AND table_schema = 'public') THEN
    ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "achievements_public_read" ON achievements;
    CREATE POLICY "achievements_public_read" ON achievements FOR SELECT TO anon USING (true);
  END IF;

  -- user_achievements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements' AND table_schema = 'public') THEN
    ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_stats
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats' AND table_schema = 'public') THEN
    ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
  END IF;

  -- hunt_templates (public reference)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_templates' AND table_schema = 'public') THEN
    ALTER TABLE hunt_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hunt_templates_public_read" ON hunt_templates;
    CREATE POLICY "hunt_templates_public_read" ON hunt_templates FOR SELECT TO anon USING (true);
  END IF;

  -- team_members
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members' AND table_schema = 'public') THEN
    ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
  END IF;

  -- team_participants
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_participants' AND table_schema = 'public') THEN
    ALTER TABLE team_participants ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_games
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_games' AND table_schema = 'public') THEN
    ALTER TABLE tag_games ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_players
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_players' AND table_schema = 'public') THEN
    ALTER TABLE tag_players ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_events' AND table_schema = 'public') THEN
    ALTER TABLE tag_events ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_safe_zones
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_safe_zones' AND table_schema = 'public') THEN
    ALTER TABLE tag_safe_zones ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_sabotages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_sabotages' AND table_schema = 'public') THEN
    ALTER TABLE tag_sabotages ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_bounties
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_bounties' AND table_schema = 'public') THEN
    ALTER TABLE tag_bounties ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_alliances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_alliances' AND table_schema = 'public') THEN
    ALTER TABLE tag_alliances ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tag_alliance_members
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tag_alliance_members' AND table_schema = 'public') THEN
    ALTER TABLE tag_alliance_members ENABLE ROW LEVEL SECURITY;
  END IF;

  -- achievement_progress
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievement_progress' AND table_schema = 'public') THEN
    ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
  END IF;

  -- analytics_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events' AND table_schema = 'public') THEN
    ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;

  -- hunt_analytics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_analytics' AND table_schema = 'public') THEN
    ALTER TABLE hunt_analytics ENABLE ROW LEVEL SECURITY;
  END IF;

  -- challenge_analytics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_analytics' AND table_schema = 'public') THEN
    ALTER TABLE challenge_analytics ENABLE ROW LEVEL SECURITY;
  END IF;

  -- player_sessions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_sessions' AND table_schema = 'public') THEN
    ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- hunt_ratings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_ratings' AND table_schema = 'public') THEN
    ALTER TABLE hunt_ratings ENABLE ROW LEVEL SECURITY;
  END IF;

  -- reactions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reactions' AND table_schema = 'public') THEN
    ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- mystery_reveals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystery_reveals' AND table_schema = 'public') THEN
    ALTER TABLE mystery_reveals ENABLE ROW LEVEL SECURITY;
  END IF;

  -- team_invites
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invites' AND table_schema = 'public') THEN
    ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
  END IF;

  -- team_hunts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_hunts' AND table_schema = 'public') THEN
    ALTER TABLE team_hunts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- team_stats
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_stats' AND table_schema = 'public') THEN
    ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
  END IF;

  -- chat_rooms
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_rooms' AND table_schema = 'public') THEN
    ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
  END IF;

  -- chat_messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages' AND table_schema = 'public') THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  END IF;

  -- chat_read_receipts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_read_receipts' AND table_schema = 'public') THEN
    ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- hunt_discovery (public)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_discovery' AND table_schema = 'public') THEN
    ALTER TABLE hunt_discovery ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hunt_discovery_public_read" ON hunt_discovery;
    CREATE POLICY "hunt_discovery_public_read" ON hunt_discovery FOR SELECT TO anon USING (true);
  END IF;

  -- hunt_reviews (public)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_reviews' AND table_schema = 'public') THEN
    ALTER TABLE hunt_reviews ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hunt_reviews_public_read" ON hunt_reviews;
    CREATE POLICY "hunt_reviews_public_read" ON hunt_reviews FOR SELECT TO anon USING (true);
  END IF;

  -- review_helpful_votes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_helpful_votes' AND table_schema = 'public') THEN
    ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_play_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_play_history' AND table_schema = 'public') THEN
    ALTER TABLE user_play_history ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences' AND table_schema = 'public') THEN
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
  END IF;

  -- featured_hunts (public)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featured_hunts' AND table_schema = 'public') THEN
    ALTER TABLE featured_hunts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "featured_hunts_public_read" ON featured_hunts;
    CREATE POLICY "featured_hunts_public_read" ON featured_hunts FOR SELECT TO anon USING (true);
  END IF;

  -- user_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  END IF;

  -- friendships
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friendships' AND table_schema = 'public') THEN
    ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
  END IF;

  -- friend_requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_requests' AND table_schema = 'public') THEN
    ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
  END IF;

  -- blocked_users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocked_users' AND table_schema = 'public') THEN
    ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
  END IF;

  -- activity_feed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed' AND table_schema = 'public') THEN
    ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
  END IF;

  -- activity_likes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_likes' AND table_schema = 'public') THEN
    ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
  END IF;

  -- activity_comments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_comments' AND table_schema = 'public') THEN
    ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
  END IF;

  -- friend_challenges
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_challenges' AND table_schema = 'public') THEN
    ALTER TABLE friend_challenges ENABLE ROW LEVEL SECURITY;
  END IF;

  -- creator_follows
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'creator_follows' AND table_schema = 'public') THEN
    ALTER TABLE creator_follows ENABLE ROW LEVEL SECURITY;
  END IF;

  -- seasonal_events (public)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seasonal_events' AND table_schema = 'public') THEN
    ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seasonal_events_public_read" ON seasonal_events;
    CREATE POLICY "seasonal_events_public_read" ON seasonal_events FOR SELECT TO anon USING (status = 'active');
  END IF;

  -- event_featured_hunts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_featured_hunts' AND table_schema = 'public') THEN
    ALTER TABLE event_featured_hunts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- event_participation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participation' AND table_schema = 'public') THEN
    ALTER TABLE event_participation ENABLE ROW LEVEL SECURITY;
  END IF;

  -- leaderboards (public)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboards' AND table_schema = 'public') THEN
    ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "leaderboards_public_read" ON leaderboards;
    CREATE POLICY "leaderboards_public_read" ON leaderboards FOR SELECT TO anon USING (visibility = 'public');
  END IF;

  -- leaderboard_entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboard_entries' AND table_schema = 'public') THEN
    ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
  END IF;

  -- live_races
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'live_races' AND table_schema = 'public') THEN
    ALTER TABLE live_races ENABLE ROW LEVEL SECURITY;
  END IF;

  -- race_participants
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'race_participants' AND table_schema = 'public') THEN
    ALTER TABLE race_participants ENABLE ROW LEVEL SECURITY;
  END IF;

  -- race_checkpoints
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'race_checkpoints' AND table_schema = 'public') THEN
    ALTER TABLE race_checkpoints ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tournaments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments' AND table_schema = 'public') THEN
    ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
  END IF;

  -- tournament_participants
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_participants' AND table_schema = 'public') THEN
    ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
  END IF;

  -- matchmaking_queue
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matchmaking_queue' AND table_schema = 'public') THEN
    ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_racing_stats
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_racing_stats' AND table_schema = 'public') THEN
    ALTER TABLE user_racing_stats ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_cities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_cities' AND table_schema = 'public') THEN
    ALTER TABLE user_cities ENABLE ROW LEVEL SECURITY;
  END IF;

  -- daily_hunt_stats
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_hunt_stats' AND table_schema = 'public') THEN
    ALTER TABLE daily_hunt_stats ENABLE ROW LEVEL SECURITY;
  END IF;

  -- challenge_feedback
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_feedback' AND table_schema = 'public') THEN
    ALTER TABLE challenge_feedback ENABLE ROW LEVEL SECURITY;
  END IF;

  -- hunt_series
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hunt_series' AND table_schema = 'public') THEN
    ALTER TABLE hunt_series ENABLE ROW LEVEL SECURITY;
  END IF;

  -- series_progress
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'series_progress' AND table_schema = 'public') THEN
    ALTER TABLE series_progress ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_story_choices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_story_choices' AND table_schema = 'public') THEN
    ALTER TABLE user_story_choices ENABLE ROW LEVEL SECURITY;
  END IF;

END $$;

-- ============================================================================
-- SECTION 5: REVOKE DANGEROUS DEFAULT PUBLIC PRIVILEGES
-- Supabase by default grants public access to public schema
-- ============================================================================

-- Revoke default public execute on functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Revoke public schema creation from public role (security best practice)
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- ============================================================================
-- SECTION 6: VERIFY — Run this to confirm all tables have RLS enabled
-- ============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- (All rowsecurity values should be TRUE)

-- ============================================================================
-- SUCCESS: All 13 security advisor errors should now be resolved.
-- Refresh the Supabase Security Advisor to confirm.
-- ============================================================================
