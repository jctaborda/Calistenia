import { renderHeader } from '../components/header.js';
import { getState, setState } from '../services/state.js';

function generateUniqueRoutineId() {
  const state = getState();
  const user = state.user;
  
  // Use a combination of user ID and current timestamp (or increment)
  return `${user.name}-${Date.now()}`;
}

export async function renderBuilderView() {
  const main = document.getElementById('app');
  const state = await getState();
  const exercises = state.exercises;
  const categories = state.categories;
  
  const editingProgram = state.editingProgram;
  
  // Pagination variables
  const itemsPerPage = 10; // Number of exercises to display per page
  let currentPage = 1;
  let filteredExercises = exercises.filter(ex => ex.categories.some(c => categories.find(cat => cat.id === c)));
  let totalItems = filteredExercises.length;
  let totalPages = Math.ceil(totalItems / itemsPerPage);
  let exercisesToRender = filteredExercises.slice(0, itemsPerPage);
  
  // Filter state
  let currentFilters = {
    searchText: '',
    selectedCategories: []
  };

  // Function to apply filters to exercises
  function applyFilters() {
    filteredExercises = exercises.filter(exercise => {
      // Only show exercises that have valid categories
      const hasValidCategory = exercise.categories.some(c => categories.find(cat => cat.id === c));
      
      // Search text filter
      const matchesSearch = currentFilters.searchText === '' || 
        exercise.name.toLowerCase().includes(currentFilters.searchText.toLowerCase());
      
      // Category filter
      const matchesCategory = currentFilters.selectedCategories.length === 0 ||
        currentFilters.selectedCategories.some(categoryId => exercise.categories.includes(categoryId));
      
      return hasValidCategory && matchesSearch && matchesCategory;
    });
    
    // Update pagination variables
    totalItems = filteredExercises.length;
    totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Reset to first page if current page is beyond filtered results
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }
    
    // Update the view
    updateAvailableExercisesView();
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

  // Function to update the available exercises view when page changes
  function updateAvailableExercisesView(newPage = currentPage) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      const startIndex = (currentPage - 1) * itemsPerPage;
      exercisesToRender = filteredExercises.slice(startIndex, startIndex + itemsPerPage);
      
      const exercisesList = main.querySelector('#available-exercises-list');
      exercisesList.innerHTML = exercisesToRender.map(e => {
        const isSelected = selectedExercises.some(ex => ex.exerciseId === e.id);
        return `
          <li data-exercise-name="${e.name.toLowerCase()}">
            <label>
              <input type="checkbox" data-exercise-id="${e.id}" data-exercise-name="${e.name}" ${isSelected ? 'checked' : ''}>
              <span>${e.name}</span>
            </label>
          </li>
        `;
      }).join('');
      
      // Update pagination
      const paginationElement = main.querySelector('.pagination');
      if (paginationElement) {
        paginationElement.innerHTML = renderPagination(currentPage, totalPages);
      }
      
      // Re-attach event listeners
      attachPaginationListeners();
      attachExerciseCheckboxListeners();
    }
  }

  // Function to attach pagination event listeners
  function attachPaginationListeners() {
    // Handle numbered page buttons
    main.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt(e.target.getAttribute('data-page'));
        updateAvailableExercisesView(page);
      });
    });
    
    // Handle navigation buttons (<< and >>)
    main.querySelectorAll('.pagination-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        if (action === 'prev' && currentPage > 1) {
          updateAvailableExercisesView(currentPage - 1);
        } else if (action === 'next' && currentPage < totalPages) {
          updateAvailableExercisesView(currentPage + 1);
        }
      });
    });
  }

  // Function to attach exercise checkbox event listeners
  function attachExerciseCheckboxListeners() {
    main.querySelectorAll('input[type="checkbox"][data-exercise-id]').forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const exerciseId = parseInt(e.target.dataset.exerciseId);
        const exerciseName = e.target.dataset.exerciseName;
        
        if (e.target.checked) {
          // Add exercise to selected list
          if (!selectedExercises.some(ex => ex.exerciseId === exerciseId)) {
            selectedExercises.push({
              exerciseId,
              name: exerciseName,
              sets: 3,
              reps: 8,
              restTime: 60
            });
            updateExerciseList();
          }
        } else {
          // Remove exercise from selected list
          const index = selectedExercises.findIndex(ex => ex.exerciseId === exerciseId);
          if (index !== -1) {
            selectedExercises.splice(index, 1);
            updateExerciseList();
          }
        }
      });
    });
  }
  
  // Initialize selected exercises based on editing mode
  let selectedExercises = [];
  let isEditing = false;
  let editingType = '';
  let editingId = '';
  
  if (editingProgram) {
    isEditing = true;
    editingType = editingProgram.type;
    editingId = editingProgram.id;
    
    // Load exercises from the program being edited
    let loadedExercises = editingProgram.program.exercises || [];
    let loadedWarmup = editingProgram.program.warmup || [];
    let loadedCooldown = editingProgram.program.cooldown || [];
    
    // Enrich the exercises with names from the exercises array
    selectedExercises = loadedExercises.map(ex => {
      const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
      return {
        ...ex,
        name: exercise ? exercise.name : 'Unknown Exercise'
      };
    });
    
    // Store warmup and cooldown for later saving
    window._editingWarmup = loadedWarmup;
    window._editingCooldown = loadedCooldown;
  }
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '#programs'">
          Back to Programs
        </button>
        <h1>${isEditing ? 'Edit Routine' : 'Routine Builder'}</h1>
      </div>
      <form id="routine-builder-form">
        <div class="card">
          <h3>Routine Name</h3>
          <input 
            type="text" 
            id="routine-name" 
            class="filter-input" 
            placeholder="Enter routine name..." 
            value="${isEditing ? editingProgram.program.name : ''}"
            required
          >
        </div>
        <div id="selected-exercises">
          <h3>Selected Exercises <small>(drag to reorder)</small></h3>
          <div id="exercise-list" class="draggable-list"></div>
        </div>
        <div class="card">
          <h3>Available Exercises</h3>
          <input 
            type="text" 
            id="available-exercise-filter" 
            class="filter-input" 
            placeholder="Search available exercises..." 
            autocomplete="off"
          >
          <select id="available-categories" multiple size="5">
            ${state.categories.map(category => {
              return `
                <option value="${category.id}">${category.name}</option>
              `;
            }).join('')}
          </select>
          <ul id="available-exercises-list" class="checkbox-list">
            ${exercisesToRender.map(e => {
              const isSelected = selectedExercises.some(ex => ex.exerciseId === e.id);
              return `
                <li data-exercise-name="${e.name.toLowerCase()}">
                  <label>
                    <input type="checkbox" data-exercise-id="${e.id}" data-exercise-name="${e.name}" ${isSelected ? 'checked' : ''}>
                    <span>${e.name}</span>
                  </label>
                </li>
              `;
            }).join('')}
          </ul>
          <div class="pagination">
            ${renderPagination(currentPage, totalPages)}
          </div>
        </div>
        <button class="btn margin-top-1" type="submit">${isEditing ? 'Update Routine' : 'Save Routine'}</button>
      </form>
    </div>
  `;

  function updateExerciseList() {
    const exerciseList = main.querySelector('#exercise-list');
    if (selectedExercises.length === 0) {
      exerciseList.innerHTML = '<p>No exercises selected yet.</p>';
      return;
    }
    
    exerciseList.innerHTML = selectedExercises.map((ex, index) => {
      // Ensure we have the exercise name, fallback to finding it from exercises array
      let exerciseName = ex.name;
      if (!exerciseName) {
        const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
        exerciseName = exercise ? exercise.name : 'Unknown Exercise';
      }
      
      return `
        <div class="card margin-bottom-1 draggable-item" draggable="true" data-index="${index}">
          <div class="drag-handle" style="cursor: move; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>⋮⋮</span>
            <span style="font-weight: 600;">${exerciseName}</span>
          </div>
          <div class="exercise-form-grid">
            <label>Sets: <input type="number" min="1" max="10" value="${ex.sets}" data-index="${index}" data-field="sets"></label>
            <label>Reps: <input type="number" min="1" max="50" value="${ex.reps}" data-index="${index}" data-field="reps"></label>
            <label>Rest (s): <input type="number" min="15" max="300" step="15" value="${ex.restTime}" data-index="${index}" data-field="restTime"></label>
            <button type="button" class="btn btn-danger" data-remove="${index}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners for input changes
    exerciseList.querySelectorAll('input[data-index]').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        selectedExercises[index][field] = parseInt(e.target.value) || 1;
      });
    });

    // Add event listeners for remove buttons
    exerciseList.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.remove);
        const exerciseId = selectedExercises[index].exerciseId;
        
        // Uncheck the corresponding checkbox
        const checkbox = main.querySelector(`input[type="checkbox"][data-exercise-id="${exerciseId}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
        
        selectedExercises.splice(index, 1);
        updateExerciseList();
      });
    });

    // Add drag and drop functionality
    let draggedIndex = null;
    
    exerciseList.querySelectorAll('.draggable-item').forEach((item, index) => {
      item.addEventListener('dragstart', (e) => {
        draggedIndex = parseInt(item.dataset.index);
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });
      
      item.addEventListener('dragend', (e) => {
        item.style.opacity = '';
        draggedIndex = null;
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropIndex = parseInt(item.dataset.index);
        
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
          // Move the item in the array
          const draggedItem = selectedExercises[draggedIndex];
          selectedExercises.splice(draggedIndex, 1);
          selectedExercises.splice(dropIndex, 0, draggedItem);
          
          // Update the display
          updateExerciseList();
        }
      });
    });
  }

  // Add filter functionality for available exercises
  const filterInput = main.querySelector('#available-exercise-filter');
  const categoryFilter = main.querySelector('#available-categories');

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
  
  // Initial setup of event listeners
  attachPaginationListeners();
  attachExerciseCheckboxListeners();

  const form = main.querySelector('#routine-builder-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      
      const nameInput = main.querySelector('#routine-name');
      const name = nameInput.value.trim();
      
      if (!name) {
        alert('Please enter a name for your routine.');
        nameInput.focus();
        return;
      }
      
      if (selectedExercises.length === 0) {
        alert('Please select at least one exercise.');
        return;
      }
      
      const state = getState();
      const user = { ...state.user };
      
      if (isEditing) {
        // Update existing custom routine
        if (editingType === 'custom') {
          user.customRoutines = user.customRoutines || [];
          const routineIndex = user.customRoutines.findIndex(r => r.id === editingId);
          if (routineIndex !== -1) {
            user.customRoutines[routineIndex] = {
              id: editingId,
              name, 
              exercises: selectedExercises.map(ex => ({
                exerciseId: ex.exerciseId,
                sets: ex.sets,
                reps: ex.reps,
                restTime: ex.restTime
              })),
              warmup: window._editingWarmup || [],
              cooldown: window._editingCooldown || []
            };
          }
        } else {
          // For built-in programs, we can't edit them, so create a new custom routine
          user.customRoutines = user.customRoutines || [];
          user.customRoutines.push({ 
            id: generateUniqueRoutineId(),
            name: name + ' (Modified)', 
            exercises: selectedExercises.map(ex => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              restTime: ex.restTime
            })),
            warmup: window._editingWarmup || [],
            cooldown: window._editingCooldown || []
          });
        }
        setState({ user, editingProgram: null });
        alert('New custom routine created from the program!');
      } else {
        // Create new custom routine
        user.customRoutines = user.customRoutines || [];
        user.customRoutines.push({ 
          id: generateUniqueRoutineId(),
          name, 
          exercises: selectedExercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            restTime: ex.restTime
          })),
          warmup: [],
          cooldown: []
        });
        setState({ user });
        alert('Routine saved!');
      }
      
      window.location.hash = '#programs';
    });
  }

  updateExerciseList();
} 