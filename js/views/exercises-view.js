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
  const muscles = (await getState().muscles) || [];
  const equipment = (await getState().equipment) || [];
  const itemsPerPage = 10; // Number of exercises to display per page
  
  // Get user's favorite exercise IDs from state
  const user = getState().user || {};
  const favoriteExerciseIds = user.favoriteExerciseIds || [];
  
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
    showAllDifficulties: true,
    selectedMuscles: [],
    showAllMuscles: true,
    selectedEquipment: [],
    showAllEquipment: true,
    showFavoritesOnly: false  // NEW: Favorites filter toggle
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
        // Apply favorites filter first
        if (currentFilters.showFavoritesOnly && !favoriteExerciseIds.includes(exercise.id)) {
          return false;
        }
        
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
        
        // Check muscle filter
        let matchesMuscle = true;
        if (!currentFilters.showAllMuscles && currentFilters.selectedMuscles.length > 0) {
          const exMuscles = Array.isArray(exercise.muscles) ? exercise.muscles : (exercise.muscles ? [exercise.muscles] : []);
          const exSecondaryMuscles = Array.isArray(exercise.muscles_secondary) ? exercise.muscles_secondary : (exercise.muscles_secondary ? [exercise.muscles_secondary] : []);
          const allMuscleIds = [...exMuscles, ...exSecondaryMuscles];
          matchesMuscle = allMuscleIds.some(muscleId => 
            currentFilters.selectedMuscles.includes(muscleId));
        }
        
        // Check equipment filter
        let matchesEquipment = true;
        if (!currentFilters.showAllEquipment && currentFilters.selectedEquipment.length > 0) {
          const exEquipment = Array.isArray(exercise.equipment) ? exercise.equipment : (exercise.equipment ? [exercise.equipment] : []);
          matchesEquipment = exEquipment.some(eqId => 
            currentFilters.selectedEquipment.includes(eqId));
        }
        
        return matchesSearch && matchesCategory && matchesDifficulty && matchesMuscle && matchesEquipment;
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
      
      const exercisesToShow = filteredExercises.slice(0, itemsPerPage);
      
      // Show/hide empty state
      const gridElement = main.querySelector('#exercises-grid');
      const emptyStateElement = main.querySelector('#empty-exercises-state');
      
      if (filteredExercises.length === 0) {
        // Hide grid, show empty state
        if (gridElement) gridElement.style.display = 'none';
        if (emptyStateElement) emptyStateElement.style.display = 'block';
      } else {
        // Show grid, hide empty state
        if (gridElement) {
          gridElement.style.display = '';
          withScrollPreservation(gridElement, () => {
            batchDomUpdates(() => {
              diffUpdateGrid(gridElement, exercisesToShow, categories, cardCache, difficulties);
            });
          });
        }
        if (emptyStateElement) emptyStateElement.style.display = 'none';
      }
      
      // Update pagination efficiently
      updatePagination(currentPage, totalPages);
    }
  }

  // Render main layout with optimized structure and modern CSS classes
  main.innerHTML = renderHeader() + `
  <div class="card">
    <h1 class="section-title">Exercises</h1>
    
    <!-- Filter Section -->
    <div class="filter-section">
      <button class="btn btn-primary" id="add-exercise-btn">➕ Add Exercise</button>
      <input type="text" id="exercise-filter" class="filter-input" 
        placeholder="Search exercises..." autocomplete="off">
      
      <!-- Favorites Toggle -->
      <button class="btn btn-secondary" id="favorites-toggle">⭐ Favorites Only</button>
    </div>

    <!-- Category Filter -->
    <div class="form-group">
      <label for="category-filter">Filter by Category</label>
      <select id="category-filter" multiple size="0">
        <option value="all" data-type="all">All Categories</option>
        ${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}
      </select>
    </div>

    <!-- Muscle Filter -->
    <div class="form-group">
      <label for="muscle-filter">Filter by Muscle Group</label>
      <select id="muscle-filter" multiple size="0">
        <option value="all" data-type="all">All Muscles</option>
        ${muscles.map(muscle => `<option value="${muscle.id}">${muscle.name_en || muscle.name}</option>`).join('')}
      </select>
    </div>

    <!-- Equipment Filter -->
    <div class="form-group">
      <label for="equipment-filter">Filter by Equipment</label>
      <select id="equipment-filter" multiple size="0">
        <option value="all" data-type="all">All Equipment</option>
        ${equipment.map(eq => `<option value="${eq.id}">${eq.name}</option>`).join('')}
      </select>
    </div>

    <!-- Difficulty Filter -->
    <div class="form-group">
      <label for="difficulty-filter">Filter by Difficulty</label>
      <select id="difficulty-filter" multiple size="0">
        <option value="all" data-type="all">All Difficulties</option>
        ${difficulties.map(diff => `<option value="${diff.id}">${diff.label}</option>`).join('')}
      </select>
    </div>

    <!-- Clear Filters Button -->
      <div class="form-group" style="text-align: center; margin-top: 1rem;">
      <button id="clear-filters-btn" class="btn btn-secondary">🔄 Clear All Filters</button>
    </div>

    <!-- Exercises Grid -->
    <div id="exercises-grid" class="exercises-grid"></div>
    
    ${filteredExercises.length === 0 ? `
    <div class="empty-state" style="display: none;" id="empty-exercises-state">
      <h2>No Exercises Found</h2>
      <p>${currentFilters.searchText || currentFilters.showFavoritesOnly ? 'Try adjusting your filters or clearing them to see all exercises.' : 'No exercises match your current criteria.'}</p>
      <button class="btn btn-primary" id="clear-filters-empty-state">🔄 Clear Filters</button>
    </div>
    ` : ''}
    
    <!-- Pagination -->
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
          console.log('[ExercisesView] Setting sessionStorage editingExerciseId:', id);
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
      
      // Handle Favorites Toggle
      else if (target.id === 'favorites-toggle') {
        e.stopPropagation();
        currentFilters.showFavoritesOnly = !currentFilters.showFavoritesOnly;
        
        // Update button styling based on state
        const toggleBtn = main.querySelector('#favorites-toggle');
        if (currentFilters.showFavoritesOnly) {
          toggleBtn.classList.add('active');
          toggleBtn.innerHTML = '⭐ Showing Favorites';
        } else {
          toggleBtn.classList.remove('active');
          toggleBtn.innerHTML = '⭐ Favorites Only';
        }
        
        applyFilters();
      }
    });
  }

  // Initial setup
  initializeEventDelegation();
  
  // Set up filter listeners
  const filterInput = main.querySelector('#exercise-filter');
  const categoryFilter = main.querySelector('#category-filter');
  const difficultyFilter = main.querySelector('#difficulty-filter');
  const muscleFilter = main.querySelector('#muscle-filter');
  const equipmentFilter = main.querySelector('#equipment-filter');
  const clearFiltersBtn = main.querySelector('#clear-filters-btn');
  
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
  
  if (muscleFilter) {
    muscleFilter.addEventListener('change', (e) => {
      const selectedMuscles = e.target.selectedOptions;
      
      const allSelected = Array.from(selectedMuscles).some(option => 
        option.getAttribute('data-type') === 'all');
      
      if (allSelected) {
        currentFilters.showAllMuscles = true;
        currentFilters.selectedMuscles = [];
      } else {
        currentFilters.showAllMuscles = false;
        currentFilters.selectedMuscles = Array.from(selectedMuscles).map(option => 
          parseInt(option.value));
      }
      
      applyFilters();
    });
  }
  
  if (equipmentFilter) {
    equipmentFilter.addEventListener('change', (e) => {
      const selectedEquipment = e.target.selectedOptions;
      
      const allSelected = Array.from(selectedEquipment).some(option => 
        option.getAttribute('data-type') === 'all');
      
      if (allSelected) {
        currentFilters.showAllEquipment = true;
        currentFilters.selectedEquipment = [];
      } else {
        currentFilters.showAllEquipment = false;
        currentFilters.selectedEquipment = Array.from(selectedEquipment).map(option => 
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
  
  // Clear all filters button
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      currentFilters = {
        searchText: '',
        selectedCategories: [],
        selectedDifficulties: [],
        showAllCategories: true,
        showAllDifficulties: true,
        selectedMuscles: [],
        showAllMuscles: true,
        selectedEquipment: [],
        showAllEquipment: true,
        showFavoritesOnly: false
      };
      
      // Reset all filter inputs
      if (filterInput) filterInput.value = '';
      if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all" data-type="all">All Categories</option>' + 
          categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('');
      }
      if (muscleFilter) {
        muscleFilter.innerHTML = '<option value="all" data-type="all">All Muscles</option>' + 
          muscles.map(muscle => `<option value="${muscle.id}">${muscle.name_en || muscle.name}</option>`).join('');
      }
      if (equipmentFilter) {
        equipmentFilter.innerHTML = '<option value="all" data-type="all">All Equipment</option>' + 
          equipment.map(eq => `<option value="${eq.id}">${eq.name}</option>`).join('');
      }
      if (difficultyFilter) {
        difficultyFilter.innerHTML = '<option value="all" data-type="all">All Difficulties</option>' + 
          difficulties.map(diff => `<option value="${diff.id}">${diff.label}</option>`).join('');
      }
      
      // Reset favorites toggle button
      const toggleBtn = main.querySelector('#favorites-toggle');
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '⭐ Favorites Only';
      }
      
      applyFilters();
    });
  }
  
  // Handle empty state clear filters button
  const emptyStateClearBtn = main.querySelector('#clear-filters-empty-state');
  if (emptyStateClearBtn) {
    emptyStateClearBtn.addEventListener('click', () => {
      clearFiltersBtn.click();
    });
  }
  
  // Initial render of first page
  updatePageView(1);
  
  // Setup lazy loading for any future images
  setupLazyLoadImages();
}

// Export as object for wrapView compatibility
export default { render: renderExercisesView };
