<?php
require_once __DIR__ . '/config.php';

$body = get_json_body();
$platform = trim($body['platform'] ?? '');
$ids = trim(strval($body['ids'] ?? ''));
$quality = trim($body['quality'] ?? '');

if ($platform === '' || $ids === '' || $quality === '') {
    json_response(400, [
        'code' => -1,
        'message' => '缺少参数: platform / ids / quality'
    ]);
}

$apiKey = tunehub_api_key();
$keyLooksUnset = (
    $apiKey === '' ||
    strpos($apiKey, 'th_') !== 0 ||
    strpos($apiKey, 'replace_with_your_real_key') !== false
);
if ($keyLooksUnset) {
    json_response(500, [
        'code' => -1,
        'message' => '请先在 proxy/config.php 或环境变量里配置 TUNEHUB_API_KEY'
    ]);
}

[$status, , $json, $err, $raw] = http_request(
    'POST',
    'https://tunehub.sayqz.com/api/v1/parse',
    [
        'Content-Type' => 'application/json',
        'X-API-Key' => $apiKey
    ],
    [],
    [
        'platform' => $platform,
        'ids' => $ids,
        'quality' => $quality
    ]
);

if ($err) {
    json_response(500, ['code' => -1, 'message' => $err]);
}

if (is_array($json)) {
    json_response($status > 0 ? $status : 500, $json);
}

json_response($status > 0 ? $status : 500, [
    'code' => -1,
    'message' => '上游返回非 JSON',
    'raw' => $raw
]);
