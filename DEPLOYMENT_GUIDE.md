# Music Downloader 全量部署指南

更新时间：2026-02-26

## 1. 项目简介

这个项目是一个在线音乐下载工具，当前采用前后端分离架构：

- `web/`：静态前端（可部署到帽子云等静态托管）
- `worker/`：Cloudflare Worker（负责登录鉴权、会话、API 代理）

登录方式：

- 密码登录：使用服务器端 `TUNEHUB_API_KEY`
- Linux DO 登录：用户在前端填写自己的 Key，仅保存在浏览器 `localStorage`

## 2. 工具与平台说明

| 工具/平台 | 作用 | 是否必须 |
|---|---|---|
| GitHub | 托管代码，帽子云自动拉取 | 必须 |
| 帽子云（Maoziyun） | 托管前端静态页面 `web/` | 必须 |
| Cloudflare Worker | 鉴权与代理 API | 必须 |
| Linux DO OAuth 应用 | 第三方登录 | 可选（但推荐） |
| Wrangler CLI | 部署 Worker 命令行工具 | 推荐 |

## 3. 架构与请求流

1. 浏览器访问帽子云前端。
2. 前端向 Worker 发起 `/api/auth/*` 登录请求。
3. Worker 登录成功后写入 HttpOnly Cookie 会话。
4. 前端调用 Worker 的 `/api/proxy/*`。
5. Worker 代理到 TuneHub 或平台上游接口，返回给前端。

说明：

- `/api/auth/me` 在未登录时返回 `401` 是正常现象。
- 需要 HTTPS，避免 Cookie 被浏览器拦截。

## 4. 仓库目录

```text
DownloadMusic/
├─ web/
│  ├─ index.html
│  ├─ script.js
│  ├─ style.css
│  └─ favicon.ico
├─ worker/
│  ├─ src/index.js
│  ├─ README.md
│  └─ wrangler.toml.example
├─ README.md
└─ DEPLOYMENT_GUIDE.md
```

## 5. 部署前准备

你需要准备：

- Cloudflare 账号（Workers 可用）
- Linux DO OAuth 应用（若启用 Linux DO 登录）
- TuneHub API Key（`th_` 开头）
- 管理员密码（用于密码登录）
- 前端域名（例如帽子云分配域名）
- API 域名（建议自定义域名，如 `musicapi.621888.xyz`）

## 6. 部署 Worker（推荐 CLI 方式）

### 6.1 安装并登录 Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 6.2 创建配置文件

```bash
cd worker
cp wrangler.toml.example wrangler.toml
```

编辑 `worker/wrangler.toml` 的 `[vars]`，重点：

- `ALLOWED_ORIGINS`：前端域名白名单，多个用逗号分隔，写 Origin（不带路径）
- `FRONTEND_URLS`：登录回跳地址白名单，多个用逗号分隔
- `MEDIA_PROXY_ALLOWED_HOSTS`：媒体域名白名单（可按需调整）

示例：

```toml
ALLOWED_ORIGINS = "https://music-t9apk03g.maozi.io,https://zodyr0w32-music-t9apk03g.maozi.io"
FRONTEND_URLS = "https://music-t9apk03g.maozi.io/,https://zodyr0w32-music-t9apk03g.maozi.io/"
```

### 6.3 配置 Worker Secrets

在 `worker/` 目录执行：

```bash
wrangler secret put SESSION_SECRET
wrangler secret put ADMIN_PASSWORD
wrangler secret put TUNEHUB_API_KEY
wrangler secret put LINUXDO_CLIENT_ID
wrangler secret put LINUXDO_CLIENT_SECRET
wrangler secret put LINUXDO_REDIRECT_URI
```

填写建议：

- `SESSION_SECRET`：随机长字符串（至少 32 位）
- `ADMIN_PASSWORD`：你的管理员登录密码
- `TUNEHUB_API_KEY`：你的服务器 Key（`th_...`）
- `LINUXDO_CLIENT_ID`：Linux DO 应用 Client ID
- `LINUXDO_CLIENT_SECRET`：Linux DO 应用 Client Secret
- `LINUXDO_REDIRECT_URI`：`https://你的API域名/api/auth/callback/linuxdo`

### 6.4 发布 Worker

```bash
wrangler deploy
```

发布成功后会得到一个 `*.workers.dev` 域名。

### 6.5 绑定自定义 API 域名（建议）

建议使用自定义域名，例如：`musicapi.621888.xyz`。

在 Cloudflare Dashboard：

1. Workers & Pages -> 你的 Worker
2. Settings -> Domains & Routes
3. Add Custom Domain -> 填入 `musicapi.621888.xyz`
4. 按提示完成 DNS/证书

