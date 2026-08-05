-- Cloudflare D1：Linux DO 邀请码注册
-- 仅保存邀请码摘要，创建接口返回的明文邀请码不会写入数据库。

CREATE TABLE IF NOT EXISTS invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_active
  ON invite_codes (revoked_at, expires_at, used_count);

CREATE TABLE IF NOT EXISTS linuxdo_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  linuxdo_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  invite_code_id INTEGER,
  disabled_at TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
);

CREATE INDEX IF NOT EXISTS idx_linuxdo_users_enabled
  ON linuxdo_users (linuxdo_id, disabled_at);

-- Linux DO 已验证、但尚未提交邀请码的短时凭据；十分钟后失效。
CREATE TABLE IF NOT EXISTS pending_linuxdo_registrations (
  ticket_hash TEXT PRIMARY KEY,
  linuxdo_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_linuxdo_expiry
  ON pending_linuxdo_registrations (expires_at);

-- 收藏、最近播放与自建歌单的跨设备资料库。
-- owner_key 由 Worker 会话生成：密码登录共享 password:family，Linux DO 各自独立。
CREATE TABLE IF NOT EXISTS user_libraries (
  owner_key TEXT PRIMARY KEY,
  document TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
