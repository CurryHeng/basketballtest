let players = [];
let filteredPlayers = [];
let selectedTeam = '全部';
let searchQuery = '';
let debounceTimer = null;

// 本地开发直接走同域（Flask 托管前端），部署后指向 PythonAnywhere
const IS_LOCAL = !window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? '' : 'https://CurryHeng.pythonanywhere.com';

async function apiFetch(path, options = {}) {
    const headers = { ...getAuthHeaders(), ...options.headers };
    const r = await fetch(`${API_BASE}${path}`, { ...options, headers });
    return r.json();
}

const homePage = document.getElementById('home-page');
const detailPage = document.getElementById('detail-page');
const talentPage = document.getElementById('talent-page');
const rankingsPage = document.getElementById('rankings-page');
const adminPage = document.getElementById('admin-page');
const searchInput = document.getElementById('search-input');
const teamTagsContainer = document.getElementById('team-tags');
const cardsContainer = document.getElementById('cards-container');
const resultCount = document.getElementById('result-count');
const emptyState = document.getElementById('empty-state');
const clearFiltersBtn = document.getElementById('clear-filters');
const backBtn = document.getElementById('back-btn');

const navBtns = document.querySelectorAll('.nav-btn');
const talentForm = document.getElementById('talent-form');
const talentResult = document.getElementById('talent-result');
const rankingsList = document.getElementById('rankings-list');

