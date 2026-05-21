/**
 * 球星图片搜索
 * 支持本地图库、Unsplash（需API Key）、Pexels（需API Key）
 */

class ImageSearcher {
    constructor() {
        this.unsplashKey = localStorage.getItem('unsplash_key') || '';
        this.pexelsKey = localStorage.getItem('pexels_key') || '';
        this.currentImages = [];
        this.players = [];
        this.init();
    }

    async init() {
        if (this.unsplashKey) {
            document.getElementById('unsplash-key').value = this.unsplashKey;
        }
        if (this.pexelsKey) {
            document.getElementById('pexels-key').value = this.pexelsKey;
        }
        // 加载本地球员数据
        try {
            const r = await fetch('data/players.json');
            this.players = await r.json();
        } catch (e) {
            console.warn('加载本地球员数据失败', e);
        }
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('save-config').addEventListener('click', () => this.saveConfig());

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('search-input').value = btn.dataset.query;
                document.getElementById('source-select').value = 'local';
                this.search(btn.dataset.query);
            });
        });

        document.getElementById('search-btn').addEventListener('click', () => {
            const q = document.getElementById('search-input').value.trim();
            if (q) this.search(q);
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const q = e.target.value.trim();
                if (q) this.search(q);
            }
        });

        document.getElementById('download-all-btn').addEventListener('click', () => this.downloadAll());
    }

    saveConfig() {
        this.unsplashKey = document.getElementById('unsplash-key').value.trim();
        this.pexelsKey = document.getElementById('pexels-key').value.trim();
        localStorage.setItem('unsplash_key', this.unsplashKey);
        localStorage.setItem('pexels_key', this.pexelsKey);
        alert('配置已保存！');
    }

    async search(query) {
        const source = document.getElementById('source-select').value;
        const statusEl = document.getElementById('status');
        const searchBtn = document.getElementById('search-btn');

        statusEl.textContent = '搜索中...';
        searchBtn.disabled = true;
        document.getElementById('images-grid').innerHTML = '';
        this.currentImages = [];

        try {
            let images = [];
            if (source === 'local') {
                images = this.searchLocal(query);
            } else if (source === 'unsplash') {
                images = await this.searchUnsplash(query);
            } else if (source === 'pexels') {
                images = await this.searchPexels(query);
            }

            this.currentImages = images;

            if (images.length === 0) {
                statusEl.textContent = '未找到匹配的图片';
                return;
            }

            statusEl.textContent = `找到 ${images.length} 张图片`;
            this.renderImages(images);
            document.getElementById('actions-bar').classList.remove('hidden');
        } catch (error) {
            statusEl.textContent = `搜索失败: ${error.message}`;
        } finally {
            searchBtn.disabled = false;
        }
    }

    searchLocal(query) {
        const kw = query.toLowerCase();
        return this.players
            .filter(p =>
                p.name.toLowerCase().includes(kw) ||
                (p.teamAbbr && p.teamAbbr.toLowerCase().includes(kw)) ||
                (p.team && p.team.toLowerCase().includes(kw))
            )
            .map(p => ({
                id: `local_${p.id}`,
                url: p.profileImage,
                downloadUrl: p.profileImage,
                thumbnail: p.profileImage,
                description: `${p.name} (${p.teamAbbr || p.team})`,
                source: '本地图库',
                author: p.name,
                link: null,
                playerName: p.name,
            }));
    }

    async searchUnsplash(query) {
        if (!this.unsplashKey) {
            throw new Error('请先配置 Unsplash API Key (在"API 配置"里设置)');
        }
        try {
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`;
            const r = await fetch(url, {
                headers: { 'Authorization': `Client-ID ${this.unsplashKey}` }
            });
            if (!r.ok) throw new Error('Unsplash API 请求失败');
            const data = await r.json();
            return data.results.map(item => ({
                id: item.id,
                url: item.urls.regular,
                downloadUrl: item.urls.full,
                thumbnail: item.urls.thumb,
                description: item.description || item.alt_description || query,
                source: 'Unsplash',
                author: item.user.name,
                link: item.links.html
            }));
        } catch (e) {
            throw new Error('Unsplash 搜索失败: ' + e.message);
        }
    }

    async searchPexels(query) {
        if (!this.pexelsKey) {
            throw new Error('请先配置 Pexels API Key (在"API 配置"里设置)');
        }
        try {
            const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`;
            const r = await fetch(url, {
                headers: { 'Authorization': this.pexelsKey }
            });
            if (!r.ok) throw new Error('Pexels API 请求失败');
            const data = await r.json();
            return data.photos.map(item => ({
                id: item.id,
                url: item.src.large,
                downloadUrl: item.src.original,
                thumbnail: item.src.tiny,
                description: item.alt || query,
                source: 'Pexels',
                author: item.photographer,
                link: item.url
            }));
        } catch (e) {
            throw new Error('Pexels 搜索失败: ' + e.message);
        }
    }

    renderImages(images) {
        const grid = document.getElementById('images-grid');
        grid.innerHTML = images.map((img, i) => `
            <div class="image-card" data-index="${i}">
                <div class="image-wrapper">
                    <div class="image-loading">加载中...</div>
                    <img src="${img.url}"
                         alt="${img.description}"
                         loading="lazy"
                         onload="this.previousElementSibling.style.display='none'"
                         onerror="this.previousElementSibling.textContent='加载失败'">
                    <div class="image-overlay">
                        <span class="overlay-text">点击查看大图</span>
                    </div>
                </div>
                <div class="image-info">
                    <div class="image-desc">${img.description}</div>
                    <div class="image-meta">
                        <span class="image-source">${img.source} · ${img.author}</span>
                        <button class="download-btn" data-index="${i}">下载</button>
                    </div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadSingle(this.currentImages[parseInt(btn.dataset.index)]);
            });
        });

        grid.querySelectorAll('.image-card').forEach(card => {
            card.addEventListener('click', () => {
                const img = this.currentImages[parseInt(card.dataset.index)];
                window.open(img.downloadUrl || img.url, '_blank');
            });
        });
    }

    async downloadSingle(image) {
        this.addLog(`下载: ${image.description}`, '');
        try {
            const r = await fetch(image.downloadUrl || image.url);
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${image.source}_${image.id}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.addLog(`下载成功: ${image.source}_${image.id}.jpg`, 'success');
        } catch (error) {
            this.addLog('自动下载失败，已打开新窗口', '');
            window.open(image.downloadUrl || image.url, '_blank');
        }
    }

    async downloadAll() {
        const images = this.currentImages;
        this.addLog(`批量下载 ${images.length} 张图片...`, '');
        for (let i = 0; i < images.length; i++) {
            await this.downloadSingle(images[i]);
            await new Promise(r => setTimeout(r, 300));
        }
        this.addLog('批量下载完成！', 'success');
    }

    addLog(msg, type = '') {
        const log = document.getElementById('download-log');
        const content = document.getElementById('log-content');
        const item = document.createElement('div');
        item.className = `log-item ${type ? 'log-' + type : ''}`;
        item.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        content.appendChild(item);
        log.classList.remove('hidden');
        content.scrollTop = content.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageSearcher();
});
