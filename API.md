# 音楽 - Music Downloader API 文档

Cloudflare Worker（`musicapi.621888.xyz`）对外接口说明。所有请求均为 JSON 格式（音频/封面代理除外）。

## 通用约定

- **Base URL**：`https://musicapi.621888.xyz`
- **鉴权**：网页端通过 `dm_session` Cookie 维持会话（请求需带 `credentials: 'include'`）；QNAP 客户端等第三方工具使用 `X-DM-Key` + `X-DM-Device-Id` 请求头（见第七节）
- **CORS**：仅允许 `ALLOWED_ORIGINS` 中配置的前端域名
- **响应格式**：`{ "code": 0, "message": "Success", "data": ... }`，`code === 0` 表示成功
- **错误码**：`-1` 通用错误、`401` 未登录、`402` 需要有效月会员、`403` 无权限、`404` 不存在、`503` 服务暂不可用
- **会员策略**：`MEMBERSHIP_REQUIRED=true` 时，除管理员与密码登录外，播放/下载类操作需有效月会员

---

## 一、认证 Auth

### 1.1 密码登录
`POST /api/auth/login/password`

请求体：
```json
{ "password": "访问密码" }
```

成功：`Set-Cookie` 写入会话，`200`。错误：`401` 密码错误、`500` 未配置 `ADMIN_PASSWORD`。

### 1.2 Linux DO 登录（发起）
`GET /api/auth/login/linuxdo?redirect=<回调地址>`

- `redirect`：登录成功后回跳的前端地址（需在 `FRONTEND_URLS` 白名单内）
- 返回 `302` 跳转到 Linux DO 授权页；授权后回调 `LINUXDO_REDIRECT_URI`

### 1.3 Linux DO 回调
`GET /api/auth/callback/linuxdo?code=<code>&state=<state>`

成功：`302` 跳回 `redirect` 并写入会话 Cookie；失败跳转 `?login=failed*` 系列参数。

### 1.4 退出登录
`POST /api/auth/logout`

清除会话 Cookie，返回 `200`。

### 1.5 当前用户
`GET /api/auth/me`（需登录）

```json
{
  "code": 0,
  "data": {
    "auth_type": "password | linuxdo",
    "user": { "id": "", "name": "", "linuxdo_id": "", "avatar": "" },
    "using_server_key": true,
    "is_admin": false,
    "membership": { "active": true, "expires_at": null, "source": "admin" }
  }
}
```

### 1.6 Linux DO 连通性
`GET /api/auth/linuxdo-status`（公开）

```json
{ "code": 0, "data": { "configured": true, "reachable": true } }
```

---

## 二、公开状态 Public

### 2.1 服务状态
`GET /api/public/service-status`（公开）

返回 Cloudflare Cron 主动探测产生的最近 24 小时平台 Uptime，包括当前状态、可用率、平均耗时和逐小时状态条。GDStudio 返回官方平台 CDN 且报告文件大于 1 MB 时采用可信元数据验证，避免 Cron 机房跨地域探测网易云 CDN 造成误判；其他结果继续执行 Range 音频验证。公开数据只包含 netease/qq/kuwo 平台汇总，不包含内部解析源。

Cron 每 5 分钟运行一次并轮换平台，因此每个平台约 15 分钟完成一次“解析链接 + 音频有效性验证”。探测结果写入独立的 `service_uptime_checks` 表，不与管理员页面中的用户真实调用统计混合。

---

## 三、会员与支付 Membership / Billing

### 3.1 会员状态
`GET /api/membership`（需登录）

```json
{
  "code": 0,
  "data": {
    "active": false,
    "expires_at": null,
    "source": "membership",
    "monthly_price": "10.00",
    "payment_configured": true,
    "is_admin": false
  }
}
```

### 3.2 创建支付订单
`POST /api/billing/checkout`（需 Linux DO 登录）

成功返回 `data.checkout_url`，前端新窗口跳转支付。错误：`400` 非 Linux DO 账号/支付未配置。

