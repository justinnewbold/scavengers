-- Migration: Push notification tokens
-- Stores device push tokens for sending notifications

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can have multiple tokens (multiple devices)
  -- but each token should only be associated with one user
  UNIQUE(user_id, token)
);

-- Index for finding active tokens by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON push_tokens(user_id) WHERE is_active = true;

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
