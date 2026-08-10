-- Track real application/API use separately from OAuth login time.
ALTER TABLE linuxdo_users ADD COLUMN last_used_at TEXT;

-- Existing users start with their last known login, then normal requests update it.
UPDATE linuxdo_users
SET last_used_at = last_login_at
WHERE last_used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_linuxdo_users_last_used
ON linuxdo_users (last_used_at DESC);
