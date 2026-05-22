/**
 * 共享认证逻辑（所有页面通用）
 */

const API_BASE = (function() {
    const h = window.location.hostname;
    return (!h || h === 'localhost' || h === '127.0.0.1') ? '' : 'https://CurryHeng.pythonanywhere.com';
})();

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
    if (!token) { updateAuthUI(); return; }
    try {
        const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await r.json();
        if (data.success) {
            currentUser = data.user;
        } else {
            clearToken();
        }
    } catch { /* offline */ }
    updateAuthUI();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userDisplay = document.getElementById('user-display');
    const adminBtn = document.getElementById('admin-nav-btn');
    if (!loginBtn || !userInfo) return;
    if (currentUser) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userDisplay.textContent = currentUser.username;
        if (adminBtn) {
            if (currentUser.isAdmin) {
                adminBtn.classList.remove('hidden');
            } else {
                adminBtn.classList.add('hidden');
            }
        }
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        if (adminBtn) adminBtn.classList.add('hidden');
    }
}

function openAuth() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.getElementById('auth-error')?.classList.add('hidden');
    document.getElementById('reg-error')?.classList.add('hidden');
    showLoginForm();
}

function closeAuth() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
}

function showLoginForm() {
    const el = document.getElementById('auth-title');
    if (el) el.textContent = '登录';
    const f1 = document.getElementById('login-form');
    const f2 = document.getElementById('register-form');
    if (f1) f1.classList.remove('hidden');
    if (f2) f2.classList.add('hidden');
}

function showRegisterForm() {
    const el = document.getElementById('auth-title');
    if (el) el.textContent = '注册';
    const f1 = document.getElementById('login-form');
    const f2 = document.getElementById('register-form');
    if (f1) f1.classList.add('hidden');
    if (f2) f2.classList.remove('hidden');
}

function initAuth() {
    const loginBtn = document.getElementById('login-btn');
    const authClose = document.getElementById('auth-close');
    const authOverlay = document.getElementById('auth-overlay');
    const switchReg = document.getElementById('switch-to-register');
    const switchLogin = document.getElementById('switch-to-login');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-nav-btn');

    // 独立页面（非 index.html）上的管理按钮跳转到首页
    if (adminBtn && !document.getElementById('admin-page')) {
        adminBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
    }

    if (loginBtn) loginBtn.addEventListener('click', openAuth);
    if (authClose) authClose.addEventListener('click', closeAuth);
    if (authOverlay) authOverlay.addEventListener('click', closeAuth);
    if (switchReg) switchReg.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
    if (switchLogin) switchLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
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
                    if (errEl) { errEl.textContent = data.error; errEl.classList.remove('hidden'); }
                }
            } catch {
                if (errEl) { errEl.textContent = '无法连接服务器'; errEl.classList.remove('hidden'); }
            }
        });
    }

    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
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
                    if (errEl) { errEl.textContent = '注册成功，请登录'; errEl.className = 'auth-success'; }
                    showLoginForm();
                    const lu = document.getElementById('login-username');
                    if (lu) lu.value = username;
                } else {
                    if (errEl) { errEl.textContent = data.error; errEl.className = 'auth-error'; errEl.classList.remove('hidden'); }
                }
            } catch {
                if (errEl) { errEl.textContent = '无法连接服务器'; errEl.className = 'auth-error'; errEl.classList.remove('hidden'); }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            clearToken();
            updateAuthUI();
        });
    }

    checkAuth();
}

document.addEventListener('DOMContentLoaded', initAuth);
