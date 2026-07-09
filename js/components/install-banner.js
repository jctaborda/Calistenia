/**
 * InstallBanner - Displays a banner prompting users to install the PWA
 */

import { t } from '../i18n.js';
import { installPromptService } from '../services/install-prompt-service.js';

/**
 * Render install banner HTML
 */
export function renderInstallBanner() {
  return `
    <div id="install-banner" class="install-banner">
      <div class="install-banner-content">
        <span class="install-banner-icon">📲</span>
        <div class="install-banner-text">
          <strong>${t('install_banner.title')}</strong>
          <p>${t('install_banner.description')}</p>
        </div>
        <div class="install-banner-actions">
          <button id="install-banner-install" class="btn btn-primary btn-sm">
            ${t('install_banner.install')}
          </button>
          <button id="install-banner-dismiss" class="btn btn-secondary btn-sm">
            ${t('install_banner.later')}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show the install banner
 */
export function showInstallBanner() {
  // Check if app is already installed
  if (installPromptService.isAppInstalled()) {
    console.log('[InstallBanner] App already installed, hiding banner');
    return;
  }

  // Check if prompt was already shown
  if (localStorage.getItem('pwa_install_prompt_shown') === 'true') {
    console.log('[InstallBanner] Prompt already shown, hiding banner');
    return;
  }

  // Create and append banner to DOM
  const banner = document.createElement('div');
  banner.innerHTML = renderInstallBanner();
  const bannerEl = banner.firstElementChild;
  
  // Add to body
  document.body.appendChild(bannerEl);

  // Show banner (add visible class)
  requestAnimationFrame(() => {
    bannerEl.classList.add('visible');
  });

  // Wire up install button
  const installBtn = bannerEl.querySelector('#install-banner-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      console.log('[InstallBanner] Install button clicked');
      
      // Hide banner
      bannerEl.classList.remove('visible');
      setTimeout(() => bannerEl.remove(), 300);

      // Show install prompt
      const accepted = await installPromptService.showInstallPrompt();
      
      if (accepted) {
        console.log('[InstallBanner] User accepted install');
      }
    });
  }

  // Wire up dismiss button
  const dismissBtn = bannerEl.querySelector('#install-banner-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      console.log('[InstallBanner] Dismiss button clicked');
      
      // Hide banner
      bannerEl.classList.remove('visible');
      setTimeout(() => bannerEl.remove(), 300);
      
      // Mark as shown so we don't show again in this session
      localStorage.setItem('pwa_install_prompt_shown', 'true');
    });
  }
}

/**
 * Hide the install banner
 */
export function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 300);
  }
}

// Listen for custom install prompt event
document.addEventListener('pwaInstallPrompt', () => {
  showInstallBanner();
});
