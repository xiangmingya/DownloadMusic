const API_BASE = String(window.APP_API_BASE || '/api/proxy').replace(/\/$/, '');
const API_ROUTES = {
    parse: `${API_BASE}/parse`,
    meta: `${API_BASE}/meta`,
    method: `${API_BASE}/method`,
    methods: `${API_BASE}/methods`,
    media: `${API_BASE}/media`,
    backup: `${API_BASE}/backup`,
    backup3: `${API_BASE}/backup3`
};
const PRIMARY_ALLOWED_PLATFORMS = ['netease', 'qq', 'kuwo'];
const BACKUP_SOURCE_MAP = {
    netease: 'netease',
    qq: 'tencent',
    kuwo: 'kuwo'
};
const BACKUP3_SOURCE_MAP = {
    netease: 'netease',
    qq: 'qq',
    kuwo: 'kuwo'
};
const APP_CONTEXT = window.APP_CONTEXT || {};
const AUTH_TYPE = APP_CONTEXT.authType || 'password';

const defaultPlatformNameMap = {
    netease: '网易云音乐',
    kuwo: '酷我音乐',
    qq: 'QQ音乐',
    kugou: '酷狗音乐',
    migu: '咪咕音乐'
};

let platformNames = { ...defaultPlatformNameMap };
let supportedPlatforms = ['netease', 'qq', 'kuwo'];
let currentSearchType = 'song';

// 分页相关
let allSongs = [];
let currentPage = 1;
let currentSearchParams = null;
const pageSize = 5;
const searchApiLimit = 20;
let keywordPagingState = {
    enabled: false,
    platform: '',
    keyword: '',
    page: 0,
    limit: searchApiLimit,
    provider: 'primary',
    hasMore: false,
    loading: false
};

// 播放相关
let currentPlayingIndex = null;
let currentLyrics = [];
let activePlayRequestId = 0;
let currentPlayingSong = null;
let currentPlaylistIndex = -1;
const audio = document.getElementById('audio');

// 缓存
const parseCache = new Map();
const metaCache = new Map();
const backupDataCache = new Map();
const backup3DataCache = new Map();
const backupPicCache = new Map();
const LOCAL_KEY_PREFIX = 'downloadmusic_tunehub_key_';
const linuxdoUserId = String(APP_CONTEXT?.user?.linuxdo_id || '').trim();
const linuxdoKeyStorageKey = `${LOCAL_KEY_PREFIX}${linuxdoUserId || 'default'}`;
const playModeStorageKey = `${LOCAL_KEY_PREFIX}playmode_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
let linuxdoUserKey = '';
const playlistStorageKey = `${LOCAL_KEY_PREFIX}playlist_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
let playlistSongs = [];
let isFullPlayerOpen = false;
let isPlaylistSheetOpen = false;
let playlistSheetHideTimer = null;
let fullPlayerHideTimer = null;
let fullPlayerFullscreenIdleTimer = null;
const FULL_PLAYER_IDLE_MS = 2200;
const PLAY_MODES = ['list', 'single', 'random'];
const PLAY_MODE_TEXT = {
    list: '列表',
    single: '单曲',
    random: '随机'
};
let currentPlayMode = 'list';
const BACKUP_COOLDOWN_MS = 45000;
const BACKUP_TOAST_INTERVAL_MS = 6000;
let backupCircuitState = {
    blockedUntil: 0,
    lastError: '',
    lastToastAt: 0
};

// Toast通知
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeForSingleQuote(text) {
    return String(text || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

function normalizeMediaUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (u.startsWith('//')) return `https:${u}`;
    return u;
}

function buildMediaProxyUrl(rawUrl, options = {}) {
    const mediaUrl = normalizeMediaUrl(rawUrl);
    if (!mediaUrl) return '';
    const endpoint = new URL(API_ROUTES.media, window.location.href);
    endpoint.searchParams.set('url', mediaUrl);
    if (options.download) {
        endpoint.searchParams.set('download', '1');
    }
    if (options.filename) {
        endpoint.searchParams.set('filename', String(options.filename));
    }
    return endpoint.toString();
}

function getProxiedCoverUrl(rawUrl) {
    return buildMediaProxyUrl(rawUrl);
}

function buildDownloadFilename(name, artist) {
    const n = String(name || '').trim();
    const a = String(artist || '').trim();
    return (a && n) ? `${a} - ${n}` : (n || a || 'music');
}

function parseResponseText(text) {
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

const API_ERROR_CODE_CN = {
    [-2]: '账户积分不足',
    [-1]: '通用错误',
    401: 'API Key 无效或未提供',
    403: '账户被封禁或 Key 已禁用',
    404: '请求的资源不存在',
    500: '服务器内部错误'
};

const API_ERROR_MESSAGE_CN = {
    'success': '请求成功',
    'error': '通用错误',
    'insufficient credits': '账户积分不足',
    'unauthorized': 'API Key 无效或未提供',
    'forbidden': '账户被封禁或 Key 已禁用',
    'not found': '请求的资源不存在',
    'server error': '服务器内部错误'
};

function localizeErrorMessage(rawMessage, fallback = '') {
    const text = String(rawMessage || '').trim();
    if (!text) return fallback;
    const lower = text.toLowerCase();
    const mapped = API_ERROR_MESSAGE_CN[text.toLowerCase()];
    if (mapped) return mapped;
    if (lower.includes('value of `source` is not supported')) return '备用源不支持该平台';
    if (lower.includes('rate') && lower.includes('limit')) return '备用源请求过于频繁，请稍后重试';
    if (lower.includes('failed to fetch')) return '网络请求失败，请稍后重试';
    if (lower.includes('networkerror')) return '网络请求失败，请稍后重试';
    return mapped || text;
}

function getApiErrorMessage(payload, statusCode, fallback = '请求失败') {
    const code = Number(payload?.code);
    if (Number.isFinite(code) && code !== 0 && API_ERROR_CODE_CN[code]) {
        return API_ERROR_CODE_CN[code];
    }

    const status = Number(statusCode);
    if (Number.isFinite(status) && API_ERROR_CODE_CN[status]) {
        return API_ERROR_CODE_CN[status];
    }

    const message = localizeErrorMessage(payload?.message, '');
    if (message) return message;

    return fallback;
}

function isBackupTemporarilyBlocked() {
    return Number(backupCircuitState.blockedUntil || 0) > Date.now();
}

function getBackupUnavailableMessage() {
    if (!isBackupTemporarilyBlocked()) return '备用源暂时不可用，请稍后重试';
    const remainMs = Math.max(0, Number(backupCircuitState.blockedUntil || 0) - Date.now());
    const remainSec = Math.max(1, Math.ceil(remainMs / 1000));
    return `备用源暂时不可用（约 ${remainSec} 秒后重试）`;
}

function shouldOpenBackupCircuit(message, statusCode = 0) {
    const text = String(message || '').toLowerCase();
    const code = Number(statusCode || 0);
    if (code === 503 || code === 502 || code === 504 || code === 429) return true;
    if (text.includes('503') || text.includes('service unavailable')) return true;
    if (text.includes('timed out') || text.includes('timeout')) return true;
    if (text.includes('failed to fetch') || text.includes('networkerror')) return true;
    return false;
}

function markBackupFailure(error, statusCode = 0) {
    const message = localizeErrorMessage(error?.message, '备用源请求失败');
    backupCircuitState.lastError = message;
    if (shouldOpenBackupCircuit(message, statusCode)) {
        backupCircuitState.blockedUntil = Date.now() + BACKUP_COOLDOWN_MS;
    }
}

function markBackupSuccess() {
    backupCircuitState.blockedUntil = 0;
    backupCircuitState.lastError = '';
}

function toastBackupUnavailableOnce() {
    const now = Date.now();
    if (now - Number(backupCircuitState.lastToastAt || 0) < BACKUP_TOAST_INTERVAL_MS) {
        return;
    }
    backupCircuitState.lastToastAt = now;
    showToast(getBackupUnavailableMessage(), 'info');
}

function toPrimaryPlatform(platform) {
    const p = String(platform || '').trim().toLowerCase();
    return PRIMARY_ALLOWED_PLATFORMS.includes(p) ? p : '';
}

function toBackupSource(platform) {
    const primary = toPrimaryPlatform(platform);
    if (!primary) return '';
    return BACKUP_SOURCE_MAP[primary] || primary;
}

function toBackup3Source(platform) {
    const primary = toPrimaryPlatform(platform);
    if (!primary) return '';
    return BACKUP3_SOURCE_MAP[primary] || primary;
}

function backupBrFromQuality(quality) {
    const q = String(quality || '').trim().toLowerCase();
    if (q.startsWith('128')) return 128;
    if (q.startsWith('320')) return 320;
    if (q.startsWith('flac')) return 999;
    return 320;
}

function normalizeBackupSong(item, selectedPlatform, backupSource) {
    const artists = Array.isArray(item?.artist) ? item.artist : [item?.artist];
    return {
        id: String(item?.id || ''),
        name: String(item?.name || '未知歌曲'),
        artist: artists.filter(Boolean).join(', ') || '未知歌手',
        album: String(item?.album || ''),
        source: selectedPlatform,
        platform: selectedPlatform,
        cover: '',
        dataSource: 'backup',
        backup: {
            source: String(backupSource || ''),
            trackId: String(item?.id || ''),
            urlId: String(item?.url_id || item?.id || ''),
            lyricId: String(item?.lyric_id || item?.id || ''),
            picId: String(item?.pic_id || '')
        }
    };
}

function normalizeBackup3Song(item, selectedPlatform, backup3Source) {
    const trackId = String(item?.songid ?? item?.id ?? '').trim();
    const streamUrl = normalizeMediaUrl(item?.url || '');
    return {
        id: trackId,
        name: String(item?.title || item?.name || '未知歌曲'),
        artist: String(item?.author || item?.artist || '未知歌手'),
        album: '',
        source: selectedPlatform,
        platform: selectedPlatform,
        cover: normalizeMediaUrl(item?.pic || ''),
        dataSource: 'backup3',
        backup: null,
        backup3: {
            source: String(backup3Source || ''),
            trackId,
            streamUrl,
            lyric: String(item?.lrc || ''),
            link: normalizeMediaUrl(item?.link || '')
        }
    };
}

function backupSongDataCacheKey(song, quality) {
    const platform = toPrimaryPlatform(song?.platform || song?.source);
    const trackId = String(song?.backup?.trackId || song?.id || '').trim();
    return `backup:${platform}:${trackId}:${String(quality || '')}`;
}

function backupPicCacheKey(song) {
    const src = String(song?.backup?.source || '');
    const picId = String(song?.backup?.picId || '');
    return `pic:${src}:${picId}`;
}

function backup3DataCacheKey(song) {
    const platform = toPrimaryPlatform(song?.platform || song?.source);
    const trackId = String(song?.backup3?.trackId || song?.id || '').trim();
    return `backup3:${platform}:${trackId}`;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiFetch(url, init = {}) {
    const { timeoutMs = 0, ...fetchInit } = init;
    if (!timeoutMs || timeoutMs <= 0) {
        return fetch(url, {
            credentials: 'include',
            ...fetchInit
        });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            credentials: 'include',
            ...fetchInit,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

function isLinuxdoLogin() {
    return AUTH_TYPE === 'linuxdo';
}

function setUserKeyStatus(message, cls = '') {
    const statusEl = document.getElementById('userKeyStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `key-status ${cls}`.trim();
}

function maskKey(key) {
    const text = String(key || '').trim();
    if (!text) return '';
    if (text.length <= 10) return '****';
    return `${text.slice(0, 4)}****${text.slice(-4)}`;
}

function loadLinuxdoKeyFromLocalStorage() {
    if (!isLinuxdoLogin()) return '';
    try {
        return String(localStorage.getItem(linuxdoKeyStorageKey) || '').trim();
    } catch {
        return '';
    }
}

function saveLinuxdoKeyToLocalStorage(key) {
    if (!isLinuxdoLogin()) return;
    try {
        localStorage.setItem(linuxdoKeyStorageKey, key);
    } catch {
        // ignore storage failures
    }
}

function clearLinuxdoKeyFromLocalStorage() {
    if (!isLinuxdoLogin()) return;
    try {
        localStorage.removeItem(linuxdoKeyStorageKey);
    } catch {
        // ignore storage failures
    }
}

function applyUserKeyState() {
    const input = document.getElementById('userApiKeyInput');
    if (input) input.value = '';

    if (linuxdoUserKey) {
        setUserKeyStatus(`已在本浏览器保存 Key：${maskKey(linuxdoUserKey)}`, 'ok');
    } else {
        setUserKeyStatus('未配置 Key，请先填写后再解析/下载（仅保存到本浏览器）。', 'warn');
    }
}

async function saveUserKey() {
    const input = document.getElementById('userApiKeyInput');
    if (!input) return;
    const key = input.value.trim();
    if (!key) {
        setUserKeyStatus('请输入 TuneHub API Key', 'warn');
        return;
    }
    if (!key.startsWith('th_') || key.length < 12) {
        setUserKeyStatus('Key 格式不正确（需 th_ 开头）', 'warn');
        return;
    }

    linuxdoUserKey = key;
    saveLinuxdoKeyToLocalStorage(key);
    applyUserKeyState();
    showToast('Key 保存成功', 'success');
}

async function clearUserKey() {
    linuxdoUserKey = '';
    clearLinuxdoKeyFromLocalStorage();
    applyUserKeyState();
    showToast('Key 已清空', 'info');
}

async function initLinuxdoKeyPanel() {
    if (!isLinuxdoLogin()) return;

    const saveBtn = document.getElementById('saveUserKeyBtn');
    const clearBtn = document.getElementById('clearUserKeyBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await saveUserKey();
            } catch (error) {
                setUserKeyStatus(error.message || '保存失败', 'warn');
                showToast(error.message || '保存失败', 'error');
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            try {
                await clearUserKey();
            } catch (error) {
                setUserKeyStatus(error.message || '清空失败', 'warn');
                showToast(error.message || '清空失败', 'error');
            }
        });
    }

    linuxdoUserKey = loadLinuxdoKeyFromLocalStorage();
    applyUserKeyState();
}

async function ensureLinuxdoKeyReady() {
    if (!isLinuxdoLogin()) return;
    if (linuxdoUserKey) return;
    throw new Error('请先填写你的 TuneHub API Key');
}

async function parseSongs(platform, ids, quality) {
    await ensureLinuxdoKeyReady();

    const headers = {
        'Content-Type': 'application/json'
    };
    if (isLinuxdoLogin() && linuxdoUserKey) {
        headers['X-Tunehub-Key'] = linuxdoUserKey;
    }

    const response = await apiFetch(API_ROUTES.parse, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            platform,
            ids,
            quality
        })
    });

    const text = await response.text();
    const data = parseResponseText(text);

    const code = Number(data.code);
    if (!response.ok || code !== 0) {
        throw new Error(getApiErrorMessage(data, response.status, `解析失败 (${response.status})`));
    }

    return data;
}

function parsedCacheKey(platform, id, quality) {
    return `${platform}:${id}:${quality}`;
}

function metaCacheKey(platform, id) {
    return `${platform}:${id}`;
}

function cacheParsedItem(platform, quality, item) {
    if (!item || !item.id || !item.success) return;
    parseCache.set(parsedCacheKey(platform, item.id, quality), item);
}

function normalizeParsedItems(platform, quality, parseResp) {
    const items = Array.isArray(parseResp?.data?.data) ? parseResp.data.data : [];
    items.forEach(item => cacheParsedItem(platform, quality, item));
    return items;
}

function toSongFromParsedItem(platform, item) {
    return {
        id: String(item.id || ''),
        name: item?.info?.name || String(item.id || '未知歌曲'),
        artist: item?.info?.artist || '未知歌手',
        album: item?.info?.album || '',
        source: platform,
        platform,
        cover: normalizeMediaUrl(item.cover || item.pic || item?.info?.pic || ''),
        dataSource: 'primary',
        backup: null
    };
}

async function ensureParsedSong(platform, id, quality) {
    const cacheKey = parsedCacheKey(platform, id, quality);
    if (parseCache.has(cacheKey)) {
        return parseCache.get(cacheKey);
    }

    const parseResp = await parseSongs(platform, String(id), quality);
    const items = normalizeParsedItems(platform, quality, parseResp);
    const matched = items.find(item => String(item.id) === String(id)) || items[0];

    if (!matched) {
        throw new Error('未返回解析结果');
    }
    if (!matched.success) {
        throw new Error(localizeErrorMessage(matched.error, `解析失败: ${id}`));
    }

    cacheParsedItem(platform, quality, matched);
    return matched;
}

async function fetchSongMeta(platform, id) {
    const key = metaCacheKey(platform, id);
    if (metaCache.has(key)) {
        return metaCache.get(key);
    }

    const url = new URL(API_ROUTES.meta, window.location.href);
    url.searchParams.set('platform', platform);
    url.searchParams.set('id', String(id));

    const response = await apiFetch(url.toString());
    const data = await response.json();
    if (!response.ok || Number(data.code) !== 0) {
        throw new Error(getApiErrorMessage(data, response.status, '获取元数据失败'));
    }

    const meta = data.data || {};
    metaCache.set(key, meta);
    return meta;
}

async function callPlatformMethod(platform, functionName, vars = {}, options = {}) {
    const url = new URL(API_ROUTES.method, window.location.href);
    url.searchParams.set('platform', platform);
    url.searchParams.set('functionName', functionName);
    Object.entries(vars).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== '') {
            url.searchParams.set(k, String(v));
        }
    });

    const timeoutMs = Number(options.timeoutMs || 0);
    const retries = Math.max(0, Number(options.retries || 0));
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 450));
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await apiFetch(url.toString(), { timeoutMs });
            const data = await response.json();
            if (!response.ok || Number(data.code) !== 0) {
                throw new Error(getApiErrorMessage(data, response.status, '请求失败'));
            }
            return data.data;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await wait(retryDelayMs);
            }
        }
    }

    throw lastError || new Error('请求失败');
}