### 3.3 支付回调
`GET /api/billing/notify/linuxdo`（Linux DO Credit 回调，公开）

校验 MD5 签名与订单金额，成功后延长 30 天会员。

---

## 四、跨设备资料库 Library

### 4.1 读取资料库
`GET /api/library`（需登录）

```json
{ "code": 0, "data": { "favorites": [], "recent": [], "playlists": [] } }
```

### 4.2 保存资料库
`PUT /api/library`（需登录）

```json
{ "library": { "favorites": [], "recent": [], "playlists": [] } }
```

限制：JSON 序列化后不超过 1 MB；密码登录共享一个资料库，Linux DO 按账号独立保存。

---

## 五、管理员 Admin（需 Linux DO 白名单管理员）

### 5.1 管理中心概览
`GET /api/admin/overview`

返回 `monthly_price`、`active_members`、`paid_orders`。

### 5.2 修改会员价格
`PUT /api/admin/settings/membership`
```json
{ "monthly_price": "10.00" }
```

### 5.3 会员列表
`GET /api/admin/members?q=<关键词>`

返回有效会员列表（Linux DO ID、昵称、注册/最近使用、会员开通与到期时间、用户状态及 API Key 状态）。`last_used_at` 同时统计网页会话和该用户 API Key 的实际调用。

### 5.4 赠送会员
`POST /api/admin/members/grant`
```json
{ "target": "Linux DO ID 或完整昵称", "days": 30, "note": "可选备注" }
```

### 5.5 用户状态
`PUT /api/admin/members/status`

启用或禁用用户，正文为 `{ "linuxdo_id": "123", "disabled": true }`。禁用后现有网页会话和该用户的 API Key 都会被拒绝；管理员账号不能被禁用。

### 5.6 用户 API Key 管理
`GET /api/admin/members/api-key?linuxdo_id=<ID>`

读取指定用户的脱敏 API Key、最近使用、绑定设备和启用状态。不会返回完整 Key 或设备令牌。

`PUT /api/admin/members/api-key`

启用或禁用指定用户的 API Key，正文为 `{ "linuxdo_id": "123", "enabled": false }`。

### 5.7 服务监控
`GET /api/admin/monitoring?days=1|7|30`

返回 `services`（各源调用/成功率/耗时/健康度/禁用状态）、`trend`（24 小时趋势）、`final_sources`（最终解析来源命中）。

### 5.8 禁用 / 启用解析源
`PUT /api/admin/monitoring/sources`
```json
{ "source": "onrender", "disabled": true }
```

禁用后该源不再参与解析/搜索链（数据存 D1，约 10 秒生效）。

---

## 六、音乐代理 Proxy

> 所有 `/api/proxy/*` 接口**均需登录**；`parse`、`resolve`、`media` 额外需要有效会员（管理员除外）。

### 6.1 平台能力
`GET /api/proxy/methods`

```json
{ "code": 0, "data": { "netease": ["search","playlist"], "qq": ["search","playlist"], "kuwo": ["search","playlist"] } }
```

### 6.2 方法调用（搜索 / 歌单）
`GET /api/proxy/method?platform=<netease|qq|kuwo>&functionName=<search|playlist>`

- 搜索：`&keyword=<关键词>&page=1&limit=20`
- 歌单：`&id=<歌单ID>`

返回歌曲/歌单列表。主搜索对网易云/酷我优先走 TuneHub 方法下发，失败自动回退直连。

### 6.3 排行榜
`GET /api/proxy/toplists?platform=<netease|qq|kuwo>`

返回该平台排行榜列表。

### 6.4 排行榜详情
`GET /api/proxy/toplist?platform=<平台>&id=<榜单ID>`

返回榜单歌曲列表。

### 6.5 推荐歌单
`GET /api/proxy/playlists?platform=netease`

返回热门歌单列表（默认 netease）。

### 6.6 歌曲解析（TuneHub V3）
`POST /api/proxy/parse`（需会员）

```json
{ "platform": "netease", "ids": "123456", "quality": "320k" }
```

