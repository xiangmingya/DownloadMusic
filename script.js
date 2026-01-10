const API_BASE = 'https://music-dl.sayqz.com';

let platformNames = {};
let supportedPlatforms = [];

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

// 检查服务状态并获取平台信息
async function checkStatus() {
    try {
        const [status, health] = await Promise.all([
            fetch(`${API_BASE}/status`).then(r => r.json()),
            fetch(`${API_BASE}/health`).then(r => r.json())
        ]);

        // 兼容不同 /status 平台结构：
        // - { data: { platforms: { platforms: ["netease", ...] } } }
        // - { data: { platforms: ["netease", ...] } }
        // - { data: { platforms: [{ name: "netease", enabled: true }, ...] } }
        // - { data: { platforms: { netease: { enabled: true }, ... } } }
        function extractEnabledPlatformKeys(statusJson) {
            const raw = statusJson?.data?.platforms;
            if (!raw) return [];

            // data.platforms = ["netease", ...]
            if (Array.isArray(raw) && raw.every(p => typeof p === 'string')) return raw;

            // data.platforms = [{name, enabled}, ...]
            if (Array.isArray(raw)) {
                return raw
                    .filter(p => p && (p.enabled === undefined || p.enabled))
                    .map(p => p.name)
                    .filter(Boolean);
            }

            // data.platforms.platforms = [...]
            if (Array.isArray(raw.platforms)) {
                return raw.platforms
                    .filter(p => (typeof p === 'string') || (p && (p.enabled === undefined || p.enabled)))
                    .map(p => (typeof p === 'string' ? p : p.name))
                    .filter(Boolean);
            }

            // data.platforms = { netease: {enabled:true}, ... }
            if (typeof raw === 'object') {
                return Object.entries(raw)
                    .filter(([, v]) => v && (v.enabled === undefined || v.enabled))
                    .map(([k]) => k);
            }

            return [];
        }

        // 平台名称映射
        const platformNameMap = {
            netease: '网易云音乐',
            kuwo: '酷我音乐',
            qq: 'QQ音乐',
            kugou: '酷狗音乐',
            migu: '咪咕音乐'
        };

        const enabledPlatformKeys = extractEnabledPlatformKeys(status);

        if (status.code === 200 && enabledPlatformKeys.length > 0) {
            supportedPlatforms = enabledPlatformKeys;
            platformNames = {};
            const enabledPlatformNames = [];

            supportedPlatforms.forEach(key => {
                platformNames[key] = platformNameMap[key] || key;
                enabledPlatformNames.push(platformNames[key]);
            });

            updatePlatformSelect();

            document.getElementById('serviceStatus').innerHTML =
                `服务状态: <span class="online">${enabledPlatformNames.join('、')}</span>`;
        } else {
            document.getElementById('serviceStatus').innerHTML =
                `服务状态: <span class="offline">异常</span>`;
        }

        const healthOk =
            health?.code === 200 ||
            health?.status === 'ok' ||
            health?.status === 'healthy' ||
            health?.data?.status === 'ok' ||
            health?.data?.status === 'healthy';

        if (healthOk) {
            document.getElementById('healthStatus').innerHTML =
                `健康状态: <span class="online">正常</span>`;
        } else {
            document.getElementById('healthStatus').innerHTML =
                `健康状态: <span class="offline">异常</span>`;
        }
    } catch (error) {
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
        `<option value="${key}">${platformNames[key]}</option>`
    ).join('');

    platformSelect.innerHTML = options;
}

