CREATE TABLE IF NOT EXISTS auth_sessions (
  sid TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip_preview TEXT,
  network_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_owner_time
ON auth_sessions (owner_key, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry
ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS member_resolve_hourly (
  bucket_hour TEXT NOT NULL,
  owner_key TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  rate_limited INTEGER NOT NULL DEFAULT 0,
  last_request_at TEXT,
  PRIMARY KEY (bucket_hour, owner_key)
);

CREATE INDEX IF NOT EXISTS idx_member_resolve_hourly_owner
ON member_resolve_hourly (owner_key, bucket_hour DESC);

CREATE TABLE IF NOT EXISTS member_resolve_dimensions (
  bucket_hour TEXT NOT NULL,
  owner_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  value_hash TEXT NOT NULL,
  preview TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  observations INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_hour, owner_key, kind, value_hash)
);

CREATE INDEX IF NOT EXISTS idx_member_resolve_dimensions_owner
ON member_resolve_dimensions (owner_key, bucket_hour DESC, kind);