// 检查服务状态并获取平台信息
async function checkStatus() {
    try {
        let response = null;
        let methodsData = null;
        let lastErr = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                response = await apiFetch(API_ROUTES.methods, { timeoutMs: 9000 });
                methodsData = await response.json();
                if (!response.ok || Number(methodsData.code) !== 0 || !methodsData.data) {
                    throw new Error(getApiErrorMessage(methodsData, response.status, '服务状态检测失败'));
                }
                lastErr = null;
                break;
            } catch (error) {
                lastErr = error;
                if (attempt < 1) {
                    await wait(500);
                }
            }
        }

        if (lastErr) {
            throw lastErr;
        }

        if (response.ok && Number(methodsData.code) === 0 && methodsData.data) {
            supportedPlatforms = Object.keys(methodsData.data)
                .filter(key => PRIMARY_ALLOWED_PLATFORMS.includes(String(key)));
            if (supportedPlatforms.length === 0) {
                supportedPlatforms = ['netease', 'qq', 'kuwo'];
            }

            const names = [];
            platformNames = {};
            supportedPlatforms.forEach(key => {
                platformNames[key] = defaultPlatformNameMap[key] || key;
                names.push(platformNames[key]);
            });

            updatePlatformSelect();
            document.getElementById('serviceStatus').innerHTML =
                `服务状态: <span class="online">${names.join('、')}</span>`;
            document.getElementById('healthStatus').innerHTML =
                `健康状态: <span class="online">正常</span>`;
        } else {
            throw new Error(getApiErrorMessage(methodsData, response.status, '服务异常'));
        }
    } catch {
        try {
            const backupProbe = await callBackupApi({
                types: 'search',
                source: 'netease',
                name: '周杰伦',
                count: 1,
                pages: 1
            }, {
                timeoutMs: 9000,
                retries: 0
            });
            const backupAlive = Array.isArray(backupProbe);
            if (backupAlive) {
                supportedPlatforms = [...PRIMARY_ALLOWED_PLATFORMS];
                platformNames = {
                    netease: defaultPlatformNameMap.netease,
                    qq: defaultPlatformNameMap.qq,
                    kuwo: defaultPlatformNameMap.kuwo
                };
                updatePlatformSelect();
                document.getElementById('serviceStatus').innerHTML =
                    `服务状态: <span class="online">主源波动，备用可用</span>`;
                document.getElementById('healthStatus').innerHTML =
                    `健康状态: <span class="online">降级运行</span>`;
                return;
            }
        } catch {
            // ignore
        }
        try {
            const backup3Probe = await callBackup3Api({
                input: '周杰伦',
                filter: 'name',
                type: 'netease',
                page: 1
            }, {
                timeoutMs: 10000,
                retries: 0
            });
            const backup3Alive = Number(backup3Probe?.code) === 200 && Array.isArray(backup3Probe?.data);
            if (backup3Alive) {
                supportedPlatforms = [...PRIMARY_ALLOWED_PLATFORMS];
                platformNames = {
                    netease: defaultPlatformNameMap.netease,
                    qq: defaultPlatformNameMap.qq,
                    kuwo: defaultPlatformNameMap.kuwo
                };
                updatePlatformSelect();
                document.getElementById('serviceStatus').innerHTML =
                    `服务状态: <span class="online">主源波动，备用3可用</span>`;
                document.getElementById('healthStatus').innerHTML =
                    `健康状态: <span class="online">三级降级</span>`;
                return;
            }
        } catch {
            // ignore
        }
        document.getElementById('serviceStatus').innerHTML =
            `服务状态: <span class="offline">网络波动</span>`;
        document.getElementById('healthStatus').innerHTML =
            `健康状态: <span class="offline">可重试</span>`;
    }
}

// 更新平台下拉框
function updatePlatformSelect() {
    const platformSelect = document.getElementById('platform');
    supportedPlatforms = supportedPlatforms.filter(key => PRIMARY_ALLOWED_PLATFORMS.includes(String(key)));
    if (supportedPlatforms.length === 0) {
        supportedPlatforms = [...PRIMARY_ALLOWED_PLATFORMS];
    }
    const current = String(platformSelect.value || '').trim();
    const fallback = supportedPlatforms.includes('netease') ? 'netease' : supportedPlatforms[0];
    const selected = supportedPlatforms.includes(current) ? current : fallback;

    platformSelect.innerHTML = supportedPlatforms.map(key =>
        `<option value="${key}"${key === selected ? ' selected' : ''}>${platformNames[key] || key}</option>`
    ).join('');
}

function platformDisplayName(platformKey) {
    return platformNames[platformKey] || defaultPlatformNameMap[platformKey] || platformKey || '当前平台';
}

