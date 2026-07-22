// views/module-admin-view.js - Dedicated admin UI for skill module management
// Follows exercise-form-service pattern with proper CRUD operations

import { renderHeader } from '../components/header.js';
import { renderSpinner, hideSpinner } from '../components/spinner.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { show } from '../services/toast-service.js';
import { showConfirmation } from '../services/confirmation-modal.js';
import { escapeHtml } from '../utils/html-helpers.js';

export async function renderModuleAdminView(editId = null) {
  const main = document.getElementById('app');
  const state = getState();
  const exercises = state.exercises || [];
  const categories = state.categories || [];
  
  // Remove any existing event listeners to prevent duplicates (memory leak fix)
  if (main.dataset.moduleAdminViewListener === 'true') {
    // Remove all event listeners
    main.removeEventListener('change', main._handleModuleAdminChange);
    main.removeEventListener('click', main._handleModuleAdminClick);
    main.removeEventListener('submit', main._handleModuleAdminSubmit);
    
    // Remove drag events from selected list
    const selectedList = main.querySelector('#selected-exercises-list');
    if (selectedList) {
      selectedList.removeEventListener('dragstart', main._handleDragStart);
      selectedList.removeEventListener('dragend', main._handleDragEnd);
      selectedList.removeEventListener('dragover', main._handleDragOver);
      selectedList.removeEventListener('dragleave', main._handleDragLeave);
      selectedList.removeEventListener('drop', main._handleDrop);
    }
    
    // Remove search input listener
    const searchInput = main.querySelector('#exercise-search');
    if (searchInput && searchInput._handleSearchInput) {
      searchInput.removeEventListener('input', searchInput._handleSearchInput);
    }
    
    delete main.dataset.moduleAdminViewListener;
    delete main._handleModuleAdminChange;
    delete main._handleModuleAdminClick;
    delete main._handleModuleAdminSubmit;
    delete main._handleDragStart;
    delete main._handleDragEnd;
    delete main._handleDragOver;
    delete main._handleDragLeave;
    delete main._handleDrop;
  }
  
  // Load existing module if editing
  let editingModule = null;
  if (editId) {
    try {
      editingModule = await ModuleStore.getById(editId);
      if (!editingModule) {
        show(t('module_admin.not_found'), 'error');
        window.location.hash = '#skill-modules';
        return;
      }
    } catch (error) {
      console.error('Error loading module:', error);
      show(t('module_admin.load_error') + error.message, 'error');
      return;
    }
  }
  
  // Initialize form values
  const formData = {
    name: editingModule?.name || '',
    description: editingModule?.description || '',
    difficulty: editingModule?.difficulty || 'beginner',
    category: editingModule?.category || '',
    exercises: editingModule?.exercises || []
  };
  
  // Generate category options from state
  const categoryOptions = categories.map(cat => 
    `<option value="${escapeHtml(cat.name)}" ${formData.category === cat.name ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`
  ).join('');
  
  // Track selected exercise IDs
  let selectedExerciseIds = [...formData.exercises];
  
  // ALWAYS render the list container, just hide/show based on selection
  const selectedExercisesHTML = selectedExerciseIds.length > 0 
    ? selectedExerciseIds.map(exId => {
        const exercise = exercises.find(e => e.id === exId);
        return `
          <div class="card margin-bottom-1 selected-exercise-item" data-ex-id="${exId}" draggable="true">
            <div class="flex-between">
              <div class="drag-handle">
                <span>⋮⋮</span>
                <strong>${escapeHtml(exercise?.name || `Exercise ${exId}`)}</strong>
                <span class="text-sm text-gray-600">
                  ${exercise ? getDifficultyLabel(exercise.difficulty) : t('module_admin.unknown_difficulty')}
                </span>
              </div>
              <button type="button" class="btn btn-danger btn-sm remove-exercise-btn" data-ex-id="${exId}">
                ${t('common.remove')}
              </button>
            </div>
          </div>
        `;
      }).join('')
    : '<p class="text-center-muted p-2rem">' + t('module_admin.no_exercises_desc') + '</p>';
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="flex-between mb-1rem">
        <button class="btn btn-secondary" data-nav="#skill-modules">
          ← ${t('skills.back')}
        </button>
        <h1>${editId ? t('module_admin.title_edit') : t('module_admin.title_create')}</h1>
      </div>
      
      <form id="module-form">
        <!-- Basic Information Section -->
        <div class="card margin-bottom-1">
          <h3>${t('module_admin.basic_info')}</h3>
          
          <div class="mb-1rem">
            <label for="module-name" class="form-label">
              ${t('module_admin.name')} *
            </label>
            <input 
              type="text" 
              id="module-name" 
              class="filter-input" 
              placeholder="${t('module_admin.name_placeholder')}"
              value="${escapeHtml(formData.name)}"
              required
            >
          </div>
          
          <div class="mb-1rem">
            <label for="module-description" class="form-label">
              ${t('module_admin.description')}
            </label>
            <textarea 
              id="module-description" 
              class="filter-input"
              rows="4"
              placeholder="${t('module_admin.description_placeholder')}"
            >${escapeHtml(formData.description)}</textarea>
          </div>
          
          <div class="grid-2">
            <div>
              <label for="module-difficulty" class="form-label">
                ${t('module_admin.difficulty')}
              </label>
              <select 
                id="module-difficulty" 
                class="filter-input"
              >
                <option value="beginner" ${formData.difficulty === 'beginner' ? 'selected' : ''}>${t('difficulty.beginner')}</option>
                <option value="intermediate" ${formData.difficulty === 'intermediate' ? 'selected' : ''}>${t('difficulty.intermediate')}</option>
                <option value="advanced" ${formData.difficulty === 'advanced' ? 'selected' : ''}>${t('difficulty.advanced')}</option>
              </select>
            </div>
            
            <div>
              <label for="module-category" class="form-label">
                ${t('module_admin.category')}
              </label>
              <select 
                id="module-category" 
                class="filter-input"
              >
                <option value="">${t('module_admin.select_category')}</option>
                ${categoryOptions}
              </select>
            </div>
          </div>
        </div>
        
        <!-- Exercise Selection Section -->
        <div class="card margin-bottom-1">
          <div class="flex-between mb-1rem">
            <h3>${t('module_admin.exercises')} (${selectedExerciseIds.length} selected)</h3>
            <button type="button" class="btn btn-secondary btn-sm" data-reset-exercises ${selectedExerciseIds.length === 0 ? 'disabled' : ''}>
              ${t('common.clear')}
            </button>
          </div>
          
          <div id="selected-exercises-list" class="${selectedExerciseIds.length === 0 ? 'hidden' : ''}">
            ${selectedExercisesHTML}
          </div>
          
          <div class="mt-1rem">
            <label for="exercise-search" class="form-label">
              ${t('exercises.search')}
            </label>
            <input 
              type="text" 
              id="exercise-search" 
              class="filter-input"
              placeholder="${t('exercises.search')}..."
            >
          </div>
          
          <div id="available-exercises-list" class="scrollable-mt">
            ${exercises.map(exercise => {
                       const isSelected = selectedExerciseIds.includes(exercise.id);
                       const itemClass = isSelected ? 'card margin-bottom-1 exercise-item selected hidden' : 'card margin-bottom-1 exercise-item';
                       return `
                         <div class="${itemClass}" \
                              data-ex-id="${exercise.id}">
              <label class="flex-between" style="cursor: pointer;">
                <div>
                  <strong>${escapeHtml(exercise.name)}</strong>
                  <div class="text-sm text-gray-600">
                    ${exercise.description ? escapeHtml(exercise.description.substring(0, 100)) + (exercise.description.length > 100 ? '...' : '') : t('common.none')}
                  </div>
                </div>
                <input type="checkbox" 
                       data-ex-id="${exercise.id}" 
                       ${isSelected ? 'checked disabled' : ''}
                       class="ml-1rem">
              </label>
            </div>
          `;
            }).join('')}
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex-gap mt-2rem">
          <button type="submit" class="btn btn-primary flex-btn">
            ${editId ? t('module_admin.save') : t('module_admin.title_create')}
          </button>
          ${editId ? `
            <button type="button" class="btn btn-danger" data-confirm-delete data-edit-id="${editId}">
              ${t('common.delete')} Module
            </button>
          ` : ''}
          <button type="button" class="btn btn-secondary" data-nav="#skill-modules">
            ${t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  `;
  
  // ==================== EVENT HANDLERS ====================
  
  // Form submission handler
  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    const name = main.querySelector('#module-name').value.trim();
    const description = main.querySelector('#module-description').value.trim();
    const difficulty = main.querySelector('#module-difficulty').value;
    const category = main.querySelector('#module-category').value.trim();
    
    if (!name) {
      show(t('module_admin.enter_name'), 'error');
      main.querySelector('#module-name').focus();
      return;
    }
    
    if (selectedExerciseIds.length === 0) {
      show(t('module_admin.select_exercise'), 'error');
      return;
    }
    
    const moduleData = {
      id: editId || undefined, // Let service generate ID if not editing
      name,
      description,
      difficulty,
      category,
      exercises: selectedExerciseIds
    };
    
    const submitBtn = main.querySelector('button[type="submit"]');
    
    if (editId) {
      // Update existing module
      submitBtn.disabled = true;
      submitBtn.textContent = t('common.loading');
      document.body.insertAdjacentHTML('beforeend', renderSpinner());
      
      ModuleStore.update(moduleData)
        .then(() => {
          // No undo needed for updates - only for deletions
          show(t('module_admin.updated'), 'success');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error updating module:', error);
          show(t('module_admin.update_error') + error.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = editId ? t('module_admin.save') : t('module_admin.title_create');
        })
        .finally(() => {
          hideSpinner();
        });
    } else {
      // Create new module
      submitBtn.disabled = true;
      submitBtn.textContent = t('common.loading');
      document.body.insertAdjacentHTML('beforeend', renderSpinner());
      
      ModuleStore.add(moduleData)
        .then(() => {
          show(t('module_admin.created'), 'success');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error creating module:', error);
          show(t('module_admin.create_error') + error.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = editId ? t('module_admin.save') : t('module_admin.title_create');
        })
        .finally(() => {
          hideSpinner();
        });
    }
  };
  
  // Exercise search handler
  const handleExerciseSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const exerciseItems = main.querySelectorAll('.exercise-item');
    
    exerciseItems.forEach(item => {
      const exerciseName = item.querySelector('strong').textContent.toLowerCase();
      const exerciseDesc = item.querySelector('div:nth-child(2)')?.textContent.toLowerCase() || '';
      
      if (exerciseName.includes(searchTerm) || exerciseDesc.includes(searchTerm)) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  };
  
  // Change handler (checkboxes)
  const handleModuleAdminChange = (e) => {
    if (e.target.matches('input[type="checkbox"][data-ex-id]')) {
      const exId = parseInt(e.target.dataset.exId);
      toggleExerciseSelection(exId, e.target.checked);
    }
  };
  
  // Click handler (delegated)
  const handleModuleAdminClick = (e) => {
    // Remove exercise button
    if (e.target.matches('.remove-exercise-btn')) {
      const exId = parseInt(e.target.dataset.exId);
      toggleExerciseSelection(exId, false);
    }
    
    // Clear exercise selection button
    if (e.target.matches('[data-reset-exercises]')) {
      selectedExerciseIds = [];
      updateSelectedExercisesUI();
    }
    
    // Delete module button
    if (e.target.matches('[data-confirm-delete]')) {
      const editIdBtn = e.target.dataset.editId;
      const deleteBtn = e.target;
      showConfirmation('Are you sure you want to delete this module?').then((confirmed) => {
        if (confirmed) {
          deleteBtn.disabled = true;
          deleteBtn.textContent = t('common.loading');
          document.body.insertAdjacentHTML('beforeend', renderSpinner());
          
          ModuleStore.delete(editIdBtn)
            .then(() => {
              show(t('module_admin.deleted'), 'success');
              window.location.hash = '#skill-modules';
            })
            .catch(error => {
              console.error('Error deleting module:', error);
              show(t('module_admin.delete_error') + error.message, 'error');
              deleteBtn.disabled = false;
              deleteBtn.textContent = t('common.delete') + ' Module';
            })
            .finally(() => {
              hideSpinner();
            });
        }
      });
    }
  };
  
  // Drag-and-drop handlers
  let draggedItem = null;
  let draggedIndex = null;
  
  const handleDragStart = (e) => {
    const item = e.target.closest('.selected-exercise-item');
    if (!item) return;
    draggedItem = item;
    draggedIndex = parseInt(item.dataset.exId);
    item.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnd = (e) => {
    if (draggedItem) {
      draggedItem.style.opacity = '';
    }
    draggedItem = null;
    draggedIndex = null;
    // Remove any visual drop indicators
    main.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const item = e.target.closest('.selected-exercise-item');
    if (!item || item === draggedItem) return;
    
    // Remove drag-over from all items
    main.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    item.classList.add('drag-over');
  };
  
  const handleDragLeave = (e) => {
    const item = e.target.closest('.selected-exercise-item');
    if (item) item.classList.remove('drag-over');
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    const targetItem = e.target.closest('.selected-exercise-item');
    if (!targetItem || !draggedItem) return;
    
    const targetIndex = parseInt(targetItem.dataset.exId);
    
    // Reorder selectedExerciseIds
    const fromIdx = selectedExerciseIds.indexOf(draggedIndex);
    const toIdx = selectedExerciseIds.indexOf(targetIndex);
    
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = selectedExerciseIds.splice(fromIdx, 1);
      selectedExerciseIds.splice(toIdx, 0, moved);
      updateSelectedExercisesUI();
    }
  };
  
  // ==================== ATTACH EVENT LISTENERS ====================
  
  // Form submission
  const form = main.querySelector('#module-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Exercise search
  const searchInput = main.querySelector('#exercise-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleExerciseSearch);
    searchInput._handleSearchInput = handleExerciseSearch;
  }
  
  // Exercise checkbox delegation
  main.addEventListener('change', handleModuleAdminChange);
  main._handleModuleAdminChange = handleModuleAdminChange;
  
  // Remove exercise button delegation + clear button + delete button
  main.addEventListener('click', handleModuleAdminClick);
  main._handleModuleAdminClick = handleModuleAdminClick;
  
  // Drag-and-drop reorder for selected exercises
  const selectedList = main.querySelector('#selected-exercises-list');
  if (selectedList) {
    selectedList.addEventListener('dragstart', handleDragStart);
    selectedList.addEventListener('dragend', handleDragEnd);
    selectedList.addEventListener('dragover', handleDragOver);
    selectedList.addEventListener('dragleave', handleDragLeave);
    selectedList.addEventListener('drop', handleDrop);
    
    main._handleDragStart = handleDragStart;
    main._handleDragEnd = handleDragEnd;
    main._handleDragOver = handleDragOver;
    main._handleDragLeave = handleDragLeave;
    main._handleDrop = handleDrop;
  }
  
  // Mark that listeners have been added
  main.dataset.moduleAdminViewListener = 'true';
  
  // ==================== HELPER FUNCTIONS ====================
  
  function toggleExerciseSelection(exId, isSelected) {
    if (isSelected) {
      if (!selectedExerciseIds.includes(exId)) {
        selectedExerciseIds.push(exId);
      }
    } else {
      selectedExerciseIds = selectedExerciseIds.filter(id => id !== exId);
    }
    
    // Update UI
    updateSelectedExercisesUI();
  }
  
  function updateSelectedExercisesUI() {
    const selectedList = main.querySelector('#selected-exercises-list');
    const clearButton = main.querySelector('[data-reset-exercises]');
    
    // Always ensure the list container exists
    if (!selectedList) {
      const header = main.querySelector('.card > div[style*="justify-content: space-between"]');
      if (header) {
        const newList = document.createElement('div');
        newList.id = 'selected-exercises-list';
        header.parentNode.insertBefore(newList, header.nextSibling);
      }
    }
    
    // If no exercises selected
    if (selectedExerciseIds.length === 0) {
      if (selectedList) selectedList.classList.add('hidden');
      if (clearButton) clearButton.disabled = true;
      
      // Show all available exercises
      const availableItems = main.querySelectorAll('.exercise-item');
      availableItems.forEach(item => {
        item.classList.remove('hidden');
      });
      
      // Update header count
      const header = main.querySelector('h3');
      if (header && header.textContent.includes('(')) {
        const parts = header.textContent.split('(');
        header.textContent = parts[0] + ` (${selectedExerciseIds.length} selected)`;
      }
      
      return;
    }
    
    // Exercises selected - show the list
    if (selectedList) selectedList.classList.remove('hidden');
    if (clearButton) clearButton.disabled = false;
    
    // Update list content
    selectedList.innerHTML = selectedExerciseIds.map(exId => {
      const exercise = exercises.find(e => e.id === exId);
      return `
        <div class="card margin-bottom-1 selected-exercise-item" data-ex-id="${exId}" draggable="true">
          <div class="flex-between">
            <div class="drag-handle">
              <span>⋮⋮</span>
              <strong>${escapeHtml(exercise?.name || `Exercise ${exId}`)}</strong>
              <span class="text-sm text-gray-600">
                ${exercise ? getDifficultyLabel(exercise.difficulty) : t('module_admin.unknown_difficulty')}
              </span>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-exercise-btn" data-ex-id="${exId}">
              ${t('common.remove')}
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Update available exercises visibility
    const availableItems = main.querySelectorAll('.exercise-item');
    availableItems.forEach(item => {
      const exId = parseInt(item.dataset.exId);
      if (selectedExerciseIds.includes(exId)) {
        item.classList.add('hidden');
      } else {
        item.classList.remove('hidden');
      }
    });
    
    // Update header count
    const header = main.querySelector('h3');
    if (header && header.textContent.includes('(')) {
      const parts = header.textContent.split('(');
      header.textContent = parts[0] + ` (${selectedExerciseIds.length} selected)`;
    }
  }
  
  // ==================== EXPOSED FUNCTIONS ====================
  
  // Export for router
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderModuleAdminView };

// ==================== UTILITY FUNCTIONS ====================

function getDifficultyLabel(difficulty) {
  if (!difficulty) return 'Unknown';
  const difficultyObj = Array.isArray(difficulty) ? difficulty : [difficulty];
  const labels = {
    1: 'Beginner',
    2: 'Intermediate', 
    3: 'Advanced'
  };
  return difficultyObj.map(id => labels[id] || `Level ${id}`).join(', ');
}
