// js/views/exercises-view.js
import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
import { 
  diffUpdateGrid, 
  setupVirtualScroll,
  withScrollPreservation,
  batchDomUpdates,
  setupLazyLoadImages 
} from '../utils/dom-optimizer.js';

export async function renderExercisesView() {
  const main = document.getElementById('app');
  const exercises = (await getState().exercises) || [];
  const categories = (await getState().categories) || [];
  const difficulties = (await getState().difficulties) || [];
  const itemsPerPage = 10; // Number of exercises to display per page
  
  // State management
  let currentPage = 1;
  let filteredExercises = exercises;
  let totalItems = filteredExercises.length;
  let totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Filter state
  let currentFilters = {
    searchText: '',
    selectedCategories: [],
    selectedDifficulties: [],
    showAllCategories: true,
    showAllDifficulties: true
  };
  
  // Cache for optimized updates
  const cardCache = new Map();

  /**
   * Get difficulty label from ID (with caching for performance)
   */
  const getDifficultyLabel = (() => {
    const cache = new Map();
    return (diffId) => {
      if (!cache.has(diffId)) {
        const diff = difficulties.find(d => d.id === diffId);
        cache.set(diffId, diff ? diff.label : `Difficulty ${diffId}`);
      }
      return cache.get(diffId);
    };
  })();

  /**
   * Get difficulty labels for an exercise (optimized)
   */
  function getDifficultyLabels(exercise) {
    const diffIds = Array.isArray(exercise.difficulty) ? exercise.difficulty : [exercise.difficulty];
    return diffIds.map(getDifficultyLabel).join(', ');
  }

  /**
   * Apply filters efficiently with debouncing
   */
  let filterTimeout;
  function applyFilters() {
    // Clear previous timeout
    clearTimeout(filterTimeout);
    
    // Debounce filter changes for better performance
    filterTimeout = setTimeout(() => {
      filteredExercises = exercises.filter(exercise => {
        const matchesSearch = currentFilters.searchText === '' || 
          exercise.name.toLowerCase().includes(currentFilters.searchText.toLowerCase());
        
        let matchesCategory = true;
        if (!currentFilters.showAllCategories && currentFilters.selectedCategories.length > 0) {
          const exCats = Array.isArray(exercise.categories) ? exercise.categories : (exercise.categories ? [exercise.categories] : []);
          matchesCategory = exCats.some(categoryId => 
            currentFilters.selectedCategories.includes(categoryId));
        }
        
        let matchesDifficulty = true;
        if (!currentFilters.showAllDifficulties && currentFilters.selectedDifficulties.length > 0) {
          const exerciseDiffIds = Array.isArray(exercise.difficulty) ? exercise.difficulty : [exercise.difficulty];
          matchesDifficulty = currentFilters.selectedDifficulties.some(difficultyId => 
            exerciseDiffIds.includes(difficultyId));
        }
        
        return matchesSearch && matchesCategory && matchesDifficulty;
      });
      
      totalItems = filteredExercises.length;
      totalPages = Math.ceil(totalItems / itemsPerPage);
      
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = 1;
      }
      
      updatePageView(currentPage);
    }, 150); // 150ms debounce
  }

  /**
   * Render pagination numbers (optimized - only updates text content)
   */
  function renderPaginationNumbers(container, current, total) {
    const existingElements = Array.from(container.children);
    
    // Clear and rebuild pagination
    container.innerHTML = '';
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        if (i === current) {
          const span = document.createElement('span');
          span.className = 'pagination-current';
          span.textContent = i;
          container.appendChild(span);
        } else {
          const btn = document.createElement('button');
          btn.className = 'pagination-btn';
          btn.setAttribute('data-page', i);
          btn.textContent = i;
          container.appendChild(btn);
        }
      }
    } else {
      // First page always shown
      const firstBtn = document.createElement('button');
      firstBtn.className = 'pagination-btn';
      firstBtn.setAttribute('data-page', 1);
      firstBtn.textContent = 1;
      container.appendChild(firstBtn);
      
      if (current <= 4) {
        for (let i = 2; i <= 5; i++) {
          const btn = document.createElement('button');
          btn.className = 'pagination-btn';
          btn.setAttribute('data-page', i);
          btn.textContent = i;
          container.appendChild(btn);
        }
        if (total > 6) {
          const span = document.createElement('span');
          span.className = 'pagination-ellipsis';
          span.textContent = '...';
          container.appendChild(span);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.setAttribute('data-page', total);
        lastBtn.textContent = total;
        container.appendChild(lastBtn);
      } else if (current >= total - 3) {
        if (total > 6) {
          const span = document.createElement('span');
          span.className = 'pagination-ellipsis';
          span.textContent = '...';
          container.appendChild(span);
        }
        for (let i = total - 4; i <= total; i++) {
          const btn = document.createElement('button');
          btn.className = 'pagination-btn';
          btn.setAttribute('data-page', i);
          btn.textContent = i;
          container.appendChild(btn);
        }
      } else {
        if (total > 6) {
          const span = document.createElement('span');
          span.className = 'pagination-ellipsis';
          span.textContent = '...';
          container.appendChild(span);
        }
        
        for (let i = current - 1; i <= current + 1; i++) {
          const btn = document.createElement('button');
          btn.className = 'pagination-btn';
          btn.setAttribute('data-page', i);
          btn.textContent = i;
          container.appendChild(btn);
        }
        
        if (total > 6) {
          const span = document.createElement('span');
          span.className = 'pagination-ellipsis';
          span.textContent = '...';
          container.appendChild(span);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.setAttribute('data-page', total);
        lastBtn.textContent = total;
        container.appendChild(lastBtn);
      }
    }
  }

  /**
   * Update pagination element (optimized)
   */
  function updatePagination(current, total) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    const prevButton = paginationContainer.querySelector('.pagination-nav-btn[data-action="prev"]');
    const nextButton = paginationContainer.querySelector('.pagination-nav-btn[data-action="next"]');
    const pageNumbersContainer = paginationContainer.querySelector('[id*="page-numbers"]') || 
                                  document.createElement('div');
    
    // Create or get page numbers container
    let numbersWrapper = paginationContainer.querySelector('[id*="page-numbers"]');
    if (!numbersWrapper) {
      numbersWrapper = document.createElement('div');
      numbersWrapper.id = 'pagination-numbers-wrapper';
      const existingButtons = Array.from(paginationContainer.querySelectorAll('.pagination-btn'));
      existingButtons.forEach(btn => btn.remove());
      paginationContainer.insertBefore(numbersWrapper, paginationContainer.firstChild);
    }
    
    // Only update the page numbers
    renderPaginationNumbers(numbersWrapper, current, total);
    
    // Update navigation buttons (preserve state)
    if (prevButton) {
      if (current > 1) {
        prevButton.classList.remove('disabled');
        prevButton.disabled = false;
        prevButton.title = 'Previous page';
      } else {
        prevButton.classList.add('disabled');
        prevButton.disabled = true;
        prevButton.title = 'Previous page';
      }
    }
    
    if (nextButton) {
      if (current < total) {
        nextButton.classList.remove('disabled');
        nextButton.disabled = false;
        nextButton.title = 'Next page';
      } else {
        nextButton.classList.add('disabled');
        nextButton.disabled = true;
        nextButton.title = 'Next page';
      }
    }
  }

  /**
   * Update view when page changes - using optimized DOM updates
   */
  function updatePageView(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      
      // Preserve scroll position
      withScrollPreservation(main.querySelector('#exercises-grid'), () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const exercisesToShow = filteredExercises.slice(startIndex, startIndex + itemsPerPage);
        
        // Use diff-based update instead of full re-render
        const gridElement = main.querySelector('#exercises-grid');
        if (gridElement) {
          batchDomUpdates(() => {
            diffUpdateGrid(gridElement, exercisesToShow, categories, cardCache);
          });
        }
      });
      
      // Update pagination efficiently
      updatePagination(currentPage, totalPages);
    }
  }

  // Render main layout with optimized structure
  main.innerHTML = renderHeader() + `
  <div class="card">
    <h1>Exercises</h1>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <button class="btn btn-primary" id="add-exercise-btn">➕ Add Exercise</button>
      <input type="text" id="exercise-filter" class="filter-input" style="width: 300px;"
        placeholder="Search exercises..." autocomplete="off">
    </div>
    <p>Filter by Category</p>
  
    <select id="category-filter" multiple size="0">
      <option value="all" data-type="all">All Categories</option>
      ${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}
    </select>

    <p>Filter by Difficulty</p>
  
    <select id="difficulty-filter" multiple size="0">
      <option value="all" data-type="all">All Difficulties</option>
      ${difficulties.map(diff => `<option value="${diff.id}">${diff.label}</option>`).join('')}
    </select>

    <div id="exercises-grid" class="exercises-grid"></div>
    
    <div class="pagination">
      <button class="pagination-nav-btn" data-action="prev" disabled title="Previous page"><<<</button>
      <div id="pagination-numbers-wrapper"></div>
      <button class="pagination-nav-btn" data-action="next" disabled title="Next page">>></button>
    </div>
  </div>`;

  /**
   * Initialize event listeners using event delegation (attached ONCE)
   */
  function initializeEventDelegation() {
    main.addEventListener('click', (e) => {
      const target = e.target;

      // Handle "View" buttons in exercise cards
      if (target.classList.contains('view-btn')) {
        e.stopPropagation();
        const card = target.closest('.exercise-card');
        if (card) {
          const id = card.getAttribute('data-id');
          window.location.hash = `#exercise/${id}`;
        }
      }

      // Handle "Edit" buttons in exercise cards
      else if (target.classList.contains('edit-btn')) {
        e.stopPropagation();
        const card = target.closest('.exercise-card');
        if (card) {
          const id = card.getAttribute('data-id');
          sessionStorage.setItem('editingExerciseId', id);
          window.location.hash = '#exercise-form';
        }
      }

      // Handle pagination number buttons
      else if (target.classList.contains('pagination-btn')) {
        e.stopPropagation();
        const page = parseInt(target.getAttribute('data-page'));
        if (!isNaN(page)) {
          updatePageView(page);
        }
      }

      // Handle pagination navigation buttons
      else if (target.classList.contains('pagination-nav-btn') && !target.classList.contains('disabled')) {
        e.stopPropagation();
        const action = target.getAttribute('data-action');
        if (action === 'prev' && currentPage > 1) {
          updatePageView(currentPage - 1);
        } else if (action === 'next' && currentPage < totalPages) {
          updatePageView(currentPage + 1);
        }
      }

      // Handle "Add Exercise" button
      else if (target.id === 'add-exercise-btn') {
        window.location.hash = '#exercise-form';
      }
    });
  }

  // Initial setup
  initializeEventDelegation();
  
  // Set up filter listeners
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
      
      const allSelected = Array.from(selectedCategories).some(option => 
        option.getAttribute('data-type') === 'all');
      
      if (allSelected) {
        currentFilters.showAllCategories = true;
        currentFilters.selectedCategories = [];
      } else {
        currentFilters.showAllCategories = false;
        currentFilters.selectedCategories = Array.from(selectedCategories).map(option => 
          parseInt(option.value));
      }
      
      applyFilters();
    });
  }
  
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', (e) => {
      const selectedDifficulty = e.target.selectedOptions;
      
      const allSelected = Array.from(selectedDifficulty).some(option => 
        option.getAttribute('data-type') === 'all');
      
      if (allSelected) {
        currentFilters.showAllDifficulties = true;
        currentFilters.selectedDifficulties = [];
      } else {
        currentFilters.showAllDifficulties = false;
        currentFilters.selectedDifficulties = Array.from(selectedDifficulty).map(option => 
          parseInt(option.value));
      }
      
      applyFilters();
    });
  }
  
  // Initial render of first page
  updatePageView(1);
  
  // Setup lazy loading for any future images
  setupLazyLoadImages();
}

// Export as object for wrapView compatibility
export default { render: renderExercisesView };
