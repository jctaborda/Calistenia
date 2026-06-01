// views/module-admin-view.js - Dedicated admin UI for skill module management
// Follows exercise-form-service pattern with proper CRUD operations

import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { fetchSkillModules } from '../services/api.js';

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
        alert('Module not found. Redirecting to module list.');
        window.location.hash = '#skill-modules';
        return;
      }
    } catch (error) {
      console.error('Error loading module:', error);
      alert('Error loading module: ' + error.message);
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
          <div class="card margin-bottom-1 selected-exercise-item" data-ex-id="${exId}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${escapeHtml(exercise?.name || `Exercise ${exId}`)}</strong>
                <span style="color: var(--gray-600); font-size: 0.875rem;">
                  ${exercise ? getDifficultyLabel(exercise.difficulty) : 'Unknown difficulty'}
                </span>
              </div>
              <button type="button" class="btn btn-danger btn-sm remove-exercise-btn" data-ex-id="${exId}">
                Remove
              </button>
            </div>
          </div>
        `;
      }).join('')
    : '<p style="color: var(--gray-600); text-align: center; padding: 2rem;">No exercises selected. Use the filter below to find and select exercises.</p>';
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '#skill-modules'">
          ← Back to Modules
        </button>
        <h1>${editId ? 'Edit Skill Module' : 'Create New Skill Module'}</h1>
      </div>
      
      <form id="module-form">
        <!-- Basic Information Section -->
        <div class="card margin-bottom-1">
          <h3>Basic Information</h3>
          
          <div style="margin-bottom: 1rem;">
            <label for="module-name" style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
              Module Name *
            </label>
            <input 
              type="text" 
              id="module-name" 
              class="filter-input" 
              placeholder="e.g., Push-Up Progression"
              value="${escapeHtml(formData.name)}"
              required
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 4px;"
            >
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label for="module-description" style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
              Description
            </label>
            <textarea 
              id="module-description" 
              class="filter-input"
              rows="4"
              placeholder="Describe what this module teaches..."
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 4px; resize: vertical;"
            >${escapeHtml(formData.description)}</textarea>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label for="module-difficulty" style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                Difficulty
              </label>
              <select 
                id="module-difficulty" 
                class="filter-input"
                style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 4px;"
              >
                <option value="beginner" ${formData.difficulty === 'beginner' ? 'selected' : ''}>Beginner</option>
                <option value="intermediate" ${formData.difficulty === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="advanced" ${formData.difficulty === 'advanced' ? 'selected' : ''}>Advanced</option>
              </select>
            </div>
            
            <div>
              <label for="module-category" style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
                Category
              </label>
              <select 
                id="module-category" 
                class="filter-input"
                style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 4px;"
              >
                <option value="">Select a category...</option>
                ${categoryOptions}
              </select>
            </div>
          </div>
        </div>
        
        <!-- Exercise Selection Section -->
        <div class="card margin-bottom-1">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>Module Exercises (${selectedExerciseIds.length} selected)</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="resetExerciseSelection()" ${selectedExerciseIds.length === 0 ? 'disabled' : ''}>
              Clear All
            </button>
          </div>
          
          <div id="selected-exercises-list" style="${selectedExerciseIds.length === 0 ? 'display: none;' : ''}">
            ${selectedExercisesHTML}
          </div>
          
          <div style="margin-top: 1rem;">
            <label for="exercise-search" style="display: block; font-weight: 600; margin-bottom: 0.5rem;">
              Search Exercises
            </label>
            <input 
              type="text" 
              id="exercise-search" 
              class="filter-input"
              placeholder="Search exercises by name..."
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 4px;"
            >
          </div>
          
          <div id="available-exercises-list" style="margin-top: 1rem; max-height: 400px; overflow-y: auto;">
            ${exercises.map(exercise => {
              const isSelected = selectedExerciseIds.includes(exercise.id);
              return `
                <div class="card margin-bottom-1 exercise-item ${isSelected ? 'selected' : ''}" 
                     data-ex-id="${exercise.id}" 
                     ${isSelected ? 'style="display: none;"' : ''}>
                  <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <div>
                      <strong>${escapeHtml(exercise.name)}</strong>
                      <div style="font-size: 0.875rem; color: var(--gray-600);">
                        ${exercise.description ? escapeHtml(exercise.description.substring(0, 100)) + (exercise.description.length > 100 ? '...' : '') : 'No description'}
                      </div>
                    </div>
                    <input type="checkbox" 
                           data-ex-id="${exercise.id}" 
                           ${isSelected ? 'checked disabled' : ''}
                           style="margin-left: 1rem;">
                  </label>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
          <button type="submit" class="btn btn-primary" style="flex: 1;">
            ${editId ? 'Update Module' : 'Create Module'}
          </button>
          ${editId ? `
            <button type="button" class="btn btn-danger" onclick="confirmDelete()">
              Delete Module
            </button>
          ` : ''}
          <button type="button" class="btn btn-secondary" onclick="window.location.hash = '#skill-modules'">
            Cancel
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
  
  // ==================== HELPER FUNCTIONS ====================
  
  function handleExerciseSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const exerciseItems = main.querySelectorAll('.exercise-item');
    
    exerciseItems.forEach(item => {
      const exerciseName = item.querySelector('strong').textContent.toLowerCase();
      const exerciseDesc = item.querySelector('div:nth-child(2)')?.textContent.toLowerCase() || '';
      
      if (exerciseName.includes(searchTerm) || exerciseDesc.includes(searchTerm)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
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
      if (selectedList) selectedList.style.display = 'none';
      if (clearButton) clearButton.disabled = true;
      
      // Show all available exercises
      const availableItems = main.querySelectorAll('.exercise-item');
      availableItems.forEach(item => {
        item.style.display = '';
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
    if (selectedList) selectedList.style.display = '';
    if (clearButton) clearButton.disabled = false;
    
    // Update list content
    selectedList.innerHTML = selectedExerciseIds.map(exId => {
      const exercise = exercises.find(e => e.id === exId);
      return `
        <div class="card margin-bottom-1 selected-exercise-item" data-ex-id="${exId}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${escapeHtml(exercise?.name || `Exercise ${exId}`)}</strong>
              <span style="color: var(--gray-600); font-size: 0.875rem;">
                ${exercise ? getDifficultyLabel(exercise.difficulty) : 'Unknown difficulty'}
              </span>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-exercise-btn" data-ex-id="${exId}">
              Remove
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
        item.style.display = 'none';
      } else {
        item.style.display = '';
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
      alert('Please enter a module name.');
      main.querySelector('#module-name').focus();
      return;
    }
    
    if (selectedExerciseIds.length === 0) {
      alert('Please select at least one exercise for this module.');
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
          alert('Module updated successfully!');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error updating module:', error);
          alert('Error updating module: ' + error.message);
        });
    } else {
      // Create new module
      ModuleStore.add(moduleData)
        .then(() => {
          alert('Module created successfully!');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error creating module:', error);
          alert('Error creating module: ' + error.message);
        });
    }
  }
  
  // ==================== EXPOSED FUNCTIONS ====================
  
  // Expose to window for onclick handlers
  window.resetExerciseSelection = function() {
    selectedExerciseIds = [];
    updateSelectedExercisesUI();
  };
  
  window.confirmDelete = function() {
    if (!editingModule) return;
    
    const confirmAction = window.confirm(
      `Are you sure you want to delete the module "${editingModule.name}"?\\n\\n` +
      `This action will save the module for possible undo for 30 days.`
    );
    
    if (confirmAction) {
      ModuleStore.delete(editId)
        .then(() => {
          saveForUndo('module', editingModule, editId);
          alert('Module deleted successfully!');
          window.location.hash = '#skill-modules';
        })
        .catch(error => {
          console.error('Error deleting module:', error);
          alert('Error deleting module: ' + error.message);
        });
    }
  };
  
  // Export for router
  window.renderModuleAdminView = renderModuleAdminView;
}

// Export as object for wrapView compatibility
export default { render: renderModuleAdminView };

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
