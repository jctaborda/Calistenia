// src/views/exercises-view.js
import { fetchExercises } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
export async function renderExercisesView() {
  const main = document.getElementById('app');
  const exercises = await getState().exercises;
  const categories = await getState().categories;
  main.innerHTML = renderHeader() + `
  <div class="card">
  <h1>Exercises</h1>
  <button class="btn" id="add-exercise">Add Exercise</button>
  <input
    type="text"
    id="exercise-filter"
    class="filter-input"
    placeholder="Search exercises..."
    autocomplete="off"
  >
  <p>Filter by Category</p>
  <select id="category-filter" multiple>
    ${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}
  </select>
  <div id="exercises-grid" class="exercise-grid">
  ${exercises.map(e => `<a class="btn" href="#exercise/${e.id}" data-exercise-name="${e.name.toLowerCase()}">${e.name}</a>`).join('')}
  </div>
  </div>
  `;
  // Add filter functionality
  const filterInput = main.querySelector('#exercise-filter');
  const categoryFilter = main.querySelector('#category-filter');
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
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      const selectedCategories = e.target.selectedOptions;
      const selectedCategoryIds = Array.from(selectedCategories).map(option => parseInt(option.value));

      exerciseButtons.forEach(button => {
        const exercise = exercises.find(ex => ex.id === parseInt(button.href.split('/').pop()));
        if (exercise && selectedCategoryIds.some(categoryId => exercise.categories.includes(categoryId))) {
          button.style.display = '';
        } else {
          button.style.display = 'none';
        }
      });
    });
  }
}


