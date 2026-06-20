import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';

export function renderErrorView(message = 'An unexpected error occurred. Please try again.') {
  return renderHeader() + `
    <div class="card error-view">
      <div class="error-icon">⚠️</div>
      <h1>Error</h1>
      <p class="error-message">${message}</p>
      <button class="btn" data-nav="#home">${t('error.go_home')}</button>
    </div>
  `;
}

// Export for error handling


// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderErrorView };