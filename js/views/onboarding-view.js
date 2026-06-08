import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { ValidationService } from '../services/validation.js';
import { show } from '../services/toast-service.js';

export function renderOnboardingView() {
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Welcome! Let's get started</h1>
      <form id="onboarding-form" class="onboarding-form">
        <div class="form-group">
          <label>Name: <input type="text" name="name" required maxlength="50" pattern="[a-zA-Z0-9\s'\-,]+" title="Use only letters, numbers, spaces, hyphens, and apostrophes"></label>
        </div><br><br>
        <div class="form-group">
          <label>Fitness Level:
            <select name="level" required>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
        </div><br><br>
        <button class="btn" type="submit">Save</button>
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
