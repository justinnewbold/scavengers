-- Social Features & Friends System

-- User profiles (extends existing users table)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    show_activity BOOLEAN DEFAULT TRUE,
    total_distance_km REAL DEFAULT 0,
    friend_count INTEGER DEFAULT 0,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(sender_id, receiver_id)
);

-- Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id)
);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_feed (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'hunt_completed', 'achievement_unlocked', 'hunt_created',
        'joined_team', 'started_hunt', 'new_review',
        'reached_milestone', 'challenge_sent', 'challenge_accepted'
    )),
    hunt_id TEXT REFERENCES hunts(id) ON DELETE SET NULL,
    achievement_id TEXT,
    team_id TEXT,
    score INTEGER,
    position INTEGER,
    distance REAL,
    duration INTEGER,
    extra_data JSONB,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity likes
CREATE TABLE IF NOT EXISTS activity_likes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    activity_id TEXT NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Activity comments
CREATE TABLE IF NOT EXISTS activity_comments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    activity_id TEXT NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend challenges
CREATE TABLE IF NOT EXISTS friend_challenges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    challenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challengee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hunt_id TEXT NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
    stakes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'in_progress', 'completed'
    )),
    challenger_score INTEGER,
    challenger_time INTEGER,
    challengee_score INTEGER,
    challengee_time INTEGER,
    winner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Creator following
CREATE TABLE IF NOT EXISTS creator_follows (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notify_new_hunts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, creator_id)
);

-- Friend suggestions (cached)
CREATE TABLE IF NOT EXISTS friend_suggestions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suggested_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN (
        'mutual_friends', 'same_hunts', 'same_location',
        'popular_creator', 'team_member'
    )),
    mutual_friend_count INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, suggested_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_users ON friend_challenges(challenger_id, challengee_id);
CREATE INDEX IF NOT EXISTS idx_creator_follows_creator ON creator_follows(creator_id);

-- Function to update friend count
CREATE OR REPLACE FUNCTION update_friend_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_profiles SET friend_count = friend_count + 1 WHERE user_id = NEW.user_id;
        UPDATE user_profiles SET friend_count = friend_count + 1 WHERE user_id = NEW.friend_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_profiles SET friend_count = friend_count - 1 WHERE user_id = OLD.user_id;
        UPDATE user_profiles SET friend_count = friend_count - 1 WHERE user_id = OLD.friend_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_count
AFTER INSERT OR DELETE ON friendships
FOR EACH ROW EXECUTE FUNCTION update_friend_count();

-- Function to update activity counts
CREATE OR REPLACE FUNCTION update_activity_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE activity_feed SET like_count = like_count + 1 WHERE id = NEW.activity_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE activity_feed SET like_count = like_count - 1 WHERE id = OLD.activity_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activity_like_count
AFTER INSERT OR DELETE ON activity_likes
FOR EACH ROW EXECUTE FUNCTION update_activity_like_count();
