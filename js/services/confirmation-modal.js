// Confirmation modal service - replaces browser confirm() with a styled modal
// Used by SW update prompts and other confirmation flows

import { ValidationService } from './validation.js';
import { t } from '../i18n.js';

/**
 * Show a confirmation modal
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
export function showConfirmation(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    const escapedMessage = ValidationService.sanitizeText(message);
    overlay.innerHTML = `
      <div class="confirm-modal-content">
        <h2>${t('common.confirm')}</h2>
        <p>${escapedMessage}</p>
        <div class="confirm-modal-actions">
          <button class="btn btn-secondary confirm-cancel">${t('common.cancel')}</button>
          <button class="btn btn-danger confirm-ok">${t('common.confirm')}</button>
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
