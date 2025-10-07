// js/views/exercises-view.js
import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
export async function renderExercisesView() {
  const main = document.getElementById('app');
  const exercises = await getState().exercises;
  const categories = await getState().categories;
  const itemsPerPage = 10; // Number of exercises to display per page
  let currentPage = 1;
  let filteredExercises = exercises; // Start with all exercises
  let totalItems = filteredExercises.length;
  let totalPages = Math.ceil(totalItems / itemsPerPage);
  let exercisesToRender = filteredExercises.slice(0, itemsPerPage);
  
  // Filter state
  let currentFilters = {
    searchText: '',
    selectedCategories: [],
    selectedDifficulties: []
  };

  // Function to apply filters to exercises
  function applyFilters() {
    filteredExercises = exercises.filter(exercise => {
      // Search text filter
      const matchesSearch = currentFilters.searchText === '' || 
        exercise.name.toLowerCase().includes(currentFilters.searchText.toLowerCase());
      
      // Category filter
      const matchesCategory = currentFilters.selectedCategories.length === 0 ||
        currentFilters.selectedCategories.some(categoryId => exercise.categories.includes(categoryId));
      
      // Difficulty filter
      const matchesDifficulty = currentFilters.selectedDifficulties.length === 0 ||
        currentFilters.selectedDifficulties.some(difficulty => 
          exercise.difficulty.toLowerCase() === difficulty.toLowerCase());
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
    
    // Update pagination variables
    totalItems = filteredExercises.length;
    totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Reset to first page if current page is beyond filtered results
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }
    
    // Update the view
    updatePageView(currentPage);
  }

  // Function to generate pagination numbers
  function generatePaginationNumbers(current, total) {
    const numbers = [];
    
    if (total <= 7) {
      // If total pages is 7 or less, show all pages
      for (let i = 1; i <= total; i++) {
        numbers.push(i);
      }
    } else {
      // Always show first page
      numbers.push(1);
      
      if (current <= 4) {
        // Show pages 1, 2, 3, 4, 5, ..., last
        for (let i = 2; i <= 5; i++) {
          numbers.push(i);
        }
        if (total > 6) numbers.push('...');
        numbers.push(total);
      } else if (current >= total - 3) {
        // Show pages 1, ..., n-4, n-3, n-2, n-1, n
        if (total > 6) numbers.push('...');
        for (let i = total - 4; i <= total; i++) {
          numbers.push(i);
        }
      } else {
        // Show pages 1, ..., current-1, current, current+1, ..., last
        if (total > 6) numbers.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          numbers.push(i);
        }
        if (total > 6) numbers.push('...');
        numbers.push(total);
      }
    }
    
    return numbers;
  }

  // Function to render pagination HTML
  function renderPagination(current, total) {
    const numbers = generatePaginationNumbers(current, total);
    const pageNumbers = numbers.map(num => {
      if (num === '...') {
        return '<span class="pagination-ellipsis">...</span>';
      } else if (num === current) {
        return `<span class="pagination-current">${num}</span>`;
      } else {
        return `<button class="pagination-btn" data-page="${num}">${num}</button>`;
      }
    }).join('');
    
    // Add navigation buttons
    const prevButton = current > 1 ? 
      `<button class="pagination-nav-btn" data-action="prev" title="Previous page"><<</button>` : 
      `<button class="pagination-nav-btn disabled" disabled title="Previous page"><<</button>`;
    
    const nextButton = current < total ? 
      `<button class="pagination-nav-btn" data-action="next" title="Next page">>></button>` : 
      `<button class="pagination-nav-btn disabled" disabled title="Next page">>></button>`;
    
    return prevButton + pageNumbers + nextButton;
  }
  
  main.innerHTML = renderHeader() + `
  <div class="card">
    <h1>Exercises</h1>
    <button class="btn hidden" id="add-exercise">Add Exercise</button>
    <input type="text" id="exercise-filter" class="filter-input"
      placeholder="Search exercises..." autocomplete="off">
    <p>Filter by Category</p>
  
    <select id="category-filter" multiple size="0">
      ${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}
    </select>

    <p>Filter by Difficulty</p>
  
    <select id="difficulty-filter" multiple size="0">
      <option value="Beginner">Beginner</option>
      <option value="Intermediate">Intermediate</option>
      <option value="Advanced">Advanced</option>
    </select>

    <div id="exercises-grid" class="exercises-grid">
      ${exercisesToRender.map(e => `<div class="exercise-card difficulty-${e.difficulty}" data-id="${e.id}"
      data-exercise-name="${e.name.toLowerCase()}"><h3>${e.name}</h3> <p>${e.description}</p> 
      <div class="tags">
        ${e.categories.map(cat => `<span class="tag">${categories.find(c => c.id===cat)?.name}</span>`).join('')}
      </div>
      </div>`).join('')}
    </div>
    <div class="pagination">
      ${renderPagination(currentPage, totalPages)}
    </div>
  </div>`;
      
  // Function to update the view when page changes
  function updatePageView(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      const startIndex = (currentPage - 1) * itemsPerPage;
      exercisesToRender = filteredExercises.slice(startIndex, startIndex + itemsPerPage);
      document.getElementById('exercises-grid').innerHTML =
        exercisesToRender.map(e => `<div class="exercise-card difficulty-${e.difficulty}" data-id="${e.id}"
        data-exercise-name="${e.name.toLowerCase()}"><h3>${e.name}</h3> <p>${e.description}</p>
        <div class="tags">
          ${e.categories.map(cat => `<span class="tag">${categories.find(c => c.id===cat)?.name}</span>`).join('')}
        </div>
      </div>`).join('');
      
      // Update pagination
      document.querySelector('.pagination').innerHTML = renderPagination(currentPage, totalPages);
      
      // Re-attach event listeners to new pagination buttons
      attachPaginationListeners();
      
      // Re-attach exercise card listeners
      attachExerciseCardListeners();
    }
  }

  // Function to attach pagination event listeners
  function attachPaginationListeners() {
    // Handle numbered page buttons
    document.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.target.getAttribute('data-page'));
        updatePageView(page);
      });
    });
    
    // Handle navigation buttons (<< and >>)
    document.querySelectorAll('.pagination-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        if (action === 'prev' && currentPage > 1) {
          updatePageView(currentPage - 1);
        } else if (action === 'next' && currentPage < totalPages) {
          updatePageView(currentPage + 1);
        }
      });
    });
  }

  // Function to attach exercise card event listeners
  function attachExerciseCardListeners() {
    document.querySelectorAll('.exercise-card').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = btn.getAttribute('data-id');
        window.location.hash = `#exercise/${id}`;
      });
    });
  }

  // Initial setup of event listeners
  attachPaginationListeners();
  
  
  // Add filter functionality
  const filterInput = main.querySelector('#exercise-filter');
  const categoryFilter = main.querySelector('#category-filter');
  const difficultyFilter = main.querySelector('#difficulty-filter');
  
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      currentFilters.searchText = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      const selectedCategories = e.target.selectedOptions;
      currentFilters.selectedCategories = Array.from(selectedCategories).map(option => parseInt(option.value));
      applyFilters();
    });
  }
  
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', (e) => {
      const selectedDifficulty = e.target.selectedOptions;
      currentFilters.selectedDifficulties = Array.from(selectedDifficulty).map(option => option.value.toLowerCase());
      applyFilters();
    });
  }
  // Exercise card listeners are now handled by attachExerciseCardListeners()
  attachExerciseCardListeners();
}


