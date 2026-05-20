let players = [];
let filteredPlayers = [];
let selectedTeam = '全部';
let searchQuery = '';
let debounceTimer = null;

// 本地开发用 localhost:5000（需启动 Flask），GitHub Pages 上线后改成 Render 地址
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : 'https://basketball-api.onrender.com';

const homePage = document.getElementById('home-page');
const detailPage = document.getElementById('detail-page');
const talentPage = document.getElementById('talent-page');
const rankingsPage = document.getElementById('rankings-page');
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

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
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
    
    if (page === 'home') {
        homePage.classList.remove('hidden');
    } else if (page === 'talent') {
        talentPage.classList.remove('hidden');
    } else if (page === 'rankings') {
        rankingsPage.classList.remove('hidden');
        loadRankings();
    }
}

async function loadPlayers() {
    try {
        const response = await fetch('data/players.json');
        if (!response.ok) throw new Error('无法加载数据');
        players = await response.json();
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
            (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
        
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

function init() {
    searchInput.addEventListener('input', debouncedFilter);
    clearFiltersBtn.addEventListener('click', clearFilters);
    backBtn.addEventListener('click', showHome);
    
    loadPlayers();
}

document.addEventListener('DOMContentLoaded', init);
