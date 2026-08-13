-- 笔墨迹通行证博友：保存后台用户管理所需的最小身份与活动摘要。
-- 不保存 Access Token、ID Token、完整博客列表或其他敏感 UserInfo。
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

CREATE INDEX IF NOT EXISTS idx_bimoji_users_last_used
ON bimoji_users (last_used_at DESC);
