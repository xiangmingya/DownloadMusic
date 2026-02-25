<?php
require_once __DIR__ . '/auth/session.php';

if (auth_is_logged_in()) {
    header('Location: /app.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    if (auth_login($password)) {
        header('Location: /app.php');
        exit;
    }
    $error = '密码错误，请重试。';
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>音楽 - 登录</title>
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-body">
    <div class="login-shell">
        <div class="login-paper">
            <p class="login-kicker">ようこそ</p>
            <h1 class="login-title">音楽</h1>
            <p class="login-subtitle">Private Access</p>

            <form method="post" class="login-form">
                <label for="password">访问密码</label>
                <input id="password" name="password" type="password" placeholder="输入密码" autocomplete="current-password" required>
                <button type="submit">入る</button>
            </form>

            <?php if ($error !== ''): ?>
            <p class="login-error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
            <?php else: ?>
            <p class="login-tip">仅需密码，无需注册。</p>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>