`quality`：`128k` / `320k` / `flac` / `flac24bit`。该接口为 TuneHub 兼容接口；网页播放和下载统一使用 6.11 的 `/resolve`。

### 6.7 免费元数据（网易云）
`GET /api/proxy/meta?platform=netease&id=<歌曲ID>`

返回歌曲名、歌手、专辑、封面（不消耗积分）。

### 6.8 媒体代理
`GET /api/proxy/media?url=<编码后的媒体地址>&download=1&filename=<文件名>`（需会员）

- 代理播放/下载音频流，支持 Range（拖动进度）
- 域名需在 `MEDIA_PROXY_ALLOWED_HOSTS` 白名单内
- 音频小于 100 KB 会被判定为异常内容拒绝

### 6.9 封面代理
`GET /api/proxy/cover?url=<编码后的图片地址>`（需登录）

仅代理 `image/*` 内容，域名同样走媒体白名单。

### 6.10 统一搜索
`GET /api/proxy/search?platform=<netease|qq|kuwo>&keyword=<关键词>&page=1&limit=20`

Worker 先调用主搜索，失败后在服务端内部使用多源搜索兜底；客户端不再调用旧 `backup*` 接口。

### 6.11 统一解析
`POST /api/proxy/resolve`（需会员）

```json
{ "platform": "netease", "id": "123456", "quality": "320k", "name": "歌曲名", "artist": "歌手" }
```

Worker 会缓存短期链接、合并同一歌曲的并发解析、按健康度排序内部来源，并以最多两个并发来源进行延迟竞速。任一来源成功后会取消其余竞速请求；全部失败的结果默认短暂缓存 20 秒，避免多人重复请求同一首受限歌曲时持续打满上游。失败缓存时长可通过 `RESOLVER_NEGATIVE_CACHE_TTL_SECONDS` 调整。为避免暴露内部服务链路，对外仅返回 `data.url`、`cover` 与 `lyrics`。

当上游返回媒体总大小时，Worker 会拒绝小于 1 MiB 的结果并自动尝试下一来源，避免把短语音提示当作歌曲播放。可通过 `RESOLVER_MIN_MEDIA_BYTES` 调整阈值；上游未提供大小时不会因此拒绝结果。

旧 `/api/proxy/backup`、`backup3`、`backup4` 已移除。

### 6.12 小爱音箱外部搜索源（topone）

`POST /api/topone?platform=<netease,qq,kuwo>`

供 Songloft「智能音箱」插件的**外部搜索源**配置使用（topone 规范，6 秒超时）。只验 Key（`Authorization: Bearer <KEY>` 或 `X-DM-Key`），不做设备绑定，绑定留作后续锚点。

请求体：

```json
{ "keyword": "歌名", "hint": { "title": "歌名", "artist": "歌手" }, "quality": "320k" }
```

- `platform` 查询参数可选，逗号分隔的优先级列表；缺省为 `netease,qq,kuwo`。只配置单个平台（如 `?platform=netease`）即实现「指定音源」。
- 各平台并发搜索、按列表顺序采纳；平台内按标题匹配度优先尝试候选，整体预算 5.5 秒。

