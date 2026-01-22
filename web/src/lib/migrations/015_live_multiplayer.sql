-- Live Multiplayer & Spectator Mode

-- Live races
CREATE TABLE IF NOT EXISTS live_races (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    hunt_id TEXT NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN (
        'waiting', 'countdown', 'in_progress', 'finished', 'cancelled'
    )),
    race_type TEXT NOT NULL DEFAULT 'standard' CHECK (race_type IN (
        'standard', 'elimination', 'relay', 'team', 'custom'
    )),
    max_participants INTEGER NOT NULL DEFAULT 10,
    current_participants INTEGER DEFAULT 0,
    spectator_count INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    winner_id TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Race participants
CREATE TABLE IF NOT EXISTS race_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id TEXT NOT NULL REFERENCES live_races(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id TEXT,
    status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN (
        'joined', 'ready', 'racing', 'finished', 'eliminated', 'disconnected'
    )),
    position INTEGER,
    current_checkpoint INTEGER DEFAULT 0,
    total_checkpoints INTEGER DEFAULT 0,
    progress REAL DEFAULT 0,
    score INTEGER DEFAULT 0,
    distance_traveled REAL DEFAULT 0,
    finish_time INTEGER,
    is_ready BOOLEAN DEFAULT FALSE,
    last_location JSONB,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(race_id, user_id)
);