async function callBackupApi(params, options = {}) {
    if (isBackupTemporarilyBlocked()) {
        throw new Error(getBackupUnavailableMessage());
    }

    const timeoutMs = Number(options.timeoutMs || 15000);
    const retries = Math.max(0, Number(options.retries || 1));
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 500));
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const url = new URL(API_ROUTES.backup, window.location.href);
            Object.entries(params || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null && String(v) !== '') {
                    url.searchParams.set(k, String(v));
                }
            });

            const response = await apiFetch(url.toString(), { timeoutMs });
            const text = await response.text();
            const data = parseResponseText(text);
            if (!response.ok) {
                const err = new Error(getApiErrorMessage(data, response.status, `备用源请求失败 (${response.status})`));
                err._statusCode = Number(response.status || 0);
                throw err;
            }
            if (data && typeof data === 'object' && !Array.isArray(data) && data.detail) {
                throw new Error(localizeErrorMessage(data.detail, '备用源请求失败'));
            }
            markBackupSuccess();
            return data;
        } catch (error) {
            lastError = error;
            markBackupFailure(error, Number(error?._statusCode || 0));
            if (attempt < retries) {
                await wait(retryDelayMs);
            }
        }
    }

    throw lastError || new Error('备用源请求失败');
}

async function callBackup3Api(params, options = {}) {
    const timeoutMs = Number(options.timeoutMs || 18000);
    const retries = Math.max(0, Number(options.retries || 1));
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 500));
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const url = new URL(API_ROUTES.backup3, window.location.href);
            Object.entries(params || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null && String(v) !== '') {
                    url.searchParams.set(k, String(v));
                }
            });

            const response = await apiFetch(url.toString(), { timeoutMs });
            const text = await response.text();
            const data = parseResponseText(text);
            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, response.status, `备用源3请求失败 (${response.status})`));
            }
            const code = Number(data?.code);
            if (Number.isFinite(code) && code !== 200 && code !== 0) {
                throw new Error(localizeErrorMessage(data?.error || data?.message, '备用源3请求失败'));
            }
            return data;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await wait(retryDelayMs);
            }
        }
    }

    throw lastError || new Error('备用源3请求失败');
}

async function searchSongsByKeywordPagePrimary(keyword, selectedPlatform, options = {}) {
    const fallback = supportedPlatforms.includes('netease') ? 'netease' : supportedPlatforms[0];
    const platform = supportedPlatforms.includes(selectedPlatform) ? selectedPlatform : fallback;
    if (!platform) {
        throw new Error('暂无可用平台');
    }

    const timeoutMs = 15000;
    const requestPage = Math.max(1, Number(options.page || 1));
    const requestLimit = Math.max(1, Number(options.limit || searchApiLimit));
    const result = await callPlatformMethod(platform, 'search', {
        keyword,
        page: requestPage,
        limit: requestLimit
    }, {
        timeoutMs,
        retries: 1,
        retryDelayMs: 600
    });
    const list = Array.isArray(result) ? result : [];
    return list.map(item => ({
        id: String(item.id || ''),
        name: item.name || '未知歌曲',
        artist: item.artist || '未知歌手',
        album: item.album || '',
        source: platform,
        platform,
        cover: normalizeMediaUrl(item.cover || ''),
        dataSource: 'primary',
        backup: null
    }));
}

async function searchSongsByKeywordPageBackup(keyword, selectedPlatform, options = {}) {
    const fallback = supportedPlatforms.includes('netease') ? 'netease' : supportedPlatforms[0];
    const platform = supportedPlatforms.includes(selectedPlatform) ? selectedPlatform : fallback;
    const backupSource = toBackupSource(platform);
    if (!platform || !backupSource) {
        return [];
    }

    const requestPage = Math.max(1, Number(options.page || 1));
    const requestLimit = Math.max(1, Number(options.limit || searchApiLimit));
    const data = await callBackupApi({
        types: 'search',
        source: backupSource,
        name: keyword,
        count: requestLimit,
        pages: requestPage
    }, {
        timeoutMs: 15000,
        retries: 1,
        retryDelayMs: 600
    });
    const list = Array.isArray(data) ? data : [];
    return list
        .filter(item => item && item.id)
        .map(item => normalizeBackupSong(item, platform, backupSource));
}

async function searchSongsByKeywordPageBackup3(keyword, selectedPlatform, options = {}) {
    const fallback = supportedPlatforms.includes('netease') ? 'netease' : supportedPlatforms[0];
    const platform = supportedPlatforms.includes(selectedPlatform) ? selectedPlatform : fallback;
    const backup3Source = toBackup3Source(platform);
    if (!platform || !backup3Source) {
        return [];
    }

    const requestPage = Math.max(1, Number(options.page || 1));
    const requestLimit = Math.max(1, Number(options.limit || searchApiLimit));
    const data = await callBackup3Api({
        input: keyword,
        filter: 'name',
        type: backup3Source,
        page: requestPage
    }, {
        timeoutMs: 18000,
        retries: 1,
        retryDelayMs: 650
    });
    const list = Array.isArray(data?.data) ? data.data : [];
    return list
        .filter(item => item && (item.songid || item.id))
        .slice(0, requestLimit)
        .map(item => normalizeBackup3Song(item, platform, backup3Source));
}

