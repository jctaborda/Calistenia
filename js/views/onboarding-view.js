import { renderHeader } from '../components/header.js';
import { setState } from '../services/state.js';

export function renderOnboardingView() {
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + `
    <h1>Welcome! Let's get started</h1>
    <form id="onboarding-form">
      <label>Name: <input type="text" name="name" required></label><br><br>
      <label>Fitness Level:
        <select name="level" required>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </label><br><br>
      <button type="submit">Save</button>
    </form>
  `;
  const form = main.querySelector('#onboarding-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const formData = new FormData(form);
      const user = {
        name: formData.get('name'),
        level: formData.get('level'),
      };
      setState({ user });
      window.location.hash = '#home';
    });
  }
} 