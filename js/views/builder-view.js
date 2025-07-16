import { fetchExercises } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { getState, setState } from '../services/state.js';

export async function renderBuilderView() {
  const main = document.getElementById('app');
  const exercises = await fetchExercises();
  main.innerHTML = renderHeader() + `
    <h1>Routine Builder</h1>
    <form id="routine-builder-form">
      <ul>
        ${exercises.map(e => `
          <li>
            <label>
              <input type="checkbox" name="exercise" value="${e.id}">
              ${e.name}
            </label>
          </li>
        `).join('')}
      </ul>
      <button type="submit">Save Routine</button>
    </form>
  `;
  const form = main.querySelector('#routine-builder-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const checked = Array.from(form.elements['exercise'])
        .filter(input => input.checked)
        .map(input => Number(input.value));
      if (checked.length === 0) {
        alert('Please select at least one exercise.');
        return;
      }
      const name = prompt('Enter a name for your routine:');
      if (!name) return;
      const state = getState();
      const user = { ...state.user };
      user.customRoutines = user.customRoutines || [];
      user.customRoutines.push({ name, exercises: checked });
      setState({ user });
      alert('Routine saved!');
      window.location.hash = '#programs';
    });
  }
} 