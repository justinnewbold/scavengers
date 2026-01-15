-- Migration: Mystery challenge reveals tracking
-- Tracks when players have revealed mystery challenges by getting close enough

-- Table to track mystery challenge reveals
CREATE TABLE IF NOT EXISTS mystery_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reveal_latitude DOUBLE PRECISION,
  reveal_longitude DOUBLE PRECISION,
  distance_meters INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure each participant can only reveal each challenge once
  UNIQUE(participant_id, challenge_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mystery_reveals_participant ON mystery_reveals(participant_id);
CREATE INDEX IF NOT EXISTS idx_mystery_reveals_challenge ON mystery_reveals(challenge_id);

-- Add timestamps to hunts if not exists (for starts_at and ends_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hunts' AND column_name = 'starts_at') THEN
    ALTER TABLE hunts ADD COLUMN starts_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hunts' AND column_name = 'ends_at') THEN
    ALTER TABLE hunts ADD COLUMN ends_at TIMESTAMPTZ;
  END IF;
END $$;