成功响应：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "title": "歌曲名",
    "artist": "歌手",
    "album": "专辑",
    "cover_url": "https://...",
    "url": "https://...",
    "source_data": { "platform": "netease", "quality": "320k", "songInfo": { "id": "123456" } }
  }
}
```

未命中返回 `code: 404`、`data: null`；Key 无效返回 `401`。

---

## 七、API Key 鉴权（客户端接入）

QNAP 客户端等第三方工具通过 API Key 调用代理接口，无需浏览器 Cookie。网页端在「用户」→「API Key 接入」中申请/查看自己的 Key。

### 7.1 请求头

- `X-DM-Key`：API Key（必填）
- `X-DM-Mi-Uid`：米家账号 ID（必填，绑定接口与代理接口）
- `X-DM-Device-Id`：设备唯一 ID（必填，参与绑定）
- `X-DM-Device-Token`：设备令牌（必填，代理接口；保存绑定时由服务端签发）
- `X-DM-Device-Name`：设备显示名（可选）

### 7.2 规则

- 分接口校验：
  - `/api/auth/me`：**只验 Key**（客户端「测试按钮」用，不触发绑定）。
  - `/api/topone`：**只验 Key**（小爱音箱外部搜索源，接受 `Authorization: Bearer <KEY>`）。
  - `/api/client/bind`：Key + 米家 UID + 设备 ID（保存绑定时调用）。
  - `/api/proxy/*`：Key + 米家 UID + 设备令牌三层校验；无 Key 头时回退会话 Cookie（网页端行为不变）。
- 缺少小米账号 ID / 设备令牌返回 `400`；Key 无效/过期返回 `401`；Key 已绑定其他小米账号或设备返回 `403`。
- Key 持有者视为已授权客户端，当前策略下绕过月会员限制。
- 一个账号一个 Key：密码登录共享 `password:family`，Linux DO 用户各自独立。
- **保存即绑定**：客户端「保存」时调 `/api/client/bind`，服务端校验 Key + 米家 UID + 设备 ID，通过后记录绑定并签发设备令牌；同一账号同一设备重复保存幂等返回原令牌。
- 换设备 / 换米家账号：网页端「解绑设备」清除绑定与令牌；未解绑前换账号或换设备调用返回 `403`。

### 7.3 绑定接口

`POST /api/client/bind`（无需网页登录，用 Key 鉴权）

请求头：`X-DM-Key`、`X-DM-Mi-Uid`、`X-DM-Device-Id`（可带 `X-DM-Device-Name`）

成功返回：
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "bound": true,
    "mi_uid_tail": "****1234",
    "device_name": "qnap-1",
    "device_token": "48位十六进制令牌",
    "bound_at": "2026-08-08T02:00:00.000Z"
  }
}
```

`device_token` 仅在绑定/重新绑定时返回，客户端必须保存；之后所有 `/api/proxy/*` 请求都要带上。

### 7.4 Key 管理接口（需网页 Cookie 登录）

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `GET /api/keys` | GET | 查询自己的 Key（完整 Key、掩码、绑定小米账号、最近使用） |
| `POST /api/keys` | POST | 申请 Key；已有则返回 `400` |
| `POST /api/keys/reset` | POST | 重新生成（旧 Key 作废并解绑） |
| `POST /api/keys/unbind` | POST | 解绑设备并作废设备令牌，保留同一把 Key |

Key 当前以明文存储于 D1 `api_keys` 表（与访问密码同级保护）；后续商业化可切换哈希存储，接口与客户端不变。

## 八、Linux DO 用户私有 Key

Linux DO 用户在浏览器填写自己的 TuneHub Key 后，前端通过请求头 `X-Tunehub-Key` 携带，Worker 用于 TuneHub 解析。密码登录使用 Worker 的 `TUNEHUB_API_KEY`，不持久化任何用户 Key。

## 九、部署相关环境变量

- 必填 Secrets：`SESSION_SECRET`、`ADMIN_PASSWORD`、`TUNEHUB_API_KEY`、`LINUXDO_CLIENT_ID`、`LINUXDO_CLIENT_SECRET`、`LINUXDO_REDIRECT_URI`、`LDC_CLIENT_ID`、`LDC_CLIENT_SECRET`
- 可选：`JKAPI_API_KEY`、`CHKSZ_API_KEY`、`BACKUP4_LXMUSIC_ONRENDER_KEY`、`BACKUP4_LXMUSIC_SCRIPT_MD5`、`BACKUP4_LXMUSIC_SECRET_KEY`、`NXVAV_SECRET`
- Vars：`ALLOWED_ORIGINS`、`FRONTEND_URLS`、`MEDIA_PROXY_ALLOWED_HOSTS`、`ADMIN_LINUXDO_IDS`、`MEMBERSHIP_REQUIRED` 等
