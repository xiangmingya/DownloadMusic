# 音楽 - Music Downloader

当前推荐架构：

1. 前端静态页（可放帽子云）  
2. Cloudflare Worker 负责：
   - 密码登录
   - Linux DO OAuth 登录
   - 会话鉴权
   - TuneHub/API 代理

## 目录说明

- `web/`：静态前端目录（帽子云发布目录）
  - `web/index.html`
  - `web/script.js`
  - `web/style.css`
  - `web/favicon.ico`
- `worker/`：Cloudflare Worker 代码与部署说明

## 前端部署（帽子云）

上传整个仓库后，帽子云发布目录请设置为：

`web/`

然后编辑 `web/index.html` 顶部配置 Worker 地址：

```js
window.AUTH_API_BASE = 'https://你的worker域名/api/auth';
window.APP_API_BASE = 'https://你的worker域名/api/proxy';
```

## Worker 部署

见 `worker/README.md`。

最关键的环境：

- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `TUNEHUB_API_KEY`
- `LINUXDO_CLIENT_ID`
- `LINUXDO_CLIENT_SECRET`
- `LINUXDO_REDIRECT_URI`
- `ALLOWED_ORIGINS`（支持多个前端域名，逗号分隔）
- `FRONTEND_URLS`（支持多个回跳地址，逗号分隔）

## Linux DO 回调地址

在 Linux DO 后台填写：

`https://你的worker域名/api/auth/callback/linuxdo`

并确保与 `LINUXDO_REDIRECT_URI` 完全一致。

## 用户 Key 策略

- 密码登录：走 Worker 中的 `TUNEHUB_API_KEY`
- Linux DO 登录：用户自己的 Key 只保存在浏览器本地（localStorage）
- Worker 不持久化保存用户 Key

## 说明

当前版本只维护 Worker 路由（`/api/auth/*`、`/api/proxy/*`），不再支持旧 PHP 代理路由。