## 7. Linux DO OAuth 配置

Linux DO 应用后台建议：

- Authorization Endpoint: `https://connect.linux.do/oauth2/authorize`
- Token Endpoint: `https://connect.linux.do/oauth2/token`
- User Endpoint: `https://connect.linux.do/api/user`
- 回调地址：`https://你的API域名/api/auth/callback/linuxdo`

注意：

- Linux DO 配置的回调地址必须与 `LINUXDO_REDIRECT_URI` 完全一致。
- 包括协议、域名、路径都要一致。

## 8. 部署前端到帽子云

### 8.1 发布目录

帽子云项目发布目录设置为：

```text
web/
```

### 8.2 API 地址

当前前端默认已经写成：

- `AUTH_API_BASE = https://musicapi.621888.xyz/api/auth`
- `APP_API_BASE = https://musicapi.621888.xyz/api/proxy`

如需更换域名，修改 `web/index.html` 顶部两行即可。

### 8.3 自动拉取

如果帽子云已连接 GitHub 自动拉取：

1. 本地 `git push`
2. 帽子云自动构建发布
3. 浏览器强刷 `Ctrl/Cmd + Shift + R`

## 9. 上线验证清单

先验证这些点：

1. 打开前端页面正常显示登录页。
2. 密码登录成功后能进入主界面。
3. Linux DO 登录按钮状态正常（可用时显示，不可用时自动隐藏）。
4. 搜索、播放、下载、歌单分页正常。
5. 全屏播放器按钮、播放模式、列表抽屉动画正常。
6. `/api/auth/me` 未登录时 401，登录后 200（这是正常行为）。

## 10. 常见问题排查

### 10.1 `服务状态: 异常` 或超时

优先检查：

1. 前端调用的 API 域名是否正确。
2. Worker 是否已部署到最新版本。
3. `ALLOWED_ORIGINS` 是否包含当前前端 Origin（精确匹配）。
4. 网络跨境抖动（国内访问 `workers.dev` 常见）。

建议：

- 使用自定义 API 域名替代 `workers.dev`。
- 已在前端加入超时延长 + 重试机制。

### 10.2 控制台 401

- 未登录时 `/api/auth/me` 返回 401 是正常检测。
- 若登录后仍 401，检查：
  - Cookie 是否被拦截
  - `ALLOWED_ORIGINS`
  - 是否 HTTPS

### 10.3 Linux DO 登录失败

检查：

1. `LINUXDO_CLIENT_ID/SECRET` 是否正确
2. `LINUXDO_REDIRECT_URI` 与 Linux DO 后台回调是否一致
3. 服务器网络是否能连通 `connect.linux.do`

### 10.4 修改代码后页面没变化

通常是缓存：

1. 前端已使用 `?v=...` 版本号
2. 每次改动建议同步升级版本号
3. 浏览器强刷

## 11. 常用更新流程

### 11.1 改前端（`web/`）

```bash
git add web
git commit -m "update web"
git push
```

帽子云自动拉取后生效。

### 11.2 改 Worker（`worker/`）

```bash
git add worker
git commit -m "update worker"
git push
cd worker
wrangler deploy
```

注意：仅 `git push` 不会自动更新 Worker 运行代码，仍需 `wrangler deploy`。

## 12. 环境变量总表（Worker）

### 必填 Secrets

- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `TUNEHUB_API_KEY`
- `LINUXDO_CLIENT_ID`
- `LINUXDO_CLIENT_SECRET`
- `LINUXDO_REDIRECT_URI`

### 可配置 Vars

- `ALLOWED_ORIGINS` / `ALLOWED_ORIGIN`
- `FRONTEND_URLS` / `FRONTEND_URL`
- `LINUXDO_AUTHORIZATION_ENDPOINT`
- `LINUXDO_TOKEN_ENDPOINT`
- `LINUXDO_USER_ENDPOINT`
- `LINUXDO_SCOPE`
- `MEDIA_PROXY_ALLOWED_HOSTS`
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_SAMESITE`（默认 `None`）
- `SESSION_COOKIE_DOMAIN`
- `SESSION_TTL_SECONDS`

## 13. 推荐生产配置

- 前端域名：`app.example.com`
- API 域名：`api.example.com`
- 二者同主域，Cookie 更稳定
- 全站 HTTPS
- `ALLOWED_ORIGINS` 只保留实际使用域名
- 定期轮换 `SESSION_SECRET` / `ADMIN_PASSWORD`

---

如果后续你要把“Worker 发布”也自动化（例如 GitHub Actions 自动 deploy），可以在这个文档基础上再加一章 CI/CD。
