const API_BASE = String(window.APP_API_BASE || '/api/proxy').replace(/\/$/, '');
const API_ROUTES = {
    parse: `${API_BASE}/parse`,
    meta: `${API_BASE}/meta`,
    method: `${API_BASE}/method`,
    methods: `${API_BASE}/methods`,
    media: `${API_BASE}/media`
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
const LOCAL_KEY_PREFIX = 'downloadmusic_tunehub_key_';
const linuxdoUserId = String(APP_CONTEXT?.user?.linuxdo_id || '').trim();
const linuxdoKeyStorageKey = `${LOCAL_KEY_PREFIX}${linuxdoUserId || 'default'}`;
let linuxdoUserKey = '';
const playlistStorageKey = `${LOCAL_KEY_PREFIX}playlist_${AUTH_TYPE}_${linuxdoUserId || 'default'}`;
let playlistSongs = [];
let isFullPlayerOpen = false;
let isPlaylistSheetOpen = false;
let playlistSheetHideTimer = null;
let fullPlayerHideTimer = null;

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
        throw new Error(data.message || `解析失败 (${response.status})`);
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
        cover: normalizeMediaUrl(item.cover || item.pic || item?.info?.pic || '')
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
        throw new Error(matched.error || `解析失败: ${id}`);
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
        throw new Error(data.message || '获取元数据失败');
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

    const response = await apiFetch(url.toString(), {
        timeoutMs: Number(options.timeoutMs || 0)
    });
    const data = await response.json();
    if (!response.ok || Number(data.code) !== 0) {
        throw new Error(data.message || '请求失败');
    }
    return data.data;
}

// 检查服务状态并获取平台信息
async function checkStatus() {
    try {
        const response = await apiFetch(API_ROUTES.methods);
        const methodsData = await response.json();

        if (response.ok && Number(methodsData.code) === 0 && methodsData.data) {
            supportedPlatforms = Object.keys(methodsData.data);
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
            throw new Error(methodsData.message || '服务异常');
        }
    } catch {
        document.getElementById('serviceStatus').innerHTML =
            `服务状态: <span class="offline">异常</span>`;
        document.getElementById('healthStatus').innerHTML =
            `健康状态: <span class="offline">异常</span>`;
    }
}

// 更新平台下拉框
function updatePlatformSelect() {
    const platformSelect = document.getElementById('platform');
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

async function searchSongsByKeyword(keyword, selectedPlatform) {
    const fallback = supportedPlatforms.includes('netease') ? 'netease' : supportedPlatforms[0];
    const platform = supportedPlatforms.includes(selectedPlatform) ? selectedPlatform : fallback;
    const targets = platform ? [platform] : [];
    if (targets.length === 0) {
        throw new Error('暂无可用平台');
    }

    const timeoutMs = 8000;
    const searchOnePlatform = async targetPlatform => {
        const result = await callPlatformMethod(targetPlatform, 'search', {
            keyword,
            page: 1,
            limit: 20
        }, {
            timeoutMs
        });
        const list = Array.isArray(result) ? result : [];
        return list.map(item => ({
            id: String(item.id || ''),
            name: item.name || '未知歌曲',
            artist: item.artist || '未知歌手',
            album: item.album || '',
            source: targetPlatform,
            platform: targetPlatform,
            cover: normalizeMediaUrl(item.cover || '')
        }));
    };

    const tasks = targets.map(async platform => {
        return searchOnePlatform(platform);
    });

    const settled = await Promise.allSettled(tasks);
    const songs = [];
    let failed = 0;
    settled.forEach(item => {
        if (item.status === 'fulfilled') {
            songs.push(...item.value);
        } else {
            failed += 1;
        }
    });

    if (failed > 0) {
        showToast(`部分平台搜索失败（${failed}/${targets.length}）`, 'error');
    }

    if (songs.length === 0 && failed > 0) {
        throw new Error('平台响应超时或失败，请稍后重试');
    }

    return songs;
}

async function fetchPlaylistSongs(platform, playlistId) {
    const result = await callPlatformMethod(platform, 'playlist', {
        id: playlistId
    });

    const list = Array.isArray(result?.list) ? result.list : [];
    return list.map(song => ({
        id: String(song.id || ''),
        name: song.name || '未知歌曲',
        artist: song.artist || '未知歌手',
        album: song.album || '',
        source: platform,
        platform,
        cover: normalizeMediaUrl(song.cover || '')
    }));
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

        if (searchMode === 'keyword') {
            if (currentSearchType === 'playlist') {
                resultsDiv.innerHTML = '<div class="empty-state">TuneHub V3 暂不支持关键词歌单搜索，请切换 ID 模式</div>';
                return;
            }

            const songs = await searchSongsByKeyword(input, platform);
            if (songs.length > 0) {
                displaySongsWithPagination(songs);
            } else {
                resultsDiv.innerHTML = `<div class="empty-state">${platformDisplayName(platform)}没有结果，请切换其他平台检索</div>`;
            }
            return;
        }

        if (currentSearchType === 'song') {
            const parseResp = await parseSongs(platform, input, quality);
            const parsedItems = normalizeParsedItems(platform, quality, parseResp);
            const successSongs = parsedItems
                .filter(item => item.success)
                .map(item => toSongFromParsedItem(platform, item));

            if (successSongs.length > 0) {
                displaySongsWithPagination(successSongs);
            } else {
                const firstError = parsedItems.find(item => !item.success);
                resultsDiv.innerHTML = `<div class="empty-state">${firstError?.error || '解析失败'}</div>`;
            }
        } else {
            const songs = await fetchPlaylistSongs(platform, input);
            if (songs.length > 0) {
                displaySongsWithPagination(songs);
            } else {
                resultsDiv.innerHTML = '<div class="empty-state">未找到歌单歌曲</div>';
            }
        }
    } catch (error) {
        resultsDiv.innerHTML = `<div class="empty-state">${error.message || '搜索失败'}</div>`;
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
                    <button class="add-playlist-btn" onclick="addSongToPlaylist('${platform}', '${song.id}', '${safeName}', '${safeArtist}', '${safeAlbum}', '${safeCover}')">＋</button>
                    <button onclick="downloadSong('${platform}', '${song.id}', '${safeName}', '${safeArtist}')">下载</button>
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

    if (totalPages > 1) {
        resultsDiv.innerHTML += `
            <div class="pagination">
                <button onclick="changeLocalPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
                <span>第 ${currentPage} / ${totalPages} 页</span>
                <button onclick="changeLocalPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
            </div>
        `;
    }

    // 某些平台搜索接口不返回封面，当前页按需补全。
    hydrateMissingCovers(pageSongs, start);
    syncInlinePlayButtonState();
}

function changeLocalPage(page) {
    const totalPages = Math.ceil(allSongs.length / pageSize);
    if (page < 1 || page > totalPages) return;
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

        // 不消耗积分的补全方式：网易云优先读取公开 H5 元数据。
        if (platform === 'netease') {
            try {
                const meta = await fetchSongMeta(platform, song.id);
                const coverUrl = normalizeMediaUrl(meta.cover || '');
                if (coverUrl) {
                    setCover(coverUrl);
                }
            } catch {
                // ignore free metadata errors
            }
        }
    });
}

