# Cloudflare Worker（鉴权 + 代理）

这个 Worker 提供：
- 密码登录
- Linux DO OAuth 登录
- 会话管理（HttpOnly Cookie）
- 跨设备资料库同步：D1 保存收藏、最近播放与自建歌单（不保存音频、封面文件或 TuneHub Key）
- Linux DO 月会员：Linux DO Credit 积分购买 30 天会员，价格由管理员在页面内调整
- Linux DO 白名单管理员：只有 `ADMIN_LINUXDO_IDS` 中的账号能进入管理页；密码登录不具备管理权限
- 公开 Uptime：Cloudflare Cron 每 5 分钟轮换探测一个平台，独立保存 7 天，不暴露内部解析源
- 管理员服务监控：D1 只聚合用户真实流量中的各主源和备用源调用、成功率、耗时、最近错误与最终解析来源，自动保留最近 30 天；不记录搜索词、歌曲名、用户资料或 Key
- 代理接口：`/api/proxy/methods` `/api/proxy/method` `/api/proxy/search` `/api/proxy/resolve` `/api/proxy/parse` `/api/proxy/meta` `/api/proxy/media`
  - `/api/proxy/search`：主搜索失败时在 Worker 内部走多源兜底
  - `/api/proxy/resolve`：统一解析入口，短期缓存、同歌并发合并、健康排序与两批智能竞速（首批健康源，短延迟后放出全部剩余源）
  - 可选：JKAPI（网易云、QQ；需自行配置 `JKAPI_API_KEY`）

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
- `POST /api/admin/members/grant`
- `PUT /api/admin/members/status`
- `GET /api/admin/members/api-key`
- `PUT /api/admin/members/api-key`
- `GET /api/admin/monitoring?days=1|7|30`
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

4. 执行最新 `schema.sql` 后再部署 Worker。普通 Linux DO 用户可直接登录；支付回调会向 Credit 查询订单并核对金额后，才延长 30 天会员。密码登录不受会员限制。

## 可选 Secret

```bash
# 仅填写你自己获得的 JKAPI Key
wrangler secret put JKAPI_API_KEY
```

## D1：资料库同步

```bash
# 1. 创建 D1，并将输出的 database_id 写进 wrangler.toml 的 [[d1_databases]]
wrangler d1 create downloadmusic-auth

# 2. 初始化表结构（资料库、会员、订单与服务监控表）
wrangler d1 execute downloadmusic-auth --remote --file=schema.sql
```

升级到会员管理增强版时，也需要再执行一次上述命令：它会新增 `membership_grants` 表，并复用已有的 `linuxdo_users` 表显示昵称、注册时间、最近使用和会员开通时间。已有会员不会丢失；历史会员的开通时间会兼容显示为原有更新时间。

密码登录统一使用一个家庭资料库；Linux DO 登录按每个 Linux DO 账号独立保存。

## 管理员服务监控

管理员用 Linux DO 白名单账号登录后，右上角会出现“管理”。服务监控仅在这个页面显示，普通用户无法请求接口。

公开页脚的 Uptime 与管理员监控是两套独立数据：前者来自 Cron 主动探测，后者来自用户真实调用。主动检测轮换样本，主样本失败时最多用两首不同样本复核，任一首成功即判本轮可用；公开百分比应理解为“测试歌曲可播率”。部署前需执行 `migrations/0002_uptime_checks.sql`，并保留 `wrangler.toml` 中的 `*/5 * * * *` Cron 配置。

API Key 网络异常提醒需要执行 `migrations/0004_api_key_network_activity.sql`。该表只保存加盐后的网络段哈希、脱敏地址和 Cloudflare 地区/ASN；提醒不会自动禁用用户或 Key。

用户状态和最近使用时间需要执行 `migrations/0003_user_activity.sql`。最近使用最多每 5 分钟写入一次，网页与 API Key 调用都会更新；禁用用户会同时阻止其现有会话和 API Key。

- 统计范围可切换最近 24 小时、7 天或 30 天；最近 24 小时会显示按小时趋势。
- “最终解析来源”只统计成功返回可播放链接的 TuneHub、GDStudio、QQ 备用解析和备用源 4，不把内部搜索请求混进去。
- 健康度规则：成功率不低于 85% 为“正常”；低于 85% 为“波动”；没有成功或近期失败明显占优为“不可用”。
- D1 表 `service_metrics_hourly` 是小时桶聚合；不保留原始请求或用户内容。Worker 每隔约 6 小时清理 30 天以前的桶。

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
