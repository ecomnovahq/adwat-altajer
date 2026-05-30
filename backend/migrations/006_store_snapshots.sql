-- Migration 006: Store Snapshots + Action Tracking

CREATE TABLE IF NOT EXISTS store_snapshots (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_url             TEXT NOT NULL,
  store_industry        TEXT,
  overall_score         INTEGER,
  estimated_monthly_loss INTEGER,
  estimated_visitors    INTEGER,
  full_result           JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_url ON store_snapshots(user_id, store_url);
CREATE INDEX IF NOT EXISTS idx_snapshots_created   ON store_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS action_status (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_url          TEXT NOT NULL,
  issue_id           TEXT NOT NULL,
  issue_title        TEXT,
  status             TEXT NOT NULL DEFAULT 'suggested'
                       CHECK (status IN ('suggested','in_progress','done','dismissed')),
  monthly_loss_saved INTEGER DEFAULT 0,
  marked_done_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_url, issue_id)
);

CREATE INDEX IF NOT EXISTS idx_action_status_user_url ON action_status(user_id, store_url);
