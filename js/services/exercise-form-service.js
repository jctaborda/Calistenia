// Exercise Form Service - Handles all exercise form operations including prerequisites, progressions, formCues, and commonMistakes
// Single form for both add and edit — populated differently depending on editId

import { normalizeArray } from '../utils/array.js';
import { escapeHtml } from '../utils/html.js';
import { show } from './toast-service.js';
import { loadExercises as loadExercisesFromStorage, saveExercises as saveExercisesToStorage } from './storage.js';

export async function initExerciseForm(editId, setStateFn) {
  const references = { 
    categories: [], 
    muscles: [], 
    equipment: [], 
    difficulties: [],
    exercises: [] 
  };
  
  let editingExerciseId = null;
  
  // Dynamic list management counters
  let formCueItems = 0;
  let mistakeItems = 0;
  
  // Setup event listeners
  setupFormListeners(setStateFn);
  
  // Load all data first
  await loadReferences();
  
  // If editing, load the exercise and populate the form
  if (editId) {
    sessionStorage.removeItem('editingExerciseId');
    await loadExerciseForEditById(editId);
  }

  // ==================== HELPER FUNCTIONS ====================

  function setupFormListeners(setStateFn) {
    // Single form handles both add and edit
    document.getElementById('exerciseForm')?.addEventListener('submit', handleExerciseSubmit.bind(null, setStateFn));
    document.getElementById('deleteBtn')?.addEventListener('click', handleDeleteExercise.bind(null, setStateFn));
    document.getElementById('cancelEditBtn')?.addEventListener('click', cancelEdit);
    
    // Dynamic list event delegation
    setupDynamicListEvents();
  }

  async function loadReferences() {
    try {
      const { getDataFilename } = await import('./data-cache.js');
      const filename = getDataFilename();
      const response = await fetch(filename);
      if (!response.ok) throw new Error('Failed to load data');
      const data = await response.json();
      
      references.categories = data.categories;
      references.muscles = data.muscles;
      references.equipment = data.equipment;
      references.difficulties = data.difficulties;
      
      references.exercises = await loadAllExercises();
      
      populateEquipmentCheckboxes();
      populateCategoryCheckboxes();
      populateMuscleCheckboxes();
      populateDifficultySelects(references.difficulties);
      populateExerciseSelects(references.exercises);
      
    } catch (error) {
      show('Error loading reference data: ' + error.message, 'error');
    }
  }

  function populateExerciseSelects(exercises) {
    const exerciseOptions = exercises.map(ex => 
      `<option value="${ex.id}">${escapeHtml(ex.name)}</option>`
    ).join('');
    
    const prereqSelect = document.getElementById('prerequisites');
    if (prereqSelect) {
      prereqSelect.innerHTML = '<option value="">-- Select Prerequisites --</option>' + exerciseOptions;
    }
    
    const progSelect = document.getElementById('progressions');
    if (progSelect) {
      progSelect.innerHTML = '<option value="">-- Select Progressions --</option>' + exerciseOptions;
    }
  }

  function populateEquipmentCheckboxes() {
    const container = document.getElementById('equipment-container');
    if (container) {
      container.innerHTML = references.equipment.map(eq => 
        `<label class="checkbox-item">
          <input type="checkbox" name="equipment" value="${escapeHtml(String(eq.id))}">
          ${escapeHtml(eq.name)}
        </label>`
      ).join('');
    }
  }

  function populateCategoryCheckboxes() {
    const container = document.getElementById('categories-container');
    if (container) {
      container.innerHTML = references.categories.map(cat => 
        `<label class="checkbox-item">
          <input type="checkbox" name="categories" value="${escapeHtml(String(cat.id))}">
          ${escapeHtml(cat.name)}
        </label>`
      ).join('');
    }
  }

  function populateMuscleCheckboxes() {
    const musclesContainer = document.getElementById('muscles-container');
    if (musclesContainer) {
      musclesContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles" value="${escapeHtml(String(mus.id))}">
          ${escapeHtml(mus.name_en || mus.name)}
        </label>`
      ).join('');
    }

    const secondaryContainer = document.getElementById('muscles-secondary-container');
    if (secondaryContainer) {
      secondaryContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles_secondary" value="${escapeHtml(String(mus.id))}">
          ${escapeHtml(mus.name_en || mus.name)}
        </label>`
      ).join('');
    }
  }

  function populateDifficultySelects(difficulties) {
    const difficultyOptions = difficulties.map(d => 
      `<option value="${escapeHtml(String(d.id))}">${escapeHtml(d.label || d.name)}</option>`
    ).join('');
    
    const select = document.getElementById('difficulty');
    if (select) {
      select.innerHTML = '<option value="">Select Difficulty...</option>' + difficultyOptions;
    }
  }

  async function loadExerciseForEditById(exerciseId) {
    try {
      // Step 1: Check in-memory references (try both string and numeric comparison)
      let exercise = references.exercises.find(ex =>
        String(ex.id) === String(exerciseId) ||
        Number(ex.id) === Number(exerciseId)
      );
      
      if (!exercise) {
        // Step 2: Try IndexedDB directly
        const { getExerciseById } = await import('../services/database.js');
        exercise = await getExerciseById(exerciseId);
      }
      
      if (!exercise) {
        // Step 3: Load exercises from IndexedDB fresh (in case loadReferences didn't get user data)
        const { exercisesLoad } = await import('../services/database.js');
        const allExercises = await exercisesLoad();
        exercise = allExercises.find(ex =>
          String(ex.id) === String(exerciseId) ||
          Number(ex.id) === Number(exerciseId)
        );
        if (exercise) {
          references.exercises = allExercises;
        }
      }
      
      if (!exercise) {
        // Step 4: Load from data.json file (fallback)
        const { getDataFilename } = await import('./data-cache.js');
        const filename = getDataFilename();
        const resp = await fetch(filename);
        if (resp.ok) {
          const data = await resp.json();
          exercise = data.exercises?.find(ex =>
            String(ex.id) === String(exerciseId) ||
            Number(ex.id) === Number(exerciseId)
          );
          if (exercise) {
            const idx = references.exercises.findIndex(e =>
              String(e.id) === String(exercise.id) || Number(e.id) === Number(exercise.id)
            );
            if (idx === -1) references.exercises.push(exercise);
            else references.exercises[idx] = exercise;
          }
        }
      }
      
      if (!exercise) {
        console.error('[ExerciseForm] Could not find exercise with ID:', exerciseId, 'in IndexedDB or data.json');
        throw new Error('Exercise not found');
      }
      
      editingExerciseId = exercise.id;
      
      // Fill text fields
      const name = document.getElementById('name');
      const description = document.getElementById('description');
      const skill = document.getElementById('skill');
      const image_url = document.getElementById('image_url');
      const video_url = document.getElementById('video_url');
      
      if (name) name.value = exercise.name || '';
      if (description) description.value = exercise.description || '';
      if (skill) skill.value = exercise.skill || '';
      if (image_url) image_url.value = exercise.image_url || '';
      if (video_url) video_url.value = exercise.video_url || '';
      
      // Set difficulty select
      const difficulty = document.getElementById('difficulty');
      if (difficulty) {
        const firstDifficulty = (exercise.difficulty && exercise.difficulty[0]) ? exercise.difficulty[0] : '';
        difficulty.value = firstDifficulty;
      }
      
      // Check checkboxes
      const equipmentIds = Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment];
      checkCheckboxes('equipment', equipmentIds);
      
      checkCheckboxes('categories', exercise.categories || []);
      checkCheckboxes('muscles', exercise.muscles || []);
      checkCheckboxes('muscles_secondary', exercise.muscles_secondary || []);
      
      // Set prerequisites select
      const prereqIds = Array.isArray(exercise.prerequisites) ? exercise.prerequisites : [];
      const prereqSelect = document.getElementById('prerequisites');
      if (prereqSelect) {
        Array.from(prereqSelect.options).forEach(opt => {
          opt.selected = prereqIds.includes(parseInt(opt.value));
        });
      }
      
      // Set progressions select
      const progIds = Array.isArray(exercise.progressions) ? exercise.progressions : [];
      const progSelect = document.getElementById('progressions');
      if (progSelect) {
        Array.from(progSelect.options).forEach(opt => {
          opt.selected = progIds.includes(parseInt(opt.value));
        });
      }
      
      // Load formCues dynamic list
      const formCues = Array.isArray(exercise.formCues) ? exercise.formCues : [];
      formCueItems = loadDynamicList('formCuesContainer', formCueItems, formCues);
      
      // Load commonMistakes dynamic list
      const mistakes = Array.isArray(exercise.commonMistakes) ? exercise.commonMistakes : [];
      mistakeItems = loadDynamicList('commonMistakesContainer', mistakeItems, mistakes);
      
    } catch (error) {
      show('Error loading exercise: ' + error.message, 'error');
    }
  }

  function checkCheckboxes(name, values) {
    const container = document.getElementById(name + '-container');
    if (!container) return;
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const cbId = String(cb.value);
      cb.checked = values.some(v => String(v) === cbId);
    });
  }

  function loadDynamicList(containerId, itemCounter, values) {
    const container = document.getElementById(containerId);
    if (!container) return itemCounter;
    
    container.innerHTML = '';
    
    if (values && values.length > 0) {
      values.forEach(value => {
        itemCounter = addItemToContainer(container, itemCounter, value);
      });
    } else {
      itemCounter = addItemToContainer(container, itemCounter, '');
    }
    
    return itemCounter;
  }

  function addItemToContainer(container, counter, value) {
    const itemId = `item-${++counter}`;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'dynamic-list-item';
    itemDiv.id = itemId;
    itemDiv.innerHTML = `
      <input type="text" class="dynamic-list-input" value="${escapeHtml(value)}" placeholder="Enter item...">
      <button type="button" class="btn btn-danger btn-sm remove-item" title="Remove">✕</button>
    `;
    container.appendChild(itemDiv);
    return counter;
  }

  function setupDynamicListEvents() {
    // Event delegation for dynamic list items
    const formCuesContainer = document.getElementById('formCuesContainer');
    const mistakesContainer = document.getElementById('commonMistakesContainer');
    
    [formCuesContainer, mistakesContainer].forEach(container => {
      if (!container) return;
      
      const addButtonId = container.id === 'formCuesContainer' ? 'addFormCueBtn' : 'addMistakeBtn';
      const addBtn = document.getElementById(addButtonId);
      
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const currentItems = container.querySelectorAll('.dynamic-list-item');
          const counter = currentItems.length;
          addItemToContainer(container, counter, '');
        });
      }
      
      container.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
          const item = e.target.closest('.dynamic-list-item');
          if (item) {
            const items = container.querySelectorAll('.dynamic-list-item');
            if (items.length > 1) {
              item.remove();
            } else {
              const input = item.querySelector('input');
              if (input) input.value = '';
            }
          }
        }
      });
    });
  }

  function getCheckedValues(name) {
    const container = document.getElementById(name + '-container');
    if (!container) return [];
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  function getMultiSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
  }

  function getDynamicListValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const inputs = container.querySelectorAll('.dynamic-list-input');
    return Array.from(inputs)
      .map(input => input.value.trim())
      .filter(value => value.length > 0);
  }

  async function handleExerciseSubmit(setStateFn, e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validate form data before processing
    try {
      const validationService = await import('./validation.js');
      const validationResult = validationService.ValidationService.validateExerciseForm(formData);
      
      if (!validationResult.valid) {
        validationService.ValidationService.clearAllErrors();
        Object.keys(validationResult.errors).forEach(fieldName => {
          validationService.ValidationService.showError(fieldName, validationResult.errors[fieldName]);
        });
        return;
      }
    } catch (err) {
      console.error('Validation service not available:', err);
    }
    
    data.categories = getCheckedValues('categories');
    data.muscles = getCheckedValues('muscles');
    data.muscles_secondary = getCheckedValues('muscles_secondary');
    
    const equipmentIds = getCheckedValues('equipment');
    data.equipment = Array.isArray(equipmentIds) ? equipmentIds : (equipmentIds ? [equipmentIds] : []);
    
    const prereqSelect = document.getElementById('prerequisites');
    data.prerequisites = prereqSelect 
      ? Array.from(prereqSelect.selectedOptions).map(opt => parseInt(opt.value))
      : [];
    const progSelect = document.getElementById('progressions');
    data.progressions = progSelect 
      ? Array.from(progSelect.selectedOptions).map(opt => parseInt(opt.value))
      : [];
    
    data.formCues = getDynamicListValues('formCuesContainer');
    data.commonMistakes = getDynamicListValues('commonMistakesContainer');
    
    const difficultyValue = formData.get('difficulty');
    data.difficulty = difficultyValue ? [parseInt(difficultyValue)] : [];
    
    if (editingExerciseId) {
      // EDIT mode
      data.id = editingExerciseId;
      
      try {
        const index = references.exercises.findIndex(ex => String(ex.id) === String(editingExerciseId));
        if (index === -1) {
          throw new Error('Exercise not found with ID: ' + editingExerciseId);
        }
        
        references.exercises[index] = data;
        
        await saveAllExercises(references.exercises);
        
        setStateFn({ exercises: references.exercises });
        
        show('Exercise updated successfully!', 'success');
        window.location.hash = '#exercises';
      } catch (error) {
        show('Error updating exercise: ' + error.message, 'error');
      }
    } else {
      // ADD mode
      try {
        const numericIds = references.exercises
          .map(ex => ex.id)
          .filter(id => typeof id === 'number' && !isNaN(id));
        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        data.id = maxId + 1;
        
        references.exercises.push(data);
        
        await saveAllExercises(references.exercises);
        
        setStateFn({ exercises: references.exercises });
        
        show(`Exercise added successfully! (ID: ${data.id})`, 'success');
        e.target.reset();
        window.location.hash = '#exercises';
      } catch (error) {
        show('Error adding exercise: ' + error.message, 'error');
      }
    }
  }

  async function handleDeleteExercise(setStateFn, e) {
    if (!editingExerciseId) {
      show('No exercise selected for deletion', 'error');
      return;
    }
    
    const exercise = references.exercises.find(ex => String(ex.id) === String(editingExerciseId));
    const confirmed = confirm(`Are you sure you want to delete "${exercise?.name}"? This cannot be undone.`);
    
    if (!confirmed) return;
    
    try {
      references.exercises = references.exercises.filter(ex => String(ex.id) !== String(editingExerciseId));
      
      await saveAllExercises(references.exercises);
      
      setStateFn({ exercises: references.exercises });
      
      show('Exercise deleted successfully!', 'success');
      window.location.hash = '#exercises';
    } catch (error) {
      show('Error deleting exercise: ' + error.message, 'error');
    }
  }

  function cancelEdit() {
    editingExerciseId = null;
    document.getElementById('exerciseForm').reset();
  }

  async function loadAllExercises() {
    return loadExercisesFromStorage();
  }

  async function saveAllExercises(exercises) {
    return saveExercisesToStorage(exercises);
  }
}