// ── 认证状态 ──
let currentUser = null;
const TOKEN_KEY = 'basketball_auth_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function getAuthHeaders() {
    const t = getToken();
    return t ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` } : { 'Content-Type': 'application/json' };
}

async function checkAuth() {
    const token = getToken();
    if (!token) return;
    try {
        const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await r.json();
        if (data.success) {
            currentUser = data.user;
            updateAuthUI();
        } else {
            clearToken();
        }
    } catch { /* offline */ }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userDisplay = document.getElementById('user-display');
    const adminBtn = document.getElementById('admin-nav-btn');
    if (currentUser) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userDisplay.textContent = currentUser.username;
        if (currentUser.isAdmin) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        adminBtn.classList.add('hidden');
    }
}

// ── 登录弹窗 ──
function openAuth() {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('reg-error').classList.add('hidden');
    showLoginForm();
}

function closeAuth() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function showLoginForm() {
    document.getElementById('auth-title').textContent = '登录';
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('auth-title').textContent = '注册';
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

document.getElementById('login-btn').addEventListener('click', openAuth);
document.getElementById('auth-close').addEventListener('click', closeAuth);
document.getElementById('auth-overlay').addEventListener('click', closeAuth);
document.getElementById('switch-to-register').addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
document.getElementById('switch-to-login').addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('auth-error');
    try {
        const r = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await r.json();
        if (data.success) {
            setToken(data.token);
            currentUser = data.user;
            updateAuthUI();
            closeAuth();
        } else {
            errEl.textContent = data.error;
            errEl.classList.remove('hidden');
        }
    } catch {
        errEl.textContent = '无法连接服务器';
        errEl.classList.remove('hidden');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('reg-error');
    try {
        const r = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await r.json();
        if (data.success) {
            errEl.textContent = '注册成功，请登录';
            errEl.className = 'auth-success';
            showLoginForm();
            document.getElementById('login-username').value = username;
        } else {
            errEl.textContent = data.error;
            errEl.className = 'auth-error';
            errEl.classList.remove('hidden');
        }
    } catch {
        errEl.textContent = '无法连接服务器';
        errEl.className = 'auth-error';
        errEl.classList.remove('hidden');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    clearToken();
    updateAuthUI();
    if (adminPage && !adminPage.classList.contains('hidden')) {
        switchPage('home');
        document.querySelector('.nav-btn[data-page="home"]').click();
    }
});

// ── 管理员面板 ──────────────────────────────────────

async function loadAdminData() {
    if (!currentUser || !currentUser.isAdmin) return;
    document.getElementById('admin-subtitle').textContent = '管理员：' + currentUser.username;
    loadAdminUsers();
    loadAdminUploads();
    loadAdminAnalyzes();
}

async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">加载中...</td></tr>';
    try {
        const data = await apiFetch('/api/admin/users');
        if (!data.success) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ff4444">加载失败</td></tr>'; return; }
        tbody.innerHTML = data.users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email || '-'}</td>
                <td><span class="admin-badge ${u.is_admin ? 'admin-badge-yes' : 'admin-badge-no'}">${u.is_admin ? '是' : '否'}</span></td>
                <td>${u.analyze_count}</td>
                <td>${u.created_at}</td>
                <td>
                    ${!u.is_admin ? `<button class="btn-admin-primary" onclick="setAdmin(${u.id})">设为管理员</button>` : ''}
                    <button class="btn-admin-danger" onclick="deleteUser(${u.id}, '${u.username}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ff4444">请求失败</td></tr>'; }
}

async function loadAdminAnalyzes() {
    const tbody = document.getElementById('admin-analyzes-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">加载中...</td></tr>';
    try {
        const data = await apiFetch('/api/admin/analyzes');
        if (!data.success) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ff4444">加载失败</td></tr>'; return; }
        if (data.analyzes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">暂无分析记录</td></tr>';
            return;
        }
        tbody.innerHTML = data.analyzes.map(a => `
            <tr>
                <td>${a.id}</td>
                <td>${a.username || '游客'}</td>
                <td>${a.matchedStar || '-'}</td>
                <td>${a.totalScore}</td>
                <td>${a.createdAt}</td>
                <td><button class="btn-admin-danger" onclick="deleteAnalyze(${a.id})">删除</button></td>
            </tr>
        `).join('');
    } catch { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ff4444">请求失败</td></tr>'; }
}

async function loadAdminUploads() {
    const tbody = document.getElementById('admin-uploads-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">加载中...</td></tr>';
    try {
        const data = await apiFetch('/api/admin/uploads');
        if (!data.success) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ff4444">加载失败</td></tr>'; return; }
        if (data.uploads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">暂无上传图片</td></tr>';
            return;
        }
        tbody.innerHTML = data.uploads.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><img src="${API_BASE}${u.file_path}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"></td>
                <td>${u.player_name}</td>
                <td>${u.image_type === 'profile' ? '头像' : '动作图'}</td>
                <td>${u.uploaded_by_name || '游客'}</td>
                <td>${u.created_at}</td>
                <td>
                    <button class="btn-admin-primary" onclick="approveUpload(${u.id})">采用</button>
                    <button class="btn-admin-danger" onclick="deleteUpload(${u.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ff4444">请求失败</td></tr>'; }
}

async function approveUpload(uploadId) {
    if (!confirm('确定采用该图片？将替换当前球员的图片配置。')) return;
    const data = await apiFetch(`/api/admin/uploads/${uploadId}/approve`, { method: 'POST' });
    if (data.success) {
        alert('已采用！' + (data.path ? ' 图片路径：' + data.path : ''));
        loadAdminUploads();
        // 刷新球员缓存，让首页卡片立即显示新图片
        loadPlayers();
    } else {
        alert('操作失败：' + (data.error || '未知错误'));
    }
}

async function deleteUpload(uploadId) {
    if (!confirm('确定删除该上传记录？图片文件也将被删除。')) return;
    const data = await apiFetch(`/api/admin/uploads/${uploadId}`, { method: 'DELETE' });
    if (data.success) {
        loadAdminUploads();
    } else {
        alert('删除失败：' + (data.error || '未知错误'));
    }
}

async function setAdmin(userId) {
    if (!confirm('确定将该用户设为管理员？')) return;
    const data = await apiFetch(`/api/admin/user/${userId}/set-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: true })
    });
    if (data.success) loadAdminUsers();
}

async function deleteUser(userId, username) {
    if (!confirm(`确定删除用户"${username}"及其所有数据？此操作不可恢复！`)) return;
    const data = await apiFetch(`/api/admin/user/${userId}`, { method: 'DELETE' });
    if (data.success) loadAdminUsers();
}

async function deleteAnalyze(analyzeId) {
    if (!confirm(`确定删除该分析记录？`)) return;
    const data = await apiFetch(`/api/admin/analyze/${analyzeId}`, { method: 'DELETE' });
    if (data.success) loadAdminAnalyzes();
}

document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.remove('hidden');
    });
});

document.getElementById('back-from-admin').addEventListener('click', () => {
    switchPage('home');
    document.querySelector('.nav-btn[data-page="home"]').click();
});

// Make admin functions globally accessible for onclick
window.setAdmin = setAdmin;
window.deleteUser = deleteUser;
window.deleteAnalyze = deleteAnalyze;
window.approveUpload = approveUpload;
window.deleteUpload = deleteUpload;

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.external !== undefined) return;
        const page = btn.dataset.page;
        switchPage(page);
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function switchPage(page) {
    homePage.classList.add('hidden');
    detailPage.classList.add('hidden');
    talentPage.classList.add('hidden');
    rankingsPage.classList.add('hidden');
    if (adminPage) adminPage.classList.add('hidden');

    if (page === 'home') {
        homePage.classList.remove('hidden');
    } else if (page === 'talent') {
        talentPage.classList.remove('hidden');
    } else if (page === 'rankings') {
        rankingsPage.classList.remove('hidden');
        // 根据当前激活的 tab 加载对应视图
        const activeTab = document.querySelector('.rankings-tab.active');
        if (activeTab && activeTab.dataset.view === 'lineup') {
            loadLineup();
        } else {
            loadRankings();
        }
    } else if (page === 'admin') {
        adminPage.classList.remove('hidden');
        loadAdminData();
    }
}

