/**
 * 球星图片贡献功能
 */

class ContributionManager {
    constructor() {
        this.players = [];
        this.selectedPlayer = null;
        this.selectedFile = null;
        
        this.init();
    }
    
    async init() {
        await this.loadPlayers();
        this.renderMissingList();
        this.populateSelects();
        this.bindEvents();
    }
    
    async loadPlayers() {
        try {
            const response = await fetch(`${API_BASE}/api/players`);
            const result = await response.json();
            if (result.success) {
                this.players = result.data;
            } else {
                throw new Error(result.error || '数据加载失败');
            }
        } catch (error) {
            console.error('加载球员数据失败:', error);
            this.players = [];
        }
    }
    
    renderMissingList() {
        const container = document.getElementById('missing-list');
        
        container.innerHTML = this.players.map(player => {
            const hasProfile = player.profileImage && !player.profileImage.includes('ui-avatars') && !player.profileImage.includes('placeholder');
            const hasAction = player.actionGif && !player.actionGif.includes('placeholder');
            
            const statusText = [];
            if (!hasProfile) statusText.push('缺头像');
            if (!hasAction) statusText.push('缺动作图');
            
            const isComplete = hasProfile && hasAction;
            
            return `
                <div class="missing-item ${isComplete ? 'has-image' : ''}" data-id="${player.id}">
                    <div class="missing-avatar">🏀</div>
                    <div class="missing-info">
                        <div class="missing-name">${player.name}</div>
                        <div class="missing-status">
                            ${isComplete ? '✅ 图片完整' : '❌ ' + statusText.join(', ')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.missing-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                const player = this.players.find(p => p.id === id);
                if (player) {
                    document.getElementById('player-select').value = id;
                    document.getElementById('player-select-upload').value = id;
                    this.selectedPlayer = player;
                }
            });
        });
    }
    
    populateSelects() {
        const options = this.players.map(p => 
            `<option value="${p.id}">${p.name} (${p.teamAbbr})</option>`
        ).join('');
        
        document.getElementById('player-select').innerHTML = '<option value="">-- 请选择 --</option>' + options;
        document.getElementById('player-select-upload').innerHTML = '<option value="">-- 请选择 --</option>' + options;
    }
    
    bindEvents() {
        // 切换上传方式
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.dataset.method;
                
                document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.upload-method').forEach(m => m.classList.remove('active'));
                document.getElementById(method + '-method').classList.add('active');
            });
        });
        
        // URL预览
        document.getElementById('image-url').addEventListener('input', (e) => {
            const url = e.target.value.trim();
            const previewBox = document.getElementById('preview-box');
            const previewImg = document.getElementById('preview-image');
            const placeholder = previewBox.querySelector('.preview-placeholder');
            
            if (url && this.isValidImageUrl(url)) {
                previewImg.src = url;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
                
                previewImg.onerror = () => {
                    placeholder.textContent = '图片加载失败';
                    placeholder.style.display = 'block';
                    previewImg.style.display = 'none';
                };
            } else {
                previewImg.style.display = 'none';
                placeholder.textContent = '图片预览';
                placeholder.style.display = 'block';
            }
        });
        
        // 选择球员
        document.getElementById('player-select').addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            this.selectedPlayer = this.players.find(p => p.id === id);
        });
        
        document.getElementById('player-select-upload').addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            this.selectedPlayer = this.players.find(p => p.id === id);
        });
        
        // 文件拖拽上传
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
        
        // 移除文件
        document.getElementById('remove-file').addEventListener('click', () => {
            this.selectedFile = null;
            document.getElementById('file-preview').classList.remove('active');
            document.getElementById('upload-btn').disabled = true;
        });
        
        // 上传到服务器
        document.getElementById('upload-btn').addEventListener('click', () => {
            this.uploadToServer();
        });

        // 提交URL
        document.getElementById('submit-url').addEventListener('click', () => {
            this.submitUrl();
        });
        
        // 创建Issue
        document.getElementById('create-issue').addEventListener('click', () => {
            this.createIssue();
        });
        
        // 复制JSON
        document.getElementById('copy-json').addEventListener('click', () => {
            this.copyJson();
        });
        
        // 关闭模态框
        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('result-modal').classList.add('hidden');
        });
    }
    
    isValidImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    }
    
    handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('文件大小不能超过5MB');
            return;
        }
        
        this.selectedFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('file-preview-img').src = e.target.result;
            document.getElementById('file-preview').classList.add('active');
            document.getElementById('upload-btn').disabled = false;
        };
        reader.readAsDataURL(file);
    }
    
    submitUrl() {
        const playerId = document.getElementById('player-select').value;
        const imageType = document.getElementById('image-type').value;
        const imageUrl = document.getElementById('image-url').value.trim();
        
        if (!playerId) {
            alert('请选择球星');
            return;
        }
        
        if (!imageUrl) {
            alert('请输入图片URL');
            return;
        }
        
        if (!this.isValidImageUrl(imageUrl)) {
            alert('请输入有效的图片URL（jpg/png/gif）');
            return;
        }
        
        const player = this.players.find(p => p.id === parseInt(playerId));
        
        this.showModal('提交信息', `
            <p><strong>球星：</strong>${player.name}</p>
            <p><strong>类型：</strong>${imageType === 'profile' ? '头像照片' : '动作GIF'}</p>
            <p><strong>图片URL：</strong></p>
            <textarea readonly>${imageUrl}</textarea>
            <p style="margin-top:1rem;color:var(--text-secondary);font-size:0.875rem;">
                请复制以上信息，通过 Issue 或 PR 方式提交给项目维护者。
            </p>
        `);
    }
    
    createIssue() {
        const playerId = document.getElementById('player-select').value;
        const imageType = document.getElementById('image-type').value;
        const imageUrl = document.getElementById('image-url').value.trim();
        
        if (!playerId || !imageUrl) {
            alert('请先选择球星并填写图片URL');
            return;
        }
        
        const player = this.players.find(p => p.id === parseInt(playerId));
        const typeName = imageType === 'profile' ? '头像照片' : '动作GIF';
        
        const title = encodeURIComponent(`贡献图片：${player.name} - ${typeName}`);
        const body = encodeURIComponent(`## 图片贡献\n\n**球星：** ${player.name}\n**球队：** ${player.team}\n**图片类型：** ${typeName}\n**图片URL：** ${imageUrl}\n\n![预览](${imageUrl})`);
        
        const issueUrl = `https://github.com/CurryHeng/basketballtest/issues/new?title=${title}&body=${body}`;
        
        window.open(issueUrl, '_blank');
    }
    
    copyJson() {
        const playerId = document.getElementById('player-select').value || document.getElementById('player-select-upload').value;
        const imageType = document.getElementById('image-type').value || document.getElementById('image-type-upload').value;
        const imageUrl = document.getElementById('image-url').value.trim();
        
        if (!playerId) {
            alert('请选择球星');
            return;
        }
        
        const player = this.players.find(p => p.id === parseInt(playerId));
        
        const updateData = {
            id: player.id,
            name: player.name,
            update: {}
        };
        
        if (imageType === 'profile') {
            updateData.update.profileImage = imageUrl || '(上传后替换)';
        } else {
            updateData.update.actionGif = imageUrl || '(上传后替换)';
        }
        
        const jsonStr = JSON.stringify(updateData, null, 2);
        
        navigator.clipboard.writeText(jsonStr).then(() => {
            this.showModal('已复制到剪贴板', `
                <p>JSON数据已复制，可以发送给项目维护者：</p>
                <textarea readonly>${jsonStr}</textarea>
            `);
        }).catch(() => {
            this.showModal('JSON数据', `
                <p>请复制以下数据：</p>
                <textarea>${jsonStr}</textarea>
            `);
        });
    }
    
    async uploadToServer() {
        const playerId = document.getElementById('player-select-upload').value;
        const imageType = document.getElementById('image-type-upload').value;
        const uploadBtn = document.getElementById('upload-btn');

        if (!playerId || !this.selectedFile) {
            alert('请先选择球星和图片文件');
            return;
        }

        const player = this.players.find(p => p.id === parseInt(playerId));
        if (!player) {
            alert('请选择有效球星');
            return;
        }

        // 检查是否已登录
        const token = localStorage.getItem('basketball_auth_token');
        if (!token) {
            alert('请先登录后再上传');
            return;
        }

        // 构建 FormData
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        formData.append('playerName', player.name);
        formData.append('playerId', player.id);
        formData.append('imageType', imageType);

        // 上传状态
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';

        try {
            const r = await fetch(`${API_BASE}/api/images/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await r.json();

            if (data.success) {
                this.showModal('✅ 上传成功', `
                    <p>图片已上传到服务器！</p>
                    <p style="margin-top:1rem;"><strong>URL：</strong></p>
                    <textarea readonly>${data.url}</textarea>
                    <p style="margin-top:1rem;color:var(--text-secondary);font-size:0.875rem;">
                        该图片已保存在服务器，项目维护者可以看到。
                    </p>
                `);
                // 重置文件选择状态
                this.selectedFile = null;
                document.getElementById('file-preview').classList.remove('active');
                document.getElementById('upload-btn').disabled = true;
            } else {
                this.showModal('上传失败', `
                    <p style="color:#f44336;">${data.error || '未知错误'}</p>
                `);
            }
        } catch (e) {
            this.showModal('上传失败', `
                <p style="color:#f44336;">网络错误：${e.message}</p>
            `);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '上传到服务器';
        }
    }

    showModal(title, body) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('result-modal').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContributionManager();
});
