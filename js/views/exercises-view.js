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
    <button class="btn hidden" id="add-exercise">Add Exercise</button>
    <input type="text" id="exercise-filter" class="filter-input"
      placeholder="Search exercises..." autocomplete="off">
  
    <p>Filter by Category</p>
  
    <select id="category-filter" multipe size="0">
      ${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}
    </select>

    <p>Filter by Difficulty</p>
  
    <select id="difficulty-filter" multipe size="0">
      <option value="Beginner">Beginner</option>
      <option value="Intermediate">Intermediate</option>
      <option value="Advanced">Advanced</option>
    </select>

    <div id="exercises-grid" class="exercises-grid">
      ${exercises.map(e => `<div class="exercise-card difficulty-${e.difficulty}" data-id="${e.id}" 
        data-exercise-name="${e.name.toLowerCase()}"><h3>${e.name}</h3> <p>${e.description}</p> 
        <div class="tags">
      ${e.categories.map(cat => `<span class="tag">${categories.find(c => c.id===cat)?.name}</span>`).join('')}
    </div>
      </div>` ).join('')}
    </div> 
  </div>
  `;
  
  // Add filter functionality
  const filterInput = main.querySelector('#exercise-filter');
  const categoryFilter = main.querySelector('#category-filter');
  const difficultyFilter = main.querySelector('#difficulty-filter');
  const exercisesGrid = main.querySelector('#exercises-grid');
  const exerciseButtons = exercisesGrid.querySelectorAll('.exercise-card');
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
        const exercise = exercises.find(ex => ex.id === parseInt(button.getAttribute('data-id')));
        if (exercise && selectedCategoryIds.some(categoryId => exercise.categories.includes(categoryId))) {
          button.style.display = '';
        } else {
          button.style.display = 'none';
        }
      });
    });
  }
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', (e) => {
      const selectedDifficulty = e.target.selectedOptions;
      const selectedDifficultyIds = Array.from(selectedDifficulty).map(option => option.value.toLowerCase());
      console.log(selectedDifficultyIds)
      exerciseButtons.forEach(button => {
        const exercise = exercises.find(ex => ex.id === parseInt(button.getAttribute('data-id')));
        if (exercise && selectedDifficultyIds.some(difi => exercise.difficulty.includes(difi))) {
          button.style.display = '';
        } else {
          button.style.display = 'none';
        }
      });
    });
  }
  exercisesGrid.querySelectorAll('.exercise-card').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = btn.getAttribute('data-id');
      window.location.hash = `#exercise/${id}`;
    });
  });
}


