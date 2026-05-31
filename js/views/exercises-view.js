// js/views/exercises-view.js
import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
import { ValidationService } from '../services/validation.js';
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
        cache.set(diffId, diff ? ValidationService.sanitizeText(diff.label) : `Difficulty ${diffId}`);
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
      // Get fresh state for favoriteExerciseIds
      const user = getState().user || {};
      const favoriteExerciseIds = user.favoriteExerciseIds || [];
      
      filteredExercises = exercises.filter(exercise => {
        // Apply favorites filter first
        if (currentFilters.showFavoritesOnly && !favoriteExerciseIds.includes(String(exercise.id))) {
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
    
    // Get or create page numbers container (use fixed ID)
    let numbersWrapper = paginationContainer.querySelector('#pagination-numbers-wrapper');
    if (!numbersWrapper) {
      numbersWrapper = document.createElement('div');
      numbersWrapper.id = 'pagination-numbers-wrapper';
      paginationContainer.appendChild(numbersWrapper);
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
      
      // Calculate correct slice for current page
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const exercisesToShow = filteredExercises.slice(startIndex, endIndex);
      
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
      
      <!-- Filter Bottom Sheet Toggle -->
      <button class="btn btn-accent" id="open-filters-btn">🔍 Filters <span id="filter-count" style="display:none">(0)</span></button>
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
  </div>

  <!-- Filter Bottom Sheet -->
  <div class="bottom-sheet-overlay" id="filter-overlay" style="display:none;">
    <div class="bottom-sheet" id="filter-bottom-sheet">
      <div class="bottom-sheet-header">
        <h3>Filter Exercises</h3>
        <button class="bottom-sheet-close" id="close-filters-btn">&times;</button>
      </div>
      
      <div class="bottom-sheet-content">
        <!-- Categories -->
        <div class="filter-group">
          <h4>Categories</h4>
          <div class="checkbox-list" id="filter-categories"></div>
        </div>
        
        <!-- Muscles -->
        <div class="filter-group">
          <h4>Muscle Groups</h4>
          <div class="checkbox-list" id="filter-muscles"></div>
        </div>
        
        <!-- Equipment -->
        <div class="filter-group">
          <h4>Equipment</h4>
          <div class="checkbox-list" id="filter-equipment"></div>
        </div>
        
        <!-- Difficulties -->
        <div class="filter-group">
          <h4>Difficulty</h4>
          <div class="checkbox-list" id="filter-difficulties"></div>
        </div>
      </div>
      
      <div class="bottom-sheet-footer">
        <button class="btn btn-secondary" id="clear-filters-from-sheet">Clear All</button>
        <button class="btn btn-primary" id="apply-filters-btn">Apply Filters</button>
      </div>
    </div>
  </div>`;

  /**
   * Render checkbox lists for each filter category
   */
  function renderFilterCheckboxes() {
    const categoryList = main.querySelector('#filter-categories');
    if (categoryList) {
      categoryList.innerHTML = categories.map(cat => `
        <label class="checkbox-item">
          <input type="checkbox" value="${cat.id}" data-filter="category" ${currentFilters.selectedCategories.includes(cat.id) ? 'checked' : ''}>
          <span>${ValidationService.sanitizeText(cat.name)}</span>
        </label>
      `).join('');
    }

    const muscleList = main.querySelector('#filter-muscles');
    if (muscleList) {
      muscleList.innerHTML = muscles.map(muscle => `
        <label class="checkbox-item">
          <input type="checkbox" value="${muscle.id}" data-filter="muscle" ${currentFilters.selectedMuscles.includes(muscle.id) ? 'checked' : ''}>
          <span>${ValidationService.sanitizeText(muscle.name_en || muscle.name)}</span>
        </label>
      `).join('');
    }

    const equipmentList = main.querySelector('#filter-equipment');
    if (equipmentList) {
      equipmentList.innerHTML = equipment.map(eq => `
        <label class="checkbox-item">
          <input type="checkbox" value="${eq.id}" data-filter="equipment" ${currentFilters.selectedEquipment.includes(eq.id) ? 'checked' : ''}>
          <span>${ValidationService.sanitizeText(eq.name)}</span>
        </label>
      `).join('');
    }

    const difficultyList = main.querySelector('#filter-difficulties');
    if (difficultyList) {
      difficultyList.innerHTML = difficulties.map(diff => `
        <label class="checkbox-item">
          <input type="checkbox" value="${diff.id}" data-filter="difficulty" ${currentFilters.selectedDifficulties.includes(diff.id) ? 'checked' : ''}>
          <span>${ValidationService.sanitizeText(diff.label)}</span>
        </label>
      `).join('');
    }
  }

  /**
   * Update filter count badge
   */
  function updateFilterCount() {
    const count = currentFilters.selectedCategories.length + 
                  currentFilters.selectedMuscles.length + 
                  currentFilters.selectedEquipment.length + 
                  currentFilters.selectedDifficulties.length;
    const countEl = main.querySelector('#filter-count');
    if (countEl) {
      if (count > 0) {
        countEl.style.display = 'inline';
        countEl.textContent = `(${count})`;
      } else {
        countEl.style.display = 'none';
      }
    }
  }

  /**
   * Open the filter bottom sheet
   */
  function openFiltersSheet() {
    renderFilterCheckboxes();
    const overlay = main.querySelector('#filter-overlay');
    const sheet = main.querySelector('#filter-bottom-sheet');
    const content = main.querySelector('#filter-bottom-sheet .bottom-sheet-content');
    
    if (overlay && sheet) {
      // Force display and positioning
      overlay.style.display = 'flex';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.zIndex = '999999';
      overlay.style.background = 'rgba(0, 0, 0, 0.9)';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      
      // Force bottom sheet styling
      sheet.style.display = 'flex';
      sheet.style.flexDirection = 'column';
      sheet.style.width = '90%';
      sheet.style.maxWidth = '600px';
      sheet.style.margin = '0 auto';
      sheet.style.position = 'relative';
      sheet.style.height = '85vh';
      sheet.style.maxHeight = '85vh';
      sheet.style.background = '#ffffff';
      sheet.style.border = '3px solid #333333';
      sheet.style.borderRadius = '16px 16px 0 0';
      sheet.style.boxShadow = '0 -8px 32px rgba(0, 0, 0, 0.4)';
      
      // Force content area to be scrollable
      if (content) {
        content.style.flex = '1';
        content.style.overflowY = 'auto';
        content.style.overflowX = 'hidden';
        content.style.background = '#ffffff';
        content.style.padding = '20px';
        content.style.borderRadius = '0';
      }
      
      // Force filter titles to be visible
      const filterHeaders = sheet.querySelectorAll('.filter-group h4');
      filterHeaders.forEach(header => {
        header.style.color = '#1a1a1a';
        header.style.fontWeight = '800';
        header.style.fontSize = '20px';
        header.style.textTransform = 'uppercase';
        header.style.letterSpacing = '1px';
        header.style.borderLeft = '4px solid #F6B17A';
        header.style.paddingLeft = '8px';
        header.style.marginBottom = '16px';
      });
      
      // Force checkbox items to have white background
      const checkboxItems = sheet.querySelectorAll('.checkbox-item');
      checkboxItems.forEach(item => {
        item.style.background = '#ffffff';
        item.style.border = '1px solid #dddddd';
      });
      
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close the filter bottom sheet
   */
  function closeFiltersSheet() {
    const overlay = main.querySelector('#filter-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }
  }

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

      // Handle favorite toggle buttons in exercise cards
      else if (target.classList.contains('exercise-card-favorite')) {
        e.stopPropagation();
        const exerciseId = target.getAttribute('data-exercise-id');
        if (exerciseId) {
          // Toggle favorite using the global function
          if (window.toggleFavorite) {
            window.toggleFavorite(exerciseId);
          }
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
      // Handle "Add Exercise" button
            else if (target.closest('#add-exercise-btn')) {
              window.location.hash = '#exercise-form';
            }
      
            // Handle Favorites Toggle
            else if (target.closest('#favorites-toggle')) {
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
      
            // Handle Open Filters button
                  else if (target.closest('#open-filters-btn')) {
                    e.stopPropagation();
                    openFiltersSheet();
                  }
      
            // Handle Close Filters button
            else if (target.closest('#close-filters-btn')) {
              e.stopPropagation();
              closeFiltersSheet();
            }
      
            // Handle Apply Filters button
            else if (target.closest('#apply-filters-btn')) {
              e.stopPropagation();
              closeFiltersSheet();
              applyFilters();
              updateFilterCount();
            }
      
            // Handle Clear Filters button from sheet
            else if (target.closest('#clear-filters-from-sheet')) {
              e.stopPropagation();
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
        
              // Reset search input
              if (filterInput) filterInput.value = '';
        
              // Reset favorites toggle
              const toggleBtn = main.querySelector('#favorites-toggle');
              if (toggleBtn) {
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = '⭐ Favorites Only';
              }
        
              applyFilters();
              updateFilterCount();
              renderFilterCheckboxes(); // Refresh checkboxes
            }
      
      // Handle checkbox changes in filter sheet
      else if (target.matches('.checkbox-list input[type="checkbox"]')) {
        const checkbox = target;
        const filterType = checkbox.getAttribute('data-filter');
        const value = parseInt(checkbox.value);
        
        // Update filter state based on checkbox type
        switch (filterType) {
          case 'category':
            if (checkbox.checked) {
              if (!currentFilters.selectedCategories.includes(value)) {
                currentFilters.selectedCategories.push(value);
              }
              currentFilters.showAllCategories = false;
            } else {
              currentFilters.selectedCategories = currentFilters.selectedCategories.filter(id => id !== value);
              if (currentFilters.selectedCategories.length === 0) {
                currentFilters.showAllCategories = true;
              }
            }
            break;
          case 'muscle':
            if (checkbox.checked) {
              if (!currentFilters.selectedMuscles.includes(value)) {
                currentFilters.selectedMuscles.push(value);
              }
              currentFilters.showAllMuscles = false;
            } else {
              currentFilters.selectedMuscles = currentFilters.selectedMuscles.filter(id => id !== value);
              if (currentFilters.selectedMuscles.length === 0) {
                currentFilters.showAllMuscles = true;
              }
            }
            break;
          case 'equipment':
            if (checkbox.checked) {
              if (!currentFilters.selectedEquipment.includes(value)) {
                currentFilters.selectedEquipment.push(value);
              }
              currentFilters.showAllEquipment = false;
            } else {
              currentFilters.selectedEquipment = currentFilters.selectedEquipment.filter(id => id !== value);
              if (currentFilters.selectedEquipment.length === 0) {
                currentFilters.showAllEquipment = true;
              }
            }
            break;
          case 'difficulty':
            if (checkbox.checked) {
              if (!currentFilters.selectedDifficulties.includes(value)) {
                currentFilters.selectedDifficulties.push(value);
              }
              currentFilters.showAllDifficulties = false;
            } else {
              currentFilters.selectedDifficulties = currentFilters.selectedDifficulties.filter(id => id !== value);
              if (currentFilters.selectedDifficulties.length === 0) {
                currentFilters.showAllDifficulties = true;
              }
            }
            break;
        }
      }
      
      // Handle overlay click (close on overlay)
      else if (target.closest('#filter-overlay')) {
        closeFiltersSheet();
      }
    });
  }

  // Initial setup
  initializeEventDelegation();
  
  // Listen for state changes to update favorite buttons
  document.addEventListener('stateChange', () => {
    updateFavoriteButtons();
  });
  
  function updateFavoriteButtons() {
    const user = getState().user || {};
    const favoriteExerciseIds = user.favoriteExerciseIds || [];
    
    document.querySelectorAll('.exercise-card-favorite').forEach(btn => {
      const exerciseId = btn.getAttribute('data-exercise-id');
      const isFavorite = favoriteExerciseIds.includes(exerciseId);
      btn.textContent = isFavorite ? '★' : '☆';
      btn.className = `btn exercise-card-favorite ${isFavorite ? 'favorited' : ''}`;
    });
  }
  
  // Set up search filter listener
  const filterInput = main.querySelector('#exercise-filter');
  
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      currentFilters.searchText = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }
  
  // Handle empty state clear filters button
  const emptyStateClearBtn = main.querySelector('#clear-filters-empty-state');
  if (emptyStateClearBtn) {
    emptyStateClearBtn.addEventListener('click', () => {
      const clearBtn = main.querySelector('#clear-filters-from-sheet');
      if (clearBtn) clearBtn.click();
    });
  }
  
  // Initial render of first page
  updatePageView(1);
  
  // Force reload of CSS to ensure latest styles are applied
  // This works around Service Worker caching issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
  
  // Setup lazy loading for any future images
  setupLazyLoadImages();
}

// Export as object for wrapView compatibility
export default { render: renderExercisesView };
