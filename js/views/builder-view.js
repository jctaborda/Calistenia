// views/builder-view.js - Updated with proper module CRUD operations
import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { fetchSkillModules } from '../services/api.js';
import { ModuleStore } from '../services/modules-service.js';

export async function renderBuilderView() {
  const main = document.getElementById('app');
  const state = getState(); // Use getState() to retrieve current state, not updateState()
  const exercises = state.exercises;
  const categories = state.categories;

  const editingProgram = state.editingProgram;
  const editingModule = state.editingModule;

  let isEditingProgram = false;
  let editingType = '';
  let editingId = '';
  let editingModuleName = '';
  let selectedExercises = [];

  // Check if we're editing a program FIRST (higher priority)
  if (editingProgram && editingProgram.program && editingProgram.program.exercises) {
    isEditingProgram = true;
    editingType = editingProgram.type || 'custom';
    editingId = editingProgram.id;
    
    let loadedExercises = editingProgram.program.exercises || [];
    
    selectedExercises = loadedExercises.map(ex => {
      const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
      return {
        ...ex,
        name: exercise ? exercise.name : 'Unknown Exercise'
      };
    });
  } else if (editingModule && editingModule.module && Array.isArray(editingModule.module.exercises)) {
    // Only treat as module if program check failed and module has valid data
    isEditingProgram = false;
    editingType = 'module';
    editingId = editingModule.id;
    editingModuleName = editingModule.module.name || '';

    const moduleData = editingModule.module;
    selectedExercises = (moduleData.exercises || []).map(exerciseId => {
      const exercise = exercises.find(e => String(e.id) === String(exerciseId));
      return {
        exerciseId: parseInt(exerciseId),
        name: exercise ? exercise.name : 'Unknown Exercise',
        sets: 3,
        reps: 8,
        restTime: 60
      };
    });
  }

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '${isEditingProgram ? '#programs' : '#skill-modules'}'">
          Back to ${isEditingProgram ? 'Programs' : 'Modules'}
        </button>
        <h1>${isEditingProgram ? (editingType === 'custom' ? 'Edit Routine' : 'Clone Program') : 'Edit Module'}</h1>
      </div>
      <form id="builder-form">
        <div class="card">
          <h3>${isEditingProgram ? 'Routine Name' : 'Module Name'}</h3>
          <input 
            type="text" 
            id="routine-name" 
            class="filter-input" 
            placeholder="Enter name..." 
            value="${isEditingProgram ? editingProgram.program.name : editingModuleName}"
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
          <ul id="available-exercises-list" class="checkbox-list">
            ${exercises.map(e => {
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
        </div>
        <button class="btn margin-top-1" type="submit">${isEditingProgram ? (editingType === 'custom' ? 'Update Routine' : 'Clone Program') : 'Save Module'}</button>
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

    exerciseList.querySelectorAll('input[data-index]').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        selectedExercises[index][field] = parseInt(e.target.value) || 1;
      });
    });

    exerciseList.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.remove);
        const exerciseId = selectedExercises[index].exerciseId;

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

      // For modules - save to IndexedDB via ModuleStore
      if (!isEditingProgram) {
        try {
          if (editingModule) {
            // Update existing module
            const updatedModule = {
              id: editingId,
              name,
              exercises: selectedExercises.map(ex => ex.exerciseId),
              description: 'Updated from builder', // Keep existing description or get it from state
              difficulty: 'mixed',
              category: 'General'
            };

            await ModuleStore.update(updatedModule);
            
            updateState({ 
              editingModule: null,
              editingProgram: null
            });
            
            alert('Module updated successfully!');
            window.location.hash = '#skill-modules';
          } else {
            // Create new module
            const newModule = {
              name,
              exercises: selectedExercises.map(ex => ex.exerciseId),
              description: 'Created from builder',
              difficulty: 'beginner',
              category: 'General'
            };

            await ModuleStore.add(newModule);
            
            updateState({ 
              editingProgram: null,
              editingModule: null // Clear both to prevent conflicts
            });
            
            alert('New module created successfully!');
            window.location.hash = '#skill-modules';
          }
        } catch (error) {
          console.error('Error saving module:', error);
          alert('Error saving module: ' + error.message);
        }
      } else {
        // Program editing (existing logic)
        const user = { ...state.user };

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
              }))
            };
          }
        } else {
          // Clone program as new custom routine
          user.customRoutines = user.customRoutines || [];
          user.customRoutines.push({
            id: `${user.name}-${Date.now()}`,
            name: name + ' (Modified)',
            exercises: selectedExercises.map(ex => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              restTime: ex.restTime
            }))
          });
        }

        updateState({ 
          user, 
          editingProgram: null,
          editingModule: null // Clear both to prevent conflicts
        });
        alert('Changes saved!');
        window.location.hash = '#programs';
      }
    });
  }
}

// Export as object for wrapView compatibility
export default { render: renderBuilderView };
