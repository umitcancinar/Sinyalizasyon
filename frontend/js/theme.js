/* theme.js — Dark/Light mode yönetimi */
(function () {
  const STORAGE_KEY = 'sinyal_theme';
  const html = document.documentElement;

  function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // Apply immediately (before paint)
  apply(getPreferred());

  // Toggle on click
  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeToggle')) {
      const current = html.getAttribute('data-theme');
      apply(current === 'dark' ? 'light' : 'dark');
    }
  });

  window.__theme = { apply, getPreferred };
})();
