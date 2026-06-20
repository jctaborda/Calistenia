// views/module-admin-view.js - Dedicated admin UI for skill module management
// Follows exercise-form-service pattern with proper CRUD operations

import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { fetchSkillModules } from '../services/api.js';
import { show } from '../services/toast-service.js';
import { escapeHtml } from '../utils/html.js';

export async function renderModuleAdminView(editId = null) {
  const main = document.getElementById('app');
  const state = getState();
  const exercises = state.exercises || [];
  const categories = state.categories || [];
  
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
              class="input-gray"
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
              class="textarea-full"
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
                class="input-gray"
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
                class="input-gray"
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
              class="input-gray"
            >
          </div>
          
          <div id="available-exercises-list" class="scrollable-mt">
            ${exercises.map(exercise => {
                       const isSelected = selectedExerciseIds.includes(exercise.id);
                       const itemClass = isSelected ? 'card margin-bottom-1 exercise-item selected hidden' : 'card margin-bottom-1 exercise-item';
                       return `
                         <div class="${itemClass}" \
                              data-ex-id="${exercise.id}">
                  <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
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
  
  // Form submission
  const form = main.querySelector('#module-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Exercise search
  const searchInput = main.querySelector('#exercise-search');
  if (searchInput) {
    searchInput.addEventListener('input', handleExerciseSearch);
  }
  
  // Exercise checkbox delegation
  main.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"][data-ex-id]')) {
      const exId = parseInt(e.target.dataset.exId);
      toggleExerciseSelection(exId, e.target.checked);
    }
  });
  
  // Remove exercise button delegation
  main.addEventListener('click', (e) => {
    if (e.target.matches('.remove-exercise-btn')) {
      const exId = parseInt(e.target.dataset.exId);
      toggleExerciseSelection(exId, false);
    }
  });
  
  // Drag-and-drop reorder for selected exercises
  setupDragAndDrop();
  
  // ==================== HELPER FUNCTIONS ====================
  
  function setupDragAndDrop() {
    const selectedList = main.querySelector('#selected-exercises-list');
    if (!selectedList) return;
    
    let draggedItem = null;
    let draggedIndex = null;
    
    selectedList.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.selected-exercise-item');
      if (!item) return;
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.exId);
      item.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    
    selectedList.addEventListener('dragend', (e) => {
      if (draggedItem) {
        draggedItem.style.opacity = '';
      }
      draggedItem = null;
      draggedIndex = null;
      // Remove any visual drop indicators
      main.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    
    selectedList.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const item = e.target.closest('.selected-exercise-item');
      if (!item || item === draggedItem) return;
      
      // Remove drag-over from all items
      main.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    
    selectedList.addEventListener('dragleave', (e) => {
      const item = e.target.closest('.selected-exercise-item');
      if (item) item.classList.remove('drag-over');
    });
    
    selectedList.addEventListener('drop', (e) => {
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
    });
  }
  
  function handleExerciseSearch(e) {
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
  }
  
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
    const clearButton = main.querySelector('#selected-exercises-display button');
    
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
    
    // Re-attach remove button listeners
    selectedList.querySelectorAll('.remove-exercise-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = parseInt(btn.dataset.exId);
        toggleExerciseSelection(exId, false);
      });
    });
    
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
  
  function handleFormSubmit(e) {
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
    
    if (editId) {
      // Update existing module
      ModuleStore.update(moduleData)
        .then(() => {
          // No undo needed for updates - only for deletions
          show(t('module_admin.updated'), 'success');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error updating module:', error);
          show(t('module_admin.update_error') + error.message, 'error');
        });
    } else {
      // Create new module
      ModuleStore.add(moduleData)
        .then(() => {
          show(t('module_admin.created'), 'success');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error creating module:', error);
          show(t('module_admin.create_error') + error.message, 'error');
        });
    }
  }
  
  // ==================== EXPOSED FUNCTIONS ====================
  
  // Removed - now handled by event delegation service
  // window.resetExerciseSelection = function() {...}
  // window.confirmDelete = function() {...}
  
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
