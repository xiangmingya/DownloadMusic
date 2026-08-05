# Cloudflare Worker（鉴权 + 代理）

这个 Worker 提供：
- 密码登录
- Linux DO OAuth 登录
- 会话管理（HttpOnly Cookie）
- 跨设备资料库同步：D1 保存收藏、最近播放与自建歌单（不保存音频、封面文件或 TuneHub Key）
- Linux DO 月会员：Linux DO Credit 积分购买 30 天会员，价格由管理员在页面内调整
- Linux DO 白名单管理员：只有 `ADMIN_LINUXDO_IDS` 中的账号能进入管理页；密码登录不具备管理权限
- 代理接口：`/api/proxy/methods` `/api/proxy/method` `/api/proxy/parse` `/api/proxy/meta` `/api/proxy/media`
  - 备用源代理：`/api/proxy/backup`（GDStudio）
  - 第三层备用代理：`/api/proxy/backup3`（雨糖小屋 QQ 搜索/解析接口）
  - 第四层备用解析：`/api/proxy/backup4`（QQ/网易/酷我 多源链路）
    - 可选：JKAPI（网易云、QQ；需自行配置 `JKAPI_API_KEY`）
    - 实验性：米兔音乐（酷我；上游可能返回 403，失败会自动跳过）
  - 可选 Linux DO 邀请码注册：D1 保存邀请码摘要、用户和短时兑换凭据

## 路由

- `POST /api/auth/login/password`
- `GET /api/auth/login/linuxdo`
- `GET /api/auth/callback/linuxdo`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/linuxdo-status`
- `GET /api/membership`
- `POST /api/billing/checkout`
- `GET /api/billing/notify/linuxdo`
- `GET /api/admin/overview`
- `PUT /api/admin/settings/membership`
- `GET /api/admin/members`
- `GET /api/library`
- `PUT /api/library`

## 必填 Secrets

```bash
wrangler secret put SESSION_SECRET
wrangler secret put ADMIN_PASSWORD
wrangler secret put TUNEHUB_API_KEY
wrangler secret put LINUXDO_CLIENT_ID
wrangler secret put LINUXDO_CLIENT_SECRET
wrangler secret put LINUXDO_REDIRECT_URI
wrangler secret put LDC_CLIENT_ID
wrangler secret put LDC_CLIENT_SECRET
```

## Linux DO 月会员配置

1. 在 LINUX DO Credit 创建商户应用。
2. 将 Client ID、Client Secret 设置为上面的两个 Worker Secret；不要写入 `wrangler.toml` 或前端。支付按 Linux DO Credit 的易支付兼容接口使用 MD5 签名。
3. 在 `wrangler.toml` 配置：

```toml
ADMIN_LINUXDO_IDS = "你的LinuxDO数字ID"
LDC_NOTIFY_URL = "https://musicapi.621888.xyz/api/billing/notify/linuxdo"
LDC_RETURN_URL = "https://music.621888.xyz/"
MEMBERSHIP_REQUIRED = "true"
```

4. 执行最新 `schema.sql` 后再部署 Worker。普通 Linux DO 用户登录不再需要邀请码；支付回调会向 Credit 查询订单并核对金额后，才延长 30 天会员。密码登录不受会员限制。

## 可选 Secret

```bash
# 仅填写你自己获得的 JKAPI Key
wrangler secret put JKAPI_API_KEY
```

## D1：资料库同步与 Linux DO 邀请码（可选）

密码登录不受邀请码限制，适合给家人共用；启用后只有 **首次** Linux DO 登录的用户需要邀请码。

```bash
# 1. 创建 D1，并将输出的 database_id 写进 wrangler.toml 的 [[d1_databases]]
wrangler d1 create downloadmusic-auth

# 2. 初始化表结构（同时创建跨设备资料库表）
wrangler d1 execute downloadmusic-auth --remote --file=schema.sql

# 3. 设置仅供管理员调用接口的独立令牌
wrangler secret put ADMIN_INVITE_TOKEN
```

然后将 `INVITE_LINUXDO_ENABLED` 设为 `"true"` 并重新部署。创建的邀请码仅在接口响应中显示一次；D1 不保存明文。

资料库同步无需启用邀请码。密码登录统一使用一个家庭资料库；Linux DO 登录按每个 Linux DO 账号独立保存。

管理接口需要请求头 `Authorization: Bearer <ADMIN_INVITE_TOKEN>`：

```bash
# 生成 3 个各可用 1 次的邀请码（expires_at 省略表示不过期）
curl -X POST 'https://你的API域名/api/admin/invites' \
  -H 'Authorization: Bearer 你的ADMIN_INVITE_TOKEN' \
  -H 'Content-Type: application/json' \
  --data '{"count":3,"max_uses":1}'

# 查看最近 200 个邀请码（不会返回明文）
curl 'https://你的API域名/api/admin/invites' \
  -H 'Authorization: Bearer 你的ADMIN_INVITE_TOKEN'

# 撤销 ID 为 12 的邀请码
curl -X POST 'https://你的API域名/api/admin/invites/12/revoke' \
  -H 'Authorization: Bearer 你的ADMIN_INVITE_TOKEN'
```

## 快速部署

1. 复制配置：
```bash
cp worker/wrangler.toml.example worker/wrangler.toml
```

2. 修改 `worker/wrangler.toml` 的 `ALLOWED_ORIGINS`、`FRONTEND_URLS`
   - 支持逗号分隔多个域名
   - 示例：
     - `ALLOWED_ORIGINS="https://a.com,https://b.com"`
     - `FRONTEND_URLS="https://a.com/,https://b.com/"`
   - 可选：`MEDIA_PROXY_ALLOWED_HOSTS`（媒体代理域名白名单，逗号分隔）

3. 配置上面的 secrets

4. 发布：
```bash
cd worker
wrangler deploy
```

## 前端对接要求

- 前端页面在仓库 `web/` 目录（帽子云发布目录设置为 `web/`）
- 前端接口基址：
  - `AUTH_API_BASE=https://你的worker域名/api/auth`
  - `APP_API_BASE=https://你的worker域名/api/proxy`
- 浏览器请求必须带 `credentials: 'include'`
- Linux DO 用户 key 继续只存浏览器本地，并在请求头 `X-Tunehub-Key` 携带

## Cookie 注意事项

- 若前端和 Worker 是跨站点域名，浏览器可能拦截第三方 Cookie
- 最稳方案：前端与 Worker 使用同一主域的子域名（例如 `app.example.com` + `api.example.com`）
- `ALLOWED_ORIGINS` 必须填写前端地址（含 `https://`），多个用逗号分隔
