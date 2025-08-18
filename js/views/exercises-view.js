import { fetchExercises } from '../services/api.js';
import { renderHeader } from '../components/header.js';

export async function renderExercisesView() {
  const main = document.getElementById('app');
  const exercises = await fetchExercises();
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Exercises</h1>
      <input 
        type="text" 
        id="exercise-filter" 
        class="filter-input" 
        placeholder="Search exercises..." 
        autocomplete="off"
      >
      <div id="exercises-grid" class="exercise-grid">
        ${exercises.map(e => `<a class="btn" href="#exercise/${e.id}" data-exercise-name="${e.name.toLowerCase()}">${e.name}</a>`).join('')}
      </div>
    </div>
  `;

  // Add filter functionality
  const filterInput = main.querySelector('#exercise-filter');
  const exercisesGrid = main.querySelector('#exercises-grid');
  const exerciseButtons = exercisesGrid.querySelectorAll('a[data-exercise-name]');

  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      const filterText = e.target.value.toLowerCase().trim();
      
      exerciseButtons.forEach(button => {
        const exerciseName = button.getAttribute('data-exercise-name');
        if (exerciseName.includes(filterText)) {
          button.style.display = '';
        } else {
          button.style.display = 'none';
        }
      });
    });
  }
} 