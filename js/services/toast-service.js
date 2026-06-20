import { t } from '../i18n.js';
import { TOAST_TIMEOUTS } from '../constants.js';

// Default timeouts by type (in ms)
const DEFAULT_TIMEOUTS = TOAST_TIMEOUTS;

let toastTimeout = null;

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Toast type: 'info', 'success', 'warning', 'error'
 * @param {number} [duration] - Optional custom duration in ms. Falls back to type-specific default.
 */
export function show(message, type = 'info', duration) {
  // Clear existing timeout if any
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  // Remove existing toast if present
  const existingToast = document.querySelector('.app-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  document.body.appendChild(toast);

  // Auto-dismiss with type-specific or custom duration
  const timeout = duration ?? DEFAULT_TIMEOUTS[type] ?? DEFAULT_TIMEOUTS.info;
  toastTimeout = setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, timeout);
}

export function success(message) {
  show(message, 'success');
}

export function error(message) {
  show(message, 'error');
}

export function warning(message) {
  show(message, 'warning');
}