// 下载单曲
async function downloadSong(source, id, name, artist) {
    try {
        const quality = document.getElementById('quality').value;
        const parsed = await ensureParsedSong(source, id, quality);
        if (!parsed.url) {
            throw new Error(parsed.error || '未获取到下载链接');
        }
        const url = buildMediaProxyUrl(parsed.url, {
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
        const songs = await fetchPlaylistSongs(source, id);
        if (songs.length === 0) {
            showToast('获取歌单失败或为空', 'error');
            return;
        }

        const total = songs.length;
        showToast(`开始下载歌单，共${total}首`, 'info');

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            showToast(`正在下载 ${i + 1}/${total}: ${song.name}`, 'info');
            await downloadSong(source, song.id, song.name, song.artist);
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

function bindSongMeta(song) {
    currentPlayingSong = {
        id: String(song.id || ''),
        name: String(song.name || '未知歌曲'),
        artist: String(song.artist || '未知歌手'),
        platform: String(song.platform || song.source || ''),
        cover: String(song.cover || ''),
        lyricsRaw: String(song.lyricsRaw || ''),
        lyrics: Array.isArray(song.lyrics) ? song.lyrics : []
    };
    currentLyrics = currentPlayingSong.lyrics;
    updateFullPlayerMeta();
}

async function playSongCore(source, id, name, artist, options = {}) {
    const quality = document.getElementById('quality').value;
    const inlineIndex = Number.isInteger(options.inlineIndex) ? options.inlineIndex : null;
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
        const parsed = await ensureParsedSong(source, id, quality);
        if (playRequestId !== activePlayRequestId) return;
        if (!parsed.url) {
            throw new Error(parsed.error || '未获取到播放链接');
        }

        resetInlinePlaybackUi(inlineIndex);

        const rawCover = normalizeMediaUrl(parsed.cover || parsed.pic || parsed?.info?.pic || options.cover || '');
        const parsedCoverUrl = getProxiedCoverUrl(rawCover);
        if (parsedCoverUrl && inlineIndex !== null) {
            const coverImg = document.getElementById(`cover-${inlineIndex}`);
            if (coverImg) {
                coverImg.src = parsedCoverUrl;
                coverImg.style.display = 'block';
            }
        }

        const parsedLyrics = parseLyrics(parsed.lyrics || '');
        if (inlineLyrics) {
            inlineLyrics.textContent = parsedLyrics.length > 0 ? parsedLyrics[0].text : '';
        }

        const playUrl = buildMediaProxyUrl(parsed.url);
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
            platform: source,
            cover: rawCover,
            lyricsRaw: parsed.lyrics || '',
            lyrics: parsedLyrics
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
    const queueIndex = findPlaylistIndex(source, id);
    currentPlaylistIndex = queueIndex;
    renderPlaylistSheet();
    await playSongCore(source, id, name, artist, {
        inlineIndex: index
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
                cover: normalizeMediaUrl(item.cover || '')
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
        return;
    }

    isFullPlayerOpen = false;
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

function addSongToPlaylist(source, id, name, artist, album = '', cover = '') {
    const platform = String(source || '').trim();
    const songId = String(id || '').trim();
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
        cover: normalizeMediaUrl(cover || '')
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
        cover: item.cover
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
    const fullPlayerToggleBtn = document.getElementById('fullPlayerToggleBtn');
    const fullPlayerPrevBtn = document.getElementById('fullPlayerPrevBtn');
    const fullPlayerNextBtn = document.getElementById('fullPlayerNextBtn');
    const fullProgressBar = document.getElementById('fullPlayerProgressBar');

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
            await playNextInPlaylist(-1);
        });
    }
    if (fullPlayerNextBtn) {
        fullPlayerNextBtn.addEventListener('click', async () => {
            await playNextInPlaylist(1);
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
playlistSongs = loadPlaylistFromStorage();
renderPlaylistSheet();
bindPlayerUiEvents();
updateFullPlayerMeta();
updateFullPlayerProgress();
updateFullPlayerControlState();
updateBrowserFullscreenButtonState();
checkStatus();
initLinuxdoKeyPanel();
setInterval(checkStatus, 60000);
