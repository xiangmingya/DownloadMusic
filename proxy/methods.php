<?php
require_once __DIR__ . '/config.php';

// 前端只用到 search / playlist
$data = [
    'netease' => ['search', 'playlist'],
    'qq' => ['search', 'playlist'],
    'kuwo' => ['search', 'playlist']
];

json_response(200, [
    'code' => 0,
    'message' => 'Success',
    'data' => $data
]);

