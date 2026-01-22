-- Seasonal Events & Leaderboards

-- Seasonal events
CREATE TABLE IF NOT EXISTS seasonal_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    theme TEXT NOT NULL CHECK (theme IN (
        'halloween', 'winter_holiday', 'valentines', 'spring',
        'summer', 'back_to_school', 'thanksgiving', 'new_year',
        'anniversary', 'custom'
    )),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    banner_image_url TEXT NOT NULL,
    icon_url TEXT,
    primary_color TEXT NOT NULL DEFAULT '#6366F1',
    secondary_color TEXT NOT NULL DEFAULT '#8B5CF6',
    participant_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event featured hunts
CREATE TABLE IF NOT EXISTS event_featured_hunts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_id TEXT NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
    hunt_id TEXT NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(event_id, hunt_id)
);

-- Event challenges
CREATE TABLE IF NOT EXISTS event_challenges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_id TEXT NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'star',
    challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'complete_hunts', 'earn_score', 'travel_distance',
        'unlock_achievements', 'find_items', 'special'
    )),
    target_value INTEGER NOT NULL,
    points_reward INTEGER NOT NULL,
    achievement_reward TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event rewards
CREATE TABLE IF NOT EXISTS event_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_id TEXT NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN (
        'badge', 'title', 'avatar_frame', 'theme', 'discount', 'exclusive_hunt'
    )),
    image_url TEXT NOT NULL,
    points_required INTEGER NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN (
        'common', 'uncommon', 'rare', 'epic', 'legendary'
    )),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User event participation
CREATE TABLE IF NOT EXISTS event_participation (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_id TEXT NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    rank INTEGER,
    challenges_completed INTEGER DEFAULT 0,
    challenge_progress JSONB DEFAULT '{}',
    rewards_unlocked TEXT[] DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'regional', 'city', 'friends', 'team')),
    region TEXT,
    team_id TEXT,
    event_id TEXT REFERENCES seasonal_events(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('all_time', 'season', 'monthly', 'weekly', 'daily', 'event')),
    metric TEXT NOT NULL CHECK (metric IN (
        'hunts_completed', 'total_score', 'distance', 'speed', 'achievements'
    )),
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    leaderboard_id TEXT NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    previous_rank INTEGER,
    value REAL NOT NULL,
    hunts_completed INTEGER DEFAULT 0,
    total_distance REAL DEFAULT 0,
    average_score REAL DEFAULT 0,
    title TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leaderboard_id, user_id)
);

-- Leaderboard rewards
CREATE TABLE IF NOT EXISTS leaderboard_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    leaderboard_id TEXT NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    rank_start INTEGER NOT NULL,
    rank_end INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('badge', 'title', 'points', 'exclusive_content')),
    reward_name TEXT NOT NULL,
    reward_image_url TEXT,
    reward_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User titles (earned from leaderboards/events)
CREATE TABLE IF NOT EXISTS user_titles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('leaderboard', 'event', 'achievement', 'special')),
    source_id TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seasonal_events_dates ON seasonal_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_challenges_event ON event_challenges(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participation_event ON event_participation(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participation_user ON event_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_scope ON leaderboards(scope, period, metric);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_board ON leaderboard_entries(leaderboard_id, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON leaderboard_entries(user_id);

-- Function to update event participant count
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE seasonal_events SET participant_count = participant_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE seasonal_events SET participant_count = participant_count - 1 WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_participant_count
AFTER INSERT OR DELETE ON event_participation
FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();

-- Function to recalculate leaderboard ranks
CREATE OR REPLACE FUNCTION recalculate_leaderboard_ranks(p_leaderboard_id TEXT)
RETURNS void AS $$
BEGIN
    WITH ranked AS (
        SELECT
            id,
            rank,
            ROW_NUMBER() OVER (ORDER BY value DESC) as new_rank
        FROM leaderboard_entries
        WHERE leaderboard_id = p_leaderboard_id
    )
    UPDATE leaderboard_entries le
    SET
        previous_rank = le.rank,
        rank = r.new_rank,
        updated_at = NOW()
    FROM ranked r
    WHERE le.id = r.id;
END;
$$ LANGUAGE plpgsql;