async function searchSongsByKeyword(keyword, selectedPlatform, options = {}) {
    const requestPage = Math.max(1, Number(options.page || 1));
    const requestLimit = Math.max(1, Number(options.limit || searchApiLimit));
    const forceProvider = String(options.provider || 'auto');
    const silentFallback = Boolean(options.silentFallback);

    if (forceProvider === 'primary') {
        const songs = await searchSongsByKeywordPagePrimary(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        return { songs, provider: 'primary' };
    }
    if (forceProvider === 'backup') {
        const songs = await searchSongsByKeywordPageBackup(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        return { songs, provider: 'backup' };
    }
    if (forceProvider === 'backup3') {
        const songs = await searchSongsByKeywordPageBackup3(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        return { songs, provider: 'backup3' };
    }

    let primarySongs = [];
    let primaryError = null;
    try {
        primarySongs = await searchSongsByKeywordPagePrimary(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
    } catch (error) {
        primaryError = error;
    }

    if (!primaryError && primarySongs.length > 0) {
        return { songs: primarySongs, provider: 'primary' };
    }

    let backupError = null;
    try {
        const backupSongs = await searchSongsByKeywordPageBackup(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        if (backupSongs.length > 0) {
            if (!silentFallback) {
                showToast(primaryError ? '主搜索异常，已自动切换备用源' : '主搜索无结果，已自动切换备用源', 'info');
            }
            return { songs: backupSongs, provider: 'backup' };
        }
    } catch (error) {
        backupError = error;
        // 继续尝试第三层备用源
    }

    try {
        const backup3Songs = await searchSongsByKeywordPageBackup3(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        if (backup3Songs.length > 0) {
            if (!silentFallback) {
                showToast(primaryError ? '主源/备用源异常，已切换第3层备用源' : '主源/备用源无结果，已切换第3层备用源', 'info');
            }
            return { songs: backup3Songs, provider: 'backup3' };
        }
    } catch (backup3Error) {
        if (!silentFallback && backupError) {
            toastBackupUnavailableOnce();
        }
        // ignore backup3 errors
    }

    if (primaryError) {
        throw primaryError;
    }
    return { songs: [], provider: 'primary' };
}

function resetKeywordPagingState() {
    keywordPagingState = {
        enabled: false,
        platform: '',
        keyword: '',
        page: 0,
        limit: searchApiLimit,
        provider: 'primary',
        hasMore: false,
        loading: false
    };
}

function enableKeywordPaging(keyword, platform, firstBatchCount, provider = 'primary') {
    const normalizedProvider = String(provider || 'primary');
    const effectiveLimit = normalizedProvider === 'backup3' ? 10 : searchApiLimit;
    keywordPagingState = {
        enabled: true,
        platform: String(platform || ''),
        keyword: String(keyword || ''),
        page: 1,
        limit: effectiveLimit,
        provider: normalizedProvider,
        // Optimistic: allow trying "next" once at list end, then decide by actual response.
        hasMore: true,
        loading: false
    };
}

function canLoadMoreKeywordPage() {
    return keywordPagingState.enabled && keywordPagingState.hasMore;
}

function mergeSongsWithoutDuplicates(baseSongs, incomingSongs) {
    const dedup = new Set(baseSongs.map(song => `${song.platform || song.source}:${song.id}`));
    const merged = [...baseSongs];
    incomingSongs.forEach(song => {
        const key = `${song.platform || song.source}:${song.id}`;
        if (dedup.has(key)) return;
        dedup.add(key);
        merged.push(song);
    });
    return merged;
}

async function loadNextKeywordPage() {
    if (!keywordPagingState.enabled) return false;
    if (!keywordPagingState.hasMore) return false;
    if (keywordPagingState.loading) return false;

    keywordPagingState.loading = true;
    try {
        const nextPage = keywordPagingState.page + 1;
        const result = await searchSongsByKeyword(
            keywordPagingState.keyword,
            keywordPagingState.platform,
            {
                page: nextPage,
                limit: keywordPagingState.limit,
                provider: keywordPagingState.provider
            }
        );
        const songs = Array.isArray(result?.songs) ? result.songs : [];

        keywordPagingState.page = nextPage;
        if (songs.length < keywordPagingState.limit) {
            keywordPagingState.hasMore = false;
        }
        if (songs.length === 0) {
            return false;
        }

        const before = allSongs.length;
        allSongs = mergeSongsWithoutDuplicates(allSongs, songs);
        if (allSongs.length === before) {
            return false;
        }
        return true;
    } catch (error) {
        showToast(error?.message || '加载下一页失败', 'error');
        return false;
    } finally {
        keywordPagingState.loading = false;
    }
}

function getSongByIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= allSongs.length) return null;
    return allSongs[index] || null;
}

async function fetchBackupPicUrl(song) {
    if (!song || song.dataSource !== 'backup') return '';
    const picId = String(song?.backup?.picId || '').trim();
    if (!picId) return '';
    const cacheKey = backupPicCacheKey(song);
    if (backupPicCache.has(cacheKey)) {
        return backupPicCache.get(cacheKey);
    }

    const backupSource = String(song?.backup?.source || '').trim();
    if (!backupSource) return '';
    const data = await callBackupApi({
        types: 'pic',
        source: backupSource,
        id: picId,
        size: 500
    }, {
        timeoutMs: 12000,
        retries: 1,
        retryDelayMs: 500
    });
    const url = normalizeMediaUrl(data?.url || '');
    if (url) {
        backupPicCache.set(cacheKey, url);
    }
    return url;
}

async function ensureBackupPlayableData(song, quality) {
    if (!song || song.dataSource !== 'backup') {
        throw new Error('备用歌曲数据无效');
    }
    const cacheKey = backupSongDataCacheKey(song, quality);
    if (backupDataCache.has(cacheKey)) {
        return backupDataCache.get(cacheKey);
    }

    const backupSource = String(song?.backup?.source || '').trim();
    const trackId = String(song?.backup?.trackId || song?.id || '').trim();
    const lyricId = String(song?.backup?.lyricId || trackId).trim();
    if (!backupSource || !trackId) {
        throw new Error('备用歌曲参数缺失');
    }

    const br = backupBrFromQuality(quality);
    const [urlData, lyricData, coverUrl] = await Promise.all([
        callBackupApi({
            types: 'url',
            source: backupSource,
            id: trackId,
            br
        }, {
            timeoutMs: 15000,
            retries: 1,
            retryDelayMs: 600
        }),
        callBackupApi({
            types: 'lyric',
            source: backupSource,
            id: lyricId
        }, {
            timeoutMs: 12000,
            retries: 1,
            retryDelayMs: 500
        }).catch(() => ({})),
        fetchBackupPicUrl(song).catch(() => '')
    ]);

    const mediaUrl = normalizeMediaUrl(urlData?.url || '');
    if (!mediaUrl) {
        throw new Error('备用源未返回可播放链接');
    }

    const result = {
        url: mediaUrl,
        lyrics: String(lyricData?.lyric || ''),
        cover: normalizeMediaUrl(coverUrl || song.cover || ''),
        br: Number(urlData?.br || br)
    };
    backupDataCache.set(cacheKey, result);
    return result;
}

async function fetchSongByIdBackup(platform, songId, quality) {
    const primaryPlatform = toPrimaryPlatform(platform);
    const backupSource = toBackupSource(primaryPlatform);
    const id = String(songId || '').trim();
    if (!primaryPlatform || !backupSource || !id) return null;

    const br = backupBrFromQuality(quality);
    const urlData = await callBackupApi({
        types: 'url',
        source: backupSource,
        id,
        br
    }, {
        timeoutMs: 15000,
        retries: 1,
        retryDelayMs: 600
    });
    const mediaUrl = normalizeMediaUrl(urlData?.url || '');
    if (!mediaUrl) return null;

    let song = {
        id,
        name: `ID ${id}`,
        artist: '未知歌手',
        album: '',
        source: primaryPlatform,
        platform: primaryPlatform,
        cover: '',
        dataSource: 'backup',
        backup: {
            source: backupSource,
            trackId: id,
            urlId: id,
            lyricId: id,
            picId: ''
        }
    };

    try {
        const metadataList = await callBackupApi({
            types: 'search',
            source: backupSource,
            name: id,
            count: 8,
            pages: 1
        }, {
            timeoutMs: 12000,
            retries: 1,
            retryDelayMs: 500
        });
        const list = Array.isArray(metadataList) ? metadataList : [];
        const matched = list.find(item => String(item?.id || '') === id) || list[0];
        if (matched) {
            const normalized = normalizeBackupSong(matched, primaryPlatform, backupSource);
            song = {
                ...normalized,
                backup: {
                    ...normalized.backup,
                    trackId: String(normalized?.backup?.trackId || id) || id
                }
            };
        }
    } catch {
        // ignore metadata lookup failures
    }

    const [lyricsData, coverUrl] = await Promise.all([
        callBackupApi({
            types: 'lyric',
            source: backupSource,
            id: String(song?.backup?.lyricId || id)
        }, {
            timeoutMs: 10000,
            retries: 1,
            retryDelayMs: 500
        }).catch(() => ({})),
        fetchBackupPicUrl(song).catch(() => '')
    ]);

    if (coverUrl) {
        song.cover = coverUrl;
    }
    backupDataCache.set(backupSongDataCacheKey(song, quality), {
        url: mediaUrl,
        lyrics: String(lyricsData?.lyric || ''),
        cover: normalizeMediaUrl(coverUrl || ''),
        br: Number(urlData?.br || br)
    });

    return song;
}

async function fetchSongByIdBackup3(platform, songId) {
    const primaryPlatform = toPrimaryPlatform(platform);
    const backup3Source = toBackup3Source(primaryPlatform);
    const id = String(songId || '').trim();
    if (!primaryPlatform || !backup3Source || !id) return null;

    const data = await callBackup3Api({
        input: id,
        filter: 'id',
        type: backup3Source,
        page: 1
    }, {
        timeoutMs: 18000,
        retries: 1,
        retryDelayMs: 650
    });
    const list = Array.isArray(data?.data) ? data.data : [];
    const matched = list.find(item => String(item?.songid ?? item?.id ?? '') === id) || list[0];
    if (!matched) return null;

    const song = normalizeBackup3Song(matched, primaryPlatform, backup3Source);
    const payload = {
        url: normalizeMediaUrl(song?.backup3?.streamUrl || ''),
        lyrics: String(song?.backup3?.lyric || ''),
        cover: normalizeMediaUrl(song?.cover || '')
    };
    if (!payload.url) return null;
    backup3DataCache.set(backup3DataCacheKey(song), payload);
    return song;
}

async function ensureBackup3PlayableData(song) {
    if (!song || song.dataSource !== 'backup3') {
        throw new Error('备用源3歌曲数据无效');
    }
    const cacheKey = backup3DataCacheKey(song);
    if (backup3DataCache.has(cacheKey)) {
        return backup3DataCache.get(cacheKey);
    }

    let url = normalizeMediaUrl(song?.backup3?.streamUrl || '');
    let lyrics = String(song?.backup3?.lyric || '');
    let cover = normalizeMediaUrl(song?.cover || '');

    if (!url) {
        const refreshed = await fetchSongByIdBackup3(song.platform || song.source, song.id).catch(() => null);
        url = normalizeMediaUrl(refreshed?.backup3?.streamUrl || '');
        lyrics = String(refreshed?.backup3?.lyric || lyrics || '');
        cover = normalizeMediaUrl(refreshed?.cover || cover || '');
    }
    if (!url) {
        throw new Error('备用源3未获取到播放链接');
    }

    const result = { url, lyrics, cover };
    backup3DataCache.set(cacheKey, result);
    return result;
}

async function fetchBackup3CoverForPrimarySong(song) {
    const platform = toPrimaryPlatform(song?.platform || song?.source);
    const backup3Source = toBackup3Source(platform);
    const id = String(song?.id || '').trim();
    if (!platform || !backup3Source || !id) return '';

    const coverCacheKey = `backup3-cover:${platform}:${id}`;
    if (backupPicCache.has(coverCacheKey)) {
        return backupPicCache.get(coverCacheKey);
    }

    const pickCover = list => {
        const arr = Array.isArray(list) ? list : [];
        if (!arr.length) return '';
        const exact = arr.find(item => String(item?.songid ?? item?.id ?? '') === id);
        if (exact?.pic) return normalizeMediaUrl(exact.pic);
        const byName = arr.find(item => String(item?.title || '').trim() === String(song?.name || '').trim());
        if (byName?.pic) return normalizeMediaUrl(byName.pic);
        return normalizeMediaUrl(arr[0]?.pic || '');
    };

    let cover = '';
    try {
        const byId = await callBackup3Api({
            input: id,
            filter: 'id',
            type: backup3Source,
            page: 1
        }, {
            timeoutMs: 12000,
            retries: 1,
            retryDelayMs: 500
        });
        cover = pickCover(byId?.data);
    } catch {
        // ignore
    }

    if (!cover && song?.name) {
        try {
            const byName = await callBackup3Api({
                input: String(song.name),
                filter: 'name',
                type: backup3Source,
                page: 1
            }, {
                timeoutMs: 12000,
                retries: 1,
                retryDelayMs: 500
            });
            cover = pickCover(byName?.data);
        } catch {
            // ignore
        }
    }

    backupPicCache.set(coverCacheKey, normalizeMediaUrl(cover || ''));
    return normalizeMediaUrl(cover || '');
}

async function fetchBackupCoverForPrimarySong(song) {
    const platform = toPrimaryPlatform(song?.platform || song?.source);
    const backupSource = toBackupSource(platform);
    const id = String(song?.id || '').trim();
    if (!platform || !backupSource || !id) return '';

    const coverCacheKey = `primary-cover:${platform}:${id}`;
    if (backupPicCache.has(coverCacheKey)) {
        return backupPicCache.get(coverCacheKey);
    }

    const pickCandidate = list => {
        const arr = Array.isArray(list) ? list : [];
        if (!arr.length) return null;
        const exactId = arr.find(item => String(item?.id || '') === id);
        if (exactId) return exactId;
        const songName = String(song?.name || '').trim();
        if (songName) {
            const byName = arr.find(item => String(item?.name || '').trim() === songName);
            if (byName) return byName;
        }
        return arr[0];
    };

    let candidate = null;
    try {
        const byId = await callBackupApi({
            types: 'search',
            source: backupSource,
            name: id,
            count: 8,
            pages: 1
        }, {
            timeoutMs: 9000,
            retries: 1,
            retryDelayMs: 450
        });
        candidate = pickCandidate(byId);
    } catch {
        // ignore
    }

    if (!candidate && song?.name) {
        try {
            const byName = await callBackupApi({
                types: 'search',
                source: backupSource,
                name: String(song.name),
                count: 8,
                pages: 1
            }, {
                timeoutMs: 9000,
                retries: 1,
                retryDelayMs: 450
            });
            candidate = pickCandidate(byName);
        } catch {
            // ignore
        }
    }

    if (!candidate) {
        backupPicCache.set(coverCacheKey, '');
        return '';
    }

    const backupSong = normalizeBackupSong(candidate, platform, backupSource);
    const coverUrl = await fetchBackupPicUrl(backupSong).catch(() => '');
    backupPicCache.set(coverCacheKey, normalizeMediaUrl(coverUrl || ''));
    return normalizeMediaUrl(coverUrl || '');
}

async function fetchPlaylistSongsPrimary(platform, playlistId) {
    const result = await callPlatformMethod(platform, 'playlist', {
        id: playlistId
    }, {
        timeoutMs: 15000,
        retries: 1,
        retryDelayMs: 600
    });

    const list = Array.isArray(result?.list) ? result.list : [];
    return list.map(song => ({
        id: String(song.id || ''),
        name: song.name || '未知歌曲',
        artist: song.artist || '未知歌手',
        album: song.album || '',
        source: platform,
        platform,
        cover: normalizeMediaUrl(song.cover || ''),
        dataSource: 'primary',
        backup: null
    }));
}

async function fetchPlaylistSongsBackup(platform, playlistId) {
    const primaryPlatform = toPrimaryPlatform(platform);
    const backupSource = toBackupSource(primaryPlatform);
    if (!primaryPlatform || !backupSource) return [];

    const queryAlbum = async () => {
        const data = await callBackupApi({
            types: 'search',
            source: `${backupSource}_album`,
            name: playlistId,
            count: 200,
            pages: 1
        }, {
            timeoutMs: 15000,
            retries: 1,
            retryDelayMs: 600
        });
        return Array.isArray(data) ? data : [];
    };

    const querySearch = async () => {
        const data = await callBackupApi({
            types: 'search',
            source: backupSource,
            name: playlistId,
            count: 100,
            pages: 1
        }, {
            timeoutMs: 15000,
            retries: 1,
            retryDelayMs: 600
        });
        return Array.isArray(data) ? data : [];
    };

    let items = [];
    try {
        items = await queryAlbum();
    } catch {
        items = [];
    }
    if (!items.length) {
        try {
            items = await querySearch();
        } catch {
            items = [];
        }
    }
    return items
        .filter(item => item && item.id)
        .map(item => normalizeBackupSong(item, primaryPlatform, backupSource));
}

async function fetchPlaylistSongs(platform, playlistId, options = {}) {
    const silentFallback = Boolean(options.silentFallback);
    let primarySongs = [];
    let primaryError = null;
    try {
        primarySongs = await fetchPlaylistSongsPrimary(platform, playlistId);
    } catch (error) {
        primaryError = error;
    }

    if (!primaryError && primarySongs.length > 0) {
        return primarySongs;
    }

    try {
        const backupSongs = await fetchPlaylistSongsBackup(platform, playlistId);
        if (backupSongs.length > 0) {
            if (!silentFallback) {
                showToast(primaryError ? '主歌单接口异常，已自动切换备用源' : '主歌单无结果，已自动切换备用源', 'info');
            }
            return backupSongs;
        }
    } catch (backupError) {
        if (primaryError) {
            throw primaryError;
        }
        throw backupError;
    }

    if (primaryError) {
        throw primaryError;
    }
    return [];
}

// 搜索
async function search() {
    const input = document.getElementById('searchInput').value.trim();
    if (!input) return;

    const searchMode = document.getElementById('searchMode').value;
    const platform = document.getElementById('platform').value;
    const quality = document.getElementById('quality').value;
    const resultsDiv = document.getElementById('results');

    resultsDiv.innerHTML = '<div class="empty-state">検索中...</div>';

    try {
        currentSearchParams = null;
        resetKeywordPagingState();

        if (searchMode === 'keyword') {
            if (currentSearchType === 'playlist') {
                resultsDiv.innerHTML = '<div class="empty-state">TuneHub V3 暂不支持关键词歌单搜索，请切换 ID 模式</div>';
                return;
            }

            const { songs, provider } = await searchSongsByKeyword(input, platform, {
                page: 1,
                limit: searchApiLimit
            });
            if (songs.length > 0) {
                enableKeywordPaging(input, platform, songs.length, provider);
                displaySongsWithPagination(songs);
            } else {
                resultsDiv.innerHTML = `<div class="empty-state">${platformDisplayName(platform)}没有结果，请切换其他平台检索</div>`;
            }
            return;
        }

        if (currentSearchType === 'song') {
            let parseResp = null;
            try {
                parseResp = await parseSongs(platform, input, quality);
            } catch (parseError) {
                parseResp = null;
            }

            const parsedItems = parseResp ? normalizeParsedItems(platform, quality, parseResp) : [];
            const successSongs = parsedItems
                .filter(item => item.success)
                .map(item => toSongFromParsedItem(platform, item));

            if (successSongs.length > 0) {
                displaySongsWithPagination(successSongs);
                return;
            }

            const backupSong = await fetchSongByIdBackup(platform, input, quality).catch(() => null);
            if (backupSong) {
                showToast('主解析无结果，已自动切换备用源', 'info');
                displaySongsWithPagination([backupSong]);
                return;
            }

            const backup3Song = await fetchSongByIdBackup3(platform, input).catch(() => null);
            if (backup3Song) {
                showToast('主解析/备用源无结果，已切换第3层备用源', 'info');
                displaySongsWithPagination([backup3Song]);
                return;
            }

            const firstError = parsedItems.find(item => !item.success);
            resultsDiv.innerHTML = `<div class="empty-state">${localizeErrorMessage(firstError?.error, '解析失败')}</div>`;
        } else {
            const songs = await fetchPlaylistSongs(platform, input);
            if (songs.length > 0) {
                displaySongsWithPagination(songs);
            } else {
                resultsDiv.innerHTML = '<div class="empty-state">未找到歌单歌曲</div>';
            }
        }
    } catch (error) {
        resultsDiv.innerHTML = `<div class="empty-state">${localizeErrorMessage(error?.message, '搜索失败')}</div>`;
    }
}

// 显示歌曲列表（带前端分页）
function displaySongsWithPagination(songs) {
    allSongs = songs;
    currentPage = 1;
    renderLocalPage();
}

function renderLocalPage() {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageSongs = allSongs.slice(start, end);
    const totalPages = Math.ceil(allSongs.length / pageSize);

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = pageSongs.map((song, index) => {
        const globalIndex = start + index;
        const platform = song.platform || song.source;
        const safeName = escapeForSingleQuote(song.name);
        const safeArtist = escapeForSingleQuote(song.artist);
        const safeAlbum = escapeForSingleQuote(song.album || '');
        const safeCover = escapeForSingleQuote(song.cover || '');
        const coverUrl = getProxiedCoverUrl(song.cover || '');
        const coverStyle = coverUrl ? 'display:block' : 'display:none';

        return `
        <div class="result-item" id="song-${globalIndex}">
            <div class="song-header">
                <div>
                    <img class="song-cover" id="cover-${globalIndex}" src="${coverUrl}" style="${coverStyle}" alt="" onerror="this.style.display='none'" onload="if(this.src){this.style.display='block'}">
                    <div class="song-info">
                        <h3>${song.name}<span class="platform-badge">${platformNames[platform] || platform}</span></h3>
                        <p>${song.artist}</p>
                    </div>
                </div>
                <div>
                    <button class="play-btn-item" data-index="${globalIndex}" onclick="playSong('${platform}', '${song.id}', '${safeName}', '${safeArtist}', ${globalIndex})">▶</button>
                    <button class="add-playlist-btn" onclick="addSongToPlaylist('${platform}', '${song.id}', '${safeName}', '${safeArtist}', '${safeAlbum}', '${safeCover}', ${globalIndex})">＋</button>
                    <button onclick="downloadSong('${platform}', '${song.id}', '${safeName}', '${safeArtist}', ${globalIndex})">下载</button>
                </div>
            </div>
            <div class="inline-lyrics" id="inline-lyrics-${globalIndex}"></div>
            <div class="inline-player" id="player-${globalIndex}" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-${globalIndex}"></div>
                </div>
                <span class="time" id="time-${globalIndex}">0:00 / 0:00</span>
            </div>
        </div>
    `;
    }).join('');

    if (totalPages > 1 || canLoadMoreKeywordPage()) {
        const atEnd = currentPage === totalPages;
        const canTryLoadMore = keywordPagingState.enabled && keywordPagingState.hasMore;
        const nextDisabled = keywordPagingState.loading
            ? 'disabled'
            : (atEnd ? (canTryLoadMore ? '' : 'disabled') : '');
        const nextText = keywordPagingState.loading
            ? '加载中...'
            : (atEnd && canTryLoadMore ? '下一页(加载)' : '下一页');
        resultsDiv.innerHTML += `
            <div class="pagination">
                <button onclick="changeLocalPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
                <span>第 ${currentPage} / ${totalPages} 页</span>
                <button onclick="changeLocalPage(${currentPage + 1})" ${nextDisabled}>${nextText}</button>
            </div>
        `;
    }

    // 某些平台搜索接口不返回封面，当前页按需补全。
    hydrateMissingCovers(pageSongs, start);
    syncInlinePlayButtonState();
}

async function changeLocalPage(page) {
    const totalPages = Math.ceil(allSongs.length / pageSize);
    if (page < 1) return;

    if (page > totalPages) {
        if (!keywordPagingState.enabled || !keywordPagingState.hasMore) return;
        renderLocalPage();
        const loaded = await loadNextKeywordPage();
        if (loaded) {
            currentPage = page;
            renderLocalPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        keywordPagingState.hasMore = false;
        showToast('没有更多结果了', 'info');
        renderLocalPage();
        return;
    }

    currentPage = page;
    renderLocalPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hydrateMissingCovers(pageSongs, startIndex) {
    pageSongs.forEach(async (song, index) => {
        if (song.cover) return;
        const platform = song.platform || song.source;
        if (!platform || !song.id) return;

        const setCover = coverUrl => {
            if (!coverUrl) return;
            song.cover = coverUrl;
            const globalIndex = startIndex + index;
            const coverImg = document.getElementById(`cover-${globalIndex}`);
            if (coverImg) {
                coverImg.src = getProxiedCoverUrl(coverUrl);
                coverImg.style.display = 'block';
            }
        };

        if (song.dataSource === 'backup') {
            if (isBackupTemporarilyBlocked()) return;
            try {
                const coverUrl = await fetchBackupPicUrl(song);
                if (coverUrl) {
                    setCover(coverUrl);
                }
            } catch {
                // ignore backup cover errors
            }
            return;
        }

        if (song.dataSource === 'backup3') {
            if (song?.backup3?.streamUrl) {
                setCover(normalizeMediaUrl(song.cover || ''));
                return;
            }
            try {
                const refreshed = await fetchSongByIdBackup3(platform, song.id);
                const coverUrl = normalizeMediaUrl(refreshed?.cover || '');
                if (coverUrl) {
                    setCover(coverUrl);
                }
            } catch {
                // ignore backup3 cover errors
            }
            return;
        }

        // 不消耗积分的补全方式：网易云优先读取公开 H5 元数据。
        if (platform === 'netease') {
            try {
                const meta = await fetchSongMeta(platform, song.id);
                const coverUrl = normalizeMediaUrl(meta.cover || '');
                if (coverUrl) {
                    setCover(coverUrl);
                    return;
                }
            } catch {
                // ignore free metadata errors
            }
        }

        // 主源无封面时，先尝试备用源2（GD）补封面，若不可用再尝试备用源3。
        if (!isBackupTemporarilyBlocked()) {
            try {
                const backupCover = await fetchBackupCoverForPrimarySong(song);
                if (backupCover) {
                    setCover(backupCover);
                    return;
                }
            } catch {
                // ignore backup cover errors
            }
        }

        // 第二备用（musicjx）补封面。
        try {
            const backup3Cover = await fetchBackup3CoverForPrimarySong(song);
            if (backup3Cover) {
                setCover(backup3Cover);
            }
        } catch {
            // ignore backup3 cover errors
        }
    });
}

// 下载单曲
async function downloadSong(source, id, name, artist, index = null, songObj = null) {
    try {
        const quality = document.getElementById('quality').value;
        const runtimeSong = songObj || getSongByIndex(Number(index));
        let mediaUrl = '';
        if (runtimeSong?.dataSource === 'backup') {
            const backupData = await ensureBackupPlayableData(runtimeSong, quality);
            mediaUrl = normalizeMediaUrl(backupData.url || '');
            if (!mediaUrl) {
                throw new Error('备用源未获取到下载链接');
            }
        } else if (runtimeSong?.dataSource === 'backup3') {
            const backup3Data = await ensureBackup3PlayableData(runtimeSong);
            mediaUrl = normalizeMediaUrl(backup3Data.url || '');
            if (!mediaUrl) {
                throw new Error('备用源3未获取到下载链接');
            }
        } else {
            const parsed = await ensureParsedSong(source, id, quality);
            mediaUrl = normalizeMediaUrl(parsed?.url || '');
            if (!mediaUrl) {
                throw new Error(localizeErrorMessage(parsed?.error, '未获取到下载链接'));
            }
        }
        const url = buildMediaProxyUrl(mediaUrl, {
            download: true,
            filename: buildDownloadFilename(name, artist)
        });
        if (!url) {
            throw new Error('下载链接无效');
        }
        window.open(url, '_blank');
    } catch (error) {
        showToast(`下载失败: ${error.message || '未知错误'}`, 'error');
    }
}

// 下载歌单
async function downloadPlaylist(source, id, name) {
    try {
        const songs = await fetchPlaylistSongs(source, id, { silentFallback: true });
        if (songs.length === 0) {
            showToast('获取歌单失败或为空', 'error');
            return;
        }

        const total = songs.length;
        showToast(`开始下载歌单，共${total}首`, 'info');

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            showToast(`正在下载 ${i + 1}/${total}: ${song.name}`, 'info');
            await downloadSong(source, song.id, song.name, song.artist, null, song);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        showToast('歌单下载完成', 'success');
    } catch (error) {
        showToast(`下载歌单失败: ${error.message || '未知错误'}`, 'error');
    }
}

function resetInlinePlaybackUi(keepIndex = null) {
    if (currentPlayingIndex === null) return;
    if (keepIndex !== null && currentPlayingIndex === keepIndex) return;
    const oldBtn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
    const oldPlayer = document.getElementById(`player-${currentPlayingIndex}`);
    const oldInlineLyrics = document.getElementById(`inline-lyrics-${currentPlayingIndex}`);
    if (oldBtn) oldBtn.textContent = '▶';
    if (oldPlayer) oldPlayer.style.display = 'none';
    if (oldInlineLyrics) oldInlineLyrics.textContent = '';
}

function syncInlinePlayButtonState() {
    document.querySelectorAll('.play-btn-item').forEach(btn => {
        btn.textContent = '▶';
    });
    if (currentPlayingIndex !== null && !audio.paused) {
        const activeBtn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
        if (activeBtn) activeBtn.textContent = '⏸';
    }
}

function isSameSong(source, id) {
    return Boolean(
        currentPlayingSong &&
        String(currentPlayingSong.platform || '') === String(source || '') &&
        String(currentPlayingSong.id || '') === String(id || '')
    );
}

function normalizeSongDataSource(raw) {
    const value = String(raw || '').trim();
    return (value === 'backup' || value === 'backup3') ? value : 'primary';
}

function bindSongMeta(song) {
    const dataSource = normalizeSongDataSource(song?.dataSource);
    currentPlayingSong = {
        id: String(song.id || ''),
        name: String(song.name || '未知歌曲'),
        artist: String(song.artist || '未知歌手'),
        platform: String(song.platform || song.source || ''),
        cover: String(song.cover || ''),
        lyricsRaw: String(song.lyricsRaw || ''),
        lyrics: Array.isArray(song.lyrics) ? song.lyrics : [],
        dataSource,
        backup: song?.backup && typeof song.backup === 'object'
            ? {
                source: String(song.backup.source || ''),
                trackId: String(song.backup.trackId || ''),
                urlId: String(song.backup.urlId || ''),
                lyricId: String(song.backup.lyricId || ''),
                picId: String(song.backup.picId || '')
            }
            : null,
        backup3: song?.backup3 && typeof song.backup3 === 'object'
            ? {
                source: String(song.backup3.source || ''),
                trackId: String(song.backup3.trackId || ''),
                streamUrl: String(song.backup3.streamUrl || ''),
                lyric: String(song.backup3.lyric || ''),
                link: String(song.backup3.link || '')
            }
            : null
    };
    currentLyrics = currentPlayingSong.lyrics;
    updateFullPlayerMeta();
}

async function playSongCore(source, id, name, artist, options = {}) {
    const quality = document.getElementById('quality').value;
    const inlineIndex = Number.isInteger(options.inlineIndex) ? options.inlineIndex : null;
    const runtimeSong = options.song || (inlineIndex !== null ? getSongByIndex(inlineIndex) : null);
    const btn = inlineIndex !== null ? document.querySelector(`button[data-index="${inlineIndex}"]`) : null;
    const player = inlineIndex !== null ? document.getElementById(`player-${inlineIndex}`) : null;
    const inlineLyrics = inlineIndex !== null ? document.getElementById(`inline-lyrics-${inlineIndex}`) : null;
    let resumeTime = 0;

    if (isSameSong(source, id) && !audio.paused) {
        audio.pause();
        syncInlinePlayButtonState();
        updateFullPlayerControlState();
        return;
    }

    if (isSameSong(source, id) && audio.paused && audio.src) {
        resumeTime = Number(audio.currentTime || 0);
        try {
            await audio.play();
            if (inlineIndex !== null && player) player.style.display = 'flex';
            if (inlineIndex !== null) currentPlayingIndex = inlineIndex;
            syncInlinePlayButtonState();
            updateFullPlayerControlState();
            return;
        } catch {
            // fallback re-parse
        }
    }

    const playRequestId = ++activePlayRequestId;
    if (btn) btn.disabled = true;

    try {
        const dataSource = normalizeSongDataSource(runtimeSong?.dataSource);
        const isBackupSong = dataSource === 'backup';
        const isBackup3Song = dataSource === 'backup3';
        let mediaUrl = '';
        let rawCover = '';
        let lyricsRaw = '';
        let backupMeta = null;
        let backup3Meta = null;
        let songPlatform = source;

        if (isBackupSong) {
            const backupData = await ensureBackupPlayableData(runtimeSong, quality);
            if (playRequestId !== activePlayRequestId) return;
            mediaUrl = normalizeMediaUrl(backupData.url || '');
            if (!mediaUrl) {
                throw new Error('备用源未获取到播放链接');
            }
            rawCover = normalizeMediaUrl(runtimeSong.cover || backupData.cover || options.cover || '');
            lyricsRaw = String(backupData.lyrics || '');
            songPlatform = String(runtimeSong.platform || runtimeSong.source || source);
            backupMeta = runtimeSong.backup || null;
        } else if (isBackup3Song) {
            const backup3Data = await ensureBackup3PlayableData(runtimeSong);
            if (playRequestId !== activePlayRequestId) return;
            mediaUrl = normalizeMediaUrl(backup3Data.url || '');
            if (!mediaUrl) {
                throw new Error('备用源3未获取到播放链接');
            }
            rawCover = normalizeMediaUrl(runtimeSong.cover || backup3Data.cover || options.cover || '');
            lyricsRaw = String(backup3Data.lyrics || '');
            songPlatform = String(runtimeSong.platform || runtimeSong.source || source);
            backup3Meta = runtimeSong.backup3 || null;
        } else {
            const parsed = await ensureParsedSong(source, id, quality);
            if (playRequestId !== activePlayRequestId) return;
            mediaUrl = normalizeMediaUrl(parsed?.url || '');
            if (!mediaUrl) {
                throw new Error(localizeErrorMessage(parsed?.error, '未获取到播放链接'));
            }
            rawCover = normalizeMediaUrl(parsed.cover || parsed.pic || parsed?.info?.pic || options.cover || '');
            lyricsRaw = String(parsed.lyrics || '');
        }

        resetInlinePlaybackUi(inlineIndex);

        const parsedCoverUrl = getProxiedCoverUrl(rawCover);
        if (parsedCoverUrl && inlineIndex !== null) {
            const coverImg = document.getElementById(`cover-${inlineIndex}`);
            if (coverImg) {
                coverImg.src = parsedCoverUrl;
                coverImg.style.display = 'block';
            }
        }

        const parsedLyrics = parseLyrics(lyricsRaw);
        if (inlineLyrics) {
            inlineLyrics.textContent = parsedLyrics.length > 0 ? parsedLyrics[0].text : '';
        }

        const playUrl = buildMediaProxyUrl(mediaUrl);
        if (!playUrl) {
            throw new Error('播放链接无效');
        }

        if (resumeTime > 0) {
            audio.addEventListener('loadedmetadata', function seekToResumePosition() {
                try {
                    const maxSeek = Number.isFinite(audio.duration) && audio.duration > 0
                        ? Math.max(audio.duration - 0.3, 0)
                        : resumeTime;
                    audio.currentTime = Math.min(resumeTime, maxSeek);
                } catch {
                    // ignore seek errors
                }
            }, { once: true });
        }

        bindSongMeta({
            id,
            name,
            artist,
            platform: songPlatform,
            cover: rawCover,
            lyricsRaw,
            lyrics: parsedLyrics,
            dataSource: isBackupSong ? 'backup' : (isBackup3Song ? 'backup3' : 'primary'),
            backup: backupMeta,
            backup3: backup3Meta
        });

        audio.src = playUrl;
        currentPlayingIndex = inlineIndex;
        if (player) {
            player.style.display = 'flex';
        }

        await audio.play();
        syncInlinePlayButtonState();
        updateFullPlayerControlState();
    } catch (error) {
        if (playRequestId === activePlayRequestId) {
            showToast(`播放失败: ${error.message || '未知错误'}`, 'error');
            syncInlinePlayButtonState();
            updateFullPlayerControlState();
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

// 播放歌曲
async function playSong(source, id, name, artist, index) {
    const runtimeSong = getSongByIndex(Number(index));
    const queueIndex = findPlaylistIndex(source, id);
    currentPlaylistIndex = queueIndex;
    renderPlaylistSheet();
    await playSongCore(source, id, name, artist, {
        inlineIndex: index,
        song: runtimeSong
    });
}

// 解析LRC歌词
function parseLyrics(lrcText) {
    const lines = String(lrcText || '').split('\n');
    const lyrics = [];

    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (!match) return;

        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        const text = match[4].trim();

        if (text) {
            lyrics.push({ time, text });
        }
    });

    return lyrics.sort((a, b) => a.time - b.time);
}

audio.addEventListener('timeupdate', () => {
    updateFullPlayerProgress();
    updateFullPlayerLyric(audio.currentTime);
    if (currentPlayingIndex === null) return;

    const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    const progressFill = document.getElementById(`progress-${currentPlayingIndex}`);
    const timeDisplay = document.getElementById(`time-${currentPlayingIndex}`);

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (timeDisplay) {
        const current = formatTime(audio.currentTime);
        const total = formatTime(audio.duration);
        timeDisplay.textContent = `${current} / ${total}`;
    }

    updateLyrics(audio.currentTime);
});

function updateLyrics(currentTime) {
    if (currentLyrics.length === 0 || currentPlayingIndex === null) return;

    let activeIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (currentTime >= currentLyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    if (activeIndex >= 0) {
        const inlineLyrics = document.getElementById(`inline-lyrics-${currentPlayingIndex}`);
        if (inlineLyrics) {
            inlineLyrics.textContent = currentLyrics[activeIndex].text;
        }
    }
}

audio.addEventListener('ended', () => {
    syncInlinePlayButtonState();
    updateFullPlayerControlState();
    playByMode(1, { fromEnded: true }).catch(() => {});
});

audio.addEventListener('play', () => {
    syncInlinePlayButtonState();
    updateFullPlayerControlState();
});

audio.addEventListener('pause', () => {
    syncInlinePlayButtonState();
    updateFullPlayerControlState();
});

audio.addEventListener('loadedmetadata', () => {
    updateFullPlayerProgress();
});

document.addEventListener('click', e => {
    if (e.target.closest('.progress-bar') && currentPlayingIndex !== null) {
        const progressBar = e.target.closest('.progress-bar');
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    }
});

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function loadPlayModeFromStorage() {
    try {
        const mode = String(localStorage.getItem(playModeStorageKey) || '').trim();
        if (PLAY_MODES.includes(mode)) return mode;
    } catch {
        // ignore storage failures
    }
    return 'list';
}

function savePlayModeToStorage() {
    try {
        localStorage.setItem(playModeStorageKey, currentPlayMode);
    } catch {
        // ignore storage failures
    }
}

function updatePlayModeButtonState() {
    const labelEl = document.getElementById('fullPlayerModeLabel');
    const btnEl = document.getElementById('fullPlayerModeBtn');
    const text = PLAY_MODE_TEXT[currentPlayMode] || PLAY_MODE_TEXT.list;
    if (labelEl) labelEl.textContent = text;
    if (btnEl) {
        const label = `播放模式：${text}`;
        btnEl.title = label;
        btnEl.setAttribute('aria-label', label);
    }
}

function cyclePlayMode() {
    const index = PLAY_MODES.indexOf(currentPlayMode);
    const next = PLAY_MODES[(index + 1) % PLAY_MODES.length];
    currentPlayMode = next;
    savePlayModeToStorage();
    updatePlayModeButtonState();
    showToast(`播放模式：${PLAY_MODE_TEXT[next]}`, 'info');
}

function loadPlaylistFromStorage() {
    try {
        const raw = localStorage.getItem(playlistStorageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(item => item && item.id && item.platform)
            .map(item => ({
                id: String(item.id),
                name: String(item.name || '未知歌曲'),
                artist: String(item.artist || '未知歌手'),
                album: String(item.album || ''),
                platform: String(item.platform || ''),
                source: String(item.platform || ''),
                cover: normalizeMediaUrl(item.cover || ''),
                dataSource: normalizeSongDataSource(item.dataSource),
                backup: item?.backup && typeof item.backup === 'object'
                    ? {
                        source: String(item.backup.source || ''),
                        trackId: String(item.backup.trackId || ''),
                        urlId: String(item.backup.urlId || ''),
                        lyricId: String(item.backup.lyricId || ''),
                        picId: String(item.backup.picId || '')
                    }
                    : null,
                backup3: item?.backup3 && typeof item.backup3 === 'object'
                    ? {
                        source: String(item.backup3.source || ''),
                        trackId: String(item.backup3.trackId || ''),
                        streamUrl: String(item.backup3.streamUrl || ''),
                        lyric: String(item.backup3.lyric || ''),
                        link: String(item.backup3.link || '')
                    }
                    : null
            }));
    } catch {
        return [];
    }
}

function savePlaylistToStorage() {
    try {
        localStorage.setItem(playlistStorageKey, JSON.stringify(playlistSongs));
    } catch {
        // ignore storage errors
    }
}

function findPlaylistIndex(source, id) {
    return playlistSongs.findIndex(item =>
        String(item.platform || item.source) === String(source) &&
        String(item.id) === String(id)
    );
}

function renderPlaylistSheet() {
    const listEl = document.getElementById('playlistSheetList');
    if (!listEl) return;

    if (playlistSongs.length === 0) {
        listEl.innerHTML = '<div class="playlist-empty">播放列表为空，搜索后点击 ＋ 添加歌曲</div>';
        return;
    }

    listEl.innerHTML = playlistSongs.map((song, index) => {
        const active = currentPlaylistIndex === index ? ' active' : '';
        const cover = getProxiedCoverUrl(song.cover || '');
        const platform = platformDisplayName(song.platform || song.source);
        return `
            <div class="playlist-item${active}" data-index="${index}">
                <img class="playlist-item-cover" src="${cover}" alt="" onerror="this.style.visibility='hidden'">
                <div class="playlist-item-meta">
                    <h4>${song.name}</h4>
                    <p>${song.artist} · ${platform}</p>
                </div>
                <div class="playlist-item-actions">
                    <button type="button" data-action="play" data-index="${index}">播放</button>
                    <button type="button" data-action="remove" data-index="${index}" class="ghost-btn">移除</button>
                </div>
            </div>
        `;
    }).join('');
}

function setPlaylistSheetOpen(open) {
    const sheet = document.getElementById('playlistSheet');
    const panel = sheet ? sheet.querySelector('.playlist-sheet-panel') : null;
    if (!sheet) return;

    if (playlistSheetHideTimer) {
        clearTimeout(playlistSheetHideTimer);
        playlistSheetHideTimer = null;
    }

    if (open) {
        isPlaylistSheetOpen = true;
        sheet.style.display = '';
        sheet.classList.add('visible');
        // Force layout so transition always starts from hidden state.
        void sheet.offsetHeight;
        requestAnimationFrame(() => {
            sheet.classList.add('open');
        });
        renderPlaylistSheet();
        return;
    }

    isPlaylistSheetOpen = false;
    sheet.classList.remove('open');
    const finishHide = () => {
        if (isPlaylistSheetOpen) return;
        sheet.classList.remove('visible');
        sheet.style.display = 'none';
    };
    if (panel) {
        panel.addEventListener('transitionend', function onEnd(e) {
            if (e.target !== panel) return;
            panel.removeEventListener('transitionend', onEnd);
            finishHide();
        });
    }
    playlistSheetHideTimer = setTimeout(finishHide, 340);
}

function setFullPlayerOpen(open) {
    const overlay = document.getElementById('fullPlayerOverlay');
    if (!overlay) return;
    const playerFabBtn = document.getElementById('playerFabBtn');

    const updateOrigin = () => {
        if (!playerFabBtn) return;
        const rect = playerFabBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        overlay.style.setProperty('--fp-origin-x', `${x}px`);
        overlay.style.setProperty('--fp-origin-y', `${y}px`);
    };

    if (fullPlayerHideTimer) {
        clearTimeout(fullPlayerHideTimer);
        fullPlayerHideTimer = null;
    }

    if (open) {
        isFullPlayerOpen = true;
        updateOrigin();
        updateBrowserFullscreenButtonState();
        overlay.style.display = '';
        overlay.classList.add('visible');
        void overlay.offsetHeight;
        requestAnimationFrame(() => {
            overlay.classList.add('open');
        });
        refreshFullscreenIdleState();
        return;
    }

    isFullPlayerOpen = false;
    clearFullscreenIdleTimer();
    setFullscreenControlsHidden(false);
    if (isBrowserFullscreenActive()) {
        exitBrowserFullscreen().catch(() => {}).finally(() => {
            updateBrowserFullscreenButtonState();
        });
    }
    updateOrigin();
    overlay.classList.remove('open');
    const shell = overlay.querySelector('.full-player-shell');
    const finishHide = () => {
        if (isFullPlayerOpen) return;
        overlay.classList.remove('visible');
        overlay.style.display = 'none';
    };
    if (shell) {
        shell.addEventListener('transitionend', function onEnd(e) {
            if (e.target !== shell) return;
            shell.removeEventListener('transitionend', onEnd);
            finishHide();
        });
    }
    fullPlayerHideTimer = setTimeout(finishHide, 420);
}

function clearFullscreenIdleTimer() {
    if (!fullPlayerFullscreenIdleTimer) return;
    clearTimeout(fullPlayerFullscreenIdleTimer);
    fullPlayerFullscreenIdleTimer = null;
}

function setFullscreenControlsHidden(hidden) {
    const overlay = document.getElementById('fullPlayerOverlay');
    if (!overlay) return;
    overlay.classList.toggle('fs-idle', Boolean(hidden));
}

function refreshFullscreenIdleState(options = {}) {
    const { bumpTimer = true } = options;
    if (!isFullPlayerOpen || !isBrowserFullscreenActive()) {
        clearFullscreenIdleTimer();
        setFullscreenControlsHidden(false);
        return;
    }

    setFullscreenControlsHidden(false);
    if (!bumpTimer) return;
    clearFullscreenIdleTimer();
    fullPlayerFullscreenIdleTimer = setTimeout(() => {
        if (isFullPlayerOpen && isBrowserFullscreenActive()) {
            setFullscreenControlsHidden(true);
        }
    }, FULL_PLAYER_IDLE_MS);
}

function onFullscreenUserActivity() {
    refreshFullscreenIdleState({ bumpTimer: true });
}

function isBrowserFullscreenActive() {
    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
}

async function requestBrowserFullscreen() {
    const target = document.documentElement;
    if (!target) throw new Error('当前页面不支持真全屏');
    const fn = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
    if (!fn) throw new Error('当前浏览器不支持真全屏');
    const result = fn.call(target);
    if (result && typeof result.then === 'function') {
        await result;
    }
}

async function exitBrowserFullscreen() {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (!fn) return;
    const result = fn.call(document);
    if (result && typeof result.then === 'function') {
        await result;
    }
}

async function toggleBrowserFullscreen() {
    try {
        if (isBrowserFullscreenActive()) {
            await exitBrowserFullscreen();
        } else {
            await requestBrowserFullscreen();
        }
    } catch (error) {
        showToast(error?.message || '切换真全屏失败', 'error');
    } finally {
        updateBrowserFullscreenButtonState();
    }
}

function updateBrowserFullscreenButtonState() {
    const btn = document.getElementById('fullPlayerBrowserFullscreenBtn');
    const icon = document.getElementById('fullPlayerBrowserFullscreenIcon');
    if (!btn || !icon) return;
    const active = isBrowserFullscreenActive();
    icon.textContent = active ? '⤡' : '⤢';
    const label = active ? '退出真全屏' : '进入真全屏';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    refreshFullscreenIdleState();
}

function updateFullPlayerMeta() {
    const titleEl = document.getElementById('fullPlayerTitle');
    const artistEl = document.getElementById('fullPlayerArtist');
    const coverEl = document.getElementById('fullPlayerCover');
    if (!titleEl || !artistEl || !coverEl) return;

    if (!currentPlayingSong) {
        titleEl.textContent = '未播放';
        artistEl.textContent = '请选择歌曲';
        coverEl.src = '';
        document.getElementById('fullPlayerCurrentLyric').textContent = '点击歌曲开始播放';
        document.getElementById('fullPlayerNextLyric').textContent = '';
        return;
    }

    titleEl.textContent = currentPlayingSong.name || '未知歌曲';
    artistEl.textContent = currentPlayingSong.artist || '未知歌手';
    coverEl.src = getProxiedCoverUrl(currentPlayingSong.cover || '');
    updateFullPlayerLyric(audio.currentTime || 0);
}

function updateFullPlayerControlState() {
    const toggleBtn = document.getElementById('fullPlayerToggleBtn');
    const toggleIcon = document.getElementById('fullPlayerToggleIcon');
    const playerFab = document.getElementById('playerFabBtn');
    const paused = audio.paused;
    if (toggleIcon) {
        toggleIcon.textContent = paused ? '▶' : '⏸';
    }
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-label', paused ? '播放' : '暂停');
    }
    if (playerFab) {
        playerFab.classList.toggle('is-spinning', !paused);
    }
}

function updateFullPlayerProgress() {
    const currentEl = document.getElementById('fullPlayerTimeCurrent');
    const totalEl = document.getElementById('fullPlayerTimeTotal');
    const fillEl = document.getElementById('fullPlayerProgressFill');
    if (!currentEl || !totalEl || !fillEl) return;

    currentEl.textContent = formatTime(audio.currentTime);
    totalEl.textContent = formatTime(audio.duration);
    const ratio = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    fillEl.style.width = `${Math.max(0, Math.min(100, ratio))}%`;
}

function updateFullPlayerLyric(currentTime) {
    const currentLyricEl = document.getElementById('fullPlayerCurrentLyric');
    const nextLyricEl = document.getElementById('fullPlayerNextLyric');
    if (!currentLyricEl || !nextLyricEl) return;

    if (!currentLyrics.length) {
        currentLyricEl.textContent = currentPlayingSong ? (currentPlayingSong.name || '播放中') : '点击歌曲开始播放';
        nextLyricEl.textContent = '';
        return;
    }

    let activeIndex = 0;
    for (let i = 0; i < currentLyrics.length; i += 1) {
        if (currentTime >= currentLyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    currentLyricEl.textContent = currentLyrics[activeIndex]?.text || '';
    nextLyricEl.textContent = currentLyrics[activeIndex + 1]?.text || '';
}

function addSongToPlaylist(source, id, name, artist, album = '', cover = '', index = null) {
    const platform = String(source || '').trim();
    const songId = String(id || '').trim();
    const runtimeSong = getSongByIndex(Number(index));
    if (!platform || !songId) return;
    const exists = findPlaylistIndex(platform, songId);
    if (exists >= 0) {
        showToast('该歌曲已在播放列表中', 'info');
        currentPlaylistIndex = exists;
        renderPlaylistSheet();
        return;
    }

    playlistSongs.push({
        id: songId,
        name: String(name || '未知歌曲'),
        artist: String(artist || '未知歌手'),
        album: String(album || ''),
        platform,
        source: platform,
        cover: normalizeMediaUrl(runtimeSong?.cover || cover || ''),
        dataSource: normalizeSongDataSource(runtimeSong?.dataSource),
        backup: runtimeSong?.backup && typeof runtimeSong.backup === 'object'
            ? {
                source: String(runtimeSong.backup.source || ''),
                trackId: String(runtimeSong.backup.trackId || ''),
                urlId: String(runtimeSong.backup.urlId || ''),
                lyricId: String(runtimeSong.backup.lyricId || ''),
                picId: String(runtimeSong.backup.picId || '')
            }
            : null,
        backup3: runtimeSong?.backup3 && typeof runtimeSong.backup3 === 'object'
            ? {
                source: String(runtimeSong.backup3.source || ''),
                trackId: String(runtimeSong.backup3.trackId || ''),
                streamUrl: String(runtimeSong.backup3.streamUrl || ''),
                lyric: String(runtimeSong.backup3.lyric || ''),
                link: String(runtimeSong.backup3.link || '')
            }
            : null
    });
    savePlaylistToStorage();
    renderPlaylistSheet();
    showToast('已添加到播放列表', 'success');
}

async function playSongFromPlaylist(index) {
    const item = playlistSongs[index];
    if (!item) return;
    currentPlaylistIndex = index;
    renderPlaylistSheet();
    await playSongCore(item.platform || item.source, item.id, item.name, item.artist, {
        inlineIndex: null,
        cover: item.cover,
        song: item
    });
}

function removeSongFromPlaylist(index) {
    if (index < 0 || index >= playlistSongs.length) return;
    playlistSongs.splice(index, 1);
    if (currentPlaylistIndex === index) {
        currentPlaylistIndex = -1;
    } else if (currentPlaylistIndex > index) {
        currentPlaylistIndex -= 1;
    }
    savePlaylistToStorage();
    renderPlaylistSheet();
}

async function playNextInPlaylist(step) {
    if (!playlistSongs.length) {
        showToast('播放列表为空', 'info');
        return;
    }
    if (currentPlaylistIndex < 0) {
        showToast('当前歌曲不在播放列表中', 'info');
        return;
    }
    const nextIndex = currentPlaylistIndex + step;
    if (nextIndex < 0 || nextIndex >= playlistSongs.length) {
        showToast('已经到边界了', 'info');
        return;
    }
    await playSongFromPlaylist(nextIndex);
}

function resolveCurrentPlaylistIndex() {
    if (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlistSongs.length) {
        return currentPlaylistIndex;
    }
    if (!currentPlayingSong) return -1;
    return findPlaylistIndex(currentPlayingSong.platform || currentPlayingSong.source, currentPlayingSong.id);
}

function pickRandomPlaylistIndex(currentIndex) {
    if (!playlistSongs.length) return -1;
    if (playlistSongs.length === 1) return 0;

    let nextIndex = currentIndex;
    for (let i = 0; i < 8 && nextIndex === currentIndex; i += 1) {
        nextIndex = Math.floor(Math.random() * playlistSongs.length);
    }
    if (nextIndex === currentIndex) {
        nextIndex = (currentIndex + 1) % playlistSongs.length;
    }
    return nextIndex;
}

async function replayCurrentTrack() {
    if (!audio.src) return;
    audio.currentTime = 0;
    try {
        await audio.play();
    } catch (error) {
        showToast(`播放失败: ${error?.message || '未知错误'}`, 'error');
    }
}

async function playByMode(step = 1, options = {}) {
    const { fromEnded = false } = options;
    if (!currentPlayingSong || !audio.src) return;

    if (currentPlayMode === 'single') {
        if (fromEnded) {
            await replayCurrentTrack();
            return;
        }
    }

    const currentIndex = resolveCurrentPlaylistIndex();
    if (currentIndex < 0) {
        if (fromEnded) return;
        showToast('当前歌曲不在播放列表中', 'info');
        return;
    }

    if (currentPlayMode === 'random') {
        const randomIndex = pickRandomPlaylistIndex(currentIndex);
        if (randomIndex >= 0) {
            await playSongFromPlaylist(randomIndex);
        }
        return;
    }

    const nextIndex = currentIndex + step;
    if (fromEnded && nextIndex >= playlistSongs.length) {
        return;
    }
    if (nextIndex < 0 || nextIndex >= playlistSongs.length) {
        showToast('已经到边界了', 'info');
        return;
    }
    await playSongFromPlaylist(nextIndex);
}

function bindPlayerUiEvents() {
    const playlistFabBtn = document.getElementById('playlistFabBtn');
    const playerFabBtn = document.getElementById('playerFabBtn');
    const playlistBackdrop = document.getElementById('playlistSheetBackdrop');
    const playlistCloseBtn = document.getElementById('playlistCloseBtn');
    const playlistSearchBtn = document.getElementById('playlistSearchBtn');
    const playlistClearBtn = document.getElementById('playlistClearBtn');
    const playlistList = document.getElementById('playlistSheetList');
    const fullPlayerCloseBtn = document.getElementById('fullPlayerCloseBtn');
    const fullPlayerCloseArea = document.getElementById('fullPlayerCloseArea');
    const fullPlayerBrowserFullscreenBtn = document.getElementById('fullPlayerBrowserFullscreenBtn');
    const fullPlayerModeBtn = document.getElementById('fullPlayerModeBtn');
    const fullPlayerToggleBtn = document.getElementById('fullPlayerToggleBtn');
    const fullPlayerPrevBtn = document.getElementById('fullPlayerPrevBtn');
    const fullPlayerNextBtn = document.getElementById('fullPlayerNextBtn');
    const fullPlayerQueueBtn = document.getElementById('fullPlayerQueueBtn');
    const fullProgressBar = document.getElementById('fullPlayerProgressBar');
    const fullPlayerOverlay = document.getElementById('fullPlayerOverlay');

    if (playlistFabBtn) {
        playlistFabBtn.addEventListener('click', () => {
            setPlaylistSheetOpen(!isPlaylistSheetOpen);
        });
    }
    if (playerFabBtn) {
        playerFabBtn.addEventListener('click', () => {
            if (!currentPlayingSong) {
                showToast('请先播放一首歌', 'info');
                return;
            }
            setFullPlayerOpen(!isFullPlayerOpen);
        });
    }
    if (playlistBackdrop) {
        playlistBackdrop.addEventListener('click', () => setPlaylistSheetOpen(false));
    }
    if (playlistCloseBtn) {
        playlistCloseBtn.addEventListener('click', () => setPlaylistSheetOpen(false));
    }
    if (playlistSearchBtn) {
        playlistSearchBtn.addEventListener('click', () => {
            setPlaylistSheetOpen(false);
            setFullPlayerOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        });
    }
    if (playlistClearBtn) {
        playlistClearBtn.addEventListener('click', () => {
            if (!playlistSongs.length) return;
            playlistSongs = [];
            currentPlaylistIndex = -1;
            savePlaylistToStorage();
            renderPlaylistSheet();
            showToast('播放列表已清空', 'info');
        });
    }
    if (playlistList) {
        playlistList.addEventListener('click', async e => {
            const target = e.target.closest('button[data-action]');
            if (!target) return;
            const action = target.getAttribute('data-action');
            const index = Number(target.getAttribute('data-index'));
            if (!Number.isInteger(index)) return;
            if (action === 'play') {
                await playSongFromPlaylist(index);
            } else if (action === 'remove') {
                removeSongFromPlaylist(index);
            }
        });
    }
    if (fullPlayerCloseBtn) {
        fullPlayerCloseBtn.addEventListener('click', () => setFullPlayerOpen(false));
    }
    if (fullPlayerCloseArea) {
        fullPlayerCloseArea.addEventListener('click', () => setFullPlayerOpen(false));
    }
    if (fullPlayerBrowserFullscreenBtn) {
        fullPlayerBrowserFullscreenBtn.addEventListener('click', async () => {
            await toggleBrowserFullscreen();
        });
    }
    if (fullPlayerModeBtn) {
        fullPlayerModeBtn.addEventListener('click', () => {
            cyclePlayMode();
        });
    }
    if (fullPlayerToggleBtn) {
        fullPlayerToggleBtn.addEventListener('click', async () => {
            if (!currentPlayingSong || !audio.src) return;
            if (audio.paused) {
                try {
                    await audio.play();
                } catch (err) {
                    showToast(`播放失败: ${err?.message || '未知错误'}`, 'error');
                }
            } else {
                audio.pause();
            }
            syncInlinePlayButtonState();
            updateFullPlayerControlState();
        });
    }
    if (fullPlayerPrevBtn) {
        fullPlayerPrevBtn.addEventListener('click', async () => {
            await playByMode(-1);
        });
    }
    if (fullPlayerNextBtn) {
        fullPlayerNextBtn.addEventListener('click', async () => {
            await playByMode(1);
        });
    }
    if (fullPlayerQueueBtn) {
        fullPlayerQueueBtn.addEventListener('click', () => {
            setPlaylistSheetOpen(true);
        });
    }
    if (fullProgressBar) {
        fullProgressBar.addEventListener('click', e => {
            if (!audio.duration) return;
            const rect = fullProgressBar.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audio.currentTime = Math.max(0, Math.min(audio.duration, ratio * audio.duration));
        });
    }
    if (fullPlayerOverlay) {
        ['mousemove', 'mousedown', 'click', 'touchstart'].forEach(eventName => {
            fullPlayerOverlay.addEventListener(eventName, onFullscreenUserActivity, { passive: true });
        });
    }
    document.addEventListener('keydown', onFullscreenUserActivity);

    ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(eventName => {
        document.addEventListener(eventName, updateBrowserFullscreenButtonState);
    });
}

// 切换搜索类型按钮
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSearchType = btn.dataset.type;
        updatePlatformSelector();
    });
});

function updatePlatformSelector() {
    updatePlatformSelect();
}

document.getElementById('searchMode').addEventListener('change', updatePlatformSelector);
document.getElementById('searchBtn').addEventListener('click', search);
document.getElementById('searchInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') search();
});

// 初始化
currentPlayMode = loadPlayModeFromStorage();
playlistSongs = loadPlaylistFromStorage();
renderPlaylistSheet();
bindPlayerUiEvents();
updateFullPlayerMeta();
updateFullPlayerProgress();
updateFullPlayerControlState();
updatePlayModeButtonState();
updateBrowserFullscreenButtonState();
checkStatus();
initLinuxdoKeyPanel();
setInterval(checkStatus, 60000);
