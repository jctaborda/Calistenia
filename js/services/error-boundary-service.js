/**
 * ErrorBoundaryService - Provides error handling and recovery mechanisms for the application
 * Implements error boundaries with retry functionality to prevent app crashes
 */

import { renderHeader } from '../components/header.js';

export class ErrorBoundaryService {
  // Store for tracking retry attempts per view
  static retryAttempts = new Map();
  static maxRetries = 2;

  /**
   * Create an error boundary wrapper that catches rendering errors
   * @param {Function} renderFn - The rendering function to wrap
   * @param {string} context - Context for error logging (e.g., view name)
   * @returns {Function} - Wrapped function with error handling
   */
  static createBoundary(renderFn, context = 'Unknown') {
    return async (...args) => {
      try {
        const result = renderFn(...args);
        // Handle both sync and async functions
        if (result && typeof result.then === 'function') {
          return await result;
        }
        return result;
      } catch (error) {
        console.error(`Error in ${context}:`, error);
        
        // Check if we can retry
        const attempts = this.retryAttempts.get(context) || 0;
        
        if (attempts < this.maxRetries) {
          this.retryAttempts.set(context, attempts + 1);
          console.log(`Retry attempt ${attempts + 1}/${this.maxRetries} for ${context}`);
          
          // Show partial error recovery
          this.renderErrorView(error, context, () => {
            this.retryAttempts.set(context, 0);
            return renderFn(...args);
          });
        } else {
          // Max retries reached, show persistent error with manual recovery
          this.renderErrorView(error, context, null);
        }
      }
    };
  }

  /**
   * Render an error view with retry mechanism
   * @param {Error} error - The error that occurred
   * @param {string} context - Context where error occurred
   * @param {Function} onRetry - Function to call on retry (optional)
   */
  static renderErrorView(error, context, onRetry = null) {
    const main = document.getElementById('app');
    if (!main) return;

    const header = this.getSafeHeader();
    
    const errorTitle = context.includes('Active Workout') ? 'Workout Error' : 
                       context.includes('Exercise') ? 'Exercise Error' : 
                       context.includes('Program') ? 'Program Error' : 'Application Error';

    const retryButton = onRetry 
      ? `<button onclick="${this.generateRetryFunction(onRetry)}" class="btn btn-primary">Try Again</button>`
      : `<p class="small-text">Please refresh the page to recover.</p>`;

    main.innerHTML = header + `
      <div class="error-container">
        <h2>${errorTitle}</h2>
        <div class="error-content">
          <p class="error-message">${this.sanitizeErrorMessage(error.message)}</p>
          <p class="error-context">Context: ${this.escapeHtml(context)}</p>
          <details>
            <summary>Show technical details</summary>
            <pre class="error-details">${this.escapeHtml(error.stack || 'No stack trace')}</pre>
          </details>
        </div>
        <div class="error-actions">
          ${retryButton}
          <button onclick="window.location.hash='#'" class="btn btn-secondary">Go Home</button>
          <button onclick="location.reload()" class="btn btn-secondary">Refresh Page</button>
        </div>
      </div>
    `;

    // Add error boundary styles
    this.ensureErrorStyles();
  }

  /**
   * Get safe header (with its own error handling)
   * @returns {string} - Header HTML or empty string if error
   */
  static getSafeHeader() {
    try {
      return renderHeader();
    } catch (e) {
      console.error('Failed to render header:', e);
      return '<nav class="navbar"><div class="navbar-brand">Calisthenics Mastery</div></nav>';
    }
  }

  /**
   * Sanitize error message for safe display
   * @param {string} message - Error message to sanitize
   * @returns {string} - Sanitized message
   */
  static sanitizeErrorMessage(message) {
    // Don't expose sensitive information
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /api[_-]?key/i,
      /secret/i
    ];

    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate retry function code that can be embedded in HTML
   * @param {Function} callback - Retry callback function
   * @returns {string} - Function code string
   */
  static generateRetryFunction(callback) {
    return `window.errorBoundaryRetry = () => ${callback.toString()}()`;
  }

  /**
   * Ensure error boundary styles are in the document
   */
  static ensureErrorStyles() {
    if (document.getElementById('error-boundary-styles')) return;

    const style = document.createElement('style');
    style.id = 'error-boundary-styles';
    style.textContent = `
      .error-container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .error-content {
        margin: 1.5rem 0;
        padding: 1rem;
        background: #fff3f3;
        border-left: 4px solid #ff4444;
        border-radius: 4px;
      }
      .error-message {
        color: #d93025;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      .error-context {
        color: #666;
        font-size: 0.9em;
      }
      .error-details {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        font-family: monospace;
        font-size: 0.85em;
        color: #333;
      }
      .error-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .error-actions .btn {
        flex: 1;
      }
      .small-text {
        font-size: 0.9em;
        color: #666;
        margin: 1rem 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Wrap a view rendering function with error boundaries
   * @param {string} viewName - Name of the view for error context
   * @returns {Object} - Object with wrapped render and init functions
   */
  static wrapView(viewModule, viewName) {
    const wrapped = {};

    // Check for default export first (modern pattern: export default { render: ... })
    // or direct module-level render property (legacy pattern)
    const renderFn = viewModule.default?.render || viewModule.render;
    
    if (renderFn) {
      wrapped.render = this.createBoundary(renderFn, `View: ${viewName}`);
    }

    // Check for init function similarly
    const initFn = viewModule.default?.init || viewModule.init;
    if (initFn) {
      wrapped.init = this.createBoundary(initFn, `Init: ${viewName}`);
    }

    return wrapped;
  }

  /**
   * Reset retry attempts for a specific context
   * @param {string} context - Context to reset
   */
  static resetRetry(context) {
    this.retryAttempts.set(context, 0);
  }

  /**
   * Global error handler to catch unhandled exceptions
   */
  static installGlobalHandlers() {
    // Handle uncaught promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      // Don't show UI for all rejections - only log them
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught Error:', event.error);
      // Don't show UI for all errors to avoid disrupting user experience
    });
  }
}

// Install global handlers immediately
ErrorBoundaryService.installGlobalHandlers();
