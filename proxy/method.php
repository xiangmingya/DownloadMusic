<?php
require_once __DIR__ . '/config.php';

function to_int_or_default($value, $default) {
    if (!isset($value) || $value === '') return $default;
    $n = intval($value);
    return $n > 0 ? $n : $default;
}

function parse_search_netease($resp) {
    $songs = $resp['result']['songs'] ?? [];
    $out = [];
    foreach ($songs as $item) {
        $artists = [];
        foreach (($item['artists'] ?? []) as $a) {
            if (!empty($a['name'])) $artists[] = $a['name'];
        }
        $out[] = [
            'id' => strval($item['id'] ?? ''),
            'name' => $item['name'] ?? '未知歌曲',
            'artist' => implode(', ', $artists),
            'album' => $item['album']['name'] ?? ''
        ];
    }
    return $out;
}

function parse_search_qq($resp) {
    $songs = $resp['req']['data']['body']['song']['list'] ?? [];
    $out = [];
    foreach ($songs as $item) {
        $artists = [];
        foreach (($item['singer'] ?? []) as $s) {
            if (!empty($s['name'])) $artists[] = $s['name'];
        }
        $out[] = [
            'id' => strval($item['mid'] ?? ''),
            'name' => $item['name'] ?? '未知歌曲',
            'artist' => implode(', ', $artists),
            'album' => $item['album']['name'] ?? ''
        ];
    }
    return $out;
}

function parse_search_kuwo($resp) {
    $songs = $resp['abslist'] ?? [];
    $out = [];
    foreach ($songs as $item) {
        $artist = str_replace('&', ', ', $item['ARTIST'] ?? '');
        $rid = $item['MUSICRID'] ?? '';
        $id = str_replace('MUSIC_', '', $rid);
        $out[] = [
            'id' => strval($id),
            'name' => $item['SONGNAME'] ?? '未知歌曲',
            'artist' => $artist,
            'album' => $item['ALBUM'] ?? ''
        ];
    }
    return $out;
}

function parse_playlist_netease($resp) {
    $playlist = $resp['result'] ?? null;
    if (!$playlist) return ['list' => []];

    $songs = [];
    foreach (($playlist['tracks'] ?? []) as $item) {
        $artists = [];
        foreach (($item['artists'] ?? []) as $a) {
            if (!empty($a['name'])) $artists[] = $a['name'];
        }
        $songs[] = [
            'id' => strval($item['id'] ?? ''),
            'name' => $item['name'] ?? '未知歌曲',
            'artist' => implode(', ', $artists),
            'album' => $item['album']['name'] ?? ''
        ];
    }
    return ['list' => $songs];
}

function parse_playlist_qq($resp) {
    $cd = $resp['cdlist'][0] ?? null;
    if (!$cd) return ['list' => []];

    $songs = [];
    foreach (($cd['songlist'] ?? []) as $item) {
        $artists = [];
        foreach (($item['singer'] ?? []) as $s) {
            if (!empty($s['name'])) $artists[] = $s['name'];
        }
        $songs[] = [
            'id' => strval($item['mid'] ?? ''),
            'name' => $item['title'] ?? '未知歌曲',
            'artist' => implode(', ', $artists),
            'album' => $item['album']['name'] ?? ''
        ];
    }
    return ['list' => $songs];
}

function parse_playlist_kuwo($resp) {
    if (($resp['result'] ?? '') !== 'ok') return ['list' => []];

    $songs = [];
    foreach (($resp['musiclist'] ?? []) as $item) {
        $songs[] = [
            'id' => strval($item['id'] ?? ''),
            'name' => $item['name'] ?? '未知歌曲',
            'artist' => str_replace('&', ', ', $item['artist'] ?? ''),
            'album' => $item['album'] ?? ''
        ];
    }
    return ['list' => $songs];
}

