-- Achievement System Tables

-- Achievements definition table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('exploration', 'completion', 'speed', 'social', 'creator', 'streak', 'mastery', 'special')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points INTEGER NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_threshold INTEGER NOT NULL,
  requirement_conditions JSONB DEFAULT '{}',
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (unlocked badges)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

-- Achievement progress tracking (for incremental achievements)
CREATE TABLE IF NOT EXISTS achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- User stats for achievement tracking
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hunts_completed INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  hunts_created INTEGER DEFAULT 0,
  total_hunt_plays INTEGER DEFAULT 0,
  group_hunts INTEGER DEFAULT 0,
  solo_hunts INTEGER DEFAULT 0,
  cities_visited INTEGER DEFAULT 0,
  night_hunts INTEGER DEFAULT 0,
  perfect_hunts INTEGER DEFAULT 0,
  photos_taken INTEGER DEFAULT 0,
  tags_made INTEGER DEFAULT 0,
  bounties_claimed INTEGER DEFAULT 0,
  alliances_formed INTEGER DEFAULT 0,
  sabotages_deployed INTEGER DEFAULT 0,
  fastest_hunt_minutes INTEGER DEFAULT NULL,
  last_play_date DATE DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cities visited tracking
CREATE TABLE IF NOT EXISTS user_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  country TEXT,
  first_visited TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  UNIQUE(user_id, city)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cities_user ON user_cities(user_id);

-- Insert predefined achievements
INSERT INTO achievements (id, name, description, icon, category, rarity, points, requirement_type, requirement_threshold, is_secret) VALUES
  ('first_hunt', 'First Steps', 'Complete your first hunt', 'footsteps-outline', 'completion', 'common', 50, 'hunts_completed', 1, FALSE),
  ('hunt_veteran', 'Hunt Veteran', 'Complete 25 hunts', 'medal-outline', 'completion', 'uncommon', 250, 'hunts_completed', 25, FALSE),
  ('hunt_master', 'Hunt Master', 'Complete 100 hunts', 'trophy-outline', 'completion', 'epic', 1000, 'hunts_completed', 100, FALSE),
  ('challenge_champion', 'Challenge Champion', 'Complete 500 challenges', 'checkmark-done-outline', 'completion', 'rare', 500, 'challenges_completed', 500, FALSE),
  ('explorer_10', 'Explorer', 'Complete hunts in 10 different cities', 'globe-outline', 'exploration', 'rare', 500, 'cities_visited', 10, FALSE),
  ('world_traveler', 'World Traveler', 'Complete hunts in 25 different cities', 'airplane-outline', 'exploration', 'epic', 1000, 'cities_visited', 25, FALSE),
  ('speed_demon', 'Speed Demon', 'Complete a hunt in under 15 minutes', 'flash-outline', 'speed', 'uncommon', 200, 'speed_completion', 15, FALSE),
  ('lightning_fast', 'Lightning Fast', 'Complete a hunt in under 10 minutes', 'thunderstorm-outline', 'speed', 'rare', 400, 'speed_completion', 10, FALSE),
  ('social_butterfly', 'Social Butterfly', 'Complete 5 group hunts', 'people-outline', 'social', 'uncommon', 200, 'group_hunts', 5, FALSE),
  ('party_animal', 'Party Animal', 'Complete 25 group hunts', 'balloon-outline', 'social', 'rare', 500, 'group_hunts', 25, FALSE),
  ('lone_wolf', 'Lone Wolf', 'Complete 10 solo hunts', 'moon-outline', 'social', 'uncommon', 200, 'solo_hunts', 10, FALSE),
  ('hunt_creator', 'Hunt Creator', 'Create your first hunt', 'create-outline', 'creator', 'common', 100, 'hunts_created', 1, FALSE),
  ('prolific_creator', 'Prolific Creator', 'Create 10 hunts', 'brush-outline', 'creator', 'uncommon', 300, 'hunts_created', 10, FALSE),
  ('viral_hunt', 'Viral Hunt', 'Have your hunt played by 100 people', 'trending-up-outline', 'creator', 'rare', 500, 'hunt_plays', 100, FALSE),
  ('legendary_creator', 'Legendary Creator', 'Have your hunts played 1000 times total', 'star-outline', 'creator', 'legendary', 2000, 'hunt_plays', 1000, FALSE),
  ('consistent', 'Consistent', 'Play for 7 days in a row', 'calendar-outline', 'streak', 'uncommon', 200, 'streak_days', 7, FALSE),
  ('dedicated', 'Dedicated', 'Play for 30 days in a row', 'flame-outline', 'streak', 'epic', 1000, 'streak_days', 30, FALSE),
  ('unstoppable', 'Unstoppable', 'Achieve a 10x streak in a single hunt', 'rocket-outline', 'streak', 'rare', 400, 'current_streak', 10, FALSE),
  ('perfectionist', 'Perfectionist', '100% verification on all challenges in a hunt', 'ribbon-outline', 'mastery', 'rare', 400, 'perfect_verification', 1, FALSE),
  ('night_owl', 'Night Owl', 'Complete a hunt after 10 PM', 'cloudy-night-outline', 'mastery', 'uncommon', 150, 'night_hunts', 1, FALSE),
  ('photographer', 'Photographer', 'Take 100 photos across hunts', 'camera-outline', 'mastery', 'uncommon', 200, 'photos_taken', 100, FALSE),
  ('tag_champion', 'Tag Champion', 'Tag 50 players in Tag Mode', 'hand-left-outline', 'special', 'rare', 500, 'tags_made', 50, FALSE),
  ('bounty_hunter', 'Bounty Hunter', 'Claim 10 bounties', 'cash-outline', 'special', 'rare', 400, 'bounties_claimed', 10, FALSE),
  ('saboteur', 'Saboteur', 'Deploy 25 sabotages', 'flash-outline', 'special', 'uncommon', 250, 'sabotages_deployed', 25, FALSE),
  ('alliance_master', 'Alliance Master', 'Form 10 alliances', 'people-circle-outline', 'special', 'uncommon', 200, 'alliances_formed', 10, FALSE)
ON CONFLICT (id) DO NOTHING;
