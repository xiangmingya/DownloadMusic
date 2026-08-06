const API_BASE = String(window.APP_API_BASE || '/api/proxy').replace(/\/$/, '');
const LIBRARY_API_URL = API_BASE.replace(/\/proxy$/, '/library');
const APP_API_ROOT = API_BASE.replace(/\/proxy$/, '');
const API_ROUTES = {
    parse: `${API_BASE}/parse`,
    meta: `${API_BASE}/meta`,
    method: `${API_BASE}/method`,
    methods: `${API_BASE}/methods`,
    media: `${API_BASE}/media`,
    backup: `${API_BASE}/backup`,
    backup3: `${API_BASE}/backup3`,
    backup4: `${API_BASE}/backup4`,
    toplists: `${API_BASE}/toplists`,
    toplist: `${API_BASE}/toplist`,
    playlists: `${API_BASE}/playlists`
};
const PRIMARY_ALLOWED_PLATFORMS = ['netease', 'qq', 'kuwo'];
const PLATFORM_ALL_VALUE = 'all';
const BACKUP_SOURCE_MAP = {
    netease: 'netease',
    qq: 'tencent',
    kuwo: 'kuwo'
};
const BACKUP3_SOURCE_MAP = {
    qq: 'qq'
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
const sourceNameMap = {
    primary: '主接口',
    backup: 'GDStudio',
    backup3: '雨糖',
    backup4: '多源'
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
    providerMap: null,
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
const playModeStorageKey = `${LOCAL_KEY_PREFIX}playmode_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
const playlistStorageKey = `${LOCAL_KEY_PREFIX}playlist_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
const favoriteStorageKey = `${LOCAL_KEY_PREFIX}favorites_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
const recentStorageKey = `${LOCAL_KEY_PREFIX}recent_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
const savedPlaylistStorageKey = `${LOCAL_KEY_PREFIX}saved_playlists_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
let playlistSongs = [];
let favoriteSongs = [];
let recentSongs = [];
let savedPlaylists = [];
let activeSavedPlaylistId = '';
let pendingPlaylistSong = null;
let pendingDeletePlaylistId = '';
let cloudLibraryReady = false;
let cloudLibrarySaveTimer = 0;
let homeToplistRotation = Number(sessionStorage.getItem('downloadmusic_home_toplist_rotation') || new Date().getDay()) || 0;
let homePlaylistKeys = [];
let homePlaylistRefreshInFlight = false;
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
        .replace(/&/g, '&amp;')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizeMediaUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (u.startsWith('//')) return `https:${u}`;
    try {
        const parsed = new URL(u);
        if (parsed.hostname === 'y.qq.com' && parsed.pathname.startsWith('/music/photo_new/')) {
            parsed.hostname = 'y.gtimg.cn';
            return parsed.toString();
        }
    } catch {
        // Invalid upstream URLs keep the existing empty/error handling path.
    }
    return u;
}

// IconPark-style inline SVG icons (replace emoji/symbol icons).
function getIconSvg(name, size = 18) {
    const s = Math.max(12, Number(size || 18));
    const base = (paths, cls = '') => {
        const iconClass = `icon-park ${cls}`.trim();
        return `<svg class="${iconClass}" viewBox="0 0 48 48" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
    };
    switch (String(name || '').trim()) {
        case 'play':
            return base('<path d="M18 12L36 24L18 36V12Z" fill="currentColor" stroke="none"/>', 'solid');
        case 'pause':
            return base('<path d="M16 12H22V36H16V12ZM26 12H32V36H26V12Z" fill="currentColor" stroke="none"/>', 'solid');
        case 'plus':
            return base('<path d="M24 10V38M10 24H38" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>');
        case 'close':
            return base('<path d="M12 12L36 36M36 12L12 36" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>');
        case 'prev':
            return base('<path d="M14 12V36M34 12L18 24L34 36V12Z" fill="currentColor" stroke="none"/>', 'solid');
        case 'next':
            return base('<path d="M34 12V36M14 12L30 24L14 36V12Z" fill="currentColor" stroke="none"/>', 'solid');
        case 'menu':
            return base('<path d="M10 14H38M10 24H38M10 34H38" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>');
        case 'record':
            return base('<circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="3.5"/><circle cx="24" cy="24" r="4" fill="currentColor" stroke="none"/>');
        case 'heart':
            return base('<path d="M24 39S9 30.2 9 18.8C9 13.9 12.8 10 17.5 10c3 0 5.2 1.5 6.5 3.8C25.3 11.5 27.5 10 30.5 10 35.2 10 39 13.9 39 18.8 39 30.2 24 39 24 39Z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>');
        case 'bookmark':
            return base('<path d="M15 9H33A2 2 0 0 1 35 11V39L24 32L13 39V11A2 2 0 0 1 15 9Z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>');
        case 'fullscreen-enter':
            return base('<path d="M17 8H8V17M31 8H40V17M8 31V40H17M40 31V40H31" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>');
        case 'fullscreen-exit':
            return base('<path d="M17 19H8V8H19M31 19H40V8H29M8 40V29H19M40 40V29H29" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>');
        default:
            return base('<circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"/>', 'solid');
    }
}

function setIconHtml(el, iconName, size = 18) {
    if (!el) return;
    el.innerHTML = getIconSvg(iconName, size);
}

function setButtonIcon(buttonEl, iconName, size = 18) {
    if (!buttonEl) return;
    buttonEl.innerHTML = getIconSvg(iconName, size);
}

function buildTurntableFabIcon() {
    return [
        '<span class="player-fab-art" aria-hidden="true">',
        '  <img id="playerFabCover" class="player-fab-cover" alt="">',
        '  <span class="turntable-icon">',
        '    <span class="turntable-disc">',
        '      <span class="turntable-disc-label"></span>',
        '    </span>',
        '  </span>',
        '</span>'
    ].join('');
}

