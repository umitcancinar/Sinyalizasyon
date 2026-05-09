/* auth.js — Frontend kimlik doğrulama */
(function () {
  // ── CONFIG ──────────────────────────────────────────────────
  // Backend URL: production'da gerçek URL'yi buraya yazın
  const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3002/api'
    : 'https://sinyal-backend-new.vercel.app/api';

  window.SINYAL_API = API; // Diğer dosyalara aç

  // ── TOKEN HELPERS ────────────────────────────────────────────
  function saveToken(token, user) {
    localStorage.setItem('sinyal_token', token);
    localStorage.setItem('sinyal_user', JSON.stringify(user));
  }
  function getToken() { return localStorage.getItem('sinyal_token'); }
  function getUser()  {
    try { return JSON.parse(localStorage.getItem('sinyal_user')); } catch { return null; }
  }
  function clearAuth() {
    localStorage.removeItem('sinyal_token');
    localStorage.removeItem('sinyal_user');
  }
  function isLoggedIn() { return !!getToken(); }

  window.Auth = { getToken, getUser, isLoggedIn, clearAuth, API };

  // ── TOAST HELPER ─────────────────────────────────────────────
  function toast(msg, type = '') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  window.showToast = toast;

  // ── AUTH PAGE LOGIC ──────────────────────────────────────────
  const onAuthPage = !!document.getElementById('authCard');

  if (onAuthPage) {
    // If already logged in, redirect to app
    if (isLoggedIn()) { window.location.href = 'app.html'; return; }

    // Tab switching
    const tabLogin    = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const panelLogin  = document.getElementById('panelLogin');
    const panelReg    = document.getElementById('panelRegister');
    const authError   = document.getElementById('authError');

    function switchTab(tab) {
      const isLogin = tab === 'login';
      tabLogin.classList.toggle('active', isLogin);
      tabRegister.classList.toggle('active', !isLogin);
      panelLogin.classList.toggle('active', isLogin);
      panelReg.classList.toggle('active', !isLogin);
      authError.classList.remove('visible');
      authError.textContent = '';
    }

    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));

    // If URL hash is #register, switch tab
    if (window.location.hash === '#register') switchTab('register');

    function showError(msg) {
      authError.textContent = msg;
      authError.classList.add('visible');
    }

    function setLoading(btn, txtEl, loading, labelKey) {
      btn.disabled = loading;
      txtEl.textContent = loading ? '...' : (window.i18n ? window.i18n.t(labelKey) : txtEl.textContent);
    }

    // ── LOGIN ───────────────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) return showError('E-posta ve şifre gerekli.');

      const btn = document.getElementById('loginBtn');
      const txt = document.getElementById('loginBtnText');
      setLoading(btn, txt, true, 'btn.login');
      authError.classList.remove('visible');

      try {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Giriş başarısız.');
        saveToken(data.token, data.user);
        goToGpsStep();
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(btn, txt, false, 'btn.login');
      }
    });

    // ── REGISTER ────────────────────────────────────────────
    const registerForm = document.getElementById('registerForm');
    const pwInput = document.getElementById('regPassword');

    // Password strength
    pwInput.addEventListener('input', () => {
      const val = pwInput.value;
      const strength = val.length < 6 ? 1 : val.length < 10 ? 2 : 3;
      const cls = ['weak','medium','strong'];
      [1,2,3].forEach(i => {
        const bar = document.getElementById(`pwBar${i}`);
        bar.className = 'pw-bar' + (i <= strength ? ` filled ${cls[strength-1]}` : '');
      });
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUsername').value.trim();
      const email    = document.getElementById('regEmail').value.trim();
      const password = pwInput.value;

      if (!username || !email || !password) return showError('Tüm alanları doldurun.');
      if (password.length < 6) return showError('Şifre en az 6 karakter olmalı.');

      const btn = document.getElementById('registerBtn');
      const txt = document.getElementById('registerBtnText');
      setLoading(btn, txt, true, 'btn.register');
      authError.classList.remove('visible');

      try {
        const res = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kayıt başarısız.');
        saveToken(data.token, data.user);
        goToGpsStep();
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(btn, txt, false, 'btn.register');
      }
    });

    // ── GPS STEP ────────────────────────────────────────────
    function goToGpsStep() {
      document.getElementById('authStep').style.display = 'none';
      document.getElementById('gpsStep').classList.add('active');
    }

    document.getElementById('gpsAllowBtn').addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        toast('Tarayıcınız GPS desteklemiyor.', 'error');
        redirectToApp();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem('sinyal_gps', 'granted');
          toast('Konum izni verildi! 📍', 'success');
          redirectToApp();
        },
        (err) => {
          toast('GPS izni reddedildi. Ayarlardan açabilirsiniz.', 'error');
          redirectToApp();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    document.getElementById('gpsSkipBtn').addEventListener('click', redirectToApp);

    function redirectToApp() {
      setTimeout(() => { window.location.href = 'app.html'; }, 500);
    }
  }

  // ── APP PAGE: logout ─────────────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      window.location.href = 'app.html';
    });
  }

  // ── GUARD: app.html requires login ───────────────────────────
  if (window.location.pathname.endsWith('app.html') && !isLoggedIn()) {
    window.location.href = 'auth.html';
  }

})();
