# 音楽 - Music Downloader API 文档

Cloudflare Worker（`musicapi.621888.xyz`）对外接口说明。所有请求均为 JSON 格式（音频/封面代理除外）。

## 通用约定

- **Base URL**：`https://musicapi.621888.xyz`
- **鉴权**：登录成功后通过 `dm_session` Cookie 维持会话；请求需带 `credentials: 'include'`
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

返回最近 24 小时各平台（netease/qq/kuwo）与解析服务健康度，用于前端页脚。

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

返回有效会员列表（Linux DO ID、昵称、注册/最近登录、会员开通与到期时间）。

### 5.4 赠送会员
`POST /api/admin/members/grant`
```json
{ "target": "Linux DO ID 或完整昵称", "days": 30, "note": "可选备注" }
```

### 5.5 服务监控
`GET /api/admin/monitoring?days=1|7|30`

返回 `services`（各源调用/成功率/耗时/健康度/禁用状态）、`trend`（24 小时趋势）、`final_sources`（最终解析来源命中）。

### 5.6 禁用 / 启用解析源
`PUT /api/admin/monitoring/sources`
```json
{ "source": "onrender", "disabled": true }
```

禁用后该源不再参与解析/搜索链（数据存 D1，约 10 秒生效）。

---

## 六、音乐代理 Proxy

> 所有 `/api/proxy/*` 接口**均需登录**；`parse`、`media` 额外需要有效会员（管理员除外）。

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

`quality`：`128k` / `320k` / `flac` / `flac24bit`。注：前端主解析已停用，实际播放走 6.9 多源链路。

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

### 6.10 备用源 GDStudio
`GET /api/proxy/backup?types=<search|url|lyric|pic>&source=<netease|tencent|kuwo>&...`

- `types=search`：`name`（关键词）、`count`、`pages`
- `types=url`（需会员）：`id`、`br`（128/320/999）解析播放链接
- `types=lyric|pic`（需会员）：`id` 取歌词/封面

### 6.11 备用源 3 雨糖小屋（QQ）
`GET /api/proxy/backup3?input=<关键词或ID>&filter=<name|id>&type=qq&page=1`

- `filter=name`：搜索（登录即可）
- `filter=id`（需会员）：解析播放链接

### 6.12 备用源 4 多源链路
`GET /api/proxy/backup4?mode=<search|url>&platform=<netease|qq|kuwo>&...`

- `mode=search`：`keyword`、`page`、`limit`
- `mode=url`（需会员）：`id`、`quality`、`name`、`artist`

内部按健康度自动排序的解析源链：GDStudio、雨糖小屋（网易云/酷我）、LXMusic Onrender、LXMusic 签名源、OIAPI（网易云/酷我）、JKAPI、CHKSZ（网易云/QQ）、BugPK、Paugram、QQMP3、NXVAV。被管理员禁用的源会被跳过。

---

## 七、Linux DO 用户私有 Key

Linux DO 用户在浏览器填写自己的 TuneHub Key 后，前端通过请求头 `X-Tunehub-Key` 携带，Worker 用于 TuneHub 解析。密码登录使用 Worker 的 `TUNEHUB_API_KEY`，不持久化任何用户 Key。

## 八、部署相关环境变量

- 必填 Secrets：`SESSION_SECRET`、`ADMIN_PASSWORD`、`TUNEHUB_API_KEY`、`LINUXDO_CLIENT_ID`、`LINUXDO_CLIENT_SECRET`、`LINUXDO_REDIRECT_URI`、`LDC_CLIENT_ID`、`LDC_CLIENT_SECRET`
- 可选：`JKAPI_API_KEY`、`CHKSZ_API_KEY`、`BACKUP4_LXMUSIC_ONRENDER_KEY`、`BACKUP4_LXMUSIC_SCRIPT_MD5`、`BACKUP4_LXMUSIC_SECRET_KEY`、`NXVAV_SECRET`
- Vars：`ALLOWED_ORIGINS`、`FRONTEND_URLS`、`MEDIA_PROXY_ALLOWED_HOSTS`、`ADMIN_LINUXDO_IDS`、`MEMBERSHIP_REQUIRED` 等
