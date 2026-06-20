// Confirmation modal service - replaces browser confirm() with a styled modal
// Used by SW update prompts and other confirmation flows

let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .confirm-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .confirm-modal-content {
      background: var(--bg-primary, #1a1a2e);
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .confirm-modal-content h2 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
    }
    .confirm-modal-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1rem;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show a confirmation modal
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
export function showConfirmation(message) {
  injectStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML = `
      <div class="confirm-modal-content">
        <h2>Confirm</h2>
        <p>${message}</p>
        <div class="confirm-modal-actions">
          <button class="btn btn-secondary confirm-cancel">Cancel</button>
          <button class="btn btn-danger confirm-ok">Confirm</button>
        </div>
      </div>
    `;

    const closeModal = () => { overlay.remove(); };

    const cancelBtn = overlay.querySelector('.confirm-cancel');
    const okBtn = overlay.querySelector('.confirm-ok');

    cancelBtn.addEventListener('click', () => {
      closeModal();
      resolve(false);
    });

    okBtn.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
        resolve(false);
      }
    });

    document.body.appendChild(overlay);
  });
}
