// Exercise Form Service - Handles all exercise form operations including prerequisites, progressions, formCues, and commonMistakes

// Make available globally for backward compatibility
window.initExerciseService = async (editId, setStateFn) => {
  return await initExerciseForm(editId, setStateFn);
};

export async function initExerciseForm(editId, setStateFn) {
  const references = { 
    categories: [], 
    muscles: [], 
    equipment: [], 
    difficulties: [],
    exercises: [] 
  };
  
  let editingExerciseId = null;
  
  // Dynamic list management counters - moved to top to avoid TDZ issues
  let formCueItems = 0;
  let mistakeItems = 0;
  
  console.log('[initExerciseForm] Called with editId:', editId);
  
  // Setup event listeners
  setupTabs();
  setupFormListeners(setStateFn);
  
  // Load all data first
  await loadReferences();
  
  // If editing, load the exercise
  if (editId) {
    console.log('[initExerciseForm] Found editId:', editId);
    sessionStorage.removeItem('editingExerciseId');
    document.querySelector('[data-tab="edit"]').click();
    await loadExerciseForEditById(editId);
  } else {
    console.log('[initExerciseForm] No editId - showing add form');
  }

  // ==================== HELPER FUNCTIONS ====================

  function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.textContent = text;
      messageEl.className = `message ${type}`;
      messageEl.style.display = 'block';
      
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 5000);
    }
  }

  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.form-section').forEach(section => {
          section.classList.remove('active');
        });
        document.getElementById(`${tabName}-form`).classList.add('active');
      });
    });
  }

  function setupFormListeners(setStateFn) {
    // Add exercise form
    document.getElementById('exerciseForm')?.addEventListener('submit', handleAddExercise.bind(null, setStateFn));
    
    // Edit exercise form
    document.getElementById('editForm')?.addEventListener('submit', handleEditExercise.bind(null, setStateFn));
    document.getElementById('deleteBtn')?.addEventListener('click', handleDeleteExercise.bind(null, setStateFn));
    document.getElementById('cancelEditBtn')?.addEventListener('click', cancelEdit);
    
    // Search for exercises
    const searchInput = document.getElementById('searchExercise');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(searchExercises, 300));
    }

    // Dynamic list event delegation
    setupDynamicListEvents();
  }

  async function loadReferences() {
    try {
      // Load all data from single data.json file
      const response = await fetch('./data/data.json');
      if (!response.ok) throw new Error('Failed to load data');
      const data = await response.json();
      
      references.categories = data.categories;
      references.muscles = data.muscles;
      references.equipment = data.equipment;
      references.difficulties = data.difficulties;
      
      // Load exercises (for CRUD operations and dropdown population)
      references.exercises = await loadAllExercises();
      
      populateEquipmentCheckboxes();
      populateCategoryCheckboxes();
      populateMuscleCheckboxes();
      populateDifficultySelects(references.difficulties);
      populateExerciseSelects(references.exercises); // NEW: Populate prerequisites/progressions
      
    } catch (error) {
      showMessage('Error loading reference data: ' + error.message, 'error');
    }
  }

  function populateExerciseSelects(exercises) {
    const exerciseOptions = exercises.map(ex => 
      `<option value="${ex.id}">${ex.name}</option>`
    ).join('');
    
    // Prerequisites select
    document.getElementById('editPrerequisites').innerHTML = 
      '<option value="">-- Select Prerequisites --</option>' + exerciseOptions;
    
    // Progressions select
    document.getElementById('editProgressions').innerHTML = 
      '<option value="">-- Select Progressions --</option>' + exerciseOptions;
  }

  function populateEquipmentCheckboxes() {
    const container = document.getElementById('equipment-container');
    if (container) {
      container.innerHTML = references.equipment.map(eq => 
        `<label class="checkbox-item">
          <input type="checkbox" name="equipment" value="${eq.id}">
          ${eq.name}
        </label>`
      ).join('');
    }
    
    // Also populate edit equipment checkboxes
    const editContainer = document.getElementById('edit-equipment-container');
    if (editContainer) {
      editContainer.innerHTML = references.equipment.map(eq => 
        `<label class="checkbox-item">
          <input type="checkbox" name="equipment" value="${eq.id}">
          ${eq.name}
        </label>`
      ).join('');
    }
  }

  function populateCategoryCheckboxes() {
    // Add form categories container
    const container = document.getElementById('categories-container');
    if (container) {
      container.innerHTML = references.categories.map(cat => 
        `<label class="checkbox-item">
          <input type="checkbox" name="categories" value="${cat.id}">
          ${cat.name}
        </label>`
      ).join('');
    }
    
    // Edit form categories container
    const editContainer = document.getElementById('edit-categories-container');
    if (editContainer) {
      editContainer.innerHTML = references.categories.map(cat => 
        `<label class="checkbox-item">
          <input type="checkbox" name="categories" value="${cat.id}">
          ${cat.name}
        </label>`
      ).join('');
    }
  }

  function populateMuscleCheckboxes() {
    // Add form primary muscles container
    const musclesContainer = document.getElementById('muscles-container');
    if (musclesContainer) {
      musclesContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles" value="${mus.id}">
          ${mus.name_en || mus.name}
        </label>`
      ).join('');
    }

    // Add form secondary muscles container
    const secondaryContainer = document.getElementById('muscles-secondary-container');
    if (secondaryContainer) {
      secondaryContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles_secondary" value="${mus.id}">
          ${mus.name_en || mus.name}
        </label>`
      ).join('');
    }

    // Edit form primary muscles container
    const editMusclesContainer = document.getElementById('edit-muscles-container');
    if (editMusclesContainer) {
      editMusclesContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles" value="${mus.id}">
          ${mus.name_en || mus.name}
        </label>`
      ).join('');
    }

    // Edit form secondary muscles container
    const editSecondaryContainer = document.getElementById('edit-muscles-secondary-container');
    if (editSecondaryContainer) {
      editSecondaryContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles_secondary" value="${mus.id}">
          ${mus.name_en || mus.name}
        </label>`
      ).join('');
    }
  }

  function populateDifficultySelects(difficulties) {
    const difficultyOptions = difficulties.map(d => 
      `<option value="${d.id}">${d.label || d.name}</option>`
    ).join('');
    
    document.getElementById('difficulty').innerHTML = '<option value="">Select Difficulty...</option>' + difficultyOptions;
    document.getElementById('editDifficulty').innerHTML = '<option value="">Select Difficulty...</option>' + difficultyOptions;
  }

  async function loadExerciseForEditById(exerciseId) {
    try {
      const exercise = references.exercises.find(ex => ex.id === parseInt(exerciseId));
      if (!exercise) throw new Error('Exercise not found');
      
      editingExerciseId = exercise.id;
      
      // Fill form fields and populate selected values
      
      // Text fields
      const editName = document.getElementById('editName');
      const editDescription = document.getElementById('editDescription');
      const editSkill = document.getElementById('editSkill');
      const editImage_url = document.getElementById('editImage_url');
      const editVideo_url = document.getElementById('editVideo_url');
      
      if (editName) editName.value = exercise.name || '';
      if (editDescription) editDescription.value = exercise.description || '';
      if (editSkill) editSkill.value = exercise.skill || '';
      if (editImage_url) editImage_url.value = exercise.image_url || '';
      if (editVideo_url) editVideo_url.value = exercise.video_url || '';
      
      // Set difficulty select to the first difficulty value (or default)
      const editDifficulty = document.getElementById('editDifficulty');
      if (editDifficulty) {
        const firstDifficulty = (exercise.difficulty && exercise.difficulty[0]) ? exercise.difficulty[0] : '';
        editDifficulty.value = firstDifficulty;
      }
      
      // Check checkboxes for equipment (array format)
      const equipmentIds = Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment];
      checkCheckboxes('equipment', equipmentIds);
      
      checkCheckboxes('categories', exercise.categories || []);
      checkCheckboxes('muscles', exercise.muscles || []);
      checkCheckboxes('muscles_secondary', exercise.muscles_secondary || []);
      
      // Set prerequisites select (array of exercise IDs)
      const prereqIds = Array.isArray(exercise.prerequisites) ? exercise.prerequisites : [];
      const prereqSelect = document.getElementById('editPrerequisites');
      if (prereqSelect) {
        Array.from(prereqSelect.options).forEach(opt => {
          opt.selected = prereqIds.includes(parseInt(opt.value));
        });
      }
      
      // Set progressions select (array of exercise IDs)
      const progIds = Array.isArray(exercise.progressions) ? exercise.progressions : [];
      const progSelect = document.getElementById('editProgressions');
      if (progSelect) {
        Array.from(progSelect.options).forEach(opt => {
          opt.selected = progIds.includes(parseInt(opt.value));
        });
      }
      
      // Load formCues dynamic list
      const formCues = Array.isArray(exercise.formCues) ? exercise.formCues : [];
      loadDynamicList('formCuesContainer', formCueItems, formCues);
      
      // Load commonMistakes dynamic list
      const mistakes = Array.isArray(exercise.commonMistakes) ? exercise.commonMistakes : [];
      loadDynamicList('commonMistakesContainer', mistakeItems, mistakes);
      
      // Show edit container and hide loading/search
      const loadingExercise = document.getElementById('loadingExercise');
      const editContainer = document.getElementById('editContainer');
      const exerciseList = document.getElementById('exerciseList');
      
      if (loadingExercise) loadingExercise.style.display = 'none';
      if (editContainer) editContainer.style.display = 'block';
      if (exerciseList) exerciseList.classList.remove('active');
    } catch (error) {
      showMessage('Error loading exercise: ' + error.message, 'error');
    }
  }

  function checkCheckboxes(name, values) {
    const containerName = name.replace('_', '-');
    const checkboxes = document.querySelectorAll(`#edit-${containerName}-container input`);
    checkboxes.forEach(cb => {
      cb.checked = values.includes(parseInt(cb.value));
    });
  }

  // Load values into dynamic list containers
  function loadDynamicList(containerId, itemCounter, values) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (values && values.length > 0) {
      values.forEach(value => {
        addItemToContainer(container, itemCounter, value);
      });
    } else {
      // Always show at least one empty field
      addItemToContainer(container, itemCounter, '');
    }
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
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function setupDynamicListEvents() {
    // Event delegation for dynamic list items
    const formCuesContainer = document.getElementById('formCuesContainer');
    const mistakesContainer = document.getElementById('commonMistakesContainer');
    
    [formCuesContainer, mistakesContainer].forEach(container => {
      if (!container) return;
      
      // Add item button handler
      const addButtonId = container.id === 'formCuesContainer' ? 'addFormCueBtn' : 'addMistakeBtn';
      const addBtn = document.getElementById(addButtonId);
      
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const counter = container.id === 'formCuesContainer' ? formCueItems : mistakeItems;
          addItemToContainer(container, counter, '');
        });
      }
      
      // Remove item handler (delegated)
      container.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
          const item = e.target.closest('.dynamic-list-item');
          if (item) {
            const items = container.querySelectorAll('.dynamic-list-item');
            if (items.length > 1) {
              item.remove();
            } else {
              // Clear the last item instead of removing
              const input = item.querySelector('input');
              if (input) input.value = '';
            }
          }
        }
      });
    });
  }

  function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  // Get values from multi-select dropdown
  function getMultiSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
  }

  // Get values from dynamic list
  function getDynamicListValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const inputs = container.querySelectorAll('.dynamic-list-input');
    return Array.from(inputs)
      .map(input => input.value.trim())
      .filter(value => value.length > 0); // Filter out empty strings
  }

   // Helper to normalize values to arrays - handles null, undefined, empty strings, and single values
  const normalizeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === '') return [];
    return [value];
  };

  async function handleAddExercise(setStateFn, e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Validate form data before processing
    try {
      const validationService = await import('./services/validation.js');
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
    
    const data = Object.fromEntries(formData.entries());
    
    data.categories = getCheckedValues('categories');
    data.muscles = getCheckedValues('muscles');
    data.muscles_secondary = getCheckedValues('muscles_secondary');
    
    const equipmentIds = getCheckedValues('equipment');
    data.equipment = Array.isArray(equipmentIds) ? equipmentIds : (equipmentIds ? [equipmentIds] : []);
    
    // Normalize prerequisites and progressions to arrays
    data.prerequisites = normalizeArray(data.prerequisites);
    data.progressions = normalizeArray(data.progressions);
    
    const difficultyValue = formData.get('difficulty');
    data.difficulty = difficultyValue ? [parseInt(difficultyValue)] : [];
    
    try {
      const maxId = Math.max(...references.exercises.map(ex => ex.id), 0);
      data.id = maxId + 1;
      
      references.exercises.push(data);
      
      await saveAllExercises(references.exercises);
      
      setStateFn({ exercises: references.exercises });
      
      showMessage(`Exercise added successfully! (ID: ${data.id})`, 'success');
      e.target.reset();
    } catch (error) {
      showMessage('Error adding exercise: ' + error.message, 'error');
    }
  }

   async function handleEditExercise(setStateFn, e) {
    console.log('handleEditExercise called with editingExerciseId:', editingExerciseId);
    e.preventDefault();
    e.stopPropagation();
    
    if (!editingExerciseId) {
      console.error('No exercise ID to edit');
      return;
    }
    
    const formData = new FormData(e.target);
    
    let validationPassed = true;
    try {
      const validationService = await import('./services/validation.js');
      
      if (validationService.ValidationService && typeof validationService.ValidationService.validateExerciseForm === 'function') {
        const validationResult = validationService.ValidationService.validateExerciseForm(formData);
        
        if (!validationResult.valid) {
          console.error('Validation failed:', validationResult.errors);
          validationService.ValidationService.clearAllErrors();
          Object.keys(validationResult.errors).forEach(fieldName => {
            validationService.ValidationService.showError(fieldName, validationResult.errors[fieldName]);
          });
          validationPassed = false;
        }
      }
    } catch (err) {
      console.log('Validation service not available, skipping validation:', err.message);
    }
    
    if (!validationPassed) {
      console.log('Validation failed, aborting update');
      return;
    }
    
    const data = Object.fromEntries(formData.entries());
    data.id = editingExerciseId;
    
    data.categories = getCheckedValues('categories');
    data.muscles = getCheckedValues('muscles');
    data.muscles_secondary = getCheckedValues('muscles_secondary');
    
    const equipmentIds = getCheckedValues('equipment');
    data.equipment = Array.isArray(equipmentIds) ? equipmentIds : (equipmentIds ? [equipmentIds] : []);
    
    // NEW: Get prerequisites and progressions from multi-select
    data.prerequisites = getMultiSelectValues('editPrerequisites');
    data.progressions = getMultiSelectValues('editProgressions');
    
    // NEW: Get formCues and commonMistakes from dynamic lists
    data.formCues = getDynamicListValues('formCuesContainer');
    data.commonMistakes = getDynamicListValues('commonMistakesContainer');
    
    const difficultyValue = formData.get('difficulty');
    data.difficulty = difficultyValue ? [parseInt(difficultyValue)] : [];
    
    console.log('Preparing to save exercise:', data);
    
    try {
      const index = references.exercises.findIndex(ex => ex.id === editingExerciseId);
      if (index === -1) {
        throw new Error('Exercise not found with ID: ' + editingExerciseId);
      }
      
      console.log('Found exercise at index:', index, 'Updating...');
      references.exercises[index] = data;
      
      console.log('Saving exercises...');
      await saveAllExercises(references.exercises);
      console.log('Exercises saved successfully');
      
      setStateFn({ exercises: references.exercises });
      
      showMessage(`Exercise updated successfully!`, 'success');
      
      // Reset form and return to list view
      editingExerciseId = null;
      document.getElementById('editForm').reset();
      document.getElementById('loadingExercise').style.display = 'block';
      document.getElementById('editContainer').style.display = 'none';
      document.getElementById('exerciseList').classList.add('active');
      
    } catch (error) {
      showMessage('Error updating exercise: ' + error.message, 'error');
    }
  }

  async function handleDeleteExercise(setStateFn, e) {
    if (!editingExerciseId) {
      showMessage('No exercise selected for deletion', 'error');
      return;
    }
    
    const exercise = references.exercises.find(ex => ex.id === editingExerciseId);
    const confirmed = confirm(`Are you sure you want to delete "${exercise?.name}"? This cannot be undone.`);
    
    if (!confirmed) return;
    
    try {
      references.exercises = references.exercises.filter(ex => ex.id !== editingExerciseId);
      
      await saveAllExercises(references.exercises);
      
      setStateFn({ exercises: references.exercises });
      
      showMessage(`Exercise deleted successfully!`, 'success');
      
      cancelEdit();
    } catch (error) {
      showMessage('Error deleting exercise: ' + error.message, 'error');
    }
  }

  function cancelEdit() {
    editingExerciseId = null;
    document.getElementById('editForm').reset();
    document.getElementById('loadingExercise').style.display = 'none';
    document.getElementById('editContainer').style.display = 'none';
    document.getElementById('exerciseList').classList.add('active');
  }

  function searchExercises() {
    const searchTerm = document.getElementById('searchExercise').value.toLowerCase();
    const listContainer = document.getElementById('exerciseList');
    
    if (!searchTerm) {
      listContainer.classList.remove('active');
      return;
    }
    
    const filtered = references.exercises.filter(ex => 
      ex.name.toLowerCase().includes(searchTerm) ||
      ex.description.toLowerCase().includes(searchTerm)
    );
    
    displayExerciseList(filtered);
  }

  function displayExerciseList(items) {
    const listContainer = document.getElementById('exerciseList');
    
    if (items.length === 0) {
      listContainer.innerHTML = '<p>No exercises found.</p>';
    } else {
      listContainer.innerHTML = `
        <h2>Found ${items.length} exercises</h2>
        ${items.map(ex => `
          <div class="exercise-item">
            <div>
              <strong>${ex.name}</strong>
              <small>${ex.description.substring(0, 60)}...</small>
            </div>
            <div class="exercise-item-actions">
              <button type="button" class="btn btn-secondary" onclick='loadExerciseForEdit(${ex.id})'>Edit</button>
            </div>
          </div>
        `).join('')}
      `;
    }
    
    listContainer.classList.add('active');
  }

  async function loadAllExercises() {
    const storage = await import('./storage.js');
    return storage.loadExercises();
  }

  async function saveAllExercises(exercises) {
    const storage = await import('./storage.js');
    return storage.saveExercises(exercises);
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Expose loadExerciseForEdit for inline button handlers
  window.loadExerciseForEdit = loadExerciseForEditById;
}
