import { t, getLocale, setLocale, getAvailableLocales } from '../i18n.js';

/**
 * Render header component
 * @returns {string} HTML string for header component
 */
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
        <a href="#progress">${t('nav.progress', 'Progress')}</a>
        <a href="#profile">${t('nav.profile')}</a>
        <a href="#settings">${t('nav.settings', 'Settings')}</a>
      </nav>
    </header>
  `;
}

// Export for maximum flexibility
export default { render: renderHeader };
