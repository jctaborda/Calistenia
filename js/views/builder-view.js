// views/builder-view.js - Routine builder (no more custom routines)
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { fetchSkillModules } from '../services/api.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { storeRoutines, routinesLoad } from '../services/database.js';
import { loadAllRoutines } from '../services/data-cache.js';
import { show } from '../services/toast-service.js';

export async function renderBuilderView() {
  const main = document.getElementById('app');
  const state = getState();
  const exercises = state.exercises || [];
  const categories = state.categories || [];
  const difficulties = state.difficulties || [];
  
  let editingRoutine = state.editingRoutine;
  const editingModule = state.editingModule;

  let isEditingRoutine = false;
  let editingType = '';
  let editingId = '';
  let editingModuleName = '';
  let selectedExercises = [];
  let createNewRoutine = false;

  // Check if we should create a new routine (not editing)
  if (state.createNewRoutine) {
    createNewRoutine = true;
    isEditingRoutine = false;
    editingRoutine = null; // Clear editingRoutine to prevent loading old data
    updateState({ createNewRoutine: false }); // Clear the flag after reading
  }

  // Check if we're editing a routine
  if (editingRoutine && editingRoutine.routine && editingRoutine.routine.exercises) {
    isEditingRoutine = true;
    editingType = editingRoutine.type || 'routine';
    editingId = editingRoutine.id;
    
    
    let loadedExercises = editingRoutine.routine.exercises || [];
    
    selectedExercises = loadedExercises.map(ex => {
      const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
      return {
        ...ex,
        name: exercise ? exercise.name : 'Unknown Exercise'
      };
    });
  } else if (editingModule && editingModule.module && Array.isArray(editingModule.module.exercises)) {
    // DEPRECATED: Module editing via builder is no longer supported
    // Redirect to new module admin view
    console.warn('[BuilderView] Module editing is deprecated. Redirecting to module admin view.');
    window.location.hash = `#module-admin/${editingModule.id}`;
    return; // Exit early to prevent rendering
  }

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="flex-between mb-1rem">
        <button class="btn btn-secondary" data-nav="${createNewRoutine || isEditingRoutine ? '#routines' : '#skill-modules'}">
          ${createNewRoutine || isEditingRoutine ? t('builder.back_routines') : t('builder.back_modules')}
        </button>
        <h1>${createNewRoutine ? t('builder.create_new') : isEditingRoutine ? t('builder.edit_routine') : t('builder.edit_module')}</h1>
      </div>
      <form id="builder-form">
        <div class="card margin-bottom-1">
          <h3>${createNewRoutine || isEditingRoutine ? t('builder.routine_name') : t('builder.module_name')}</h3>
          <input 
            type="text" 
            id="routine-name" 
            class="filter-input routine-name-input" 
            placeholder="${t('builder.enter_name')}" 
            value="${isEditingRoutine ? editingRoutine.routine.name : createNewRoutine ? '' : editingModuleName}"
            required
          >
        </div>
        
        ${createNewRoutine || isEditingRoutine ? `
        <div class="card margin-bottom-1" class="mt-2rem">
          <h3>${t('builder.routine_details')}</h3>
          
          <div class="form-group">
            <label for="routine-description">${t('builder.description')} *</label>
            <textarea 
              id="routine-description" 
              name="description" 
              required 
              maxlength="2000" 
              placeholder="${t('builder.description_placeholder')}"
              class="textarea-accent min-h-80"
            >${isEditingRoutine && editingRoutine.routine?.description ? editingRoutine.routine.description : ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="routine-category">${t('builder.category')}</label>
            <select id="routine-category" name="category" class="input-accent">
              <option value="">Select Category...</option>
              ${categories.map(cat => `
                <option value="${cat.id}" ${isEditingRoutine && String(editingRoutine.routine?.category) === String(cat.id) ? 'selected' : ''}>
                  ${cat.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="routine-difficulty">${t('builder.difficulty')}</label>
            <select id="routine-difficulty" name="difficulty" class="input-accent">
              <option value="">${t('builder.select_difficulty')}</option>
              ${difficulties.map(diff => `\n                <option value="${diff.label}" ${isEditingRoutine && String(editingRoutine.routine?.difficulty).toLowerCase() === String(diff.label).toLowerCase() ? 'selected' : ''}>
                  ${diff.label}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="routine-duration">${t('builder.duration_minutes')}</label>
            <input 
              type="number" 
              id="routine-duration" 
              name="duration" 
              min="5" 
              max="300" 
              placeholder="30"
              value="${isEditingRoutine && editingRoutine.routine?.duration ? editingRoutine.routine.duration : '30'}"
              class="input-accent"
            >
          </div>
        </div>
        ` : `
        <div class="card margin-bottom-1" class="mt-2rem">
          <h3>${t('builder.module_details')}</h3>
          
          <div class="form-group">
            <label for="routine-description">${t('builder.description')} *</label>
            <textarea 
              id="routine-description" 
              name="description" 
              required 
              maxlength="2000" 
              placeholder="${t('builder.description_placeholder')}"
              class="textarea-accent min-h-80"
            >${editingModule?.module?.description || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="routine-category">${t('builder.category')}</label>
            <select id="routine-category" name="category" class="input-accent">
              <option value="">${t('builder.select_category')}</option>
              ${categories.map(cat => `
                <option value="${cat.id}" ${(!isEditingRoutine && !createNewRoutine && String(editingModule?.module?.category) === String(cat.id)) ? 'selected' : ''}>
                  ${cat.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="routine-difficulty">${t('builder.difficulty')}</label>
            <select id="routine-difficulty" name="difficulty" class="input-accent">
              <option value="">${t('builder.select_difficulty')}</option>
              ${difficulties.map(diff => `
                <option value="${diff.label}" ${(!isEditingRoutine && !createNewRoutine && editingModule?.module?.difficulty === diff.label.toLowerCase()) ? 'selected' : ''}>
                  ${diff.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        `}
        
        <div id="selected-exercises" class="${selectedExercises.length === 0 ? 'hidden' : ''}">
          <h3 class="exercises-heading">${t('builder.selected_exercises')}</h3>
          <div id="exercise-list" class="draggable-list"></div>
        </div>
        
        ${selectedExercises.length === 0 ? `
        <div class="empty-state hidden">
          <h2>${t('builder.no_exercises_selected')}</h2>
          <p>${t('builder.select_exercises_desc')}</p>
        </div>
        ` : ''}
        
        <div class="card margin-bottom-1" style="margin-top: 2rem; max-height: 350px; overflow-y: auto; padding-right: 0.5rem;">
          <h3>${t('builder.available_exercises')} (${exercises.length} exercises)</h3>
          <input 
            type="text" 
            id="available-exercise-filter" 
            class="filter-input exercise-filter" 
            placeholder="${t('builder.search_available')}" 
            autocomplete="off"
          >
          <ul id="available-exercises-list" class="checkbox-list">
            ${exercises.length > 0 ? exercises.map(e => {
              const isSelected = selectedExercises.some(ex => ex.exerciseId === e.id);
              return `
                <li data-exercise-name="${e.name.toLowerCase()}">
                  <label>
                    <input type="checkbox" data-exercise-id="${e.id}" data-exercise-name="${e.name}" ${isSelected ? 'checked' : ''}>
                    <span>${e.name}</span>
                  </label>
                </li>
              `;
            }).join('') : '<p>' + t('builder.no_exercises_available') + '</p>'}
          </ul>
        </div>
        <button class="btn margin-top-1 form-submit-btn" type="submit">${createNewRoutine ? t('builder.create_routine_btn') : isEditingRoutine ? t('builder.update_routine_btn') : t('builder.save_module_btn')}</button>
      </form>
    </div>
  `;

  function updateExerciseList() {
    const exerciseList = main.querySelector('#exercise-list');
    const selectedExercisesDiv = main.querySelector('#selected-exercises');
    const emptyState = main.querySelector('.empty-state');
    
    if (selectedExercises.length === 0) {
      exerciseList.innerHTML = '<p>' + t('builder.no_exercises_selected_yet') + '</p>';
      if (selectedExercisesDiv) {
        selectedExercisesDiv.classList.add('hidden');
      }
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
      return;
    } else {
      if (selectedExercisesDiv) {
        selectedExercisesDiv.classList.remove('hidden');
      }
      if (emptyState) {
        emptyState.classList.add('hidden');
      }
    }

    exerciseList.innerHTML = selectedExercises.map((ex, index) => {
      let exerciseName = ex.name;
      if (!exerciseName) {
        const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
        exerciseName = exercise ? exercise.name : 'Unknown Exercise';
      }

      return `
        <div class="card margin-bottom-1 draggable-item" draggable="true" data-index="${index}">
          <div class="drag-handle">
            <span>⋮⋮</span>
            <span class="exercise-name">${exerciseName}</span>
          </div>
          <div class="exercise-form-grid">
            <label>Sets: <input type="number" min="1" max="10" value="${ex.sets}" data-index="${index}" data-field="sets"></label>
            <label>Reps: <input type="number" min="1" max="50" value="${ex.reps}" data-index="${index}" data-field="reps"></label>
            <label>Rest (s): <input type="number" min="15" max="300" step="15" value="${ex.restTime}" data-index="${index}" data-field="restTime"></label>
            <button type="button" class="btn btn-danger remove-btn" data-remove="${index}">${t('builder.remove')}</button>
          </div>
        </div>
      `;
    }).join('');

    exerciseList.querySelectorAll('input[data-index]').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        selectedExercises[index][field] = parseInt(e.target.value) || 1;
      });
    });

    exerciseList.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.remove);
        const exerciseId = selectedExercises[index].exerciseId;
        
        const exerciseName = selectedExercises[index].name || `Exercise ${index + 1}`;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content" class="max-w-400">
            <h2>Remove Exercise</h2>
            <div class="modal-body">
              <p>Are you sure you want to remove "${escapeHtml(exerciseName)}" from this routine? This will not delete the exercise itself.</p>
            </div>
            <div class="flex-end mt-1rem">
              <button class="btn btn-secondary remove-cancel flex-btn">Cancel</button>
              <button class="btn btn-danger remove-ok flex-btn">Remove</button>
            </div>
          </div>
        `;

        const removeCancel = modal.querySelector('.remove-cancel');
        const removeOk = modal.querySelector('.remove-ok');

        const doRemove = () => {
          const checkbox = main.querySelector(`input[type="checkbox"][data-exercise-id="${exerciseId}"]`);
          if (checkbox) {
            checkbox.checked = false;
          }
          selectedExercises.splice(index, 1);
          if (selectedExercises.length === 0) {
            show('No exercises selected. Add exercises to build your routine.', 'warning');
          }
          updateExerciseList();
        };

        removeCancel.addEventListener('click', () => { modal.remove(); });
        removeOk.addEventListener('click', () => {
          modal.remove();
          doRemove();
        });
        modal.addEventListener('click', (ev) => {
          if (ev.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
      });
    });

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
          const draggedItem = selectedExercises[draggedIndex];
          selectedExercises.splice(draggedIndex, 1);
          selectedExercises.splice(dropIndex, 0, draggedItem);

          updateExerciseList();
        }
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  const filterInput = main.querySelector('#available-exercise-filter');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      const searchText = e.target.value.toLowerCase().trim();
      const checkboxes = main.querySelectorAll('input[type="checkbox"][data-exercise-id]');

      checkboxes.forEach(checkbox => {
        const exerciseName = checkbox.dataset.exerciseName.toLowerCase();
        const li = checkbox.parentElement.parentElement;
        if (exerciseName.includes(searchText)) {
          li.classList.remove('hidden');
        } else {
          li.classList.add('hidden');
        }
      });
    });
  }

  main.querySelectorAll('input[type="checkbox"][data-exercise-id]').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const exerciseId = parseInt(e.target.dataset.exerciseId);
      const exerciseName = e.target.dataset.exerciseName;

      if (e.target.checked) {
        if (!selectedExercises.some(ex => ex.exerciseId === exerciseId)) {
          selectedExercises.push({
            exerciseId,
            name: exerciseName,
            sets: 3,
            reps: 8,
            restTime: 60
          });
          updateExerciseList();
        } else {
          // Exercise already selected — warn the user
          show(`"${exerciseName}" is already in this routine.`, 'warning');
        }
      } else {
        const index = selectedExercises.findIndex(ex => ex.exerciseId === exerciseId);
        if (index !== -1) {
          selectedExercises.splice(index, 1);
          updateExerciseList();
        }
      }
    });
  });

  updateExerciseList();

  const form = main.querySelector('#builder-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const nameInput = main.querySelector('#routine-name');
      const name = nameInput.value.trim();

      if (!name) {
        show(t('builder.enter_name_error'), 'error');
        nameInput.focus();
        return;
      }

      if (selectedExercises.length === 0) {
        show(t('builder.select_exercise_error'), 'error');
        return;
      }
      
      // Warn if routine has very few or very many exercises
      if (selectedExercises.length === 1) {
        show('Tip: Routines with at least 3 exercises are more effective.', 'warning');
      }
      
      // Get routine details (only for routines, not modules)
      let routineDetails = {};
      if (createNewRoutine || isEditingRoutine) {
        const description = main.querySelector('#routine-description')?.value.trim() || '';
        const category = main.querySelector('#routine-category')?.value;
        const difficulty = main.querySelector('#routine-difficulty')?.value;
        const duration = main.querySelector('#routine-duration')?.value || '30';
        
        if (!description) {
          show(t('builder.enter_description_error'), 'error');
          return;
        }
        
        routineDetails = {
          description,
          category,
          difficulty,
          duration: parseInt(duration) || 30
        };
      }

      // For modules - save to IndexedDB via ModuleStore
      if (!isEditingRoutine && !createNewRoutine) {
        try {
          const moduleDescription = main.querySelector('#routine-description')?.value.trim() || '';
          const moduleCategory = main.querySelector('#routine-category')?.value;
          const moduleDifficulty = main.querySelector('#routine-difficulty')?.value;
          
          if (editingModule) {
            const updatedModule = {
              id: editingId,
              name,
              exercises: selectedExercises.map(ex => ex.exerciseId),
              description: moduleDescription,
              difficulty: moduleDifficulty?.toLowerCase() || 'beginner',
              category: moduleCategory || ''
            };

            await ModuleStore.update(updatedModule);
            
            updateState({ 
              editingModule: null,
              editingRoutine: null
            });
            
            show(t('builder.module_updated'), 'success');
            window.location.hash = '#skill-modules';
          } else {
            const newModule = {
              name,
              exercises: selectedExercises.map(ex => ex.exerciseId),
              description: moduleDescription,
              difficulty: moduleDifficulty?.toLowerCase() || 'beginner',
              category: moduleCategory || ''
            };

            await ModuleStore.add(newModule);
            
            updateState({ 
              editingRoutine: null,
              editingModule: null
            });
            
            show(t('builder.module_created'), 'success');
            window.location.hash = '#skill-modules';
          }
        } catch (error) {
          console.error('Error saving module:', error);
          show(t('builder.save_error') + error.message, 'error');
        }
      } else if (createNewRoutine) {
        // Create new routine - load existing, add new, save all
        try {
          // Load existing routines from IndexedDB
          const existingRoutines = await routinesLoad();
          
          const newRoutine = {
            id: existingRoutines.length + 1,
            name,
            ...routineDetails,
            exercises: selectedExercises.map(ex => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              restTime: ex.restTime
            }))
          };
          
          // Get all routines from IndexedDB and add new one
          const allRoutines = [...existingRoutines, newRoutine];
          
          // Save to IndexedDB using storeRoutines
          await storeRoutines(allRoutines);
          
          // Update state to reflect the new routines
          updateState({ routines: allRoutines });
          
          show(t('builder.routine_created'), 'success');
          window.location.hash = '#routines';
        } catch (error) {
          console.error('Error creating routine:', error);
          console.error('Error details:', error.message);
          show(t('builder.routine_error') + error.message, 'error');
        }
      } else {
        // Update existing routine - load, modify, save all
        try {
          // Load routines from cache (IndexedDB with in-memory fallback)
          const allRoutines = await loadAllRoutines();
          
          const routineIndex = allRoutines.findIndex(p => String(p.id) === String(editingId));
          if (routineIndex === -1) {
            show(t('builder.routine_not_found'), 'error');
            return;
          }
          
          const updatedRoutine = {
            id: editingId,
            name,
            ...routineDetails,
            exercises: selectedExercises.map(ex => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              restTime: ex.restTime
            }))
          };
          
          allRoutines[routineIndex] = updatedRoutine;
          
          // Save to IndexedDB using storeRoutines
          await storeRoutines(allRoutines);
          
          // Update state to reflect the changes
          updateState({ routines: allRoutines });
          
          show('Routine updated successfully!', 'success');
          window.location.hash = '#routine-details/' + editingId;
        } catch (error) {
          console.error('Error updating routine:', error);
          show(t('builder.routine_update_error') + error.message, 'error');
        }
      }
    });
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderBuilderView };
