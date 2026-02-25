<?php
require_once __DIR__ . '/config.php';

function auth_start_session() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}

function auth_is_logged_in() {
    auth_start_session();
    return !empty($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

function auth_login($password) {
    global $APP_LOGIN_PASSWORD;
    auth_start_session();

    if (!is_string($password)) {
        return false;
    }

    $ok = hash_equals((string)$APP_LOGIN_PASSWORD, (string)$password);
    if (!$ok) {
        return false;
    }

    session_regenerate_id(true);
    $_SESSION['logged_in'] = true;
    $_SESSION['logged_in_at'] = time();
    return true;
}

function auth_logout() {
    auth_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function auth_require_login_page() {
    if (auth_is_logged_in()) return;
    header('Location: /index.php');
    exit;
}

function auth_require_login_api() {
    if (auth_is_logged_in()) return;
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'code' => 401,
        'message' => 'Unauthorized'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

