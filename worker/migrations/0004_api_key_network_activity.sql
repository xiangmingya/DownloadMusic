-- Record privacy-preserving network activity for API Key anomaly reminders.
CREATE TABLE IF NOT EXISTS api_key_network_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER NOT NULL,
  network_hash TEXT NOT NULL,
  ip_preview TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  asn INTEGER,
  user_agent TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  observations INTEGER NOT NULL DEFAULT 1,
  UNIQUE(api_key_id, network_hash),
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_key_network_activity_key_time
ON api_key_network_activity (api_key_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_key_network_activity_time
ON api_key_network_activity (last_seen_at DESC);
