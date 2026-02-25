<?php

require_once dirname(__DIR__) . '/auth/session.php';
auth_require_login_api();

// TuneHub API Key:
// 1) 推荐设置环境变量 TUNEHUB_API_KEY
// 2) 或直接写在下面（不推荐提交到仓库）
$LOCAL_TUNEHUB_API_KEY = 'th_xxx_replace_with_your_real_key';

function tunehub_api_key() {
    global $LOCAL_TUNEHUB_API_KEY;
    $envKey = getenv('TUNEHUB_API_KEY');
    if ($envKey && trim($envKey) !== '') {
        return trim($envKey);
    }
    return trim($LOCAL_TUNEHUB_API_KEY);
}

function json_response($code, $payload) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_json_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function http_request($method, $url, $headers = [], $query = [], $body = null) {
    if (!empty($query)) {
        $separator = strpos($url, '?') === false ? '?' : '&';
        $url .= $separator . http_build_query($query);
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    $method = strtoupper($method);
    if ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    }

    if (!empty($headers)) {
        $headerList = [];
        foreach ($headers as $k => $v) {
            $headerList[] = $k . ': ' . $v;
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headerList);
    }

    if ($body !== null) {
        if (is_array($body)) {
            $body = json_encode($body, JSON_UNESCAPED_UNICODE);
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return [0, [], null, $err];
    }

    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    $decoded = null;
    $temp = json_decode($response, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($temp)) {
        $decoded = $temp;
    }

    return [$statusCode, ['content-type' => $contentType], $decoded, null, $response];
}
