import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { ValidationService } from '../services/validation.js';
import { t } from '../i18n.js';
import { show } from '../services/toast-service.js';

export function renderOnboardingView() {
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>${t('onboarding.welcome')}</h1>
      <form id="onboarding-form" class="onboarding-form">
        <div class="form-group">
          <label for="onboarding-name">${t('onboarding.name_label')} <input type="text" id="onboarding-name" name="name" required maxlength="50" title="Use only letters, numbers, spaces, hyphens, apostrophes, and commas"></label>
        </div><br><br>
        <div class="form-group">
          <label for="onboarding-level">${t('onboarding.fitness_level')}
            <select id="onboarding-level" name="level" required>
              <option value="Beginner">${t('difficulty.beginner')}</option>
              <option value="Intermediate">${t('difficulty.intermediate')}</option>
              <option value="Advanced">${t('difficulty.advanced')}</option>
            </select>
          </label>
        </div><br><br>
        <button class="btn" type="submit">${t('onboarding.get_started')}</button>
      </form>
    </div>
  `;
  const form = main.querySelector('#onboarding-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const formData = new FormData(form);
      
      // Validate name input
      const rawName = formData.get('name');
      const nameValidation = ValidationService.validateExerciseName(rawName);
      if (!nameValidation.valid) {
        show(nameValidation.error, 'error');
        return;
      }
      
      // Sanitize name to prevent XSS
      const name = ValidationService.sanitizeText(rawName);
      
      const user = {
        name: name,
        level: formData.get('level'),
      };
      updateState({ user });
      window.location.hash = '#home';
    });
  }
} 


// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderOnboardingView };
