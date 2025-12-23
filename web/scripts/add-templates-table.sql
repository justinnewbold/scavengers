-- Add hunt_templates table for saving and sharing hunt templates
CREATE TABLE IF NOT EXISTS hunt_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  difficulty VARCHAR(20) DEFAULT 'medium',
  challenge_count INTEGER DEFAULT 0,
  estimated_time INTEGER DEFAULT 60, -- in minutes
  is_public BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  template_data JSONB NOT NULL, -- Stores hunt and challenges structure
  tags JSONB DEFAULT '[]', -- Array of tags
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_hunt_templates_category ON hunt_templates(category);
CREATE INDEX IF NOT EXISTS idx_hunt_templates_is_public ON hunt_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_hunt_templates_creator_id ON hunt_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_hunt_templates_use_count ON hunt_templates(use_count DESC);

-- Add template_id column to hunts table to track which template was used
ALTER TABLE hunts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES hunt_templates(id) ON DELETE SET NULL;

-- Add use_count column if it doesn't exist (for backwards compatibility)
ALTER TABLE hunt_templates ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Insert some default templates
INSERT INTO hunt_templates (id, name, description, category, difficulty, challenge_count, estimated_time, is_public, template_data, tags)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'City Explorer',
    'Discover hidden gems and iconic landmarks in any urban environment',
    'urban',
    'medium',
    8,
    60,
    true,
    '{
      "hunt": {
        "title": "City Explorer Adventure",
        "description": "Explore the city and discover hidden gems, street art, and local landmarks!",
        "difficulty": "medium",
        "duration_minutes": 60
      },
      "challenges": [
        {"title": "Find Street Art", "description": "Locate a colorful mural or graffiti art", "points": 15, "verificationType": "photo", "orderIndex": 1},
        {"title": "Historic Landmark", "description": "Find a building over 50 years old", "points": 20, "verificationType": "photo", "orderIndex": 2},
        {"title": "Local Cafe", "description": "Take a photo of the menu at a local coffee shop", "points": 10, "verificationType": "photo", "orderIndex": 3},
        {"title": "Public Sculpture", "description": "Find a statue or public art installation", "points": 15, "verificationType": "photo", "orderIndex": 4},
        {"title": "Unique Door", "description": "Photograph an interesting or colorful door", "points": 10, "verificationType": "photo", "orderIndex": 5},
        {"title": "Vintage Sign", "description": "Find a retro or vintage shop sign", "points": 15, "verificationType": "photo", "orderIndex": 6},
        {"title": "Hidden Alley", "description": "Discover a charming alleyway or passage", "points": 20, "verificationType": "photo", "orderIndex": 7},
        {"title": "Local Market", "description": "Visit a farmers market or local vendor", "points": 15, "verificationType": "photo", "orderIndex": 8}
      ]
    }',
    '["urban", "walking", "photography", "exploration"]'
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Nature Trail',
    'Connect with nature and discover the beauty of the outdoors',
    'nature',
    'easy',
    6,
    45,
    true,
    '{
      "hunt": {
        "title": "Nature Discovery Trail",
        "description": "Explore the natural world around you and document the beauty of nature!",
        "difficulty": "easy",
        "duration_minutes": 45
      },
      "challenges": [
        {"title": "Unique Flower", "description": "Photograph a wildflower or unusual bloom", "points": 10, "verificationType": "photo", "orderIndex": 1},
        {"title": "Tree Bark Pattern", "description": "Find interesting tree bark and capture its texture", "points": 10, "verificationType": "photo", "orderIndex": 2},
        {"title": "Bird Spotting", "description": "Photograph a bird in its natural habitat", "points": 20, "verificationType": "photo", "orderIndex": 3},
        {"title": "Water Feature", "description": "Find a stream, pond, or fountain", "points": 15, "verificationType": "photo", "orderIndex": 4},
        {"title": "Leaf Collection", "description": "Photograph 3 different leaf shapes", "points": 15, "verificationType": "photo", "orderIndex": 5},
        {"title": "Sunset/Sunrise", "description": "Capture the sky at golden hour", "points": 25, "verificationType": "photo", "orderIndex": 6}
      ]
    }',
    '["nature", "outdoor", "photography", "family-friendly"]'
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Team Building Challenge',
    'Fun team challenges for corporate events or group activities',
    'team-building',
    'medium',
    10,
    90,
    true,
    '{
      "hunt": {
        "title": "Ultimate Team Challenge",
        "description": "Work together as a team to complete fun and creative challenges!",
        "difficulty": "medium",
        "duration_minutes": 90
      },
      "challenges": [
        {"title": "Team Photo", "description": "Take a creative group photo with everyone jumping", "points": 15, "verificationType": "photo", "orderIndex": 1},
        {"title": "Human Pyramid", "description": "Build a human pyramid (safety first!)", "points": 25, "verificationType": "photo", "orderIndex": 2},
        {"title": "Team Cheer", "description": "Create and perform a team cheer (record video)", "points": 30, "verificationType": "manual", "orderIndex": 3},
        {"title": "Scavenger Find", "description": "Find something red, yellow, and blue", "points": 15, "verificationType": "photo", "orderIndex": 4},
        {"title": "Stranger Selfie", "description": "Get a selfie with a friendly stranger", "points": 20, "verificationType": "photo", "orderIndex": 5},
        {"title": "Team Logo", "description": "Draw your team logo using natural materials", "points": 25, "verificationType": "photo", "orderIndex": 6},
        {"title": "Act It Out", "description": "Act out a famous movie scene as a team", "points": 25, "verificationType": "manual", "orderIndex": 7},
        {"title": "Find a Mascot", "description": "Find or create a team mascot", "points": 20, "verificationType": "photo", "orderIndex": 8},
        {"title": "Team Anthem", "description": "Write and perform a short team song", "points": 30, "verificationType": "manual", "orderIndex": 9},
        {"title": "Victory Pose", "description": "Create an epic team victory pose", "points": 15, "verificationType": "photo", "orderIndex": 10}
      ]
    }',
    '["team-building", "corporate", "group", "creative"]'
  )
ON CONFLICT (id) DO NOTHING;
