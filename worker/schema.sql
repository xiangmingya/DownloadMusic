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