async function loadPlayers() {
    try {
        const response = await fetch(`${API_BASE}/api/players`);
        if (!response.ok) throw new Error('无法加载数据');
        const result = await response.json();
        if (!result.success) throw new Error('数据加载失败');
        // 图片路径补上 API_BASE 前缀，确保从后端服务器加载（部署环境下 GitHub Pages 上无图片文件）
        players = result.data.map(p => ({
            ...p,
            profileImage: p.profileImage ? `${API_BASE}/${p.profileImage}` : p.profileImage,
            actionGif: p.actionGif ? `${API_BASE}/${p.actionGif}` : p.actionGif
        }));
        filteredPlayers = [...players];
        renderTeamTags();
        renderCards();
    } catch (error) {
        console.error('加载数据失败:', error);
        resultCount.textContent = '数据加载失败，请使用本地服务器运行';
    }
}

function renderTeamTags() {
    const teams = ['全部', ...new Set(players.map(p => p.teamAbbr))];
    
    teamTagsContainer.innerHTML = teams.map(team => `
        <button class="team-tag ${team === selectedTeam ? 'active' : ''}" data-team="${team}">
            ${team}
        </button>
    `).join('');
    
    teamTagsContainer.querySelectorAll('.team-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const team = tag.dataset.team;
            if (selectedTeam === team && team !== '全部') {
                selectedTeam = '全部';
            } else {
                selectedTeam = team;
            }
            updateTeamTagsUI();
            filterPlayers();
        });
    });
}

function updateTeamTagsUI() {
    teamTagsContainer.querySelectorAll('.team-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.team === selectedTeam);
    });
}

function filterPlayers() {
    filteredPlayers = players.filter(player => {
        const matchesSearch = searchQuery === '' ||
            player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (player.nameCn && player.nameCn.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesTeam = selectedTeam === '全部' || player.teamAbbr === selectedTeam;
        
        return matchesSearch && matchesTeam;
    });
    
    renderCards();
}

function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedFilter = debounce(() => {
    searchQuery = searchInput.value.trim();
    filterPlayers();
}, 300);

function renderCards() {
    resultCount.innerHTML = `找到 <strong>${filteredPlayers.length}</strong> 位球星`;
    
    if (filteredPlayers.length === 0) {
        cardsContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    cardsContainer.innerHTML = filteredPlayers.map(player => `
        <article class="card" data-id="${player.id}">
            <div class="card-image-wrapper">
                <div class="card-loading" id="loading-${player.id}">加载中...</div>
                <img class="card-image" 
                     src="${player.profileImage}" 
                     alt="${player.name}"
                     onload="this.previousElementSibling.style.display='none'"
                     onerror="this.previousElementSibling.textContent='图片未找到'">
            </div>
            <div class="card-content">
                <h3 class="card-name">${player.name}</h3>
                ${player.nickname ? `<div class="card-nickname">"${player.nickname}"</div>` : ''}
                <div class="card-team">
                    <span class="team-abbr">${player.teamAbbr}</span>
                    ${player.team}
                </div>
            </div>
        </article>
    `).join('');
    
    cardsContainer.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const player = players.find(p => p.id === id);
            if (player) showDetail(player);
        });
    });
}

