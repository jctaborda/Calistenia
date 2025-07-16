import { fetchExercises } from '../services/api.js';
import { renderHeader } from '../components/header.js';

export async function renderHomeView() {
  const main = document.getElementById('app');
  const exercises = await fetchExercises();
  main.innerHTML = renderHeader() + `<h1>Exercises</h1><ul>${exercises.map(e => `<li><a href="#exercise/${e.id}">${e.name}</a></li>`).join('')}</ul>`;
} 