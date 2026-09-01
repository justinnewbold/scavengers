-- Content reports for user-submitted photos.
--
-- The mobile feed has always offered a "Report" action that POSTs to
-- /api/reports, but neither the route nor this table existed, so every report
-- failed. A working reporting path is also an app-store expectation for
-- user-generated photo content.

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,

  -- One report per person per submission; re-reporting is a no-op rather than
  -- a way to flood the moderation queue.
  CONSTRAINT reports_unique_reporter_submission UNIQUE (submission_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_submission
  ON reports (submission_id);

-- Match the RLS posture applied to every other table in 016_enable_rls.sql.
-- The API connects as the table owner and enforces authorization in the route,
-- so no permissive policy is added here: reports stay readable only to
-- privileged/service access, which is what moderation data should be.
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