function showDetail(player) {
    homePage.classList.add('hidden');
    detailPage.classList.remove('hidden');
    window.scrollTo(0, 0);
    
    const detailImage = document.getElementById('detail-image');
    const detailImageLoading = document.getElementById('detail-image-loading');
    const detailGif = document.getElementById('detail-gif');
    const gifLoading = document.getElementById('gif-loading');
    
    detailImageLoading.style.display = 'flex';
    gifLoading.style.display = 'flex';
    
    detailImage.src = player.profileImage;
    detailImage.alt = player.name;
    detailImage.onload = () => detailImageLoading.style.display = 'none';
    detailImage.onerror = () => detailImageLoading.textContent = '图片未找到';
    
    // 检测是否是真实 GIF，静态图则应用 Ken Burns 动画
    const isRealGif = player.actionGif.endsWith('.gif');
    detailGif.classList.toggle('action-still', !isRealGif);

    detailGif.src = player.actionGif;
    detailGif.alt = player.actionDescription;
    detailGif.onload = () => gifLoading.style.display = 'none';
    detailGif.onerror = () => gifLoading.textContent = 'GIF未找到';
    
    document.getElementById('detail-name').textContent = player.name;
    document.getElementById('detail-nickname').textContent = player.nickname ? `"${player.nickname}"` : '';
    document.getElementById('detail-team').textContent = player.team;
    document.getElementById('detail-position').textContent = player.position;
    document.getElementById('detail-height').textContent = player.height;
    document.getElementById('detail-weight').textContent = player.weight;
    document.getElementById('detail-honors').textContent = player.honors;
    document.getElementById('detail-action-desc').textContent = player.actionDescription;
}

function showHome() {
    detailPage.classList.add('hidden');
    homePage.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function clearFilters() {
    searchInput.value = '';
    searchQuery = '';
    selectedTeam = '全部';
    updateTeamTagsUI();
    filterPlayers();
}

talentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(talentForm);
    const data = {
        nickname: formData.get('nickname'),
        height: parseFloat(formData.get('height')),
        weight: parseFloat(formData.get('weight')),
        armSpan: formData.get('armSpan') ? parseFloat(formData.get('armSpan')) : null,
        verticalJump: formData.get('verticalJump') ? parseFloat(formData.get('verticalJump')) : 65,
        runningJump: formData.get('runningJump') ? parseFloat(formData.get('runningJump')) : 80,
        position: formData.get('position') || null,
        playStyle: formData.getAll('playStyle')
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showTalentResult(result.result);
        } else {
            alert('分析失败: ' + result.error);
        }
    } catch (error) {
        console.error('请求失败:', error);
        alert('无法连接后端服务，请确保Flask服务器正在运行 (python app.py)');
    }
});

function showTalentResult(result) {
    talentResult.classList.remove('hidden');
    
    const activeStar = result.matchedStarActive || {};
    const funStar = result.matchedStarFun || {};
    
    document.getElementById('result-star-active').textContent = 
        activeStar.nickname ? `${activeStar.name} "${activeStar.nickname}"` : activeStar.name || '未知';
    document.getElementById('result-star-desc').textContent = activeStar.description || '';
    
    document.getElementById('result-star-fun').textContent = 
        funStar.nickname ? `${funStar.nickname}` : funStar.name || '未知';
    document.getElementById('result-star-fun-desc').textContent = funStar.description || '';
    
    const scores = result.scores || {};
    const scoreNames = { shooting: '投射', speed: '速度', iq: '球商', handling: '运球', defense: '防守' };
    
    const scoreBars = document.getElementById('score-bars');
    scoreBars.innerHTML = Object.entries(scores).map(([key, value]) => `
        <div class="score-bar">
            <span class="score-label">${scoreNames[key] || key}</span>
            <div class="score-track">
                <div class="score-fill" style="width: ${value}%"></div>
            </div>
            <span class="score-value">${value}</span>
        </div>
    `).join('');
    
    const comments = result.comments || {};
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = Object.entries(comments).map(([key, text]) => `
        <div class="comment-item">${text}</div>
    `).join('');
    
    talentResult.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('retry-btn').addEventListener('click', () => {
    talentResult.classList.add('hidden');
    talentForm.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function loadRankings() {
    try {
        const response = await fetch(`${API_BASE}/api/rankings?limit=20`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            renderRankings(data.data);
        } else {
            rankingsList.innerHTML = '<div class="empty-state"><p class="empty-text">暂无数据，快去提交你的天赋分析吧！</p></div>';
        }
    } catch (error) {
        rankingsList.innerHTML = '<div class="empty-state"><p class="empty-text">无法连接后端服务</p></div>';
    }
}

async function loadLineup() {
    const posNames = { PG: '控球后卫', SG: '得分后卫', SF: '小前锋', PF: '大前锋', C: '中锋' };
    try {
        const res = await fetch(`${API_BASE}/api/rankings/lineup`);
        const data = await res.json();
        if (!data.success || !data.data) return;

        // 重置为空状态
        for (const pos of ['PG', 'SG', 'SF', 'PF', 'C']) {
            const el = document.getElementById(`lineup-${pos}`);
            el.innerHTML = `
                <div class="court-player-icon">🏀</div>
                <div class="court-player-name">无数据</div>
                <div class="court-player-score"></div>
            `;
            el.onclick = null;
        }

        data.data.forEach(item => {
            const el = document.getElementById(`lineup-${item.position}`);
            if (!el) return;
            el.innerHTML = `
                <div class="court-player-icon">⭐</div>
                <div class="court-player-name">${item.nickname}</div>
                <div class="court-player-score">${item.totalScore} 分 · ${posNames[item.position] || item.position}</div>
            `;
            el.onclick = () => {
                const userId = item.userId;
                loadUserDetail(userId);
            };
        });
    } catch (e) {
        console.error('加载阵容失败', e);
    }
}

function renderRankings(rankings) {
    rankingsList.innerHTML = rankings.map(item => `
        <div class="rank-item" data-user-id="${item.userId}">
            <div class="rank-number">${item.rank}</div>
            <div class="rank-info">
                <div class="rank-name">${item.nickname}</div>
                <div class="rank-meta">${item.height}cm | ${item.weight}kg | ${item.position || '未知位置'}</div>
            </div>
            <div class="rank-score">${item.totalScore}</div>
        </div>
    `).join('');
    
    rankingsList.querySelectorAll('.rank-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            loadUserDetail(userId);
        });
    });
}

