// views/builder-view.js - Routine builder (no more custom routines)
import { renderHeader } from '../components/header.js';
import { renderSpinner, hideSpinner } from '../components/spinner.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { ModuleStore } from '../services/modules-service.js';
import { show } from '../services/toast-service.js';
import { escapeHtml } from '../utils/html-helpers.js';
import { openDatabase, STORES } from '../services/database.js';

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
  let selectedWarmup = [];
  let selectedCooldown = [];
  let activeSection = 'exercises';
  let createNewRoutine = false;

  if (state.createNewRoutine) {
    createNewRoutine = true;
    isEditingRoutine = false;
    editingRoutine = null;
    updateState({ createNewRoutine: false });
  }

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

    const loadedWarmup = editingRoutine.routine.warmup || [];
    selectedWarmup = loadedWarmup.map(ex => {
      const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
      return {
        ...ex,
        name: exercise ? exercise.name : 'Unknown Exercise'
      };
    });

    const loadedCooldown = editingRoutine.routine.cooldown || [];
    selectedCooldown = loadedCooldown.map(ex => {
      const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
      return {
        ...ex,
        name: exercise ? exercise.name : 'Unknown Exercise'
      };
    });
  } else if (editingModule && editingModule.module && Array.isArray(editingModule.module.exercises)) {
    console.warn('[BuilderView] Module editing is deprecated. Redirecting to module admin view.');
    window.location.hash = `#module-admin/${editingModule.id}`;
    return;
  }

  function getActiveList() {
    if (activeSection === 'warmup') return selectedWarmup;
    if (activeSection === 'cooldown') return selectedCooldown;
    return selectedExercises;
  }

  function isExerciseInActiveList(exerciseId) {
    return getActiveList().some(ex => ex.exerciseId === exerciseId);
  }

  function renderSectionExerciseList(exerciseList, sectionKey) {
    if (exerciseList.length === 0) {
      return `<p class="section-empty-msg">${t('builder.no_exercises_selected_yet')}</p>`;
    }

    return exerciseList.map((ex, index) => {
      let exerciseName = ex.name;
      if (!exerciseName) {
        const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
        exerciseName = exercise ? exercise.name : 'Unknown Exercise';
      }

      const weightValue = ex.weight || 0;

      return `
        <div class="card margin-bottom-1 draggable-item" draggable="true" data-section="${sectionKey}" data-index="${index}">
          <div class="drag-handle">
            <span>⋮⋮</span>
            <span class="exercise-name">${exerciseName}</span>
          </div>
          <div class="exercise-form-grid">
            <label>Sets: <input type="number" min="1" max="10" value="${ex.sets}" data-section="${sectionKey}" data-index="${index}" data-field="sets"></label>
            <label>Reps: <input type="number" min="1" max="50" value="${ex.reps}" data-section="${sectionKey}" data-index="${index}" data-field="reps"></label>
            <label>Rest (s): <input type="number" min="15" max="300" step="15" value="${ex.restTime}" data-section="${sectionKey}" data-index="${index}" data-field="restTime"></label>
            <label>Wt: <input type="number" min="0" max="500" step="0.5" value="${weightValue}" data-section="${sectionKey}" data-index="${index}" data-field="weight" class="weight-input"></label>
            <button type="button" class="btn btn-danger remove-btn" data-section="${sectionKey}" data-remove="${index}">${t('builder.remove')}</button>
          </div>
        </div>
      `;
    }).join('');
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
        <div class="card margin-bottom-1 mt-2rem">
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
              ${difficulties.map(diff => `
                <option value="${diff.label}" ${isEditingRoutine && String(editingRoutine.routine?.difficulty).toLowerCase() === String(diff.label).toLowerCase() ? 'selected' : ''}>
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
        <div class="card margin-bottom-1 mt-2rem">
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

        ${createNewRoutine || isEditingRoutine ? `
        <div class="builder-sections">
          <div class="builder-section-nav">
            <button type="button" class="btn section-tab ${activeSection === 'warmup' ? 'active' : ''}" data-section="warmup">
              🔥 ${t('active_workout.warmup')} (${selectedWarmup.length})
            </button>
            <button type="button" class="btn section-tab ${activeSection === 'exercises' ? 'active' : ''}" data-section="exercises">
              💪 ${t('builder.selected_exercises')} (${selectedExercises.length})
            </button>
            <button type="button" class="btn section-tab ${activeSection === 'cooldown' ? 'active' : ''}" data-section="cooldown">
              ❄️ ${t('active_workout.cooldown')} (${selectedCooldown.length})
            </button>
          </div>
        ` : ''}

        <div id="section-warmup" class="builder-section ${activeSection !== 'warmup' ? 'hidden' : ''}">
          <div class="section-header">
            <h3>🔥 ${t('active_workout.warmup')}</h3>
          </div>
          <div id="warmup-list" class="draggable-list">
            ${renderSectionExerciseList(selectedWarmup, 'warmup')}
          </div>
        </div>

        <div id="section-exercises" class="builder-section ${activeSection !== 'exercises' ? 'hidden' : ''}">
          <div class="section-header">
            <h3>${t('builder.selected_exercises')}</h3>
          </div>
          <div id="exercise-list" class="draggable-list">
            ${selectedExercises.length === 0 ? '<p class="section-empty-msg">' + t('builder.no_exercises_selected_yet') + '</p>' : ''}
          </div>
        </div>

        <div id="section-cooldown" class="builder-section ${activeSection !== 'cooldown' ? 'hidden' : ''}">
          <div class="section-header">
            <h3>❄️ ${t('active_workout.cooldown')}</h3>
          </div>
          <div id="cooldown-list" class="draggable-list">
            ${renderSectionExerciseList(selectedCooldown, 'cooldown')}
          </div>
        </div>

        ${createNewRoutine || isEditingRoutine ? '</div>' : ''}

        <div class="card margin-bottom-1 scrollable-exercise-list">
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
              const isSelected = isExerciseInActiveList(e.id);
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

  function updateAllExerciseLists() {
    const exerciseList = main.querySelector('#exercise-list');
    const warmupList = main.querySelector('#warmup-list');
    const cooldownList = main.querySelector('#cooldown-list');

    if (exerciseList) {
      exerciseList.innerHTML = renderSectionExerciseList(selectedExercises, 'exercises');
    }
    if (warmupList) {
      warmupList.innerHTML = renderSectionExerciseList(selectedWarmup, 'warmup');
    }
    if (cooldownList) {
      cooldownList.innerHTML = renderSectionExerciseList(selectedCooldown, 'cooldown');
    }

    attachListEventListeners();
    updateCheckboxStates();
  }

  function updateCheckboxStates() {
    const checkboxes = main.querySelectorAll('input[type="checkbox"][data-exercise-id]');
    checkboxes.forEach(checkbox => {
      const exerciseId = parseInt(checkbox.dataset.exerciseId);
      checkbox.checked = isExerciseInActiveList(exerciseId);
    });
  }

  function updateSectionTabCounts() {
    const tabs = main.querySelectorAll('.section-tab');
    tabs.forEach(tab => {
      const section = tab.dataset.section;
      let count = 0;
      if (section === 'warmup') count = selectedWarmup.length;
      else if (section === 'cooldown') count = selectedCooldown.length;
      else count = selectedExercises.length;
      const sectionLabel = section === 'exercises' ? t('builder.selected_exercises').split('(')[0].trim() :
        section === 'warmup' ? t('active_workout.warmup') : t('active_workout.cooldown');
      const icon = section === 'warmup' ? '🔥 ' : section === 'cooldown' ? '❄️ ' : '💪 ';
      tab.textContent = `${icon}${sectionLabel} (${count})`;
    });
  }

  function attachListEventListeners() {
    const allLists = main.querySelectorAll('.draggable-list');
    allLists.forEach(list => {
      list.querySelectorAll('input[data-index]').forEach(input => {
        input.addEventListener('input', e => {
          const section = e.target.dataset.section;
          const index = parseInt(e.target.dataset.index);
          const field = e.target.dataset.field;
          const targetList = section === 'warmup' ? selectedWarmup :
            section === 'cooldown' ? selectedCooldown : selectedExercises;
          if (field === 'weight') {
            targetList[index][field] = parseFloat(e.target.value) || 0;
          } else {
            targetList[index][field] = parseInt(e.target.value) || 1;
          }
        });
      });

      list.querySelectorAll('button[data-remove]').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          const section = e.target.dataset.section;
          const index = parseInt(e.target.dataset.remove);
          const targetList = section === 'warmup' ? selectedWarmup :
            section === 'cooldown' ? selectedCooldown : selectedExercises;
          const exerciseId = targetList[index].exerciseId;
          const exerciseName = targetList[index].name || `Exercise ${index + 1}`;

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
            targetList.splice(index, 1);
            updateAllExerciseLists();
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
      let draggedSection = null;

      list.querySelectorAll('.draggable-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          draggedIndex = parseInt(item.dataset.index);
          draggedSection = item.dataset.section;
          item.style.opacity = '0.5';
          e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
          item.style.opacity = '';
          draggedIndex = null;
          draggedSection = null;
        });

        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });

        item.addEventListener('drop', (e) => {
          e.preventDefault();
          const dropIndex = parseInt(item.dataset.index);
          const dropSection = item.dataset.section;

          if (draggedIndex !== null && draggedSection === dropSection && draggedIndex !== dropIndex) {
            const targetList = dropSection === 'warmup' ? selectedWarmup :
              dropSection === 'cooldown' ? selectedCooldown : selectedExercises;
            const draggedItem = targetList[draggedIndex];
            targetList.splice(draggedIndex, 1);
            targetList.splice(dropIndex, 0, draggedItem);
            updateAllExerciseLists();
          }
        });
      });
    });
  }

  const sectionTabs = main.querySelectorAll('.section-tab');
  sectionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activeSection = tab.dataset.section;
      sectionTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      main.querySelectorAll('.builder-section').forEach(s => s.classList.add('hidden'));
      main.querySelector(`#section-${activeSection}`).classList.remove('hidden');

      updateCheckboxStates();
    });
  });

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
      const targetList = getActiveList();

      if (e.target.checked) {
        if (!targetList.some(ex => ex.exerciseId === exerciseId)) {
          targetList.push({
            exerciseId,
            name: exerciseName,
            sets: activeSection === 'warmup' || activeSection === 'cooldown' ? 2 : 3,
            reps: activeSection === 'warmup' || activeSection === 'cooldown' ? 12 : 8,
            restTime: activeSection === 'warmup' || activeSection === 'cooldown' ? 30 : 60,
            weight: 0
          });
          updateAllExerciseLists();
          updateSectionTabCounts();
        } else {
          show(`"${exerciseName}" is already in this section.`, 'warning');
          e.target.checked = false;
        }
      } else {
        const index = targetList.findIndex(ex => ex.exerciseId === exerciseId);
        if (index !== -1) {
          targetList.splice(index, 1);
          updateAllExerciseLists();
          updateSectionTabCounts();
        }
      }
    });
  });

  updateAllExerciseLists();
  updateSectionTabCounts();

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
      
      if (selectedExercises.length === 1) {
        show('Tip: Routines with at least 3 exercises are more effective.', 'warning');
      }
      
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

      const submitBtn = main.querySelector('.form-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = t('common.loading');
        document.body.insertAdjacentHTML('beforeend', renderSpinner());
      }

      try {
        if (!isEditingRoutine && !createNewRoutine) {
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
        } else if (createNewRoutine || isEditingRoutine) {
          const routineId = isEditingRoutine ? parseInt(editingId, 10) : Date.now();

          function mapExerciseList(list) {
            return list.map(ex => {
              const entry = {
                exerciseId: ex.exerciseId,
                sets: ex.sets,
                reps: ex.reps,
                restTime: ex.restTime
              };
              if (ex.weight && ex.weight > 0) {
                entry.weight = ex.weight;
              }
              return entry;
            });
          }

          const routineData = {
            id: routineId,
            name,
            ...routineDetails,
            exercises: mapExerciseList(selectedExercises)
          };

          if (selectedWarmup.length > 0) {
            routineData.warmup = mapExerciseList(selectedWarmup);
          }
          if (selectedCooldown.length > 0) {
            routineData.cooldown = mapExerciseList(selectedCooldown);
          }

          const database = await openDatabase();
          const transaction = database.transaction([STORES.ROUTINES], 'readwrite');
          const store = transaction.objectStore(STORES.ROUTINES);
          
          const putRequest = store.put(routineData);
          
          await new Promise((resolve, reject) => {
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });
          
          const { fetchRoutines } = await import('../services/api.js');
          const refreshedRoutines = await fetchRoutines();
          updateState({ 
            routines: refreshedRoutines,
            editingRoutine: null
          });
          
          if (isEditingRoutine) {
            show(t('builder.routine_updated'), 'success');
          } else {
            show(t('builder.routine_created'), 'success');
          }
          
          window.location.hash = '#routines';
        }
      } catch (error) {
        console.error('Error saving:', error);
        show(t('builder.save_error') + error.message, 'error');
      } finally {
        hideSpinner();
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
    });
  }
}

export default { render: renderBuilderView };
