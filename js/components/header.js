import { t, getLocale, setLocale, getAvailableLocales } from '../i18n.js';

export function renderHeader() {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const locale = getLocale();
  const locales = getAvailableLocales();
  const nextLocale = locales[(locales.findIndex(l => l.code === locale) + 1) % locales.length].code;

  return `
    <header id="app-header">
      <div class="flex-container">
        <span class="logo-icon" role="img" aria-label="logo">💪</span>
        <h2 style="margin:0;">Calisthenics Mastery</h2>
        <div class="header-controls">
          <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
            <span class="icon">${isDarkMode ? t('theme.light') : t('theme.dark')}</span>
          </button>
          <button id="locale-toggle" class="locale-toggle" aria-label="Toggle language">
            <span class="icon">🌐 ${nextLocale.toUpperCase()}</span>
          </button>
        </div>
      </div>
      <nav class="flex-container" aria-label="Main navigation">
        <a href="#home">${t('nav.home')}</a>
        <a href="#routines">${t('nav.routines')}</a>
        <a href="#exercises">${t('nav.exercises')}</a>
        <a href="#skill-modules">${t('nav.skills')}</a>
        <a href="#profile">${t('nav.profile')}</a>
      </nav>
    </header>
  `;
}

// Theme toggle: attach to document using delegation (works even when header is dynamically inserted)
document.addEventListener('click', (e) => {
  const themeToggle = e.target.closest('#theme-toggle');
  if (themeToggle) {
    e.preventDefault();
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.querySelector('.icon').textContent = isDark ? t('theme.light') : t('theme.dark');
    return;
  }

  const localeToggle = e.target.closest('#locale-toggle');
  if (localeToggle) {
    e.preventDefault();
    const locales = getAvailableLocales();
    const current = getLocale();
    const idx = locales.findIndex(l => l.code === current);
    const next = locales[(idx + 1) % locales.length].code;
    setLocale(next);
    // localeChange event will be dispatched by setLocale
    // main.js listens for it and re-renders everything
    return;
  }
});
