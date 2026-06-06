import { renderHeader } from '../components/header.js';

export function renderErrorView(message = 'An unexpected error occurred. Please try again.') {
  return renderHeader() + `
    <div class="card error-view">
      <div class="error-icon">⚠️</div>
      <h1>Error</h1>
      <p class="error-message">${message}</p>
      <button class="btn" data-nav="#home">Go Home</button>
    </div>
  `;
}

// Export for error handling
window.renderErrorView = renderErrorView;


// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderErrorView };