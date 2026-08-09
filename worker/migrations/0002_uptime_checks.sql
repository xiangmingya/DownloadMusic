CREATE TABLE IF NOT EXISTS service_uptime_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('netease', 'qq', 'kuwo')),
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status_code INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  canary_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_uptime_checks_platform_time ON service_uptime_checks (platform, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_uptime_checks_time ON service_uptime_checks (checked_at DESC);