-- Race checkpoints (for tracking progress)
CREATE TABLE IF NOT EXISTS race_checkpoints (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id TEXT NOT NULL REFERENCES live_races(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES race_participants(id) ON DELETE CASCADE,
    checkpoint_index INTEGER NOT NULL,
    item_id TEXT,
    reached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_from_start INTEGER NOT NULL,
    UNIQUE(participant_id, checkpoint_index)
);

-- Spectator sessions
CREATE TABLE IF NOT EXISTS spectator_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id TEXT NOT NULL REFERENCES live_races(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_mode TEXT NOT NULL DEFAULT 'overview' CHECK (view_mode IN (
        'overview', 'follow', 'map', 'split'
    )),
    following_participant_id TEXT REFERENCES race_participants(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(race_id, user_id)
);

-- Spectator reactions
CREATE TABLE IF NOT EXISTS spectator_reactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id TEXT NOT NULL REFERENCES live_races(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_participant_id TEXT REFERENCES race_participants(id),
    reaction_type TEXT NOT NULL CHECK (reaction_type IN (
        'cheer', 'fire', 'clap', 'wow', 'laugh', 'heart', 'star', 'trophy'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spectator comments
CREATE TABLE IF NOT EXISTS spectator_comments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id TEXT NOT NULL REFERENCES live_races(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    hunt_id TEXT NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format TEXT NOT NULL DEFAULT 'single_elimination' CHECK (format IN (
        'single_elimination', 'double_elimination', 'round_robin', 'swiss'
    )),
    status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN (
        'registration', 'seeding', 'in_progress', 'completed', 'cancelled'
    )),
    max_participants INTEGER NOT NULL DEFAULT 32,
    current_participants INTEGER DEFAULT 0,
    registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
    tournament_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_round INTEGER DEFAULT 0,
    total_rounds INTEGER,
    entry_fee INTEGER DEFAULT 0,
    prize_pool INTEGER DEFAULT 0,
    prizes JSONB DEFAULT '[]',
    rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seed INTEGER,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN (
        'registered', 'confirmed', 'eliminated', 'winner', 'withdrawn'
    )),
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    current_position INTEGER,
    final_position INTEGER,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Tournament brackets
CREATE TABLE IF NOT EXISTS tournament_brackets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_type TEXT NOT NULL DEFAULT 'winners' CHECK (bracket_type IN (
        'winners', 'losers', 'grand_finals'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament matches
CREATE TABLE IF NOT EXISTS tournament_matches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_id TEXT REFERENCES tournament_brackets(id) ON DELETE CASCADE,
    race_id TEXT REFERENCES live_races(id),
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    participant1_id TEXT REFERENCES tournament_participants(id),
    participant2_id TEXT REFERENCES tournament_participants(id),
    winner_id TEXT REFERENCES tournament_participants(id),
    loser_id TEXT REFERENCES tournament_participants(id),
    participant1_score INTEGER,
    participant2_score INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'scheduled', 'in_progress', 'completed', 'bye'
    )),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    next_match_id TEXT REFERENCES tournament_matches(id),
    loser_next_match_id TEXT REFERENCES tournament_matches(id),
    UNIQUE(tournament_id, bracket_id, round, match_number)
);

-- Race replays
CREATE TABLE IF NOT EXISTS race_replays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    race_id TEXT NOT NULL REFERENCES live_races(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    total_checkpoints INTEGER NOT NULL,
    participant_count INTEGER NOT NULL,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replay events (for reconstructing race)
CREATE TABLE IF NOT EXISTS replay_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    replay_id TEXT NOT NULL REFERENCES race_replays(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'position_update', 'checkpoint_reached', 'item_found',
        'power_up_used', 'elimination', 'finish', 'reaction'
    )),
    participant_id TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replay highlights
CREATE TABLE IF NOT EXISTS replay_highlights (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    replay_id TEXT NOT NULL REFERENCES race_replays(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL,
    highlight_type TEXT NOT NULL CHECK (highlight_type IN (
        'close_finish', 'overtake', 'lead_change', 'fast_solve', 'comeback'
    )),
    title TEXT NOT NULL,
    description TEXT,
    participants TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode TEXT NOT NULL CHECK (game_mode IN (
        'ranked', 'casual', 'tournament'
    )),
    skill_rating INTEGER DEFAULT 1000,
    search_range INTEGER DEFAULT 200,
    preferred_hunt_types TEXT[] DEFAULT '{}',
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes',
    UNIQUE(user_id, game_mode)
);

-- User racing stats
CREATE TABLE IF NOT EXISTS user_racing_stats (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    races_completed INTEGER DEFAULT 0,
    races_won INTEGER DEFAULT 0,
    total_race_time INTEGER DEFAULT 0,
    average_position REAL DEFAULT 0,
    best_finish_time INTEGER,
    tournaments_entered INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    ranked_rating INTEGER DEFAULT 1000,
    ranked_tier TEXT DEFAULT 'bronze' CHECK (ranked_tier IN (
        'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'
    )),
    win_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_races_status ON live_races(status);
CREATE INDEX IF NOT EXISTS idx_live_races_hunt ON live_races(hunt_id);
CREATE INDEX IF NOT EXISTS idx_live_races_host ON live_races(host_id);
CREATE INDEX IF NOT EXISTS idx_race_participants_race ON race_participants(race_id);
CREATE INDEX IF NOT EXISTS idx_race_participants_user ON race_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_spectator_sessions_race ON spectator_sessions(race_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_race_replays_race ON race_replays(race_id);
CREATE INDEX IF NOT EXISTS idx_replay_events_replay ON replay_events(replay_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode ON matchmaking_queue(game_mode, queued_at);

-- Function to update race participant count
CREATE OR REPLACE FUNCTION update_race_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE live_races SET current_participants = current_participants + 1 WHERE id = NEW.race_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE live_races SET current_participants = current_participants - 1 WHERE id = OLD.race_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_race_participant_count
AFTER INSERT OR DELETE ON race_participants
FOR EACH ROW EXECUTE FUNCTION update_race_participant_count();

-- Function to update spectator count
CREATE OR REPLACE FUNCTION update_spectator_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE live_races SET spectator_count = spectator_count + 1 WHERE id = NEW.race_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL) THEN
        UPDATE live_races SET spectator_count = spectator_count - 1 WHERE id = COALESCE(NEW.race_id, OLD.race_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spectator_count
AFTER INSERT OR DELETE OR UPDATE ON spectator_sessions
FOR EACH ROW EXECUTE FUNCTION update_spectator_count();

-- Function to update user racing stats after race completion
CREATE OR REPLACE FUNCTION update_user_racing_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
        INSERT INTO user_racing_stats (user_id, races_completed, races_won, total_race_time, average_position, best_finish_time)
        VALUES (
            NEW.user_id,
            1,
            CASE WHEN NEW.position = 1 THEN 1 ELSE 0 END,
            COALESCE(NEW.finish_time, 0),
            NEW.position,
            NEW.finish_time
        )
        ON CONFLICT (user_id) DO UPDATE SET
            races_completed = user_racing_stats.races_completed + 1,
            races_won = user_racing_stats.races_won + CASE WHEN NEW.position = 1 THEN 1 ELSE 0 END,
            total_race_time = user_racing_stats.total_race_time + COALESCE(NEW.finish_time, 0),
            average_position = (user_racing_stats.average_position * user_racing_stats.races_completed + NEW.position) / (user_racing_stats.races_completed + 1),
            best_finish_time = LEAST(user_racing_stats.best_finish_time, NEW.finish_time),
            win_streak = CASE WHEN NEW.position = 1 THEN user_racing_stats.win_streak + 1 ELSE 0 END,
            best_win_streak = GREATEST(user_racing_stats.best_win_streak, CASE WHEN NEW.position = 1 THEN user_racing_stats.win_streak + 1 ELSE user_racing_stats.best_win_streak END),
            updated_at = NOW();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_racing_stats
AFTER UPDATE ON race_participants
FOR EACH ROW EXECUTE FUNCTION update_user_racing_stats();

-- Function to generate tournament brackets
CREATE OR REPLACE FUNCTION generate_single_elimination_bracket(p_tournament_id TEXT)
RETURNS void AS $$
DECLARE
    v_bracket_id TEXT;
    v_participants RECORD;
    v_participant_count INTEGER;
    v_rounds INTEGER;
    v_match_count INTEGER;
    v_match_number INTEGER;
    v_round INTEGER;
BEGIN
    -- Create winners bracket
    INSERT INTO tournament_brackets (tournament_id, bracket_type)
    VALUES (p_tournament_id, 'winners')
    RETURNING id INTO v_bracket_id;

    -- Get participant count
    SELECT COUNT(*) INTO v_participant_count
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id AND status = 'confirmed';

    -- Calculate rounds needed
    v_rounds := CEIL(LOG(2, v_participant_count));

    -- Update tournament total rounds
    UPDATE tournaments SET total_rounds = v_rounds WHERE id = p_tournament_id;

    -- Generate matches for each round
    FOR v_round IN 1..v_rounds LOOP
        v_match_count := POWER(2, v_rounds - v_round);
        FOR v_match_number IN 1..v_match_count LOOP
            INSERT INTO tournament_matches (tournament_id, bracket_id, round, match_number, status)
            VALUES (p_tournament_id, v_bracket_id, v_round, v_match_number, 'pending');
        END LOOP;
    END LOOP;

    -- Seed first round matches with participants
    v_match_number := 1;
    FOR v_participants IN
        SELECT id FROM tournament_participants
        WHERE tournament_id = p_tournament_id AND status = 'confirmed'
        ORDER BY seed NULLS LAST, registered_at
    LOOP
        -- Alternate between participant1 and participant2
        IF v_match_number % 2 = 1 THEN
            UPDATE tournament_matches
            SET participant1_id = v_participants.id
            WHERE tournament_id = p_tournament_id AND round = 1 AND match_number = CEIL(v_match_number::REAL / 2);
        ELSE
            UPDATE tournament_matches
            SET participant2_id = v_participants.id
            WHERE tournament_id = p_tournament_id AND round = 1 AND match_number = CEIL(v_match_number::REAL / 2);
        END IF;
        v_match_number := v_match_number + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
