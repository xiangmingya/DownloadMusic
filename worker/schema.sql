-- 收藏、最近播放与自建歌单的跨设备资料库。
-- owner_key 由 Worker 会话生成：密码登录共享 password:family，Linux DO 各自独立。
CREATE TABLE IF NOT EXISTS user_libraries (
  owner_key TEXT PRIMARY KEY,
  document TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Linux DO 月会员与积分订单。金额、状态均在服务端保存，前端不能自行开通会员。
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('monthly_membership_price', '10.00', CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS memberships (
  linuxdo_id TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_expires_at ON memberships (expires_at);

-- 赠送和购买的开通记录。旧会员没有历史记录时，后台会使用 memberships.updated_at 作为兼容显示。
CREATE TABLE IF NOT EXISTS membership_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  linuxdo_id TEXT NOT NULL,
  days INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('purchase', 'admin_gift')),
  granted_by TEXT,
  granted_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_membership_grants_member ON membership_grants (linuxdo_id, granted_at DESC);

CREATE TABLE IF NOT EXISTS billing_orders (
  out_trade_no TEXT PRIMARY KEY,
  linuxdo_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  trade_no TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_orders_linuxdo_created ON billing_orders (linuxdo_id, created_at DESC);

-- 管理员服务监控：按小时聚合，不保存用户、歌曲名或 Key。
-- Worker 会在写入时清理 30 天前的桶，体积会保持很小。
CREATE TABLE IF NOT EXISTS service_metrics_hourly (
  bucket_hour TEXT NOT NULL,
  source TEXT NOT NULL,
  operation TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_success_at TEXT,
  last_failure_at TEXT,
  last_status INTEGER,
  last_error TEXT,
  PRIMARY KEY (bucket_hour, source, operation)
);

CREATE INDEX IF NOT EXISTS idx_service_metrics_hourly_bucket ON service_metrics_hourly (bucket_hour DESC);
CREATE INDEX IF NOT EXISTS idx_service_metrics_hourly_source ON service_metrics_hourly (source, bucket_hour DESC);

-- 公开 Uptime：仅保存 Worker Cron 的主动探测，不与用户真实调用统计混合。
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

-- API Key：QNAP 客户端等第三方工具接入鉴权。
-- owner_key 与 user_libraries 同一套归属规则：密码登录共享 password:family，Linux DO 各自独立。
-- 一个账号一个 Key；bound_device_* 用于 1 台设备绑定（暂时）。
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_key TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  mi_uid TEXT,
  device_id TEXT,
  device_name TEXT,
  device_token TEXT,
  bound_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_key);

-- API Key 外部调用网络活动：仅保存网络段哈希和脱敏地址，用于后台异常提醒。
-- 不保存完整公网 IP，也不据此自动封禁用户。
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

-- 可撤销网页登录会话。sid 为随机标识，不保存 Cookie 或签名 Token。
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

-- 会员解析请求按小时聚合；不记录歌曲名、歌曲 ID 或完整 IP。
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

-- 每小时去重后的网络与客户端维度。value_hash 使用服务端盐，不保存原始值。
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

-- linuxdo_users belongs to the base authentication schema. Migration 0003 adds
-- last_used_at and this index so the admin list can sort by real recent use.
CREATE INDEX IF NOT EXISTS idx_linuxdo_users_last_used ON linuxdo_users (last_used_at DESC);

-- 笔墨迹通行证用户。只保存后台管理所需的最小身份与准入摘要。
CREATE TABLE IF NOT EXISTS bimoji_users (
  bimoji_sub TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  bimoji_exists INTEGER NOT NULL DEFAULT 0,
  account_registered INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  max_level INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bimoji_users_last_used ON bimoji_users (last_used_at DESC);
