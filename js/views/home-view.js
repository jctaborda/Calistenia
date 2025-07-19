import { fetchExercises } from '../services/api.js';
import { renderHeader } from '../components/header.js';

export async function renderHomeView() {
  const main = document.getElementById('app');
  const exercises = await fetchExercises();
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Exercises</h1>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
        ${exercises.map(e => `<a class="btn" href="#exercise/${e.id}">${e.name}</a>`).join('')}
      </div>
    </div>
  `;
} 