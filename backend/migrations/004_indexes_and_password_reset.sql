-- ============================================================
-- Migration 004: Performance indexes + password reset tokens
-- ============================================================

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tool_logs_user_id   ON tool_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_logs_created_at ON tool_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_logs_tool_name  ON tool_logs(tool_name);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupons_platform    ON coupons(platform);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active   ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expiry_date ON coupons(expiry_date);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON blog_posts(is_published);

CREATE INDEX IF NOT EXISTS idx_works_category  ON works(category);
CREATE INDEX IF NOT EXISTS idx_works_is_active ON works(is_active);
CREATE INDEX IF NOT EXISTS idx_works_order     ON works(sort_order);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token   ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