function initStaticIcons() {
    setButtonIcon(document.getElementById('playlistFabBtn'), 'menu', 22);
    const playerFabBtn = document.getElementById('playerFabBtn');
    if (playerFabBtn) {
        playerFabBtn.innerHTML = buildTurntableFabIcon();
    }
    setButtonIcon(document.getElementById('playerFabPrevBtn'), 'prev', 20);
    setButtonIcon(document.getElementById('playerFabToggleBtn'), 'play', 20);
    setButtonIcon(document.getElementById('playerFabNextBtn'), 'next', 20);

    setIconHtml(document.getElementById('fullPlayerBrowserFullscreenIcon'), 'fullscreen-enter', 20);

    const closeIconEl = document.querySelector('#fullPlayerCloseBtn .top-btn-icon');
    setIconHtml(closeIconEl, 'close', 20);

    const prevIconEl = document.querySelector('#fullPlayerPrevBtn .control-icon');
    const toggleIconEl = document.getElementById('fullPlayerToggleIcon');
    const nextIconEl = document.querySelector('#fullPlayerNextBtn .control-icon');
    const queueIconEl = document.querySelector('#fullPlayerQueueBtn .control-icon');

    setIconHtml(prevIconEl, 'prev', 22);
    setIconHtml(toggleIconEl, 'play', 22);
    setIconHtml(nextIconEl, 'next', 22);
    setIconHtml(queueIconEl, 'menu', 22);
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
    return BACKUP3_SOURCE_MAP[primary] || '';
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

function normalizeBackup4Song(item, selectedPlatform, provider = 'backup4_search') {
    const trackId = String(item?.id || item?.songid || item?.songmid || '').trim();
    return {
        id: trackId,
        name: String(item?.name || item?.title || '未知歌曲'),
        artist: String(item?.artist || item?.author || '未知歌手'),
        album: String(item?.album || ''),
        source: selectedPlatform,
        platform: selectedPlatform,
        cover: normalizeMediaUrl(item?.cover || item?.pic || ''),
        dataSource: 'backup4',
        backup: null,
        backup3: null,
        backup4: {
            provider: String(provider || 'backup4_search'),
            trackId
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

async function parseSongs(platform, ids, quality) {
    const response = await apiFetch(API_ROUTES.parse, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    // TuneHub has been retired; playback goes straight to the managed resolver chain.
    throw new Error('主解析服务未启用');
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

async function resolveBackup4Parsed(platform, id, quality, options = {}) {
    const normalizedPlatform = toPrimaryPlatform(platform);
    const songId = String(id || '').trim();
    if (!normalizedPlatform || !songId) {
        return null;
    }

    const cacheKey = parsedCacheKey(normalizedPlatform, songId, quality);
    const cached = parseCache.get(cacheKey);
    if (cached?.success && normalizeMediaUrl(cached?.url || '')) {
        return cached;
    }

    const payload = await callBackup4Api({
        platform: normalizedPlatform,
        id: songId,
        quality: quality || '320k',
        name: String(options.name || '').trim(),
        artist: String(options.artist || '').trim()
    }, {
        timeoutMs: 40000,
        retries: 0,
        retryDelayMs: 0
    });
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    const mediaUrl = normalizeMediaUrl(data?.url || '');
    if (!mediaUrl) {
        throw new Error('备用源4未返回可播放链接');
    }

    const parsedItem = {
        id: songId,
        success: true,
        url: mediaUrl,
        error: '',
        pic: normalizeMediaUrl(options.cover || ''),
        cover: normalizeMediaUrl(options.cover || ''),
        lyrics: '',
        info: {
            name: String(options.name || `ID ${songId}`),
            artist: String(options.artist || '未知歌手'),
            album: String(options.album || '')
        },
        fallback_provider: String(data?.provider || 'backup4')
    };
    cacheParsedItem(normalizedPlatform, quality, parsedItem);
    return parsedItem;
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
                type: 'qq',
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
        try {
            const backup4Probe = await callBackup4Api({
                platform: 'netease',
                id: '1901371647',
                quality: '320k',
                name: '孤勇者',
                artist: '陈奕迅'
            }, {
                timeoutMs: 10000,
                retries: 0
            });
            const backup4Alive = Boolean(normalizeMediaUrl(backup4Probe?.data?.url || backup4Probe?.url || ''));
            if (backup4Alive) {
                supportedPlatforms = [...PRIMARY_ALLOWED_PLATFORMS];
                platformNames = {
                    netease: defaultPlatformNameMap.netease,
                    qq: defaultPlatformNameMap.qq,
                    kuwo: defaultPlatformNameMap.kuwo
                };
                updatePlatformSelect();
                document.getElementById('serviceStatus').innerHTML =
                    `服务状态: <span class="online">主源波动，备用4可用</span>`;
                document.getElementById('healthStatus').innerHTML =
                    `健康状态: <span class="online">多源降级</span>`;
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

// 搜索始终自动并发尝试网易云、QQ 音乐与酷我，不再向用户暴露平台选择。
function updatePlatformSelect() {
    supportedPlatforms = supportedPlatforms.filter(key => PRIMARY_ALLOWED_PLATFORMS.includes(String(key)));
    if (supportedPlatforms.length === 0) {
        supportedPlatforms = [...PRIMARY_ALLOWED_PLATFORMS];
    }
    renderHomeToplistCards();
}

function platformDisplayName(platformKey) {
    if (String(platformKey || '').trim() === PLATFORM_ALL_VALUE) {
        return '全部平台';
    }
    return platformNames[platformKey] || defaultPlatformNameMap[platformKey] || platformKey || '当前平台';
}

function sourceDisplayNameBySong(song) {
    const dataSource = normalizeSongDataSource(song?.dataSource);
    return sourceNameMap[dataSource] || sourceNameMap.primary;
}

function getAvailableSearchPlatforms() {
    const filtered = supportedPlatforms.filter(key => PRIMARY_ALLOWED_PLATFORMS.includes(String(key)));
    return filtered.length > 0 ? filtered : [...PRIMARY_ALLOWED_PLATFORMS];
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
    const timeoutMs = Number(options.timeoutMs || 40000);
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

async function callBackup4Api(params, options = {}) {
    const timeoutMs = Number(options.timeoutMs || 18000);
    const retries = Math.max(0, Number(options.retries || 1));
    const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 500));
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const url = new URL(API_ROUTES.backup4, window.location.href);
            Object.entries(params || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null && String(v) !== '') {
                    url.searchParams.set(k, String(v));
                }
            });

            const response = await apiFetch(url.toString(), { timeoutMs });
            const text = await response.text();
            const data = parseResponseText(text);
            if (!response.ok || Number(data?.code) !== 0) {
                throw new Error(getApiErrorMessage(data, response.status, `备用源4请求失败 (${response.status})`));
            }
            return data;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await wait(retryDelayMs);
            }
        }
    }

    throw lastError || new Error('备用源4请求失败');
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

async function searchSongsByKeywordPageBackup4(keyword, selectedPlatform, options = {}) {
    const fallback = supportedPlatforms.includes('netease') ? 'netease' : supportedPlatforms[0];
    const platform = supportedPlatforms.includes(selectedPlatform) ? selectedPlatform : fallback;
    if (!platform) {
        return [];
    }

    const requestPage = Math.max(1, Number(options.page || 1));
    const requestLimit = Math.max(1, Number(options.limit || searchApiLimit));
    const data = await callBackup4Api({
        mode: 'search',
        platform,
        keyword,
        page: requestPage,
        limit: requestLimit
    }, {
        timeoutMs: 18000,
        retries: 1,
        retryDelayMs: 650
    });
    const list = Array.isArray(data?.data) ? data.data : [];
    const provider = String(data?.provider || 'backup4_search');
    return list
        .filter(item => item && (item.id || item.songid || item.songmid))
        .slice(0, requestLimit)
        .map(item => normalizeBackup4Song(item, platform, provider));
}

async function searchSongsByKeyword(keyword, selectedPlatform, options = {}) {
    const normalizedSelectedPlatform = String(selectedPlatform || '').trim().toLowerCase();
    if (normalizedSelectedPlatform === PLATFORM_ALL_VALUE) {
        const requestPage = Math.max(1, Number(options.page || 1));
        const requestLimit = Math.max(1, Number(options.limit || searchApiLimit));
        const forceProvider = String(options.provider || 'auto');
        const providerMapInput = (options.providerMap && typeof options.providerMap === 'object')
            ? options.providerMap
            : null;
        const requestedPlatforms = Array.isArray(options.platforms) ? options.platforms : null;
        const platforms = (requestedPlatforms || getAvailableSearchPlatforms())
            .filter(platform => getAvailableSearchPlatforms().includes(platform));
        const errors = [];

        const platformTasks = platforms.map(platform => {
            const providerForPlatform = providerMapInput?.[platform]
                || (forceProvider === 'multi' ? 'auto' : forceProvider);
            const task = searchSongsByKeyword(keyword, platform, {
                    page: requestPage,
                    limit: Math.min(requestLimit, searchApiLimit),
                    provider: providerForPlatform,
                    silentFallback: true
                })
                .then(result => ({
                    platform,
                    providerForPlatform,
                    ok: true,
                    result
                }))
                .catch(error => ({
                    platform,
                    providerForPlatform,
                    ok: false,
                    error
                }));
            return { platform, task };
        });

        const pending = new Set(platformTasks);
        while (pending.size > 0) {
            const raceResult = await Promise.race(
                Array.from(pending).map(({ platform, task }) =>
                    task.then(payload => ({ platform, payload }))
                )
            );
            const doneEntry = Array.from(pending).find(item => item.platform === raceResult.platform);
            if (doneEntry) {
                pending.delete(doneEntry);
            }

            const { payload } = raceResult;
            if (payload.ok) {
                const result = payload.result;
                if (Array.isArray(result?.songs) && result.songs.length > 0) {
                    return {
                        songs: result.songs,
                        provider: 'multi',
                        providerMap: { [payload.platform]: String(result?.provider || payload.providerForPlatform || 'primary') },
                        activePlatform: payload.platform
                    };
                }
            } else {
                errors.push(payload.error);
            }
        }
        if (errors.length >= platforms.length && errors[0]) {
            throw errors[0];
        }
        return { songs: [], provider: 'multi', providerMap: {} };
    }

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
    if (forceProvider === 'backup4') {
        const songs = await searchSongsByKeywordPageBackup4(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        return { songs, provider: 'backup4' };
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

    try {
        const backup4Songs = await searchSongsByKeywordPageBackup4(keyword, selectedPlatform, {
            page: requestPage,
            limit: requestLimit
        });
        if (backup4Songs.length > 0) {
            if (!silentFallback) {
                showToast(primaryError ? '前3层备用异常，已切换第4层备用源' : '前3层无结果，已切换第4层备用源', 'info');
            }
            return { songs: backup4Songs, provider: 'backup4' };
        }
    } catch (backup4Error) {
        // ignore backup4 errors
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
        providerMap: null,
        activePlatform: '',
        hasMore: false,
        loading: false
    };
}

function enableKeywordPaging(keyword, platform, firstBatchCount, provider = 'primary', extra = {}) {
    const normalizedProvider = String(provider || 'primary');
    const normalizedPlatform = String(platform || '').trim();
    const isAllPlatform = normalizedPlatform === PLATFORM_ALL_VALUE;
    const platformCount = isAllPlatform && !extra?.activePlatform ? getAvailableSearchPlatforms().length : 1;
    const effectiveLimitBase = normalizedProvider === 'backup3' ? 10 : searchApiLimit;
    const effectiveLimit = Math.max(1, effectiveLimitBase * Math.max(1, platformCount));
    keywordPagingState = {
        enabled: true,
        platform: normalizedPlatform,
        keyword: String(keyword || ''),
        page: 1,
        limit: effectiveLimit,
        provider: normalizedProvider,
        providerMap: (extra?.providerMap && typeof extra.providerMap === 'object')
            ? { ...extra.providerMap }
            : null,
        activePlatform: String(extra?.activePlatform || ''),
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
                provider: keywordPagingState.provider,
                providerMap: keywordPagingState.providerMap || undefined,
                platforms: keywordPagingState.activePlatform ? [keywordPagingState.activePlatform] : undefined
            }
        );
        const songs = Array.isArray(result?.songs) ? result.songs : [];
        if (result?.providerMap && typeof result.providerMap === 'object') {
            keywordPagingState.providerMap = { ...result.providerMap };
        }
        if (result?.activePlatform) keywordPagingState.activePlatform = String(result.activePlatform);

        keywordPagingState.page = nextPage;
        const isAllPlatform = String(keywordPagingState.platform || '') === PLATFORM_ALL_VALUE;
        if (isAllPlatform) {
            if (songs.length === 0) {
                keywordPagingState.hasMore = false;
            }
        } else if (songs.length < keywordPagingState.limit) {
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

function chartMatchScore(candidate, song) {
    const normalize = value => String(value || '').toLowerCase().replace(/[\s·・,，、()（）\-_.]/g, '');
    const candidateName = normalize(candidate?.name);
    const songName = normalize(song?.name);
    const candidateArtist = normalize(candidate?.artist);
    const songArtist = normalize(song?.artist);
    let score = candidateName === songName ? 8 : (candidateName.includes(songName) || songName.includes(candidateName) ? 3 : 0);
    if (candidateArtist && songArtist && (candidateArtist.includes(songArtist) || songArtist.includes(candidateArtist))) score += 4;
    return score;
}

async function resolveLookupOnlySong(song) {
    if (!song?.lookupOnly) return song;
    const keyword = `${String(song.name || '').trim()} ${String(song.artist || '').trim()}`.trim();
    if (!keyword) throw new Error('这首榜单歌曲缺少匹配信息');
    const candidates = await callPlatformMethod('kuwo', 'search', { keyword, page: 1, limit: 8 }, {
        timeoutMs: 12000,
        retries: 1,
        retryDelayMs: 450
    });
    const list = Array.isArray(candidates) ? candidates : [];
    const matched = [...list].sort((a, b) => chartMatchScore(b, song) - chartMatchScore(a, song))[0];
    if (!matched?.id) throw new Error('未能匹配到酷我歌曲');
    Object.assign(song, {
        id: String(matched.id),
        name: String(matched.name || song.name),
        artist: String(matched.artist || song.artist),
        album: String(matched.album || song.album || ''),
        cover: normalizeMediaUrl(matched.cover || song.cover || ''),
        platform: 'kuwo',
        source: 'kuwo',
        lookupOnly: false
    });
    return song;
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

async function fetchSongByIdBackup3Direct(platform, songId) {
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

function sortBackup3Candidates(candidates, options = {}) {
    const requestedId = String(options.requestedId || '').trim();
    const preferredArtist = String(options.preferredArtist || '').trim().toLowerCase();
    const preferredKeyword = String(options.preferredKeyword || '').trim().toLowerCase();
    return [...(Array.isArray(candidates) ? candidates : [])].sort((a, b) => {
        const calc = (item) => {
            const cid = String(item?.backup3?.trackId || item?.id || '').trim();
            const name = String(item?.name || '').trim().toLowerCase();
            const artist = String(item?.artist || '').trim().toLowerCase();
            let score = 0;
            if (requestedId && cid === requestedId) score += 6;
            if (preferredKeyword && name === preferredKeyword) score += 3;
            if (preferredKeyword && name.includes(preferredKeyword)) score += 1;
            if (preferredArtist && artist.includes(preferredArtist)) score += 2;
            return score;
        };
        return calc(b) - calc(a);
    });
}

async function fetchSongByIdBackup3(platform, songId, options = {}) {
    const id = String(songId || '').trim();
    if (!id) return null;

    const direct = await fetchSongByIdBackup3Direct(platform, id).catch(() => null);
    if (direct) return direct;

    const keyword = String(options.keyword || '').trim();
    if (!keyword) return null;

    const candidates = await searchSongsByKeywordPageBackup3(keyword, platform, {
        page: 1,
        limit: 8
    }).catch(() => []);
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return null;
    }

    const ordered = sortBackup3Candidates(candidates, {
        requestedId: id,
        preferredArtist: options.artist || '',
        preferredKeyword: keyword
    });
    const tried = new Set([id]);

    for (const candidate of ordered) {
        const candidateId = String(candidate?.backup3?.trackId || candidate?.id || '').trim();
        if (!candidateId || tried.has(candidateId)) continue;
        tried.add(candidateId);

        const resolved = await fetchSongByIdBackup3Direct(platform, candidateId).catch(() => null);
        if (!resolved) continue;

        const merged = {
            ...resolved,
            id,
            name: String(options.songName || resolved.name || candidate.name || keyword),
            artist: String(options.songArtist || resolved.artist || candidate.artist || ''),
            cover: normalizeMediaUrl(resolved.cover || candidate.cover || ''),
            backup3: {
                ...(resolved.backup3 || {}),
                trackId: String(resolved?.backup3?.trackId || candidateId)
            }
        };

        const payload = {
            url: normalizeMediaUrl(merged?.backup3?.streamUrl || ''),
            lyrics: String(merged?.backup3?.lyric || ''),
            cover: normalizeMediaUrl(merged?.cover || '')
        };
        if (payload.url) {
            backup3DataCache.set(backup3DataCacheKey(merged), payload);
            return merged;
        }
    }

    return null;
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
    let refreshedSong = null;

    if (!url) {
        const targetId = String(song?.backup3?.trackId || song?.id || '').trim();
        refreshedSong = await fetchSongByIdBackup3(song.platform || song.source, targetId, {
            keyword: song?.name || '',
            artist: song?.artist || '',
            songName: song?.name || '',
            songArtist: song?.artist || ''
        }).catch(() => null);
        url = normalizeMediaUrl(refreshedSong?.backup3?.streamUrl || '');
        lyrics = String(refreshedSong?.backup3?.lyric || lyrics || '');
        cover = normalizeMediaUrl(refreshedSong?.cover || cover || '');
    }
    if (!url) {
        throw new Error('备用源3未获取到播放链接');
    }

    if (refreshedSong?.backup3 && song) {
        song.backup3 = {
            ...(song.backup3 || {}),
            ...refreshedSong.backup3,
            streamUrl: normalizeMediaUrl(refreshedSong?.backup3?.streamUrl || song?.backup3?.streamUrl || ''),
            lyric: String(refreshedSong?.backup3?.lyric || song?.backup3?.lyric || '')
        };
    }
    if (cover && song) {
        song.cover = cover;
    }

    const result = { url, lyrics, cover };
    backup3DataCache.set(cacheKey, result);
    if (refreshedSong) {
        const refreshedCacheKey = backup3DataCacheKey(refreshedSong);
        if (refreshedCacheKey && refreshedCacheKey !== cacheKey) {
            backup3DataCache.set(refreshedCacheKey, result);
        }
    }
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
    let platform = PLATFORM_ALL_VALUE;
    const quality = document.getElementById('quality').value;
    const resultsDiv = document.getElementById('results');

    if (searchMode !== 'keyword' && String(platform) === PLATFORM_ALL_VALUE) {
        platform = supportedPlatforms.includes('netease') ? 'netease' : (supportedPlatforms[0] || 'netease');
        showToast(`ID / 歌单解析会自动尝试可用音乐源`, 'info');
    }

    resultsDiv.innerHTML = '<div class="empty-state">正在同时搜索网易云、QQ 音乐和酷我…</div>';

    try {
        currentSearchParams = null;
        resetKeywordPagingState();

        if (searchMode === 'keyword') {
            if (currentSearchType === 'playlist') {
                resultsDiv.innerHTML = '<div class="empty-state">关键词歌单搜索暂不可用，请切换 ID 模式</div>';
                return;
            }

            const { songs, provider, providerMap, activePlatform } = await searchSongsByKeyword(input, platform, {
                page: 1,
                limit: searchApiLimit
            });
            if (songs.length > 0) {
                enableKeywordPaging(input, platform, songs.length, provider, { providerMap, activePlatform });
                displaySongsWithPagination(songs);
            } else {
                const emptyMessage = String(platform) === PLATFORM_ALL_VALUE
                    ? '全部平台没有结果，请换关键词重试'
                    : `${platformDisplayName(platform)}没有结果，请切换其他平台检索`;
                resultsDiv.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
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

            const backup4Parsed = await resolveBackup4Parsed(platform, input, quality, {
                name: `ID ${input}`,
                artist: '未知歌手'
            }).catch(() => null);
            if (backup4Parsed) {
                showToast('主解析/备用源3无结果，已切换第4层备用源', 'info');
                displaySongsWithPagination([toSongFromParsedItem(platform, backup4Parsed)]);
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
        const displayName = escapeHtml(song.name);
        const displayArtist = escapeHtml(song.artist);
        const displayPlatform = escapeHtml(platformNames[platform] || platform);
        const displaySource = escapeHtml(sourceDisplayNameBySong(song));
        const safePlatform = escapeForSingleQuote(platform);
        const safeId = escapeForSingleQuote(song.id);
        const safeName = escapeForSingleQuote(song.name);
        const safeArtist = escapeForSingleQuote(song.artist);
        const safeAlbum = escapeForSingleQuote(song.album || '');
        const safeCover = escapeForSingleQuote(song.cover || '');
        const coverUrl = getProxiedCoverUrl(song.cover || '');
        const coverStyle = coverUrl ? 'display:block' : 'display:none';
        const favorite = isFavoriteSong(song);

        return `
        <div class="result-item" id="song-${globalIndex}">
            <div class="song-header">
                <div>
                    <img class="song-cover" id="cover-${globalIndex}" src="${coverUrl}" style="${coverStyle}" alt="" onerror="this.style.display='none'" onload="if(this.src){this.style.display='block'}">
                    <div class="song-info">
                        <h3>${displayName}<span class="platform-badge">${displayPlatform}</span><span class="source-badge">${displaySource}</span></h3>
                        <p>${displayArtist}</p>
                    </div>
                </div>
                <div>
                    <button class="play-btn-item" data-index="${globalIndex}" onclick="playSong('${safePlatform}', '${safeId}', '${safeName}', '${safeArtist}', ${globalIndex})">${getIconSvg('play', 20)}</button>
                    <button class="favorite-song-btn${favorite ? ' is-favorite' : ''}" onclick="toggleFavoriteByIndex(${globalIndex})" aria-label="${favorite ? '取消收藏' : '收藏'}" title="${favorite ? '取消收藏' : '收藏'}">${getIconSvg('heart', 18)}</button>
                    <button class="add-playlist-btn" onclick="addSongToPlaylist('${safePlatform}', '${safeId}', '${safeName}', '${safeArtist}', '${safeAlbum}', '${safeCover}', ${globalIndex})">${getIconSvg('plus', 18)}</button>
                    <button class="save-song-btn" onclick="saveSongToCustomPlaylistByIndex(${globalIndex})" aria-label="保存到歌单">${getIconSvg('bookmark', 18)}</button>
                    <button onclick="downloadSong('${safePlatform}', '${safeId}', '${safeName}', '${safeArtist}', ${globalIndex})">下载</button>
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

async function playAllResultSongs() {
    if (!Array.isArray(allSongs) || allSongs.length === 0) return;
    let firstSong;
    try {
        firstSong = await resolveLookupOnlySong(allSongs[0]);
    } catch (error) {
        showToast(`全部播放失败: ${error.message || '无法准备第一首歌曲'}`, 'error');
        return;
    }
    const queue = [];
    const seen = new Set();
    allSongs.forEach(song => {
        const item = toLibrarySong(song);
        if (!item || seen.has(songIdentity(item))) return;
        seen.add(songIdentity(item));
        queue.push(item);
    });
    playlistSongs = queue;
    savePlaylistToStorage();
    const source = String(firstSong?.platform || firstSong?.source || '');
    const id = String(firstSong?.id || '');
    currentPlaylistIndex = findPlaylistIndex(source, id);
    renderPlaylistSheet();
    showToast(`已加入 ${queue.length} 首歌曲，正在播放第一首`, 'info');
    await playSongCore(source, id, String(firstSong?.name || ''), String(firstSong?.artist || ''), {
        inlineIndex: 0,
        song: firstSong
    });
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

        // 第二备用（QQ 专用）补封面。
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
        const runtimeSong = await resolveLookupOnlySong(songObj || getSongByIndex(Number(index)));
        source = String(runtimeSong?.platform || runtimeSong?.source || source);
        id = String(runtimeSong?.id || id);
        name = String(runtimeSong?.name || name);
        artist = String(runtimeSong?.artist || artist);
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
            let parsed = null;
            try {
                parsed = await ensureParsedSong(source, id, quality);
            } catch (primaryError) {
                parsed = await resolveBackup4Parsed(source, id, quality, {
                    name,
                    artist,
                    cover: runtimeSong?.cover || ''
                }).catch(() => null);
                if (!parsed) {
                    throw primaryError;
                }
            }
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

function resetInlinePlaybackUi(keepIndex = null) {
    if (currentPlayingIndex === null) return;
    if (keepIndex !== null && currentPlayingIndex === keepIndex) return;
    const oldBtn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
    const oldPlayer = document.getElementById(`player-${currentPlayingIndex}`);
    const oldInlineLyrics = document.getElementById(`inline-lyrics-${currentPlayingIndex}`);
    if (oldBtn) oldBtn.innerHTML = getIconSvg('play', 20);
    if (oldPlayer) oldPlayer.style.display = 'none';
    if (oldInlineLyrics) oldInlineLyrics.textContent = '';
}

function syncInlinePlayButtonState() {
    document.querySelectorAll('.play-btn-item').forEach(btn => {
        btn.innerHTML = getIconSvg('play', 20);
    });
    if (currentPlayingIndex !== null && !audio.paused) {
        const activeBtn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
        if (activeBtn) activeBtn.innerHTML = getIconSvg('pause', 16);
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
    return (value === 'backup' || value === 'backup3' || value === 'backup4') ? value : 'primary';
}

function cloneBackupMeta(value) {
    if (!value || typeof value !== 'object') return null;
    return {
        source: String(value.source || ''),
        trackId: String(value.trackId || ''),
        urlId: String(value.urlId || ''),
        lyricId: String(value.lyricId || ''),
        picId: String(value.picId || '')
    };
}

function cloneBackup3Meta(value) {
    if (!value || typeof value !== 'object') return null;
    return {
        source: String(value.source || ''),
        trackId: String(value.trackId || ''),
        streamUrl: String(value.streamUrl || ''),
        lyric: String(value.lyric || ''),
        link: String(value.link || '')
    };
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toLibrarySong(song) {
    if (!song || !song.id) return null;
    return {
        id: String(song.id),
        name: String(song.name || '未知歌曲'),
        artist: String(song.artist || '未知歌手'),
        album: String(song.album || ''),
        platform: String(song.platform || song.source || ''),
        source: String(song.platform || song.source || ''),
        cover: normalizeMediaUrl(song.cover || ''),
        dataSource: normalizeSongDataSource(song.dataSource),
        lookupOnly: Boolean(song.lookupOnly),
        backup: cloneBackupMeta(song?.backup),
        backup3: cloneBackup3Meta(song?.backup3)
    };
}

function loadLocalSongList(key, limit = 100) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed)
            ? parsed.map(toLibrarySong).filter(Boolean).slice(0, limit)
            : [];
    } catch {
        return [];
    }
}

function saveLocalSongList(key, songs) {
    try {
        localStorage.setItem(key, JSON.stringify((songs || []).map(toLibrarySong).filter(Boolean)));
    } catch {
        // 浏览器无痕模式或空间已满时，应用仍可继续播放。
    }
}

function songIdentity(song) {
    return `${String(song?.platform || song?.source || '')}:${String(song?.id || '')}`;
}

function songTitleArtistIdentity(song) {
    const normalize = value => String(value || '').toLowerCase().replace(/[\s·・,，、()（）\-_.]/g, '');
    return `${normalize(song?.name)}:${normalize(song?.artist)}`;
}

function isSameFavoriteSong(left, right) {
    return songIdentity(left) === songIdentity(right)
        || (songTitleArtistIdentity(left) === songTitleArtistIdentity(right) && songTitleArtistIdentity(left) !== ':');
}

function isFavoriteSong(song) {
    return favoriteSongs.some(item => isSameFavoriteSong(item, song));
}

function removeFavoriteSong(index) {
    if (!favoriteSongs.splice(Number(index), 1).length) return;
    saveLocalSongList(favoriteStorageKey, favoriteSongs);
    queueLibraryCloudSave();
    renderHomeCollection();
    renderLibrary();
    renderLocalPage();
    showToast('已从喜欢的音乐移除', 'info');
}

async function toggleFavoriteByIndex(index) {
    let rawSong;
    try {
        rawSong = await resolveLookupOnlySong(getSongByIndex(Number(index)));
    } catch (error) {
        showToast(`收藏失败: ${error.message || '无法匹配歌曲'}`, 'error');
        return;
    }
    const song = toLibrarySong(rawSong);
    if (!song) return;
    const existingIndex = favoriteSongs.findIndex(item => isSameFavoriteSong(item, song));
    if (existingIndex >= 0) {
        removeFavoriteSong(existingIndex);
        return;
    } else {
        favoriteSongs.unshift(song);
        favoriteSongs = favoriteSongs.slice(0, 500);
        showToast('已加入喜欢的音乐', 'success');
    }
    saveLocalSongList(favoriteStorageKey, favoriteSongs);
    queueLibraryCloudSave();
    renderHomeCollection();
    renderLibrary();
    renderLocalPage();
}

function loadSavedPlaylists() {
    try {
        const raw = JSON.parse(localStorage.getItem(savedPlaylistStorageKey) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw
            .filter(item => item && item.id && item.name)
            .map(item => ({
                id: String(item.id),
                name: String(item.name).slice(0, 40),
                songs: Array.isArray(item.songs) ? item.songs.map(toLibrarySong).filter(Boolean).slice(0, 500) : []
            }));
    } catch {
        return [];
    }
}

function saveSavedPlaylists() {
    try {
        localStorage.setItem(savedPlaylistStorageKey, JSON.stringify(savedPlaylists));
    } catch {
        showToast('歌单保存失败，请检查浏览器存储空间', 'error');
    }
}

function getLibraryDocument() {
    return {
        version: 1,
        favorites: favoriteSongs.map(toLibrarySong).filter(Boolean).slice(0, 500),
        recent: recentSongs.map(toLibrarySong).filter(Boolean).slice(0, 24),
        playlists: savedPlaylists
            .filter(item => item && item.id && item.name)
            .slice(0, 100)
            .map(item => ({
                id: String(item.id),
                name: String(item.name).slice(0, 40),
                songs: Array.isArray(item.songs) ? item.songs.map(toLibrarySong).filter(Boolean).slice(0, 500) : []
            }))
    };
}

function applyLibraryDocument(document) {
    if (!document || typeof document !== 'object') return false;
    favoriteSongs = Array.isArray(document.favorites)
        ? document.favorites.map(toLibrarySong).filter(Boolean).slice(0, 500)
        : [];
    recentSongs = Array.isArray(document.recent)
        ? document.recent.map(toLibrarySong).filter(Boolean).slice(0, 24)
        : [];
    savedPlaylists = Array.isArray(document.playlists)
        ? document.playlists
            .filter(item => item && item.id && item.name)
            .slice(0, 100)
            .map(item => ({
                id: String(item.id),
                name: String(item.name).slice(0, 40),
                songs: Array.isArray(item.songs) ? item.songs.map(toLibrarySong).filter(Boolean).slice(0, 500) : []
            }))
        : [];
    saveLocalSongList(favoriteStorageKey, favoriteSongs);
    saveLocalSongList(recentStorageKey, recentSongs);
    saveSavedPlaylists();
    renderHomeCollection();
    renderLibrary();
    renderLocalPage();
    return true;
}

function libraryHasContent(document) {
    return Boolean(document.favorites?.length || document.recent?.length || document.playlists?.length);
}

function mergeLibrarySongs(primary, secondary, limit) {
    const seen = new Set();
    return [...(primary || []), ...(secondary || [])]
        .map(toLibrarySong)
        .filter(song => {
            if (!song || seen.has(songIdentity(song))) return false;
            seen.add(songIdentity(song));
            return true;
        })
        .slice(0, limit);
}

function mergeLibraryDocuments(remote, local) {
    const playlists = (Array.isArray(remote?.playlists) ? remote.playlists : [])
        .filter(item => item && item.id && item.name)
        .map(item => ({
            id: String(item.id),
            name: String(item.name).slice(0, 40),
            songs: Array.isArray(item.songs) ? item.songs.map(toLibrarySong).filter(Boolean).slice(0, 500) : []
        }));
    const byId = new Map(playlists.map(item => [item.id, item]));
    const byName = new Map(playlists.map(item => [item.name, item]));
    (Array.isArray(local?.playlists) ? local.playlists : []).forEach(item => {
        if (!item?.id || !item?.name) return;
        const existing = byId.get(String(item.id)) || byName.get(String(item.name));
        if (existing) {
            existing.songs = mergeLibrarySongs(existing.songs, item.songs, 500);
            return;
        }
        const playlist = {
            id: String(item.id),
            name: String(item.name).slice(0, 40),
            songs: mergeLibrarySongs(item.songs, [], 500)
        };
        playlists.push(playlist);
        byId.set(playlist.id, playlist);
        byName.set(playlist.name, playlist);
    });
    return {
        version: 1,
        favorites: mergeLibrarySongs(remote?.favorites, local?.favorites, 500),
        recent: mergeLibrarySongs(remote?.recent, local?.recent, 24),
        playlists: playlists.slice(0, 100)
    };
}

async function saveLibraryToCloud() {
    if (!cloudLibraryReady) return;
    try {
        // ponytail: last write wins; add per-record revisions only if simultaneous edits become common.
        const response = await apiFetch(LIBRARY_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ library: getLibraryDocument() }),
            timeoutMs: 10000
        });
        if (!response.ok) return;
    } catch {
        // 本地缓存保留，下一次操作或刷新会再次尝试同步。
    }
}

function queueLibraryCloudSave() {
    if (!cloudLibraryReady) return;
    clearTimeout(cloudLibrarySaveTimer);
    cloudLibrarySaveTimer = setTimeout(saveLibraryToCloud, 350);
}

async function restoreLibraryFromCloud() {
    const localDocument = getLibraryDocument();
    try {
        const response = await apiFetch(LIBRARY_API_URL, { timeoutMs: 10000 });
        const payload = await response.json();
        if (!response.ok || Number(payload?.code) !== 0) return;
        cloudLibraryReady = true;
        const remoteDocument = payload?.data?.library;
        if (remoteDocument) {
            const mergedDocument = mergeLibraryDocuments(remoteDocument, localDocument);
            applyLibraryDocument(mergedDocument);
            if (JSON.stringify(mergedDocument) !== JSON.stringify(remoteDocument)) {
                await saveLibraryToCloud();
            }
        } else if (libraryHasContent(localDocument)) {
            await saveLibraryToCloud();
        }
    } catch {
        // D1 尚未配置或暂时不可用时，继续使用本地资料库。
    }
}

function createSavedPlaylist(name) {
    name = String(name || '').trim().slice(0, 40);
    if (!name) return null;
    const existing = savedPlaylists.find(item => item.name === name);
    if (existing) {
        showToast(`歌单「${name}」已存在`, 'info');
        return existing;
    }
    const playlist = { id: crypto.randomUUID(), name, songs: [] };
    savedPlaylists.unshift(playlist);
    saveSavedPlaylists();
    queueLibraryCloudSave();
    renderLibrary();
    showToast(`已创建歌单「${name}」`, 'success');
    return playlist;
}

async function saveSongToCustomPlaylistByIndex(index) {
    let rawSong;
    try {
        rawSong = await resolveLookupOnlySong(getSongByIndex(Number(index)));
    } catch (error) {
        showToast(`保存失败: ${error.message || '无法匹配歌曲'}`, 'error');
        return;
    }
    const song = toLibrarySong(rawSong);
    if (!song) return;
    openPlaylistPicker(song);
}

function addSongToSavedPlaylist(playlist, song) {
    if (!playlist || !song) return false;
    if (playlist.songs.some(item => songIdentity(item) === songIdentity(song))) {
        showToast('这首歌已经在该歌单中', 'info');
        return false;
    }
    playlist.songs.push(song);
    saveSavedPlaylists();
    queueLibraryCloudSave();
    renderLibrary();
    showToast(`已加入「${playlist.name}」`, 'success');
    return true;
}

function renderPlaylistPicker(filter = '') {
    const picker = document.getElementById('playlistPicker');
    const title = document.getElementById('playlistPickerTitle');
    const song = document.getElementById('playlistPickerSong');
    const input = document.getElementById('playlistPickerName');
    const createButton = document.getElementById('playlistPickerCreateBtn');
    const count = document.getElementById('playlistPickerCount');
    const list = document.getElementById('playlistPickerList');
    if (!picker || !title || !song || !input || !createButton || !count || !list) return;
    const hasSong = Boolean(pendingPlaylistSong);
    title.textContent = hasSong ? '保存到歌单' : '新建歌单';
    song.textContent = hasSong
        ? `${pendingPlaylistSong.name} · ${pendingPlaylistSong.artist}`
        : '新建一个歌单，之后可从搜索结果直接添加歌曲。';
    input.placeholder = hasSong ? '输入新歌单名称' : '例如：晚安循环';
    createButton.textContent = hasSong ? '创建并加入' : '创建歌单';
    const query = String(filter || '').trim().toLowerCase();
    const playlists = savedPlaylists.filter(item => !query || item.name.toLowerCase().includes(query));
    count.textContent = String(savedPlaylists.length);
    list.innerHTML = playlists.length
        ? playlists.map(item => {
            const alreadyAdded = hasSong && item.songs.some(entry => songIdentity(entry) === songIdentity(pendingPlaylistSong));
            const action = hasSong ? (alreadyAdded ? '已在此歌单' : '加入') : '查看';
            return `<button type="button" class="playlist-picker-item" data-pick-saved-playlist="${escapeHtml(item.id)}"${alreadyAdded ? ' disabled' : ''}><span><strong>${escapeHtml(item.name)}</strong><small>${item.songs.length} 首歌曲</small></span><em>${action}</em></button>`;
        }).join('')
        : `<div class="playlist-picker-empty">${savedPlaylists.length ? '没有名称相近的歌单，可以直接创建。' : '还没有歌单，先在上方创建一个吧。'}</div>`;
}

function openPlaylistPicker(song = null) {
    const picker = document.getElementById('playlistPicker');
    if (!picker) return;
    pendingPlaylistSong = song;
    renderPlaylistPicker();
    if (!picker.open) picker.showModal();
    requestAnimationFrame(() => document.getElementById('playlistPickerName')?.focus());
}

function closePlaylistPicker() {
    document.getElementById('playlistPicker')?.close();
}

function createPlaylistFromPicker() {
    const input = document.getElementById('playlistPickerName');
    const playlist = createSavedPlaylist(input?.value);
    if (!playlist) return;
    if (pendingPlaylistSong) addSongToSavedPlaylist(playlist, pendingPlaylistSong);
    closePlaylistPicker();
}

function pickSavedPlaylist(playlistId) {
    const playlist = savedPlaylists.find(item => item.id === playlistId);
    if (!playlist) return;
    if (pendingPlaylistSong) {
        if (addSongToSavedPlaylist(playlist, pendingPlaylistSong)) closePlaylistPicker();
        return;
    }
    closePlaylistPicker();
    openSavedPlaylist(playlist.id);
}

function songRowMarkup(song, collection, index, allowFavoriteRemove = false) {
    const cover = getProxiedCoverUrl(song.cover || '');
    const image = cover
        ? `<img src="${escapeHtml(cover)}" alt="" onerror="this.outerHTML='<span class=mini-song-art></span>'">`
        : '<span class="mini-song-art" aria-hidden="true"></span>';
    const favoriteControl = allowFavoriteRemove
        ? `<button type="button" class="favorite-song-btn is-favorite" data-remove-favorite="${index}" aria-label="取消收藏 ${escapeHtml(song.name)}" title="取消收藏">${getIconSvg('heart', 18)}</button>`
        : '';
    return `<div class="mini-song-row${allowFavoriteRemove ? ' has-favorite-control' : ''}">${image}<div class="mini-song-meta"><strong>${escapeHtml(song.name)}</strong><small>${escapeHtml(song.artist)}</small></div><button type="button" data-play-collection="${collection}" data-song-index="${index}" aria-label="播放 ${escapeHtml(song.name)}">${getIconSvg('play', 32)}</button>${favoriteControl}</div>`;
}

function setNowPlayingArt(art, cover) {
    const url = getProxiedCoverUrl(cover || '');
    art.style.backgroundImage = url ? `url("${url.replace(/"/g, '%22')}")` : '';
    art.style.backgroundSize = 'cover';
    art.style.backgroundPosition = 'center center';
    art.style.backgroundRepeat = 'no-repeat';
}

function renderHomeNowPlaying() {
    const title = document.getElementById('homeNowPlayingTitle');
    const artist = document.getElementById('homeNowPlayingArtist');
    const art = document.getElementById('homeNowPlayingArt');
    const btn = document.getElementById('homeNowPlayingBtn');
    const openBtn = document.getElementById('homeNowPlayingOpen');
    if (!title || !artist || !art || !btn || !openBtn) return;
    if (!currentPlayingSong) {
        const standby = playlistSongs[0] || null;
        if (standby) {
            title.textContent = standby.name || '从播放列表继续';
            artist.textContent = standby.artist || '';
            setNowPlayingArt(art, standby.cover || '');
            btn.disabled = false;
            openBtn.disabled = false;
            openBtn.setAttribute('aria-label', `继续播放：${standby.name || '播放列表'}`);
            updateHomeNowPlayingControlState();
            return;
        }
        title.textContent = '还没有开始播放';
        artist.textContent = '选一首歌，让这里成为你的入口。';
        setNowPlayingArt(art, '');
        btn.disabled = true;
        openBtn.disabled = true;
        updateHomeNowPlayingControlState();
        return;
    }
    title.textContent = currentPlayingSong.name || '正在播放';
    artist.textContent = currentPlayingSong.artist || '';
    setNowPlayingArt(art, currentPlayingSong.cover || '');
    btn.disabled = false;
    openBtn.disabled = false;
    openBtn.setAttribute('aria-label', `打开正在播放：${currentPlayingSong.name || '当前歌曲'}`);
    updateHomeNowPlayingControlState();
}

function updateHomeNowPlayingControlState() {
    const btn = document.getElementById('homeNowPlayingBtn');
    if (!btn) return;
    const hasSong = Boolean(currentPlayingSong);
    if (!hasSong) {
        const hasStandby = playlistSongs.length > 0;
        btn.disabled = !hasStandby;
        btn.innerHTML = getIconSvg('play', 34);
        btn.setAttribute('aria-label', hasStandby ? '继续播放播放列表' : '播放');
        btn.setAttribute('title', hasStandby ? '继续播放播放列表' : '播放');
        return;
    }
    const canControl = Boolean(hasSong && audio.src);
    const paused = audio.paused;
    btn.disabled = !canControl;
    btn.innerHTML = getIconSvg(paused ? 'play' : 'pause', 34);
    btn.setAttribute('aria-label', paused ? '播放' : '暂停');
    btn.setAttribute('title', paused ? '播放' : '暂停');
    if (!canControl && hasSong) {
        btn.setAttribute('aria-label', '正在准备播放');
        btn.setAttribute('title', '正在准备播放');
    }
}

function renderHomeCollection() {
    const list = document.getElementById('homeCollectionList');
    if (!list) return;
    const source = recentSongs.length ? recentSongs : favoriteSongs;
    const collection = recentSongs.length ? 'recent' : 'favorites';
    if (!source.length) {
        list.innerHTML = '<div class="collection-empty">从探索里播放或收藏一首歌，<br>它就会出现在这里。</div>';
        return;
    }
    list.innerHTML = source.slice(0, 3).map((song, index) => songRowMarkup(song, collection, index)).join('');
}

function renderLibrary() {
    const favoriteList = document.getElementById('favoriteList');
    const recentList = document.getElementById('recentList');
    const savedList = document.getElementById('savedPlaylistList');
    if (!favoriteList || !recentList || !savedList) return;
    document.getElementById('favoriteCount').textContent = String(favoriteSongs.length);
    document.getElementById('recentCount').textContent = String(recentSongs.length);
    document.getElementById('playlistCount').textContent = String(savedPlaylists.length);
    document.querySelector('[data-play-collection-all="favorites"]').disabled = !favoriteSongs.length;
    document.querySelector('[data-play-collection-all="recent"]').disabled = !recentSongs.length;
    favoriteList.innerHTML = favoriteSongs.length
        ? favoriteSongs.map((song, index) => songRowMarkup(song, 'favorites', index, true)).join('')
        : '<div class="library-empty">还没有收藏。搜索结果右侧的心形按钮可以收藏歌曲。</div>';
    recentList.innerHTML = recentSongs.length
        ? recentSongs.map((song, index) => songRowMarkup(song, 'recent', index)).join('')
        : '<div class="library-empty">还没有播放记录。</div>';
    savedList.innerHTML = savedPlaylists.length
        ? savedPlaylists.map(item => {
            const firstSong = item.songs[0];
            const cover = firstSong?.cover
                ? `<img src="${escapeHtml(getProxiedCoverUrl(firstSong.cover))}" alt="" loading="lazy" onerror="this.remove()">`
                : '';
            const isOpen = item.id === activeSavedPlaylistId;
            return `<button type="button" class="saved-playlist-card${isOpen ? ' active' : ''}" data-open-saved-playlist="${escapeHtml(item.id)}"><span class="saved-playlist-card-art" aria-hidden="true">${getIconSvg('record', 22)}${cover}</span><span class="saved-playlist-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${item.songs.length} 首歌曲</small></span><span class="saved-playlist-card-open">${isOpen ? '关闭' : '打开'}</span></button>`;
        }).join('')
        : '<div class="library-empty">新建歌单后，可在搜索结果中将歌曲保存进去。</div>';
    renderSavedPlaylistDetail();
}

async function playCollectionSong(collection, index) {
    const groups = { favorites: favoriteSongs, recent: recentSongs };
    const songs = groups[collection];
    const song = songs?.[Number(index)];
    if (!song) return;
    allSongs = songs.map(toLibrarySong).filter(Boolean);
    await playSong(song.platform, song.id, song.name, song.artist, Number(index));
}

async function playSavedPlaylist(playlistId) {
    const playlist = savedPlaylists.find(item => item.id === playlistId);
    if (!playlist || !playlist.songs.length) {
        showToast('这个歌单还是空的', 'info');
        return;
    }
    allSongs = playlist.songs.map(toLibrarySong).filter(Boolean);
    const song = allSongs[0];
    await playSong(song.platform, song.id, song.name, song.artist, 0);
}

function openSavedPlaylist(playlistId) {
    activeSavedPlaylistId = activeSavedPlaylistId === playlistId
        ? ''
        : (savedPlaylists.some(item => item.id === playlistId) ? playlistId : '');
    renderLibrary();
}

async function playSavedPlaylistSong(playlistId, index) {
    const playlist = savedPlaylists.find(item => item.id === playlistId);
    const song = playlist?.songs?.[Number(index)];
    if (!song) return;
    allSongs = playlist.songs.map(toLibrarySong).filter(Boolean);
    await playSong(song.platform, song.id, song.name, song.artist, Number(index));
}

function removeSavedPlaylistSong(playlistId, index) {
    const playlist = savedPlaylists.find(item => item.id === playlistId);
    if (!playlist || !Number.isInteger(Number(index))) return;
    const [removed] = playlist.songs.splice(Number(index), 1);
    if (!removed) return;
    saveSavedPlaylists();
    queueLibraryCloudSave();
    renderLibrary();
    showToast(`已从「${playlist.name}」移除 ${removed.name}`, 'info');
}

function requestDeleteSavedPlaylist(playlistId) {
    const playlist = savedPlaylists.find(item => item.id === playlistId);
    const dialog = document.getElementById('deletePlaylistDialog');
    if (!playlist || !dialog) return;
    pendingDeletePlaylistId = playlist.id;
    document.getElementById('deletePlaylistDialogTitle').textContent = `删除歌单「${playlist.name}」吗？`;
    document.getElementById('deletePlaylistDialogMessage').textContent = '歌单中的歌曲不会被删除。';
    dialog.showModal();
}

function deleteSavedPlaylist(playlistId) {
    const playlist = savedPlaylists.find(item => item.id === playlistId);
    if (!playlist) return;
    savedPlaylists = savedPlaylists.filter(item => item.id !== playlistId);
    if (activeSavedPlaylistId === playlistId) activeSavedPlaylistId = '';
    saveSavedPlaylists();
    queueLibraryCloudSave();
    renderLibrary();
    showToast(`已删除歌单「${playlist.name}」`, 'info');
}

function renderSavedPlaylistDetail() {
    const detail = document.getElementById('savedPlaylistDetail');
    if (!detail) return;
    const playlist = savedPlaylists.find(item => item.id === activeSavedPlaylistId);
    if (!playlist) {
        activeSavedPlaylistId = '';
        detail.innerHTML = '';
        return;
    }
    const songRows = playlist.songs.length
        ? playlist.songs.map((song, index) => {
            const cover = getProxiedCoverUrl(song.cover || '');
            const art = cover
                ? `<img src="${escapeHtml(cover)}" alt="" onerror="this.outerHTML='<span class=mini-song-art></span>'">`
                : '<span class="mini-song-art" aria-hidden="true"></span>';
            return `<div class="saved-playlist-song">${art}<div class="mini-song-meta"><strong>${escapeHtml(song.name)}</strong><small>${escapeHtml(song.artist)}</small></div><button type="button" class="saved-playlist-song-play" data-play-saved-song="${escapeHtml(playlist.id)}" data-song-index="${index}" aria-label="播放 ${escapeHtml(song.name)}">${getIconSvg('play', 20)}</button><button type="button" class="saved-playlist-song-remove" data-remove-saved-song="${escapeHtml(playlist.id)}" data-song-index="${index}" aria-label="从歌单移除 ${escapeHtml(song.name)}">${getIconSvg('close', 18)}</button></div>`;
        }).join('')
        : '<div class="library-empty">歌单还是空的，从搜索结果中保存歌曲吧。</div>';
    detail.innerHTML = `<div class="saved-playlist-detail-head"><div><p class="eyebrow">歌单详情</p><h3>${escapeHtml(playlist.name)}</h3><p>${playlist.songs.length} 首歌曲</p></div><div class="saved-playlist-detail-actions"><button type="button" class="saved-playlist-play-all" data-play-saved-playlist="${escapeHtml(playlist.id)}" ${playlist.songs.length ? '' : 'disabled'}>播放全部</button><button type="button" class="saved-playlist-delete" data-delete-saved-playlist="${escapeHtml(playlist.id)}">删除歌单</button></div></div><div class="saved-playlist-song-list">${songRows}</div>`;
}

function setAppView(view) {
    const valid = ['home', 'search', 'library', 'admin'].includes(view) ? view : 'home';
    document.getElementById('homeView').style.display = valid === 'home' ? '' : 'none';
    document.getElementById('searchView').style.display = valid === 'search' ? '' : 'none';
    document.getElementById('libraryView').style.display = valid === 'library' ? '' : 'none';
    document.getElementById('adminView').style.display = valid === 'admin' && APP_CONTEXT.isAdmin ? '' : 'none';
    document.querySelectorAll('[data-view-target]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view-target') === valid);
    });
    if (valid === 'library') renderLibrary();
    if (valid === 'admin' && APP_CONTEXT.isAdmin) void loadAdminPanel();
}

async function getJson(url, init = {}) {
    const response = await apiFetch(url, { ...init, timeoutMs: 15000 });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || Number(payload?.code) !== 0) throw new Error(payload?.message || '请求失败');
    return payload.data || {};
}

function renderMembership(data) {
    const status = document.getElementById('membershipStatusText');
    const price = document.getElementById('membershipPrice');
    const button = document.getElementById('membershipCheckoutBtn');
    const hint = document.getElementById('membershipHint');
    const chip = document.getElementById('userChip');
    const badge = document.getElementById('membershipStateBadge');
    if (!status || !price || !button || !hint || !chip || !badge) return;
    if (window.APP_CONTEXT) window.APP_CONTEXT.membership = data;
    const userName = String(window.APP_CONTEXT?.user?.name || '用户');
    price.textContent = String(data.monthly_price || '10.00');
    if (data.source === 'admin') {
        chip.textContent = `${userName} · 家庭账号`;
        badge.textContent = '无需会员';
        status.textContent = '密码登录无需开通月会员。';
        button.hidden = true;
        button.disabled = true;
        hint.textContent = '';
        return;
    }
    chip.textContent = `${userName} · ${data.active ? '已开通' : '待开通'}`;
    badge.textContent = data.active ? '已开通' : '待开通';
    status.textContent = data.active ? `有效至 ${new Date(data.expires_at).toLocaleString()}` : '当前未开通会员。';
    button.textContent = data.active ? '使用 Linux DO 积分续费' : '使用 Linux DO 积分开通';
    button.hidden = false;
    button.disabled = !data.payment_configured;
    hint.textContent = data.payment_configured ? (data.active ? '续费后会在当前有效期基础上增加 30 天。' : '开通后立即获得 30 天使用时间。') : '积分支付正在配置中，请稍后再试。';
}

async function loadMembership() {
    try { renderMembership(await getJson(`${APP_API_ROOT}/membership`)); } catch (error) {
        const hint = document.getElementById('membershipHint');
        const badge = document.getElementById('membershipStateBadge');
        if (hint) hint.textContent = error.message || '会员状态读取失败';
        if (badge) badge.textContent = '读取失败';
    }
}

async function startMembershipCheckout() {
    const button = document.getElementById('membershipCheckoutBtn');
    button.disabled = true;
    try {
        const data = await getJson(`${APP_API_ROOT}/billing/checkout`, { method: 'POST' });
        window.location.assign(data.checkout_url);
    } catch (error) {
        showToast(error.message || '创建订单失败', 'error');
        await loadMembership();
    }
}

async function loadAdminPanel() {
    try {
        const overview = await getJson(`${APP_API_ROOT}/admin/overview`);
        document.getElementById('adminMembershipPrice').value = overview.monthly_price;
        document.getElementById('adminOverviewText').textContent = `当前有效会员 ${overview.active_members} 人 · 已支付订单 ${overview.paid_orders} 笔`;
        await loadAdminMembers();
    } catch (error) { document.getElementById('adminMemberList').textContent = error.message || '读取失败'; }
    await loadAdminMonitoring();
}

function memberTime(value) {
    return value ? monitorTime(value) : '—';
}

function renderAdminMembers(members) {
    const list = document.getElementById('adminMemberList');
    if (!list) return;
    list.innerHTML = members.length ? `<div class="admin-member-table" role="table"><div class="admin-member-table-head" role="row"><span>会员</span><span>Linux DO ID</span><span>注册时间</span><span>最近登录</span><span>会员开通</span><span>到期时间</span></div>${members.map(item => `<article class="admin-member-row" role="row"><div class="admin-member-identity"><strong>${escapeHtml(item.name || item.linuxdo_id)}</strong></div><span class="admin-member-id">${escapeHtml(item.linuxdo_id)}</span><time>${escapeHtml(memberTime(item.registered_at))}</time><time>${escapeHtml(memberTime(item.last_login_at))}</time><time>${escapeHtml(memberTime(item.membership_started_at))}</time><time class="admin-member-expiry">${escapeHtml(memberTime(item.expires_at))}</time></article>`).join('')}</div>` : '<p class="admin-muted admin-members-empty">没有找到有效会员。</p>';
}

async function loadAdminMembers(keyword = '') {
    const list = document.getElementById('adminMemberList');
    const search = document.getElementById('adminMemberSearch');
    if (!list) return;
    const query = String(keyword || search?.value || '').trim();
    list.setAttribute('aria-busy', 'true');
    try {
        const data = await getJson(`${APP_API_ROOT}/admin/members${query ? `?q=${encodeURIComponent(query)}` : ''}`);
        renderAdminMembers(Array.isArray(data.members) ? data.members : []);
    } catch (error) {
        list.textContent = error.message || '读取失败';
    } finally {
        list.removeAttribute('aria-busy');
    }
}

const MONITOR_SOURCE_INFO = {
    netease: { name: '网易云音乐', detail: '网易云音乐平台接口 · 搜索 / 歌单', endpoint: 'music.163.com' },
    qq: { name: 'QQ 音乐', detail: 'QQ 音乐平台接口 · 搜索 / 歌单', endpoint: 'y.qq.com' },
    kuwo: { name: '酷我音乐', detail: '酷我音乐平台接口 · 搜索 / 歌单', endpoint: 'kuwo.cn' },
    gdstudio: { name: 'GDStudio', detail: '备用解析服务 · 网易云 / 酷我 / QQ 音乐', endpoint: 'music-api.gdstudio.xyz' },
    qq_backup3: { name: '雨糖小屋 QQ 接口', detail: 'QQ 音乐专用接口 · 搜索与解析', endpoint: 'yutangxiaowu.cn' },
    qq_backup3_parse: { name: '雨糖小屋 QQ 接口', detail: 'QQ 音乐专用接口 · 播放链接解析', endpoint: 'yutangxiaowu.cn' },
    onrender: { name: 'LXMusic Onrender', detail: '多平台备用 · 网易云 / 酷我 / QQ 音乐', endpoint: 'lxmusicapi.onrender.com' },
    lxmusic_signed: { name: 'LXMusic 签名源', detail: '多平台备用 · 网易云 / 酷我 / QQ 音乐', endpoint: '88.lxmusic.xn--fiqs8s' },
    oiapi_music163: { name: 'OIAPI 网易云接口', detail: '网易云音乐专用接口 · 播放链接解析', endpoint: 'oiapi.net' },
    oiapi_kuwo: { name: 'OIAPI 酷我接口', detail: '酷我音乐专用接口 · 播放链接解析', endpoint: 'oiapi.net' },
    chksz_163: { name: 'CHKSZ 音乐接口', detail: '网易云 / QQ 音乐接口 · 搜索与播放链接解析', endpoint: 'api.chksz.com' },
    chksz_qq: { name: 'CHKSZ 音乐接口', detail: '网易云 / QQ 音乐接口 · 搜索与播放链接解析', endpoint: 'api.chksz.com' },
    jkapi: { name: 'JKAPI 音乐接口', detail: '网易云 / QQ 音乐接口 · 播放链接解析', endpoint: 'jkapi.com/api/music' },
    qqmp3: { name: 'QQMP3 酷我接口', detail: '酷我音乐专用接口 · 播放链接解析', endpoint: 'qqmp3.cn' },
};

function monitorSourceLabel(source) {
    return monitorSourceInfo(source).name;
}

function monitorSourceInfo(source) {
    const raw = String(source || '');
    return MONITOR_SOURCE_INFO[raw] || { name: raw || '未知来源', detail: '内部服务来源', endpoint: raw || '—' };
}

function monitoringCategory(item) {
    if (item?.category) return item.category;
    return ['netease', 'qq', 'kuwo'].includes(String(item?.source || '')) ? 'data' : 'resolve';
}

function monitoringHealthOrder(health) {
    return ({ healthy: 0, unstable: 1, unknown: 2, down: 3 })[String(health || '')] ?? 4;
}

function renderMonitoringServiceRow(item) {
    const info = monitorSourceInfo(item.source);
    return `<article class="monitoring-service-row"><div class="monitoring-service-title"><strong>${escapeHtml(info.name)}</strong><small>${escapeHtml(info.detail)}</small><small class="monitoring-service-endpoint">接口地址：${escapeHtml(info.endpoint)}</small></div><span class="monitoring-health monitoring-health-${escapeHtml(item.health)}">${escapeHtml(item.health_label)}</span><dl><div><dt>调用</dt><dd>${Number(item.requests || 0).toLocaleString()}</dd></div><div><dt>成功率</dt><dd>${item.success_rate === null ? '—' : monitorPercent(item.success_rate)}</dd></div><div><dt>平均响应</dt><dd>${Number(item.average_duration_ms || 0).toLocaleString()} ms</dd></div><div><dt>最近成功</dt><dd>${escapeHtml(monitorTime(item.last_success_at))}</dd></div></dl><p class="monitoring-service-note">${item.last_failure_at ? `最近失败：${escapeHtml(monitorTime(item.last_failure_at))}${item.last_status ? ` · HTTP ${Number(item.last_status)}` : ''}${item.last_error ? ` · ${escapeHtml(item.last_error)}` : ''}` : (Number(item.requests || 0) ? `接口标识：${escapeHtml(item.source)}` : '暂未产生调用记录')}</p></article>`;
}

function monitorPercent(value) {
    return `${Math.round(Math.max(0, Number(value || 0)) * 100)}%`;
}

function monitorTime(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? new Date(time).toLocaleString() : '—';
}

function renderAdminMonitoring(data) {
    const rawServices = Array.isArray(data?.services) ? data.services : [];
    const mergedServices = new Map();
    rawServices.forEach(item => {
        const source = item.source === 'chksz_qq' ? 'chksz_163' : item.source;
        const previous = mergedServices.get(source);
        if (!previous) {
            mergedServices.set(source, { ...item, source, category: source === 'chksz_163' ? 'resolve' : item.category });
            return;
        }
        const requests = Number(previous.requests || 0) + Number(item.requests || 0);
        const successes = Number(previous.successes || 0) + Number(item.successes || 0);
        const failures = Number(previous.failures || 0) + Number(item.failures || 0);
        const duration = Number(previous.average_duration_ms || 0) * Number(previous.requests || 0) + Number(item.average_duration_ms || 0) * Number(item.requests || 0);
        mergedServices.set(source, { ...previous, requests, successes, failures, success_rate: requests ? successes / requests : null, average_duration_ms: requests ? Math.round(duration / requests) : 0, last_failure_at: item.last_failure_at || previous.last_failure_at, last_error: item.last_error || previous.last_error });
    });
    const services = [...mergedServices.values()];
    const finalSources = Array.isArray(data?.final_sources) ? data.final_sources : [];
    const trend = Array.isArray(data?.trend) ? data.trend : [];
    const totalRequests = services.reduce((total, item) => total + Number(item.requests || 0), 0);
    const totalSuccesses = services.reduce((total, item) => total + Number(item.successes || 0), 0);
    const normalCount = services.filter(item => item.health === 'healthy').length;
    const unstableCount = services.filter(item => item.health === 'unstable').length;
    const downCount = services.filter(item => item.health === 'down').length;
    const finalTotal = finalSources.reduce((total, item) => total + Number(item.hits || 0), 0);
    const summary = document.getElementById('monitoringSummaryText');
    if (summary) summary.textContent = services.length
        ? `统计范围 ${data.window_days} 天 · 数据保留 ${data.retained_days} 天 · 最后汇总 ${monitorTime(data.generated_at)}`
        : '暂时还没有上游调用记录；用户搜索、打开榜单或解析歌曲后会自动出现。';

    document.getElementById('monitoringKpis').innerHTML = [
        ['累计调用', totalRequests.toLocaleString(), '不含内部最终命中计数'],
        ['整体成功率', totalRequests ? monitorPercent(totalSuccesses / totalRequests) : '—', `${totalSuccesses.toLocaleString()} 次成功`],
        ['当前健康', `${normalCount} 正常`, unstableCount || downCount ? `${unstableCount} 波动 · ${downCount} 不可用` : '没有异常来源'],
        ['最终解析', finalTotal.toLocaleString(), '成功返回播放链接的来源'],
    ].map(([label, value, note]) => `<article class="monitoring-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');

    const maxTrend = Math.max(1, ...trend.map(item => Number(item.requests || 0)));
    document.getElementById('monitoringTrend').innerHTML = trend.map(item => {
        const requests = Number(item.requests || 0);
        const successes = Number(item.successes || 0);
        const failures = Number(item.failures || 0);
        const height = Math.max(requests ? 9 : 2, Math.round((requests / maxTrend) * 100));
        const hour = new Date(item.bucket_hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="monitoring-trend-item" title="${escapeHtml(`${hour}：${requests} 请求，${successes} 成功，${failures} 失败`)}"><span class="monitoring-trend-bar" style="height:${height}%"><i style="height:${requests ? Math.round((failures / requests) * 100) : 0}%"></i></span><small>${escapeHtml(hour)}</small></div>`;
    }).join('');

    document.getElementById('monitoringFinalSources').innerHTML = finalSources.length
        ? finalSources.map(item => {
            const hits = Number(item.hits || 0);
            const percent = finalTotal ? hits / finalTotal : 0;
            return `<div class="monitoring-source-row"><div><strong>${escapeHtml(monitorSourceLabel(item.source))}</strong><small>${hits.toLocaleString()} 次最终命中</small></div><div class="monitoring-share"><span><i style="width:${Math.round(percent * 100)}%"></i></span><b>${monitorPercent(percent)}</b></div></div>`;
        }).join('')
        : '<p class="monitoring-empty">暂无成功解析记录。</p>';

    const resolveServices = services.filter(item => monitoringCategory(item) === 'resolve').sort((a, b) => monitoringHealthOrder(a.health) - monitoringHealthOrder(b.health) || Number(b.success_rate ?? -1) - Number(a.success_rate ?? -1) || Number(a.average_duration_ms || Number.MAX_SAFE_INTEGER) - Number(b.average_duration_ms || Number.MAX_SAFE_INTEGER) || Number(a.catalog_order || 999) - Number(b.catalog_order || 999));
    const dataServices = services.filter(item => monitoringCategory(item) === 'data').sort((a, b) => Number(a.catalog_order || 999) - Number(b.catalog_order || 999));
    const otherServices = services.filter(item => !['resolve', 'data'].includes(monitoringCategory(item)));
    const renderGroup = (title, note, items) => `<section class="monitoring-service-group"><div class="monitoring-service-group-heading"><strong>${title}</strong><span>${note}</span></div>${items.length ? items.map(renderMonitoringServiceRow).join('') : '<p class="monitoring-empty">暂无接口。</p>'}</section>`;
    document.getElementById('monitoringServiceList').innerHTML = services.length
        ? `${renderGroup('播放 / 下载链接解析', '健康、稳定接口优先；失效较多的自动靠后', resolveServices)}${renderGroup('歌曲 / 歌单原始数据', '提供搜索、歌单与榜单数据', dataServices)}${otherServices.length ? renderGroup('其他接口', '运行时发现的接口', otherServices) : ''}`
        : '<p class="monitoring-empty">暂无调用记录。</p>';
}

async function loadAdminMonitoring() {
    const range = document.getElementById('monitoringRange');
    const serviceList = document.getElementById('monitoringServiceList');
    if (!range || !serviceList) return;
    try {
        const data = await getJson(`${APP_API_ROOT}/admin/monitoring?days=${encodeURIComponent(range.value)}`);
        renderAdminMonitoring(data);
    } catch (error) {
        const message = error.message || '读取失败';
        document.getElementById('monitoringSummaryText').textContent = message;
        document.getElementById('monitoringKpis').innerHTML = '';
        document.getElementById('monitoringTrend').innerHTML = '<p class="monitoring-empty">暂无趋势数据。</p>';
        document.getElementById('monitoringFinalSources').innerHTML = '<p class="monitoring-empty">暂无来源数据。</p>';
        serviceList.textContent = message;
    }
}

const HOME_DIRECT_TOPLISTS = {
    netease: [
        { id: '3778678', title: '网易云热歌榜', note: '每日更新 · 点开就是歌曲列表' },
        { id: '3779629', title: '网易云新歌榜', note: '每日更新 · 点开就是歌曲列表' },
        { id: '19723756', title: '网易云飙升榜', note: '每日更新 · 点开就是歌曲列表' }
    ],
    qq: [
        { id: '26', title: 'QQ 音乐热歌榜', note: '每日更新 · 点开就是歌曲列表' },
        { id: '27', title: 'QQ 音乐新歌榜', note: '每日更新 · 点开就是歌曲列表' },
        { id: '62', title: 'QQ 音乐飙升榜', note: '每日更新 · 点开就是歌曲列表' }
    ],
    kuwo: [
        { id: 'hot', title: '酷我热歌榜', note: '热门单曲 · 点开就是歌曲列表' },
        { id: 'new', title: '酷我新歌榜', note: '新鲜上架 · 点开就是歌曲列表' }
    ]
};

function renderHomeToplistCards() {
    document.querySelectorAll('[data-home-toplist]').forEach((button, position) => {
        const platform = button.dataset.homeToplist;
        const variants = HOME_DIRECT_TOPLISTS[platform] || [];
        const item = variants[(homeToplistRotation + position) % variants.length];
        if (!item) return;
        button.dataset.toplistId = item.id;
        button.dataset.toplistName = item.title;
        const title = button.querySelector('strong');
        const note = button.querySelector('small');
        if (title) title.textContent = item.title;
        if (note) note.textContent = item.note;
    });
}

function runHomeSearch(keyword) {
    const input = String(keyword || '').trim();
    if (!input) return;
    resetSearchViewMode();
    const searchInput = document.getElementById('searchInput');
    const mode = document.getElementById('searchMode');
    if (mode) mode.value = 'keyword';
    updatePlatformSelect();
    if (searchInput) searchInput.value = input;
    setAppView('search');
    search();
}

function resetSearchViewMode() {
    const heading = document.getElementById('searchViewEyebrow');
    const title = document.getElementById('searchViewTitle');
    const description = document.getElementById('searchViewDescription');
    const searchSection = document.querySelector('#searchView .search-section');
    const toplistActions = document.getElementById('toplistActions');
    if (heading) heading.textContent = '探索';
    if (title) title.textContent = '找到想听的声音';
    if (description) description.textContent = '支持歌曲、歌单与 ID 解析。';
    if (searchSection) searchSection.style.display = '';
    if (toplistActions) toplistActions.innerHTML = '';
}

async function openToplistSongs(platform, id, name, options = {}) {
    const heading = document.getElementById('searchViewEyebrow');
    const title = document.getElementById('searchViewTitle');
    const description = document.getElementById('searchViewDescription');
    const searchSection = document.querySelector('#searchView .search-section');
    const toplistActions = document.getElementById('toplistActions');
    if (heading) heading.textContent = platformDisplayName(platform);
    if (title) title.textContent = name || '榜单歌曲';
    if (description) description.textContent = '直接播放、收藏或加入你的歌单。';
    if (searchSection) searchSection.style.display = 'none';
    if (toplistActions) toplistActions.innerHTML = '';
    setAppView('search');
    const results = document.getElementById('results');
    results.innerHTML = '<div class="empty-state">正在加载内容…</div>';
    resetKeywordPagingState();
    try {
        let songs = [];
        if (typeof options.loader === 'function') {
            songs = await options.loader();
        } else {
            const url = new URL(API_ROUTES.toplist, window.location.href);
            url.searchParams.set('platform', platform);
            url.searchParams.set('id', id);
            const response = await apiFetch(url.toString(), { timeoutMs: 20000 });
            const payload = await response.json();
            if (!response.ok || Number(payload?.code) !== 0) throw new Error(payload?.message || '榜单歌曲加载失败');
            songs = (Array.isArray(payload?.data?.songs) ? payload.data.songs : []).map(song => ({ ...song, platform }));
        }
        if (!Array.isArray(songs) || songs.length === 0) throw new Error('这里暂时没有可播放歌曲');
        displaySongsWithPagination(songs);
        if (toplistActions && songs.length > 1) {
            toplistActions.innerHTML = `<button class="toplist-play-all-btn" type="button" onclick="playAllResultSongs()">${getIconSvg('play', 17)} 全部播放（${songs.length} 首）</button>`;
        }
    } catch (error) {
        results.innerHTML = `<div class="empty-state">${escapeHtml(localizeErrorMessage(error?.message, '内容加载失败'))}</div>`;
    }
}

function formatPlayCount(count) {
    const n = Number(count || 0);
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
    return String(n);
}

async function fetchHomePlaylistCards() {
    const tasks = ['netease', 'qq'].map(async platform => {
        const url = new URL(API_ROUTES.playlists, window.location.href);
        url.searchParams.set('platform', platform);
        const response = await apiFetch(url.toString(), { timeoutMs: 15000 });
        const payload = await response.json();
        if (!response.ok || Number(payload?.code) !== 0) throw new Error('歌单列表加载失败');
        const list = Array.isArray(payload?.data?.playlists) ? payload.data.playlists : [];
        return list.map(item => ({ ...item, platform }));
    });
    const settled = await Promise.allSettled(tasks);
    return settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}

function playlistCardKey(item) {
    return `${String(item?.platform || '')}:${String(item?.id || '')}`;
}

function shuffleHomePlaylistCards(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const pick = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[pick]] = [shuffled[pick], shuffled[index]];
    }
    return shuffled;
}

function pickHomePlaylistCards(cards) {
    const previous = new Set(homePlaylistKeys);
    const selected = [];
    const selectedKeys = new Set();
    const platforms = ['netease', 'qq'];

    platforms.forEach(platform => {
        const seen = new Set();
        const unique = shuffleHomePlaylistCards(cards.filter(item => item?.platform === platform))
            .filter(item => {
                const key = playlistCardKey(item);
                if (!item?.id || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        const fresh = unique.filter(item => !previous.has(playlistCardKey(item)));
        const platformPicks = (fresh.length >= 2 ? fresh : unique).slice(0, 2);
        platformPicks.forEach(item => selectedKeys.add(playlistCardKey(item)));
        selected.push(...platformPicks);
    });

    if (selected.length < 4) {
        shuffleHomePlaylistCards(cards).some(item => {
            const key = playlistCardKey(item);
            if (!item?.id || selectedKeys.has(key)) return false;
            selected.push(item);
            selectedKeys.add(key);
            return selected.length >= 4;
        });
    }

    return shuffleHomePlaylistCards(selected).slice(0, 4);
}

function renderHomePlaylistCards(cards, options = {}) {
    const grid = document.querySelector('.mood-grid');
    if (!grid || cards.length === 0) return false;
    const picked = pickHomePlaylistCards(cards);
    if (picked.length === 0) return false;
    homePlaylistKeys = picked.map(playlistCardKey);

    grid.innerHTML = picked.map((item, index) => `
        <button class="mood-card playlist-mood-card${options.animate ? ' is-entering' : ''}" type="button" style="--playlist-card-delay:${index * 42}ms" data-playlist-platform="${escapeHtml(item.platform)}" data-playlist-id="${escapeHtml(item.id)}" data-playlist-name="${escapeForSingleQuote(item.name)}">
            <img class="playlist-card-cover" src="${escapeHtml(getProxiedCoverUrl(item.cover || ''))}" alt="" onerror="this.style.display='none'">
            <span>${escapeHtml(platformDisplayName(item.platform))} 歌单</span>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${Number(item.playCount || 0) > 0 ? `${formatPlayCount(item.playCount)} 次播放` : `${Number(item.trackCount || 0)} 首歌曲`}</small>
        </button>`).join('');
    grid.querySelectorAll('[data-playlist-id]').forEach(button => {
        button.addEventListener('click', () => {
            openToplistSongs(button.dataset.playlistPlatform, button.dataset.playlistId, button.dataset.playlistName, {
                loader: () => fetchPlaylistSongs(button.dataset.playlistPlatform, button.dataset.playlistId)
            });
        });
    });
    return true;
}

async function initHomePlaylists({ animate = false } = {}) {
    if (homePlaylistRefreshInFlight) return;
    homePlaylistRefreshInFlight = true;
    const refreshButton = document.querySelector('[data-home-playlist-refresh]');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = '更新中…';
    }
    const grid = document.querySelector('.mood-grid');
    try {
        const cards = await fetchHomePlaylistCards();
        if (animate && grid?.querySelector('.playlist-mood-card')) {
            grid.classList.add('is-refreshing');
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        const rendered = renderHomePlaylistCards(cards, { animate });
        if (rendered && grid?.classList.contains('is-refreshing')) {
            requestAnimationFrame(() => requestAnimationFrame(() => grid.classList.remove('is-refreshing')));
        } else {
            grid?.classList.remove('is-refreshing');
        }
    } catch {
        // 歌单列表不可用时保留原有关键词卡片。
        grid?.classList.remove('is-refreshing');
    } finally {
        homePlaylistRefreshInFlight = false;
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = '换一批';
        }
    }
}

function initHomeInterface() {
    favoriteSongs = loadLocalSongList(favoriteStorageKey, 500);
    recentSongs = loadLocalSongList(recentStorageKey, 24);
    savedPlaylists = loadSavedPlaylists();
    renderHomeNowPlaying();
    renderHomeCollection();
    renderLibrary();
    void restoreLibraryFromCloud();
    void loadMembership();
    document.querySelectorAll('[data-view-target]').forEach(item => item.addEventListener('click', event => {
        if (item.tagName === 'A') event.preventDefault();
        const target = item.getAttribute('data-view-target');
        if (target === 'search') resetSearchViewMode();
        setAppView(target);
    }));
    const membershipMenu = document.getElementById('userMembershipMenu');
    const membershipToggle = document.getElementById('userChip');
    const membershipPopover = document.getElementById('membershipPopover');
    const setMembershipMenuOpen = open => {
        if (!membershipMenu || !membershipToggle || !membershipPopover) return;
        membershipMenu.classList.toggle('is-open', open);
        membershipToggle.setAttribute('aria-expanded', String(open));
        membershipPopover.setAttribute('aria-hidden', String(!open));
        membershipPopover.inert = !open;
        if (open) void loadMembership();
    };
    membershipToggle?.addEventListener('click', () => setMembershipMenuOpen(!membershipMenu?.classList.contains('is-open')));
    document.addEventListener('click', event => {
        if (membershipMenu && !membershipMenu.contains(event.target)) setMembershipMenuOpen(false);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && membershipMenu?.classList.contains('is-open')) {
            setMembershipMenuOpen(false);
            membershipToggle?.focus();
        }
    });
    document.getElementById('membershipCheckoutBtn')?.addEventListener('click', startMembershipCheckout);
    document.getElementById('saveMembershipPriceBtn')?.addEventListener('click', async () => {
        const price = document.getElementById('adminMembershipPrice').value;
        try { await getJson(`${APP_API_ROOT}/admin/settings/membership`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_price: price }) }); showToast('月会员价格已保存', 'success'); await loadAdminPanel(); } catch (error) { showToast(error.message || '保存失败', 'error'); }
    });
    document.getElementById('refreshMembersBtn')?.addEventListener('click', () => void loadAdminMembers());
    document.getElementById('adminMemberSearch')?.addEventListener('search', () => void loadAdminMembers());
    document.getElementById('adminMemberSearch')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); void loadAdminMembers(); }
    });
    document.getElementById('grantMembershipForm')?.addEventListener('submit', async event => {
        event.preventDefault();
        const target = String(document.getElementById('grantMemberTarget')?.value || '').trim();
        const days = Number(document.getElementById('grantMemberDays')?.value || 0);
        const note = String(document.getElementById('grantMemberNote')?.value || '').trim();
        try {
            const result = await getJson(`${APP_API_ROOT}/admin/members/grant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, days, note }) });
            showToast(`已向 ${result.name || result.linuxdo_id} 赠送 ${result.days} 天会员`, 'success');
            document.getElementById('grantMembershipForm').reset();
            document.getElementById('grantMemberDays').value = '30';
            await loadAdminPanel();
        } catch (error) { showToast(error.message || '赠送失败', 'error'); }
    });
    document.getElementById('monitoringRange')?.addEventListener('change', () => void loadAdminMonitoring());
    document.getElementById('refreshMonitoringBtn')?.addEventListener('click', () => void loadAdminMonitoring());
    document.getElementById('homeSearchForm')?.addEventListener('submit', event => {
        event.preventDefault();
        runHomeSearch(document.getElementById('homeSearchInput')?.value);
    });
    document.querySelectorAll('[data-search-keyword]').forEach(button => button.addEventListener('click', () => runHomeSearch(button.getAttribute('data-search-keyword'))));
    document.querySelectorAll('[data-home-toplist]').forEach(button => button.addEventListener('click', () => {
        openToplistSongs(button.dataset.homeToplist, button.dataset.toplistId, button.dataset.toplistName);
    }));
    document.querySelector('[data-toplist-refresh]')?.addEventListener('click', () => {
        homeToplistRotation += 1;
        sessionStorage.setItem('downloadmusic_home_toplist_rotation', String(homeToplistRotation));
        renderHomeToplistCards();
    });
    document.getElementById('homeNowPlayingOpen')?.addEventListener('click', () => {
        if (currentPlayingSong) setFullPlayerOpen(true);
        else if (playlistSongs.length > 0) playSongFromPlaylist(0);
    });
    document.getElementById('homeNowPlayingBtn')?.addEventListener('click', async event => {
        event.stopPropagation();
        if (!currentPlayingSong) {
            if (playlistSongs.length > 0) {
                await playSongFromPlaylist(0);
            }
            return;
        }
        if (!currentPlayingSong || !audio.src) return;
        if (audio.paused) {
            try {
                await audio.play();
            } catch (error) {
                showToast(`播放失败: ${error?.message || '未知错误'}`, 'error');
            }
        } else {
            audio.pause();
        }
        updateHomeNowPlayingControlState();
    });
    document.getElementById('createPlaylistBtn')?.addEventListener('click', () => openPlaylistPicker());
    document.getElementById('playlistPickerCloseBtn')?.addEventListener('click', closePlaylistPicker);
    document.getElementById('playlistPickerCreateForm')?.addEventListener('submit', event => {
        event.preventDefault();
        createPlaylistFromPicker();
    });
    document.getElementById('playlistPickerName')?.addEventListener('input', event => {
        renderPlaylistPicker(event.target.value);
    });
    document.getElementById('playlistPickerList')?.addEventListener('click', event => {
        const item = event.target.closest('[data-pick-saved-playlist]');
        if (item && !item.disabled) pickSavedPlaylist(item.dataset.pickSavedPlaylist);
    });
    document.getElementById('playlistPicker')?.addEventListener('close', () => {
        pendingPlaylistSong = null;
    });
    document.getElementById('deletePlaylistCancelBtn')?.addEventListener('click', () => document.getElementById('deletePlaylistDialog')?.close());
    document.getElementById('deletePlaylistConfirmBtn')?.addEventListener('click', () => {
        if (pendingDeletePlaylistId) deleteSavedPlaylist(pendingDeletePlaylistId);
        document.getElementById('deletePlaylistDialog')?.close();
    });
    document.getElementById('deletePlaylistDialog')?.addEventListener('close', () => {
        pendingDeletePlaylistId = '';
    });
    document.querySelectorAll('[data-play-collection-all]').forEach(button => button.addEventListener('click', () => {
        playCollectionSong(button.dataset.playCollectionAll, 0);
    }));
    document.getElementById('favoriteList')?.addEventListener('click', event => {
        const favoriteButton = event.target.closest('[data-remove-favorite]');
        if (favoriteButton) {
            removeFavoriteSong(favoriteButton.dataset.removeFavorite);
            return;
        }
        const button = event.target.closest('[data-play-collection]');
        if (button) playCollectionSong(button.dataset.playCollection, button.dataset.songIndex);
    });
    document.getElementById('recentList')?.addEventListener('click', event => {
        const button = event.target.closest('[data-play-collection]');
        if (button) playCollectionSong(button.dataset.playCollection, button.dataset.songIndex);
    });
    document.getElementById('homeCollectionList')?.addEventListener('click', event => {
        const button = event.target.closest('[data-play-collection]');
        if (button) playCollectionSong(button.dataset.playCollection, button.dataset.songIndex);
    });
    document.getElementById('savedPlaylistList')?.addEventListener('click', event => {
        const card = event.target.closest('[data-open-saved-playlist]');
        if (card) openSavedPlaylist(card.dataset.openSavedPlaylist);
    });
    document.getElementById('savedPlaylistDetail')?.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.dataset.playSavedPlaylist) {
            playSavedPlaylist(target.dataset.playSavedPlaylist);
        } else if (target.dataset.playSavedSong) {
            playSavedPlaylistSong(target.dataset.playSavedSong, Number(target.dataset.songIndex));
        } else if (target.dataset.removeSavedSong) {
            removeSavedPlaylistSong(target.dataset.removeSavedSong, Number(target.dataset.songIndex));
        } else if (target.dataset.deleteSavedPlaylist) {
            requestDeleteSavedPlaylist(target.dataset.deleteSavedPlaylist);
        }
    });
    document.querySelector('[data-home-playlist-refresh]')?.addEventListener('click', () => initHomePlaylists({ animate: true }));
    renderHomeToplistCards();
    initHomePlaylists();
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
        backup: cloneBackupMeta(song?.backup),
        backup3: cloneBackup3Meta(song?.backup3)
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
            let parsed = null;
            try {
                parsed = await ensureParsedSong(source, id, quality);
            } catch (primaryError) {
                parsed = await resolveBackup4Parsed(source, id, quality, {
                    name,
                    artist,
                    cover: runtimeSong?.cover || options.cover || ''
                }).catch(() => null);
                if (!parsed) {
                    throw primaryError;
                }
            }
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

        const songMeta = {
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
        };

        audio.src = playUrl;
        currentPlayingIndex = inlineIndex;
        if (player) {
            player.style.display = 'flex';
        }

        await audio.play();
        bindSongMeta(songMeta);
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
    let runtimeSong;
    try {
        runtimeSong = await resolveLookupOnlySong(getSongByIndex(Number(index)));
    } catch (error) {
        showToast(`播放失败: ${error.message || '无法匹配歌曲'}`, 'error');
        return;
    }
    source = String(runtimeSong?.platform || runtimeSong?.source || source);
    id = String(runtimeSong?.id || id);
    name = String(runtimeSong?.name || name);
    artist = String(runtimeSong?.artist || artist);
    const queueIndex = findPlaylistIndex(source, id);
    if (queueIndex >= 0) {
        currentPlaylistIndex = queueIndex;
    } else {
        // 从列表播放时把当前列表同步进播放队列，保证上一首/下一首可用。
        const seen = new Set(playlistSongs.map(songIdentity));
        allSongs.forEach(song => {
            const item = toLibrarySong(song);
            if (!item || seen.has(songIdentity(item))) return;
            seen.add(songIdentity(item));
            playlistSongs.push(item);
        });
        const resolvedItem = toLibrarySong(runtimeSong);
        if (resolvedItem && !seen.has(songIdentity(resolvedItem))) {
            playlistSongs.push(resolvedItem);
        }
        savePlaylistToStorage();
        currentPlaylistIndex = findPlaylistIndex(source, id);
    }
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
    updateHomeNowPlayingControlState();
    playByMode(1, { fromEnded: true }).catch(() => {});
});

audio.addEventListener('play', () => {
    syncInlinePlayButtonState();
    updateFullPlayerControlState();
    updateHomeNowPlayingControlState();
});

audio.addEventListener('pause', () => {
    syncInlinePlayButtonState();
    updateFullPlayerControlState();
    updateHomeNowPlayingControlState();
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
                lookupOnly: Boolean(item.lookupOnly),
                backup: cloneBackupMeta(item?.backup),
                backup3: cloneBackup3Meta(item?.backup3)
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
    updatePlayerFabPreview();
    updateFullPlayerControlState();

    if (playlistSongs.length === 0) {
        listEl.innerHTML = '<div class="playlist-empty">播放列表为空，搜索后点击“添加”按钮</div>';
        return;
    }

    listEl.innerHTML = playlistSongs.map((song, index) => {
        const active = currentPlaylistIndex === index ? ' active' : '';
        const cover = getProxiedCoverUrl(song.cover || '');
        const platform = platformDisplayName(song.platform || song.source);
        return `
            <div class="playlist-item${active}" data-index="${index}">
                <img class="playlist-item-cover" src="${escapeHtml(cover)}" alt="" onerror="this.style.visibility='hidden'">
                <div class="playlist-item-meta">
                    <h4>${escapeHtml(song.name)}</h4>
                    <p>${escapeHtml(song.artist)} · ${escapeHtml(platform)}</p>
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
    icon.innerHTML = getIconSvg(active ? 'fullscreen-exit' : 'fullscreen-enter', 20);
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
        updatePlayerFabPreview();
        return;
    }

    titleEl.textContent = currentPlayingSong.name || '未知歌曲';
    artistEl.textContent = currentPlayingSong.artist || '未知歌手';
    coverEl.src = getProxiedCoverUrl(currentPlayingSong.cover || '');
    updateFullPlayerLyric(audio.currentTime || 0);
    updatePlayerFabPreview();
}

function updatePlayerFabPreview() {
    const playerFab = document.getElementById('playerFabBtn');
    const cover = document.getElementById('playerFabCover');
    const title = document.getElementById('playerFabTrackName');
    const previewSong = currentPlayingSong || playlistSongs[0] || null;
    if (title) title.textContent = previewSong?.name || '还没有开始播放';
    if (!playerFab || !cover) return;
    playerFab.classList.remove('has-cover');
    cover.removeAttribute('src');
    const source = getProxiedCoverUrl(previewSong?.cover || '');
    if (!source) return;
    cover.onload = () => playerFab.classList.add('has-cover');
    cover.onerror = () => playerFab.classList.remove('has-cover');
    cover.src = source;
}

function updateFullPlayerControlState() {
    const toggleBtn = document.getElementById('fullPlayerToggleBtn');
    const toggleIcon = document.getElementById('fullPlayerToggleIcon');
    const playerFab = document.getElementById('playerFabBtn');
    const quickToggleBtn = document.getElementById('playerFabToggleBtn');
    const quickPrevBtn = document.getElementById('playerFabPrevBtn');
    const quickNextBtn = document.getElementById('playerFabNextBtn');
    const paused = audio.paused;
    const canControl = Boolean(currentPlayingSong && audio.src);
    const canStartFromQueue = !currentPlayingSong && playlistSongs.length > 0;
    const canToggle = canControl || canStartFromQueue;
    if (toggleIcon) {
        toggleIcon.innerHTML = getIconSvg(paused ? 'play' : 'pause', 22);
    }
    if (toggleBtn) {
        toggleBtn.disabled = !canToggle;
        toggleBtn.setAttribute('aria-label', canStartFromQueue ? '播放播放列表' : (paused ? '播放' : '暂停'));
    }
    if (quickToggleBtn) {
        quickToggleBtn.disabled = !canToggle;
        quickToggleBtn.innerHTML = getIconSvg(paused ? 'play' : 'pause', 20);
        quickToggleBtn.setAttribute('aria-label', canStartFromQueue ? '播放播放列表' : (paused ? '播放' : '暂停'));
        quickToggleBtn.setAttribute('title', canStartFromQueue ? '播放播放列表' : (paused ? '播放' : '暂停'));
    }
    [quickPrevBtn, quickNextBtn].forEach(button => {
        if (button) button.disabled = !canControl;
    });
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

async function addSongToPlaylist(source, id, name, artist, album = '', cover = '', index = null) {
    let runtimeSong;
    try {
        runtimeSong = await resolveLookupOnlySong(getSongByIndex(Number(index)));
    } catch (error) {
        showToast(`加入播放列表失败: ${error.message || '无法匹配歌曲'}`, 'error');
        return;
    }
    const platform = String(runtimeSong?.platform || runtimeSong?.source || source || '').trim();
    const songId = String(runtimeSong?.id || id || '').trim();
    name = String(runtimeSong?.name || name);
    artist = String(runtimeSong?.artist || artist);
    album = String(runtimeSong?.album || album);
    cover = String(runtimeSong?.cover || cover);
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
        lookupOnly: Boolean(runtimeSong?.lookupOnly),
        backup: cloneBackupMeta(runtimeSong?.backup),
        backup3: cloneBackup3Meta(runtimeSong?.backup3)
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
    const wasLookupOnly = Boolean(item.lookupOnly);
    await resolveLookupOnlySong(item).catch(() => item);
    if (wasLookupOnly && !item.lookupOnly) {
        savePlaylistToStorage();
    }
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
    const playerFabPrevBtn = document.getElementById('playerFabPrevBtn');
    const playerFabToggleBtn = document.getElementById('playerFabToggleBtn');
    const playerFabNextBtn = document.getElementById('playerFabNextBtn');
    const fullProgressBar = document.getElementById('fullPlayerProgressBar');
    const fullPlayerOverlay = document.getElementById('fullPlayerOverlay');

    if (playlistFabBtn) {
        playlistFabBtn.addEventListener('click', () => {
            setPlaylistSheetOpen(!isPlaylistSheetOpen);
        });
    }
    if (playerFabBtn) {
        playerFabBtn.addEventListener('click', async () => {
            if (!currentPlayingSong) {
                if (playlistSongs.length) {
                    await playSongFromPlaylist(0);
                    return;
                }
                showToast('请先播放一首歌', 'info');
                return;
            }
            setFullPlayerOpen(!isFullPlayerOpen);
        });
    }
    if (playerFabPrevBtn) playerFabPrevBtn.addEventListener('click', () => fullPlayerPrevBtn?.click());
    if (playerFabToggleBtn) playerFabToggleBtn.addEventListener('click', () => fullPlayerToggleBtn?.click());
    if (playerFabNextBtn) playerFabNextBtn.addEventListener('click', () => fullPlayerNextBtn?.click());
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
            resetSearchViewMode();
            setAppView('search');
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
            if (!currentPlayingSong || !audio.src) {
                if (playlistSongs.length) await playSongFromPlaylist(0);
                return;
            }
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
initStaticIcons();
currentPlayMode = loadPlayModeFromStorage();
playlistSongs = loadPlaylistFromStorage();
initHomeInterface();
renderPlaylistSheet();
bindPlayerUiEvents();
updateFullPlayerMeta();
updateFullPlayerProgress();
updateFullPlayerControlState();
updatePlayModeButtonState();
updateBrowserFullscreenButtonState();
checkStatus();
setInterval(checkStatus, 60000);
