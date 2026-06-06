// views/builder-view.js - Routine builder (no more custom routines)
import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { fetchSkillModules } from '../services/api.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { storeRoutines, routinesLoad } from '../services/database.js';

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
    
    // Debug log
    console.log('[BuilderView] Editing routine:', {
      id: editingId,
      name: editingRoutine.routine?.name,
      category: editingRoutine.routine?.category,
      categoryType: typeof editingRoutine.routine?.category,
      difficulties: editingRoutine.routine?.difficulty,
      duration: editingRoutine.routine?.duration
    });
    
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" data-nav="${createNewRoutine || isEditingRoutine ? '#routines' : '#skill-modules'}">
          Back to ${createNewRoutine || isEditingRoutine ? 'Routines' : 'Modules'}
        </button>
        <h1>${createNewRoutine ? 'Create New Routine' : isEditingRoutine ? 'Edit Routine' : 'Edit Module'}</h1>
      </div>
      <form id="builder-form">
        <div class="card margin-bottom-1">
          <h3>${createNewRoutine || isEditingRoutine ? 'Routine Name' : 'Module Name'}</h3>
          <input 
            type="text" 
            id="routine-name" 
            class="filter-input routine-name-input" 
            placeholder="Enter name..." 
            value="${isEditingRoutine ? editingRoutine.routine.name : createNewRoutine ? '' : editingModuleName}"
            required
          >
        </div>
        
        ${createNewRoutine || isEditingRoutine ? `
        <div class="card margin-bottom-1" style="margin-top: 2rem;">
          <h3>Routine Details</h3>
          
          <div class="form-group">
            <label for="routine-description">Description *</label>
            <textarea 
              id="routine-description" 
              name="description" 
              required 
              maxlength="2000" 
              placeholder="Describe this routine..."
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px; min-height: 80px;"
            >${isEditingRoutine && editingRoutine.routine?.description ? editingRoutine.routine.description : ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="routine-category">Category</label>
            <select id="routine-category" name="category" style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px;">
              <option value="">Select Category...</option>
              ${categories.map(cat => `
                <option value="${cat.id}" ${isEditingRoutine && String(editingRoutine.routine?.category) === String(cat.id) ? 'selected' : ''}>
                  ${cat.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="routine-difficulty">Difficulty Level</label>
            <select id="routine-difficulty" name="difficulty" style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px;">
              <option value="">Select Difficulty...</option>
              ${difficulties.map(diff => `\n                <option value="${diff.label}" ${isEditingRoutine && String(editingRoutine.routine?.difficulty).toLowerCase() === String(diff.label).toLowerCase() ? 'selected' : ''}>
                  ${diff.label}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="routine-duration">Duration (minutes)</label>
            <input 
              type="number" 
              id="routine-duration" 
              name="duration" 
              min="5" 
              max="300" 
              placeholder="30"
              value="${isEditingRoutine && editingRoutine.routine?.duration ? editingRoutine.routine.duration : '30'}"
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px;"
            >
          </div>
        </div>
        ` : `
        <div class="card margin-bottom-1" style="margin-top: 2rem;">
          <h3>Module Details</h3>
          
          <div class="form-group">
            <label for="routine-description">Description *</label>
            <textarea 
              id="routine-description" 
              name="description" 
              required 
              maxlength="2000" 
              placeholder="Describe this module..."
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px; min-height: 80px;"
            >${editingModule?.module?.description || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label for="routine-category">Category</label>
            <select id="routine-category" name="category" style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px;">
              <option value="">Select Category...</option>
              ${categories.map(cat => `
                <option value="${cat.id}" ${(!isEditingRoutine && !createNewRoutine && String(editingModule?.module?.category) === String(cat.id)) ? 'selected' : ''}>
                  ${cat.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="routine-difficulty">Difficulty Level</label>
            <select id="routine-difficulty" name="difficulty" style="width: 100%; padding: 0.5rem; border: 1px solid var(--accent); border-radius: 4px;">
              <option value="">Select Difficulty...</option>
              ${difficulties.map(diff => `
                <option value="${diff.label}" ${(!isEditingRoutine && !createNewRoutine && editingModule?.module?.difficulty === diff.label.toLowerCase()) ? 'selected' : ''}>
                  ${diff.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        `}
        
        <div id="selected-exercises" style="${selectedExercises.length === 0 ? 'display: none;' : ''}">
          <h3 class="exercises-heading">Selected Exercises (drag to reorder)</h3>
          <div id="exercise-list" class="draggable-list"></div>
        </div>
        
        ${selectedExercises.length === 0 ? `
        <div class="empty-state">
          <h2>No Exercises Selected Yet</h2>
          <p>Select exercises from the list below to build your routine or module.</p>
        </div>
        ` : ''}
        
        <div class="card margin-bottom-1" style="margin-top: 2rem; max-height: 350px; overflow-y: auto; padding-right: 0.5rem;">
          <h3>Available Exercises (${exercises.length} exercises)</h3>
          <input 
            type="text" 
            id="available-exercise-filter" 
            class="filter-input exercise-filter" 
            placeholder="Search available exercises..." 
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
            }).join('') : '<p>No exercises available</p>'}
          </ul>
        </div>
        <button class="btn margin-top-1 form-submit-btn" type="submit">${createNewRoutine ? 'Create Routine' : isEditingRoutine ? 'Update Routine' : 'Save Module'}</button>
      </form>
    </div>
  `;

  function updateExerciseList() {
    const exerciseList = main.querySelector('#exercise-list');
    const selectedExercisesDiv = main.querySelector('#selected-exercises');
    const emptyState = main.querySelector('.empty-state');
    
    if (selectedExercises.length === 0) {
      exerciseList.innerHTML = '<p>No exercises selected yet.</p>';
      if (selectedExercisesDiv) {
        selectedExercisesDiv.style.display = 'none';
      }
      if (emptyState) {
        emptyState.style.display = 'block';
      }
      return;
    } else {
      if (selectedExercisesDiv) {
        selectedExercisesDiv.style.display = 'block';
      }
      if (emptyState) {
        emptyState.style.display = 'none';
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
            <button type="button" class="btn btn-danger remove-btn" data-remove="${index}">Remove</button>
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
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.remove);
        const exerciseId = selectedExercises[index].exerciseId;
        
        const exerciseName = selectedExercises[index].name || `Exercise ${index + 1}`;
        
        if (!confirm(`Are you sure you want to remove "${exerciseName}" from this routine? This will not delete the exercise itself.`)) {
          return;
        }

        const checkbox = main.querySelector(`input[type="checkbox"][data-exercise-id="${exerciseId}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }

        selectedExercises.splice(index, 1);
        updateExerciseList();
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

  const filterInput = main.querySelector('#available-exercise-filter');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      const searchText = e.target.value.toLowerCase().trim();
      const checkboxes = main.querySelectorAll('input[type="checkbox"][data-exercise-id]');

      checkboxes.forEach(checkbox => {
        const exerciseName = checkbox.dataset.exerciseName.toLowerCase();
        checkbox.parentElement.parentElement.style.display = 
          exerciseName.includes(searchText) ? 'list-item' : 'none';
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
    console.log('✅ Form found, adding submit listener');
    console.log('  createNewRoutine:', createNewRoutine);
    console.log('  isEditingRoutine:', isEditingRoutine);
    console.log('  selectedExercises count:', selectedExercises.length);
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const nameInput = main.querySelector('#routine-name');
      const name = nameInput.value.trim();

      if (!name) {
        alert('Please enter a name.');
        nameInput.focus();
        return;
      }

      if (selectedExercises.length === 0) {
        alert('Please select at least one exercise.');
        return;
      }
      
      // Get routine details (only for routines, not modules)
      let routineDetails = {};
      if (createNewRoutine || isEditingRoutine) {
        const description = main.querySelector('#routine-description')?.value.trim() || '';
        const category = main.querySelector('#routine-category')?.value;
        const difficulty = main.querySelector('#routine-difficulty')?.value;
        const duration = main.querySelector('#routine-duration')?.value || '30';
        
        if (!description) {
          alert('Please enter a description for the routine.');
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
            
            alert('Module updated successfully!');
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
            
            alert('New module created successfully!');
            window.location.hash = '#skill-modules';
          }
        } catch (error) {
          console.error('Error saving module:', error);
          alert('Error saving module: ' + error.message);
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
          
          alert('New routine created and saved successfully!');
          window.location.hash = '#routines';
        } catch (error) {
          console.error('Error creating routine:', error);
          console.error('Error details:', error.message);
          alert('Error creating routine: ' + error.message);
        }
      } else {
        // Update existing routine - load, modify, save all
        try {
          // Load routines from IndexedDB
          const allRoutines = await routinesLoad();
          
          const routineIndex = allRoutines.findIndex(p => String(p.id) === String(editingId));
          if (routineIndex === -1) {
            alert('Routine not found!');
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
          
          alert('Routine updated successfully!');
          window.location.hash = '#routine-details/' + editingId;
        } catch (error) {
          console.error('Error updating routine:', error);
          alert('Error updating routine: ' + error.message);
        }
      }
    });
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderBuilderView };
