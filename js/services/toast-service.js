// Toast notification service for user feedback
let toastTimeout = null;

export function show(message, type = 'info') {
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

  // Auto-dismiss after 5 seconds
  toastTimeout = setTimeout(() => {
    if (toast.parentNode) {
  toast.remove();
    }
  }, 5000);
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
