-- Hunt Series & Storylines

-- Hunt series
CREATE TABLE IF NOT EXISTS hunt_series (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_image_url TEXT NOT NULL,
    banner_image_url TEXT,
    theme_color TEXT NOT NULL DEFAULT '#6366F1',
    genre TEXT NOT NULL CHECK (genre IN (
        'mystery', 'adventure', 'horror', 'romance', 'comedy',
        'sci_fi', 'fantasy', 'historical', 'thriller', 'educational'
    )),
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    total_chapters INTEGER NOT NULL DEFAULT 1,
    estimated_total_duration INTEGER NOT NULL DEFAULT 60,
    has_branching_paths BOOLEAN DEFAULT FALSE,
    has_multiple_endings BOOLEAN DEFAULT FALSE,
    ending_count INTEGER DEFAULT 1,
    has_character_progression BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    average_rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Series chapters
CREATE TABLE IF NOT EXISTS series_chapters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    hunt_id TEXT NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    thumbnail_url TEXT,
    estimated_duration INTEGER NOT NULL DEFAULT 30,
    requires_previous_chapter BOOLEAN DEFAULT TRUE,
    required_choices TEXT[] DEFAULT '{}',
    required_items TEXT[] DEFAULT '{}',
    is_optional BOOLEAN DEFAULT FALSE,
    branch_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(series_id, chapter_number)
);

-- Chapter branches
CREATE TABLE IF NOT EXISTS chapter_branches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    triggered_by_choice TEXT NOT NULL,
    chapter_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Choice points within chapters
CREATE TABLE IF NOT EXISTS choice_points (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    chapter_id TEXT NOT NULL REFERENCES series_chapters(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    choice_type TEXT NOT NULL CHECK (choice_type IN ('dialogue', 'action', 'path', 'ending')),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'challenge_complete', 'location_reached', 'item_found', 'time_elapsed'
    )),
    trigger_value TEXT NOT NULL,
    required_stats JSONB,
    required_items TEXT[] DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Choice options
CREATE TABLE IF NOT EXISTS choice_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    choice_point_id TEXT NOT NULL REFERENCES choice_points(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    subtext TEXT,
    required_stats JSONB,
    required_items TEXT[] DEFAULT '{}',
    stats_change JSONB,
    items_gained TEXT[] DEFAULT '{}',
    items_lost TEXT[] DEFAULT '{}',
    branch_unlock TEXT,
    ending_id TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story endings
CREATE TABLE IF NOT EXISTS story_endings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    video_url TEXT,
    required_choices TEXT[] DEFAULT '{}',
    required_stats JSONB,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'secret')),
    percent_players REAL DEFAULT 0,
    achievement_id TEXT,
    title_reward TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory items (templates for series)
CREATE TABLE IF NOT EXISTS series_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'cube',
    image_url TEXT,
    is_key_item BOOLEAN DEFAULT FALSE,
    is_consumable BOOLEAN DEFAULT FALSE,
    obtained_in_chapter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User series progress
CREATE TABLE IF NOT EXISTS series_progress (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
        'not_started', 'in_progress', 'completed', 'locked'
    )),
    current_chapter_id TEXT REFERENCES series_chapters(id) ON DELETE SET NULL,
    chapters_completed INTEGER DEFAULT 0,
    percent_complete REAL DEFAULT 0,
    character_stats JSONB DEFAULT '{"reputation": 0, "courage": 50, "wisdom": 50, "charisma": 50}',
    current_branch TEXT,
    unlocked_branches TEXT[] DEFAULT '{}',
    achieved_endings TEXT[] DEFAULT '{}',
    total_play_time INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(series_id, user_id)
);

-- User story choices
CREATE TABLE IF NOT EXISTS user_story_choices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL REFERENCES series_chapters(id) ON DELETE CASCADE,
    choice_point_id TEXT NOT NULL REFERENCES choice_points(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL,
    affected_stats JSONB,
    unlocked_items TEXT[] DEFAULT '{}',
    triggered_branch TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User inventory
CREATE TABLE IF NOT EXISTS user_series_inventory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    series_id TEXT NOT NULL REFERENCES hunt_series(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES series_items(id) ON DELETE CASCADE,
    obtained_in_chapter TEXT,
    obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_in_chapter TEXT,
    UNIQUE(series_id, user_id, item_id)
);

-- Series collections
CREATE TABLE IF NOT EXISTS series_collections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    series_ids TEXT[] DEFAULT '{}',
    reward_type TEXT CHECK (reward_type IN ('badge', 'title', 'exclusive_series')),
    reward_name TEXT,
    reward_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hunt_series_creator ON hunt_series(creator_id);
CREATE INDEX IF NOT EXISTS idx_hunt_series_genre ON hunt_series(genre);
CREATE INDEX IF NOT EXISTS idx_hunt_series_featured ON hunt_series(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_series_chapters_series ON series_chapters(series_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_choice_points_chapter ON choice_points(chapter_id);
CREATE INDEX IF NOT EXISTS idx_series_progress_user ON series_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_series_progress_status ON series_progress(series_id, status);
CREATE INDEX IF NOT EXISTS idx_user_story_choices_user ON user_story_choices(user_id, series_id);

-- Function to update series stats
CREATE OR REPLACE FUNCTION update_series_completion_rate()
RETURNS TRIGGER AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_count, completed_count
    FROM series_progress
    WHERE series_id = COALESCE(NEW.series_id, OLD.series_id);

    UPDATE hunt_series
    SET
        play_count = total_count,
        completion_rate = CASE WHEN total_count > 0 THEN (completed_count::REAL / total_count) * 100 ELSE 0 END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.series_id, OLD.series_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_series_completion_rate
AFTER INSERT OR UPDATE OR DELETE ON series_progress
FOR EACH ROW EXECUTE FUNCTION update_series_completion_rate();

-- Function to update ending percentages
CREATE OR REPLACE FUNCTION update_ending_percentages(p_series_id TEXT)
RETURNS void AS $$
DECLARE
    total_completions INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_completions
    FROM series_progress
    WHERE series_id = p_series_id AND status = 'completed';

    IF total_completions > 0 THEN
        UPDATE story_endings se
        SET percent_players = (
            SELECT (COUNT(*)::REAL / total_completions) * 100
            FROM series_progress sp
            WHERE sp.series_id = se.series_id
            AND se.id = ANY(sp.achieved_endings)
        )
        WHERE se.series_id = p_series_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
