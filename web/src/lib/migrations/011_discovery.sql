-- Discovery and Reviews Tables

-- Hunt discovery metadata (extends hunts table)
CREATE TABLE IF NOT EXISTS hunt_discovery (
  hunt_id UUID PRIMARY KEY REFERENCES hunts(id) ON DELETE CASCADE,

  -- Location
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  city TEXT,
  address TEXT,
  country TEXT,

  -- Discovery settings
  environment TEXT DEFAULT 'both' CHECK (environment IN ('indoor', 'outdoor', 'both')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[] DEFAULT '{}',

  -- Media
  cover_image_url TEXT,
  preview_images TEXT[] DEFAULT '{}',

  -- Pricing
  is_free BOOLEAN DEFAULT TRUE,
  price DECIMAL(10, 2),

  -- Flags
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,

  -- Stats (denormalized for performance)
  play_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hunt reviews
CREATE TABLE IF NOT EXISTS hunt_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  helpful_count INTEGER DEFAULT 0,
  is_verified_play BOOLEAN DEFAULT FALSE,
  photos TEXT[] DEFAULT '{}',
  creator_response_content TEXT,
  creator_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hunt_id, user_id)
);

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES hunt_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- User play history (for recommendations)
CREATE TABLE IF NOT EXISTS user_play_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hunt_id)
);

-- User preferences (for recommendations)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_tags TEXT[] DEFAULT '{}',
  preferred_difficulty TEXT[] DEFAULT '{}',
  preferred_environment TEXT[] DEFAULT '{}',
  preferred_duration_min INTEGER,
  preferred_duration_max INTEGER,
  home_latitude DECIMAL(10, 7),
  home_longitude DECIMAL(10, 7),
  followed_creators UUID[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Featured hunts (curated)
CREATE TABLE IF NOT EXISTS featured_hunts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id UUID NOT NULL REFERENCES hunts(id) ON DELETE CASCADE,
  featured_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  region TEXT -- Optional regional targeting
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hunt_discovery_location ON hunt_discovery USING gist (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX IF NOT EXISTS idx_hunt_discovery_city ON hunt_discovery(city);
CREATE INDEX IF NOT EXISTS idx_hunt_discovery_rating ON hunt_discovery(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_hunt_discovery_play_count ON hunt_discovery(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_hunt_discovery_featured ON hunt_discovery(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_hunt_discovery_trending ON hunt_discovery(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_hunt_reviews_hunt ON hunt_reviews(hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_reviews_rating ON hunt_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_user_play_history_user ON user_play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_play_history_hunt ON user_play_history(hunt_id);
CREATE INDEX IF NOT EXISTS idx_featured_hunts_active ON featured_hunts(hunt_id) WHERE expires_at IS NULL OR expires_at > NOW();

-- Function to update discovery stats on review
CREATE OR REPLACE FUNCTION update_hunt_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE hunt_discovery
    SET
      average_rating = (
        SELECT AVG(rating)::DECIMAL(3, 2) FROM hunt_reviews WHERE hunt_id = NEW.hunt_id
      ),
      review_count = (
        SELECT COUNT(*) FROM hunt_reviews WHERE hunt_id = NEW.hunt_id
      ),
      updated_at = NOW()
    WHERE hunt_id = NEW.hunt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hunt_discovery
    SET
      average_rating = COALESCE((
        SELECT AVG(rating)::DECIMAL(3, 2) FROM hunt_reviews WHERE hunt_id = OLD.hunt_id
      ), 0),
      review_count = (
        SELECT COUNT(*) FROM hunt_reviews WHERE hunt_id = OLD.hunt_id
      ),
      updated_at = NOW()
    WHERE hunt_id = OLD.hunt_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for review stats
DROP TRIGGER IF EXISTS trigger_update_review_stats ON hunt_reviews;
CREATE TRIGGER trigger_update_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON hunt_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_hunt_review_stats();

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hunt_reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hunt_reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for helpful count
DROP TRIGGER IF EXISTS trigger_review_helpful ON review_helpful_votes;
CREATE TRIGGER trigger_review_helpful
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function to check if ll_to_earth exists, create stub if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'll_to_earth') THEN
    -- Create a simple distance function if earthdistance extension is not available
    CREATE OR REPLACE FUNCTION ll_to_earth(lat FLOAT, lng FLOAT)
    RETURNS point AS $func$
    BEGIN
      RETURN point(lng, lat);
    END;
    $func$ LANGUAGE plpgsql IMMUTABLE;
  END IF;
END
$$;
