# 音楽 - Music Downloader（PHP + 密码登录）

这是一个纯 PHP 版本：
- 单密码登录（无注册）
- 登录后才能调用代理接口
- 不需要 Node，不需要 `npm install`

## 上线前只改 2 处

1. 编辑 `auth/config.php`，设置登录密码：

```php
$APP_LOGIN_PASSWORD = 'your-password';
```

2. 编辑 `proxy/config.php`，设置 TuneHub Key：

```php
$LOCAL_TUNEHUB_API_KEY = 'th_xxx_replace_with_your_real_key';
```

## 宝塔部署（最简单）

1. 把整个项目上传到宝塔站点目录（PHP 网站）。
2. 确认站点开启 PHP。
3. 按上面两处配置好密码和 Key。
4. 访问站点首页 `index.php`，输入密码后使用。

不需要：
- `npm install`
- `npm start`
- PM2

## 认证与代理

- 登录页：`index.php`
- 应用页：`app.php`
- 退出：`auth/logout.php`
- 代理接口（登录态可访问）：
  - `proxy/methods.php`
  - `proxy/method.php`
  - `proxy/parse.php`

## 项目结构（关键）

```text
DownloadMusic/
├── index.php
├── app.php
├── index.html
├── style.css
├── script.js
├── auth/
│   ├── config.php
│   ├── session.php
│   └── logout.php
└── proxy/
    ├── config.php
    ├── methods.php
    ├── method.php
    └── parse.php
```

## 注意

- 请不要把真实 Key 和登录密码提交到公开仓库。
- 如果接口报 `Unauthorized`，说明未登录或会话失效，请重新登录。