function call_search($platform, $keyword, $page, $limit) {
    if ($platform === 'netease') {
        [$status, , $json, $err] = http_request('GET', 'https://music.163.com/api/search/get/web', [
            'Referer' => 'https://music.163.com/'
        ], [
            's' => $keyword,
            'type' => '1',
            'offset' => strval(($page - 1) * $limit),
            'limit' => strval($limit)
        ]);
        if ($err) throw new Exception($err);
        if ($status < 200 || $status >= 300 || !is_array($json)) throw new Exception("上游请求失败 ($status)");
        return parse_search_netease($json);
    }

    if ($platform === 'qq') {
        $body = [
            'comm' => [
                'cv' => 4747474,
                'ct' => 24,
                'format' => 'json',
                'inCharset' => 'utf-8',
                'outCharset' => 'utf-8',
                'uin' => 0
            ],
            'req' => [
                'method' => 'DoSearchForQQMusicDesktop',
                'module' => 'music.search.SearchCgiService',
                'param' => [
                    'query' => $keyword,
                    'page_num' => strval($page),
                    'num_per_page' => strval($limit)
                ]
            ]
        ];
        [$status, , $json, $err] = http_request('POST', 'https://u.y.qq.com/cgi-bin/musicu.fcg', [
            'Content-Type' => 'application/json',
            'Referer' => 'https://y.qq.com/'
        ], [], $body);
        if ($err) throw new Exception($err);
        if ($status < 200 || $status >= 300 || !is_array($json)) throw new Exception("上游请求失败 ($status)");
        return parse_search_qq($json);
    }

    if ($platform === 'kuwo') {
        [$status, , $json, $err] = http_request('GET', 'http://search.kuwo.cn/r.s', [
            'User-Agent' => 'Mozilla/5.0'
        ], [
            'client' => 'kt',
            'all' => $keyword,
            'pn' => strval($page - 1),
            'rn' => strval($limit),
            'uid' => '794762570',
            'ver' => 'kwplayer_ar_9.2.2.1',
            'vipver' => '1',
            'show_copyright_off' => '1',
            'newver' => '1',
            'ft' => 'music',
            'cluster' => '0',
            'strategy' => '2012',
            'encoding' => 'utf8',
            'rformat' => 'json',
            'vermerge' => '1',
            'mobi' => '1',
            'issubtitle' => '1'
        ]);
        if ($err) throw new Exception($err);
        if ($status < 200 || $status >= 300 || !is_array($json)) throw new Exception("上游请求失败 ($status)");
        return parse_search_kuwo($json);
    }

    throw new Exception('不支持的平台');
}

function call_playlist($platform, $id) {
    if ($platform === 'netease') {
        [$status, , $json, $err] = http_request('GET', 'https://music.163.com/api/playlist/detail', [
            'Referer' => 'https://music.163.com/'
        ], [
            'id' => $id,
            'n' => '100000',
            's' => '8'
        ]);
        if ($err) throw new Exception($err);
        if ($status < 200 || $status >= 300 || !is_array($json)) throw new Exception("上游请求失败 ($status)");
        return parse_playlist_netease($json);
    }

    if ($platform === 'qq') {
        [$status, , $json, $err] = http_request('GET', 'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg', [
            'Origin' => 'https://y.qq.com',
            'Referer' => 'https://y.qq.com/'
        ], [
            'type' => '1',
            'json' => '1',
            'utf8' => '1',
            'onlysong' => '0',
            'new_format' => '1',
            'disstid' => $id,
            'loginUin' => '0',
            'hostUin' => '0',
            'format' => 'json',
            'inCharset' => 'utf8',
            'outCharset' => 'utf-8',
            'notice' => '0',
            'platform' => 'yqq.json',
            'needNewCode' => '0'
        ]);
        if ($err) throw new Exception($err);
        if ($status < 200 || $status >= 300 || !is_array($json)) throw new Exception("上游请求失败 ($status)");
        return parse_playlist_qq($json);
    }

    if ($platform === 'kuwo') {
        [$status, , $json, $err] = http_request('GET', 'http://nplserver.kuwo.cn/pl.svc', [
            'User-Agent' => 'Mozilla/5.0'
        ], [
            'op' => 'getlistinfo',
            'pid' => $id,
            'pn' => '0',
            'rn' => '1000',
            'encode' => 'utf8',
            'keyset' => 'pl2012',
            'identity' => 'kuwo',
            'pcmp4' => '1',
            'vipver' => 'MUSIC_9.0.5.0_W1',
            'newver' => '1'
        ]);
        if ($err) throw new Exception($err);
        if ($status < 200 || $status >= 300 || !is_array($json)) throw new Exception("上游请求失败 ($status)");
        return parse_playlist_kuwo($json);
    }

    throw new Exception('不支持的平台');
}

$platform = trim($_GET['platform'] ?? '');
$functionName = trim($_GET['functionName'] ?? '');

if ($platform === '' || $functionName === '') {
    json_response(400, ['code' => -1, 'message' => '缺少参数: platform / functionName']);
}

try {
    if ($functionName === 'search') {
        $keyword = trim($_GET['keyword'] ?? '');
        if ($keyword === '') {
            json_response(400, ['code' => -1, 'message' => '缺少参数: keyword']);
        }
        $page = to_int_or_default($_GET['page'] ?? '1', 1);
        $limit = to_int_or_default($_GET['limit'] ?? '20', 20);
        $data = call_search($platform, $keyword, $page, $limit);
        json_response(200, ['code' => 0, 'message' => 'Success', 'data' => $data]);
    }

    if ($functionName === 'playlist') {
        $id = trim($_GET['id'] ?? '');
        if ($id === '') {
            json_response(400, ['code' => -1, 'message' => '缺少参数: id']);
        }
        $data = call_playlist($platform, $id);
        json_response(200, ['code' => 0, 'message' => 'Success', 'data' => $data]);
    }

    json_response(400, ['code' => -1, 'message' => '不支持的方法，只支持 search / playlist']);
} catch (Exception $e) {
    json_response(500, ['code' => -1, 'message' => $e->getMessage()]);
}

