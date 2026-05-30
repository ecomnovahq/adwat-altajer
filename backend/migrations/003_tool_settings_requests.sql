-- Tool global settings (paid/free + daily limit)
CREATE TABLE IF NOT EXISTS tool_settings (
  tool_name        VARCHAR(100) PRIMARY KEY,
  display_name     VARCHAR(255) NOT NULL,
  is_paid          BOOLEAN DEFAULT FALSE,
  daily_free_limit INTEGER DEFAULT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tool_settings (tool_name, display_name, is_paid, daily_free_limit) VALUES
  ('analyzer',  'محلل المتاجر',    false, 10),
  ('generator', 'مولّد المحتوى', false, 10)
ON CONFLICT (tool_name) DO NOTHING;

-- Tool access requests
CREATE TABLE IF NOT EXISTS tool_access_requests (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_name  VARCHAR(100) NOT NULL,
  reason     TEXT,
  status     VARCHAR(50) DEFAULT 'pending'
             CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