async function loadUserDetail(userId) {
    try {
        const response = await fetch(`${API_BASE}/api/user/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            showUserDetail(result.data);
        } else {
            alert('获取用户详情失败');
        }
    } catch (error) {
        console.error('请求失败:', error);
        alert('无法连接后端服务');
    }
}

function showUserDetail(data) {
    rankingsPage.classList.add('hidden');
    document.getElementById('user-detail-page').classList.remove('hidden');
    window.scrollTo(0, 0);
    
    const user = data.user;
    const talent = data.talent;
    
    document.getElementById('user-detail-name').textContent = user.nickname;
    document.getElementById('user-detail-height').textContent = `${user.height} cm`;
    document.getElementById('user-detail-weight').textContent = `${user.weight} kg`;
    document.getElementById('user-detail-armspan').textContent = user.armSpan ? `${user.armSpan} cm` : '未填写';
    document.getElementById('user-detail-position').textContent = user.position || '未填写';
    document.getElementById('user-detail-vertical').textContent = user.verticalJump ? `${user.verticalJump} cm` : '未填写';
    document.getElementById('user-detail-running').textContent = user.runningJump ? `${user.runningJump} cm` : '未填写';
    document.getElementById('user-detail-styles').textContent = user.playStyle && user.playStyle.length > 0 ? user.playStyle.join('、') : '未填写';
    
    if (talent) {
        const activeStar = talent.matchedStarActive || {};
        document.getElementById('matched-star-name').textContent = activeStar.name || '未知球星';
        document.getElementById('matched-star-nickname').textContent = activeStar.nickname ? `"${activeStar.nickname}"` : '';
        document.getElementById('matched-star-desc').textContent = activeStar.description || '';
        
        const scores = talent.scores || {};
        const scoreNames = { shooting: '投射', speed: '速度', iq: '球商', handling: '运球', defense: '防守' };
        
        const scoreBars = document.getElementById('user-score-bars');
        scoreBars.innerHTML = Object.entries(scores).map(([key, value]) => `
            <div class="score-bar">
                <span class="score-label">${scoreNames[key] || key}</span>
                <div class="score-track">
                    <div class="score-fill" style="width: ${value}%"></div>
                </div>
                <span class="score-value">${value}</span>
            </div>
        `).join('');
        
        const comments = talent.comments || {};
        const commentsEl = document.getElementById('user-comments');
        commentsEl.innerHTML = Object.entries(comments).map(([key, text]) => `
            <div class="comment-item">${text}</div>
        `).join('');
    }
}

document.getElementById('back-to-rankings').addEventListener('click', () => {
    document.getElementById('user-detail-page').classList.add('hidden');
    rankingsPage.classList.remove('hidden');
});

// ── 阵容 Tab 切换 ──
document.querySelectorAll('.rankings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.rankings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const view = tab.dataset.view;
        if (view === 'lineup') {
            document.getElementById('rankings-list').classList.add('hidden');
            document.getElementById('lineup-view').classList.remove('hidden');
            loadLineup();
        } else {
            document.getElementById('rankings-list').classList.remove('hidden');
            document.getElementById('lineup-view').classList.add('hidden');
            loadRankings();
        }
    });
});

function init() {
    searchInput.addEventListener('input', debouncedFilter);
    clearFiltersBtn.addEventListener('click', clearFilters);
    backBtn.addEventListener('click', showHome);

    loadPlayers();
    checkAuth();
}

document.addEventListener('DOMContentLoaded', init);
