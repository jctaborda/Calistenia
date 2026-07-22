/**
 * ErrorBoundaryService - Provides error handling and recovery mechanisms for the application
 * Implements error boundaries with retry functionality to prevent app crashes
 * Includes global error handlers for error, unhandledrejection, and IndexedDB errors
 */

import { renderHeader } from '../components/header.js';
import { ERROR_BOUNDARY_MAX_RETRIES } from '../constants.js';

// Global error handler registration (call once on app init)
let globalHandlersRegistered = false;

/**
 * Register global error handlers for the application
 * Should be called once during app initialization
 */
export function registerGlobalErrorHandlers() {
  if (globalHandlersRegistered) {
    console.warn('[ErrorBoundary] Global handlers already registered');
    return;
  }
  
  // Handle uncaught JS errors (script errors, DOM errors)
  window.addEventListener('error', (event) => {
    const errorInfo = {
      type: 'error',
      message: event.message || 'Unknown error',
      filename: event.filename || window.location.href,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString()
    };
    
    console.error('[Global Error Handler]', errorInfo);
    ErrorBoundaryService.logAndReport(errorInfo);
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorInfo = {
      type: 'unhandledrejection',
      message: event.reason?.message || String(event.reason),
      reason: event.reason,
      timestamp: new Date().toISOString()
    };
    
    // Prevent default only for known error types to avoid hiding real issues
    if (errorInfo.message.includes('Failed to fetch') || 
        errorInfo.message.includes('quota')) {
      event.preventDefault();
    }
    
    console.error('[Global Rejection Handler]', errorInfo);
    ErrorBoundaryService.logAndReport(errorInfo);
  });
  
  // Handle IndexedDB errors (wrapped in try/catch in database.js)
  // IndexedDB errors are already handled at transaction level in database.js
  // This handler catches any uncaught IndexedDB exceptions
  const originalOpenDB = indexedDB.open.bind(indexedDB);
  indexedDB.open = function(name, version) {
    try {
      return originalOpenDB(name, version);
    } catch (error) {
      const errorInfo = {
        type: 'indexeddb',
        message: 'IndexedDB operation failed',
        operation: 'open',
        database: name,
        version: version,
        error: error,
        timestamp: new Date().toISOString()
      };
      console.error('[Global IndexedDB Handler]', errorInfo);
      ErrorBoundaryService.logAndReport(errorInfo);
      throw error;
    }
  };
  
  globalHandlersRegistered = true;
  console.log('[ErrorBoundary] Global error handlers registered');
}

export class ErrorBoundaryService {
  // Store for tracking retry attempts per view
  static retryAttempts = new Map();
  static maxRetries = ERROR_BOUNDARY_MAX_RETRIES;

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
      ? `<button data-error-retry class="btn btn-primary">Try Again</button>`
      : `<p class="small-text">Please refresh the page to recover.</p>`;

    main.innerHTML = header + `
      <div class="error-container">
        <h2>${errorTitle}</h2>
        <div class="error-content">
          <p class="error-message">${this.escapeHtml(this.sanitizeErrorMessage(error.message))}</p>
          <p class="error-context">Context: ${this.escapeHtml(context)}</p>
          <details>
            <summary>Show technical details</summary>
            <pre class="error-details">${this.escapeHtml(error.stack || 'No stack trace')}</pre>
          </details>
        </div>
        <div class="error-actions">
          ${retryButton}
          <button data-error-go-home class="btn btn-secondary">Go Home</button>
          <button data-error-reload class="btn btn-secondary">Refresh Page</button>
        </div>
      </div>
    `;

    // Attach retry handler directly since it's a one-time use button
    if (onRetry) {
      const retryBtn = main.querySelector('[data-error-retry]');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.retryAttempts.set(context, 0);
          onRetry();
        });
      }
    }
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
   * Log and report error information
   * @param {Object} errorInfo - Error information object
   */
  static logAndReport(errorInfo) {
    // Log to console with timestamp
    console.error(`[ErrorReport] ${errorInfo.type.toUpperCase()}: ${errorInfo.message}`, errorInfo);
    
    // In production, this could send to error tracking service (Sentry, etc.)
    // For now, we just log to console
    if (typeof window !== 'undefined' && window.__ERROR_TRACKING__) {
      try {
        window.__ERROR_TRACKING__.captureException(errorInfo);
      } catch (e) {
        console.error('Failed to report error to tracking service:', e);
      }
    }
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
}
