const API_BASE = 'proxy';

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
const audio = document.getElementById('audio');

// 缓存
const parseCache = new Map();

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

function parseResponseText(text) {
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

async function parseSongs(platform, ids, quality) {
    const response = await fetch(`${API_BASE}/parse.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
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
        cover: item.cover || ''
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

async function callPlatformMethod(platform, functionName, vars = {}) {
    const url = new URL(`${API_BASE}/method.php`, window.location.href);
    url.searchParams.set('platform', platform);
    url.searchParams.set('functionName', functionName);
    Object.entries(vars).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== '') {
            url.searchParams.set(k, String(v));
        }
    });

    const response = await fetch(url.toString());
    const data = await response.json();
    if (!response.ok || Number(data.code) !== 0) {
        throw new Error(data.message || '请求失败');
    }
    return data.data;
}

// 检查服务状态并获取平台信息
async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/methods.php`);
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
    const searchMode = document.getElementById('searchMode').value;

    let options = '';
    if (searchMode === 'keyword' && currentSearchType === 'song') {
        options = '<option value="all">全部</option>';
    }
    options += supportedPlatforms.map(key =>
        `<option value="${key}">${platformNames[key] || key}</option>`
    ).join('');

    platformSelect.innerHTML = options;
}

async function searchSongsByKeyword(keyword, selectedPlatform) {
    const targets = selectedPlatform === 'all' ? supportedPlatforms : [selectedPlatform];
    const tasks = targets.map(async platform => {
        const result = await callPlatformMethod(platform, 'search', {
            keyword,
            page: 1,
            limit: 50
        });
        const list = Array.isArray(result) ? result : [];
        return list.map(item => ({
            id: String(item.id || ''),
            name: item.name || '未知歌曲',
            artist: item.artist || '未知歌手',
            album: item.album || '',
            source: platform,
            platform,
            cover: ''
        }));
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
        cover: ''
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
                resultsDiv.innerHTML = '<div class="empty-state">未找到结果</div>';
            }
            return;
        }

        if (platform === 'all') {
            resultsDiv.innerHTML = '<div class="empty-state">ID 模式下请选择具体平台</div>';
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
        const coverUrl = song.cover || '';
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
}

function changeLocalPage(page) {
    const totalPages = Math.ceil(allSongs.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderLocalPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 下载单曲
async function downloadSong(source, id, name, artist) {
    try {
        const quality = document.getElementById('quality').value;
        const parsed = await ensureParsedSong(source, id, quality);
        if (!parsed.url) {
            throw new Error(parsed.error || '未获取到下载链接');
        }
        window.open(parsed.url, '_blank');
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

// 播放歌曲
async function playSong(source, id, name, artist, index) {
    const quality = document.getElementById('quality').value;
    const btn = document.querySelector(`button[data-index="${index}"]`);
    const player = document.getElementById(`player-${index}`);
    const inlineLyrics = document.getElementById(`inline-lyrics-${index}`);

    if (!btn || !player) return;

    if (currentPlayingIndex === index && !audio.paused) {
        audio.pause();
        btn.textContent = '▶';
        return;
    }

    const playRequestId = ++activePlayRequestId;
    btn.disabled = true;

    try {
        const parsed = await ensureParsedSong(source, id, quality);
        if (playRequestId !== activePlayRequestId) return;
        if (!parsed.url) {
            throw new Error(parsed.error || '未获取到播放链接');
        }

        if (currentPlayingIndex !== null && currentPlayingIndex !== index) {
            const oldBtn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
            const oldPlayer = document.getElementById(`player-${currentPlayingIndex}`);
            if (oldBtn) oldBtn.textContent = '▶';
            if (oldPlayer) oldPlayer.style.display = 'none';
        }

        if (parsed.cover) {
            const coverImg = document.getElementById(`cover-${index}`);
            if (coverImg) {
                coverImg.src = parsed.cover;
                coverImg.style.display = 'block';
            }
        }

        currentLyrics = parseLyrics(parsed.lyrics || '');
        if (inlineLyrics) {
            inlineLyrics.textContent = currentLyrics.length > 0 ? currentLyrics[0].text : '';
        }

        audio.src = parsed.url;
        currentPlayingIndex = index;
        player.style.display = 'flex';

        await audio.play();
        btn.textContent = '⏸';
    } catch (error) {
        if (playRequestId === activePlayRequestId) {
            showToast(`播放失败: ${error.message || '未知错误'}`, 'error');
            btn.textContent = '▶';
        }
    } finally {
        btn.disabled = false;
    }
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
    if (currentPlayingIndex !== null) {
        const btn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
        if (btn) btn.textContent = '▶';
    }
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
checkStatus();
setInterval(checkStatus, 60000);