// 搜索
async function search() {
    const input = document.getElementById('searchInput').value.trim();
    if (!input) return;

    const searchMode = document.getElementById('searchMode').value;
    const resultsDiv = document.getElementById('results');

    resultsDiv.innerHTML = '<div class="empty-state">検索中...</div>';

    try {
        let url;

        if (searchMode === 'id') {
            const platform = document.getElementById('platform').value;
            if (currentSearchType === 'song') {
                url = `${API_BASE}/api/?source=${platform}&id=${input}&type=info`;
            } else {
                url = `${API_BASE}/api/?source=${platform}&id=${input}&type=playlist`;
            }
        } else {
            const platform = document.getElementById('platform').value;
            if (currentSearchType === 'song') {
                if (platform === 'all') {
                    url = `${API_BASE}/api/?type=aggregateSearch&keyword=${encodeURIComponent(input)}`;
                    currentSearchParams = { type: 'aggregateSearch', keyword: input };
                } else {
                    url = `${API_BASE}/api/?source=${platform}&type=search&keyword=${encodeURIComponent(input)}`;
                    currentSearchParams = { type: 'search', platform, keyword: input };
                }
            } else {
                url = `${API_BASE}/api/?source=${platform}&type=search&keyword=${encodeURIComponent(input)}`;
                currentSearchParams = { type: 'search', platform, keyword: input };
            }
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200) {
            if (searchMode === 'id') {
                currentSearchParams = null;
                if (currentSearchType === 'song') {
                    displaySongsWithPagination([data.data]);
                } else {
                    const platform = document.getElementById('platform').value;
                    const songs = (data.data.list || data.data.songs || []).map(s => ({...s, source: platform}));
                    displaySongsWithPagination(songs);
                }
            } else {
                const results = currentSearchType === 'song' ? data.data.results : (data.data.list || data.data);
                if (results && results.length > 0) {
                    if (currentSearchType === 'song') {
                        displaySongs(results, true);
                    } else {
                        displayPlaylists(results.filter(item => item.isPlaylist));
                    }
                } else {
                    resultsDiv.innerHTML = '<div class="empty-state">未找到结果</div>';
                }
            }
        } else {
            resultsDiv.innerHTML = '<div class="empty-state">未找到结果</div>';
        }
    } catch (error) {
        resultsDiv.innerHTML = '<div class="empty-state">搜索失败</div>';
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
        const coverUrl = `${API_BASE}/api/?source=${platform}&id=${song.id}&type=pic`;
        return `
        <div class="result-item" id="song-${globalIndex}">
            <div class="song-header">
                <div>
                    <img class="song-cover" id="cover-${globalIndex}" src="${coverUrl}" alt="" onerror="this.style.display='none'" onload="this.style.display='block'">
                    <div class="song-info">
                        <h3>${song.name}<span class="platform-badge">${platformNames[platform] || platform}</span></h3>
                        <p>${song.artist}</p>
                    </div>
                </div>
                <div>
                    <button class="play-btn-item" data-index="${globalIndex}" onclick="playSong('${platform}', '${song.id}', '${song.name.replace(/'/g, "\\'")}', '${song.artist.replace(/'/g, "\\'")}', ${globalIndex})">▶</button>
                    <button onclick="downloadSong('${platform}', '${song.id}', '${song.name.replace(/'/g, "\\'")}', '${song.artist.replace(/'/g, "\\'")}')">下载</button>
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

// 分页相关
let allSongs = [];
let currentPage = 1;
let totalPages = 1;
let currentSearchParams = null;
const pageSize = 5;
const apiPageSize = 100;

// 显示歌曲列表（API搜索结果，使用前端分页）
function displaySongs(songs, enableApiPaging = false) {
    if (enableApiPaging) {
        // API搜索结果也使用前端分页
        displaySongsWithPagination(songs);
    } else {
        // 单曲显示（不分页）
        displaySongsWithPagination(songs);
    }
}


// 显示歌单列表
function displayPlaylists(playlists) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = playlists.map(playlist => {
        const platform = playlist.platform || playlist.source;
        return `
        <div class="result-item">
            <div class="song-info">
                <h3>${playlist.name}<span class="platform-badge">${platformNames[platform] || platform}</span></h3>
                <p>${playlist.artist}</p>
            </div>
            <button onclick="downloadPlaylist('${platform}', '${playlist.id}', '${playlist.name.replace(/'/g, "\\'")}')">下载</button>
        </div>
    `;
    }).join('');
}

// 下载单曲
function downloadSong(source, id, name, artist) {
    const quality = document.getElementById('quality').value;
    const url = `${API_BASE}/api/?source=${source}&id=${id}&type=url&br=${quality}`;

    window.open(url, '_blank');
}

// 下载歌单
async function downloadPlaylist(source, id, name) {
    try {
        const url = `${API_BASE}/api/?source=${source}&id=${id}&type=playlist`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200 && data.data.songs) {
            const total = data.data.songs.length;
            showToast(`开始下载歌单，共${total}首`, 'info');

            for (let i = 0; i < data.data.songs.length; i++) {
                const song = data.data.songs[i];
                showToast(`正在下载 ${i + 1}/${total}: ${song.name}`, 'info');
                await downloadSong(source, song.id, song.name, song.artist);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            showToast('歌单下载完成', 'success');
        } else {
            showToast('获取歌单失败', 'error');
        }
    } catch (error) {
        showToast('下载歌单失败', 'error');
    }
}

// 播放歌曲
let currentPlayingIndex = null;
let currentLyrics = [];
const audio = document.getElementById('audio');

function playSong(source, id, name, artist, index) {
    const quality = document.getElementById('quality').value;
    const url = `${API_BASE}/api/?source=${source}&id=${id}&type=url&br=${quality}`;
    const btn = document.querySelector(`button[data-index="${index}"]`);
    const player = document.getElementById(`player-${index}`);
    const lyricsContainer = document.getElementById(`lyrics-${index}`);

    if (currentPlayingIndex === index && !audio.paused) {
        audio.pause();
        btn.textContent = '▶';
        return;
    }

    if (currentPlayingIndex !== null && currentPlayingIndex !== index) {
        const oldBtn = document.querySelector(`button[data-index="${currentPlayingIndex}"]`);
        const oldPlayer = document.getElementById(`player-${currentPlayingIndex}`);
        const oldLyrics = document.getElementById(`lyrics-${currentPlayingIndex}`);
        if (oldBtn) oldBtn.textContent = '▶';
        if (oldPlayer) oldPlayer.style.display = 'none';
        if (oldLyrics) oldLyrics.style.display = 'none';
    }

    audio.src = url;
    currentPlayingIndex = index;
    player.style.display = 'flex';

    loadCover(source, id, index);
    loadLyrics(source, id, index);

    audio.play().then(() => {
        btn.textContent = '⏸';
    }).catch(() => {
        showToast('播放失败', 'error');
    });
}

// 加载封面
function loadCover(source, id, index) {
    const coverImg = document.getElementById(`cover-${index}`);
    const coverUrl = `${API_BASE}/api/?source=${source}&id=${id}&type=pic`;

    coverImg.onload = () => {
        coverImg.style.display = 'block';
    };
    coverImg.onerror = () => {
        coverImg.style.display = 'none';
    };
    coverImg.src = coverUrl;
}

// 加载歌词
async function loadLyrics(source, id, index) {
    const inlineLyrics = document.getElementById(`inline-lyrics-${index}`);

    try {
        const response = await fetch(`${API_BASE}/api/?source=${source}&id=${id}&type=lrc`);
        const text = await response.text();

        currentLyrics = parseLyrics(text);

        if (currentLyrics.length > 0) {
            // 显示第一句歌词
            inlineLyrics.textContent = currentLyrics[0].text;
        }
    } catch (error) {
        console.error('歌词加载失败:', error);
    }
}

// 解析LRC歌词
function parseLyrics(lrcText) {
    const lines = lrcText.split('\n');
    const lyrics = [];

    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3].padEnd(3, '0'));
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = match[4].trim();

            if (text) {
                lyrics.push({ time, text });
            }
        }
    });

    return lyrics.sort((a, b) => a.time - b.time);
}

audio.addEventListener('timeupdate', () => {
    if (currentPlayingIndex === null) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    const progressFill = document.getElementById(`progress-${currentPlayingIndex}`);
    const timeDisplay = document.getElementById(`time-${currentPlayingIndex}`);

    if (progressFill) progressFill.style.width = progress + '%';
    if (timeDisplay) {
        const current = formatTime(audio.currentTime);
        const total = formatTime(audio.duration);
        timeDisplay.textContent = `${current} / ${total}`;
    }

    // 歌词同步
    updateLyrics(audio.currentTime);
});

// 更新歌词高亮
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

document.addEventListener('click', (e) => {
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
let currentSearchType = 'song';

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSearchType = btn.dataset.type;
        updatePlatformSelector();
    });
});

// 切换搜索模式时更新平台选择器
function updatePlatformSelector() {
    updatePlatformSelect();
}

document.getElementById('searchMode').addEventListener('change', updatePlatformSelector);

// 事件监听
document.getElementById('searchBtn').addEventListener('click', search);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
});

// 初始化
checkStatus();
setInterval(checkStatus, 60000);
