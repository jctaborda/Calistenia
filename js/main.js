import { initializeState, setState, getState, updateState } from './services/state.js';
import { ErrorBoundaryService } from './services/error-boundary-service.js';
import { renderHomeView } from './views/home-view.js';
import { renderExerciseView } from './views/exercise-details-view.js';
import { renderProgramsView } from './views/programs-view.js';
import { renderActiveWorkoutView } from './views/active-workout-view.js';
import { renderWorkoutSummaryView } from './views/workout-summary-view.js';
import { renderWorkoutCompletionView } from './views/workout-completion-view.js';
import { renderOnboardingView } from './views/onboarding-view.js';
import { renderProfileView } from './views/profile-view.js';
import { renderBuilderView } from './views/builder-view.js';
import { renderExercisesView } from './views/exercises-view.js';
import { renderProgramDetailsView } from './views/program-details-view.js';
import { fetchExercises, fetchPrograms, fetchCategories, fetchEquipment, fetchMuscles, fetchDifficulties } from './services/api.js';
import { getExerciseProgressData } from './utils/chart-helpers.js';
import { renderSkillModulesView } from './views/skill-modules-view.js';
import { renderSkillModuleDetailView } from './views/skill-module-detail-view.js';
import { renderSharedWorkoutView } from './views/shared-workout-view.js';
import { renderErrorView } from './views/error-view.js';
import { renderSpinner, hideSpinner } from './components/spinner.js';
import { renderSkillsTreeView } from './views/skills-tree-view.js';
import { renderHeader } from './components/header.js';

initializeState();

async function ensureExercisesLoaded() {
  if (!getState().exercises) {
    try {
      const exercises = await fetchExercises();
      updateState({ exercises });
    } catch (error) {
      console.error('Failed to load exercises:', error);
      renderErrorView('Failed to load exercises. Please check your connection.');
    }
  }
}

async function ensureProgramsLoaded(){
  if (!getState().programs){
    try {
      const programs = await fetchPrograms();
      updateState({ programs });
    } catch (error) {
      console.error('Failed to load programs:', error);
      renderErrorView('Failed to load programs. Please check your connection.');
    }
  }
}

async function ensureModulesLoaded(){
  if (!getState().modules){
    try {
      const modules = await fetchSkillModules();
      updateState({ modules });
    } catch (error) {
      console.error('Failed to load skill modules:', error);
      // Don't render error view, just log - modules are less critical than programs
      console.warn('Skill modules will be loaded on demand');
    }
  }
}

async function ensureCategoriesLoaded(){
  if (!getState().categories){
    try {
      const categories = await fetchCategories();
      updateState({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }
}

async function ensureEquipmentLoaded(){
  if (!getState().equipment){
    try {
      const equipment = await fetchEquipment();
      updateState({ equipment });
    } catch (error) {
      console.error('Failed to load equipment:', error);
    }
  }
}

async function ensureMusclesLoaded(){
  if (!getState().muscles){
    try {
      const muscles = await fetchMuscles();
      updateState({ muscles });
    } catch (error) {
      console.error('Failed to load muscles:', error);
    }
  }
}

async function ensureDifficultiesLoaded(){
  if (!getState().difficulties){
    try {
      const difficulties = await fetchDifficulties();
      updateState({ difficulties });
    } catch (error) {
      console.error('Failed to load difficulties:', error);
    }
  }
}

async function router() {
  // Show loading spinner for initial data loads
  if (!getState().exercises || !getState().programs) {
    document.getElementById('app').innerHTML = renderSpinner();
    await Promise.all([
      ensureExercisesLoaded(),
      ensureProgramsLoaded(),
      ensureModulesLoaded(), // Add modules loading
      ensureCategoriesLoaded(),
      ensureEquipmentLoaded(),
      ensureMusclesLoaded(),
      ensureDifficultiesLoaded()
    ]);
    hideSpinner();
  }

  const state = getState();
  const hash = window.location.hash;

  // Handle unauthenticated users
  if (!state.user && hash !== '#onboarding' && !hash.startsWith('#shared-workout/')) {
    window.location.hash = '#onboarding';
    return;
  }

  try {
    // Wrap all view rendering with error boundaries for graceful recovery
    if (hash === '#onboarding') {
      const onboardingView = ErrorBoundaryService.wrapView(
        await import('./views/onboarding-view.js'), 
        'Onboarding'
      );
      await onboardingView.render();
    } else if (hash === '' || hash === '#home') {
      const homeView = ErrorBoundaryService.wrapView(
        await import('./views/home-view.js'), 
        'Home'
      );
      await homeView.render();
    } else if (hash.startsWith('#exercise/')) {
      const id = hash.split('/')[1];
      const exerciseView = ErrorBoundaryService.wrapView(
        await import('./views/exercise-details-view.js'), 
        'Exercise Details'
      );
      exerciseView.render(id);
    } else if (hash === '#programs') {
      const programsView = ErrorBoundaryService.wrapView(
        await import('./views/programs-view.js'), 
        'Programs'
      );
      await programsView.render();
    } else if (hash.startsWith('#program-details/')) {
      // Fix: Parse hash correctly - can be #program-details/type/id or #program-details/id
      const cleanHash = hash.replace('#', '');  // "program-details/program/1" or "program-details/1"
      const parts = cleanHash.split('/');       // ["program-details", "program", "1"] or ["program-details", "1"]
      
      let type, id;
      if (parts.length === 3) {
        // Format: #program-details/type/id
        type = parts[1];           // 'program' or 'custom'
        id = parts[2];             // ID
      } else {
        // Format: #program-details/id (backward compatibility)
        type = 'program';          // Default to program if not specified
        id = parts[1];             // ID
      }
      
      const programDetailsView = ErrorBoundaryService.wrapView(
        await import('./views/program-details-view.js'), 
        'Program Details'
      );
      programDetailsView.render(type, id);
    } else if (hash === '#active-workout') {
      const activeWorkoutView = ErrorBoundaryService.wrapView(
        await import('./views/active-workout-view.js'), 
        'Active Workout'
      );
      await activeWorkoutView.render();
    } else if (hash === '#workout-completion') {
      const workoutCompletionView = ErrorBoundaryService.wrapView(
        await import('./views/workout-completion-view.js'), 
        'Workout Completion'
      );
      await workoutCompletionView.render();
    } else if (hash === '#summary') {
      const summaryView = ErrorBoundaryService.wrapView(
        await import('./views/workout-summary-view.js'), 
        'Workout Summary'
      );
      await summaryView.render();
    } else if (hash === '#exercises') {
      const exercisesView = ErrorBoundaryService.wrapView(
        await import('./views/exercises-view.js'), 
        'Exercises'
      );
      await exercisesView.render();
    } else if (hash === '#profile') {
      const profileView = ErrorBoundaryService.wrapView(
        await import('./views/profile-view.js'), 
        'Profile'
      );
      await profileView.render();
    } else if (hash === '#builder') {
      const builderView = ErrorBoundaryService.wrapView(
        await import('./views/builder-view.js'), 
        'Builder'
      );
      await builderView.render();
    } else if (hash === '#skill-modules') {
      const skillModulesView = ErrorBoundaryService.wrapView(
        await import('./views/skill-modules-view.js'), 
        'Skill Modules'
      );
      await skillModulesView.render();
    } else if (hash.startsWith('#skill-module/')) {
      const moduleId = hash.split('/')[1];
      console.log('Router: Navigating to skill module detail, moduleId:', moduleId);
      const skillModuleView = ErrorBoundaryService.wrapView(
        await import('./views/skill-module-detail-view.js'), 
        'Skill Module Detail'
      );
      console.log('Router: About to call render for skill module detail');
      await skillModuleView.render(moduleId);
      console.log('Router: Skill module detail render completed');
    } else if (hash === '#skills-tree') {
      const skillsTreeView = ErrorBoundaryService.wrapView(
        await import('./views/skills-tree-view.js'), 
        'Skills Tree'
      );
      await skillsTreeView.render();
    } else if (hash.startsWith('#shared-workout/')) {
      // Fix: Split hash correctly - parts[1] contains the workoutId
      const workoutId = hash.split('/')[1];
      const sharedWorkoutView = ErrorBoundaryService.wrapView(
        await import('./views/shared-workout-view.js'), 
        'Shared Workout'
      );
      await sharedWorkoutView.render(workoutId);
    } else if (hash === '#exercise-form') {
      loadExerciseForm();
    }
    // else: do nothing for now
  } catch (error) {
    console.error('Router error:', error);
    renderErrorView('An error occurred while loading this page.');
  }
}

// Exercise CRUD helpers for offline PWA - uses IndexedDB instead of localStorage
async function loadAllExercises() {
  // Use storage.js which now loads from IndexedDB or data.json
  const storage = await import('./services/storage.js');
  return storage.loadExercises();
}

async function saveAllExercises(exercises) {
  // Use storage.js which now saves to IndexedDB
  const storage = await import('./services/storage.js');
  return storage.saveExercises(exercises);
}

async function loadExerciseForm() {
  const app = document.getElementById('app');
  
  // Check sessionStorage for edit ID first (from click handler), then URL params
  const editIdFromSession = sessionStorage.getItem('editingExerciseId');
  const urlParams = new URLSearchParams(window.location.search);
  const editId = editIdFromSession || urlParams.get('edit');
  
  // Load the exercise form HTML
  fetch('./exercise-form.html')
    .then(response => response.text())
    .then(html => {
      // Extract just the body content (remove DOCTYPE, html, head, and body tags)
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const bodyContent = doc.body.innerHTML;
      
      // Wrap with header and card structure
      app.innerHTML = renderHeader() + `
        <link href="./css/style.css" rel="stylesheet">
        <div class="card">
          ${bodyContent}
        </div>`;
      
      // If editing, pass the ID to the form script
      if (editId) {
        window.exerciseFormEditId = editId;
      }
      
      // Manually execute scripts and trigger initialization
      setTimeout(() => {
        const scriptElements = document.querySelectorAll('#app script');
        scriptElements.forEach(script => {
          const newScript = document.createElement('script');
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.textContent = script.textContent;
          }
          script.parentNode.replaceChild(newScript, script);
        });
        
        // Manually trigger initialization since DOMContentLoaded won't fire again
        setTimeout(() => {
          const formDiv = document.querySelector('.exercise-form-container');
          if (formDiv) {
            initExerciseForm(editId, setState);
          }
        }, 50);
      }, 10);
    })
    .catch(error => {
      console.error('Failed to load exercise form:', error);
      renderErrorView('Failed to load the Exercise Manager page.');
    });
}

async function initExerciseForm(editId, setStateFn) {
  const references = { categories: [], muscles: [], equipment: [], difficulties: [] };
  let exercises = [];
  let editingExerciseId = null;
  
  // Setup event listeners
  setupTabs();
  setupFormListeners(setStateFn);
  
  // Load all data first
  await loadReferences();
  
  // If editing, load the exercise
  if (editId) {
    sessionStorage.removeItem('editingExerciseId');
    document.querySelector('[data-tab="edit"]').click();
    await loadExerciseForEditById(editId);
  }

  // Helper functions for form initialization
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
  
  function populateEquipmentSelects() {
    const selectOptions = references.equipment.map(eq => 
      `<option value="${eq.id}">${eq.name}</option>`
    ).join('');
    
    document.getElementById('equipment').innerHTML = '<option value="">Select Equipment...</option>' + selectOptions;
    document.getElementById('editEquipment').innerHTML = '<option value="">Select Equipment...</option>' + selectOptions;
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
          ${mus.name_en}
        </label>`
      ).join('');
    }

    // Add form secondary muscles container
    const secondaryContainer = document.getElementById('muscles-secondary-container');
    if (secondaryContainer) {
      secondaryContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles_secondary" value="${mus.id}">
          ${mus.name_en}
        </label>`
      ).join('');
    }

    // Edit form primary muscles container
    const editMusclesContainer = document.getElementById('edit-muscles-container');
    if (editMusclesContainer) {
      editMusclesContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles" value="${mus.id}">
          ${mus.name_en}
        </label>`
      ).join('');
    }

    // Edit form secondary muscles container
    const editSecondaryContainer = document.getElementById('edit-muscles-secondary-container');
    if (editSecondaryContainer) {
      editSecondaryContainer.innerHTML = references.muscles.map(mus => 
        `<label class="checkbox-item">
          <input type="checkbox" name="muscles_secondary" value="${mus.id}">
          ${mus.name_en}
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
    document.getElementById('exerciseForm').addEventListener('submit', handleAddExercise.bind(null, setStateFn));
    
    // Edit exercise form
    document.getElementById('editForm').addEventListener('submit', handleEditExercise.bind(null, setStateFn));
    document.getElementById('deleteBtn').addEventListener('click', handleDeleteExercise.bind(null, setStateFn));
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    
    // Search for exercises
    const searchInput = document.getElementById('searchExercise');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(searchExercises, 300));
    }
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
      
      // Load exercises (for CRUD operations)
      exercises = await loadAllExercises();
      
      populateEquipmentCheckboxes();
      populateCategoryCheckboxes();
      populateMuscleCheckboxes();
      populateDifficultySelects(references.difficulties);
    } catch (error) {
      showMessage('Error loading reference data: ' + error.message, 'error');
    }
  }
  
  async function loadExerciseForEditById(exerciseId) {
    try {
      const exercise = exercises.find(ex => ex.id === parseInt(exerciseId));
      if (!exercise) throw new Error('Exercise not found');
      
      editingExerciseId = exercise.id;
      
      // Fill form fields and populate selected values
      
      // Text fields
      document.getElementById('editName').value = exercise.name || '';
      document.getElementById('editDescription').value = exercise.description || '';
      document.getElementById('editSkill').value = exercise.skill || '';
      document.getElementById('editImage_url').value = exercise.image_url || '';
      document.getElementById('editVideo_url').value = exercise.video_url || '';
      
      // Set difficulty select to the first difficulty value (or default)
      const firstDifficulty = (exercise.difficulty && exercise.difficulty[0]) ? exercise.difficulty[0] : '';
      document.getElementById('editDifficulty').value = firstDifficulty;
      
      // Check checkboxes for equipment (array format)
      const equipmentIds = Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment];
      checkCheckboxes('equipment', equipmentIds);
      
      checkCheckboxes('categories', exercise.categories || []);
      checkCheckboxes('muscles', exercise.muscles || []);
      checkCheckboxes('muscles_secondary', exercise.muscles_secondary || []);
      
      document.getElementById('loadingExercise').style.display = 'none';
      document.getElementById('editContainer').style.display = 'block';
      document.getElementById('exerciseList').classList.remove('active');
    } catch (error) {
      showMessage('Error loading exercise: ' + error.message, 'error');
    }
  }
  
  function checkCheckboxes(name, values) {
    // Convert 'muscles_secondary' to 'muscles-secondary' for matching HTML IDs
    const containerName = name.replace('_', '-');
    const checkboxes = document.querySelectorAll(`#edit-${containerName}-container input`);
    checkboxes.forEach(cb => {
      cb.checked = values.includes(parseInt(cb.value));
    });
  }
  
  function searchExercises() {
    const searchTerm = document.getElementById('searchExercise').value.toLowerCase();
    const listContainer = document.getElementById('exerciseList');
    
    if (!searchTerm) {
      listContainer.classList.remove('active');
      return;
    }
    
    const filtered = exercises.filter(ex => 
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
              <strong>${ex.name}</strong> - ${ex.difficulty}
              <small>${ex.description.substring(0, 60)}...</small>
            </div>
            <div class="exercise-item-actions">
              <button class="btn btn-secondary" onclick='loadExerciseForEdit(${JSON.stringify(ex)})'>Edit</button>
            </div>
          </div>
        `).join('')}
      `;
    }
    
    listContainer.classList.add('active');
  }
  
  function getCheckedValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
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
        // Clear previous errors
        validationService.ValidationService.clearAllErrors();
        
        // Show errors for each field
        Object.keys(validationResult.errors).forEach(fieldName => {
          validationService.ValidationService.showError(fieldName, validationResult.errors[fieldName]);
        });
        
        return; // Stop here if validation fails
      }
    } catch (err) {
      console.error('Validation service not available:', err);
    }
    
    const data = Object.fromEntries(formData.entries());
    
    data.categories = getCheckedValues('categories');
    data.muscles = getCheckedValues('muscles');
    data.muscles_secondary = getCheckedValues('muscles_secondary');
    // Handle equipment - always save as array, even if empty
    const equipmentIds = getCheckedValues('equipment');
    data.equipment = Array.isArray(equipmentIds) ? equipmentIds : (equipmentIds ? [equipmentIds] : []);
    // Normalize prerequisites and progressions to arrays
    data.prerequisites = normalizeArray(data.prerequisites);
    data.progressions = normalizeArray(data.progressions);
    // Normalize difficulty to array (it comes from select, so ensure it's an array)
    const difficultyValue = formData.get('difficulty');
    data.difficulty = difficultyValue ? [parseInt(difficultyValue)] : [];
    
    try {
      // Generate new ID
      const maxId = Math.max(...exercises.map(ex => ex.id), 0);
      data.id = maxId + 1;
      
      // Add exercise
      exercises.push(data);
      
      // Save to localStorage
      await saveAllExercises(exercises);
      
      // Refresh the global state so views show updated data
      setStateFn({ exercises: exercises });
      
      showMessage(`Exercise added successfully! (ID: ${data.id})`, 'success');
      e.target.reset();
    } catch (error) {
      showMessage('Error adding exercise: ' + error.message, 'error');
    }
  }
  
  async function handleEditExercise(setStateFn, e) {
    e.preventDefault();
    
    if (!editingExerciseId) return;
    
    const formData = new FormData(e.target);
    
    // Validate form data before processing
    try {
      const validationService = await import('./services/validation.js');
      const validationResult = validationService.ValidationService.validateExerciseForm(formData);
      
      if (!validationResult.valid) {
        // Clear previous errors
        validationService.ValidationService.clearAllErrors();
        
        // Show errors for each field
        Object.keys(validationResult.errors).forEach(fieldName => {
          validationService.ValidationService.showError(fieldName, validationResult.errors[fieldName]);
        });
        
        return; // Stop here if validation fails
      }
    } catch (err) {
      console.error('Validation service not available:', err);
    }
    
    const data = Object.fromEntries(formData.entries());
    data.id = editingExerciseId;
    
    data.categories = getCheckedValues('categories');
    data.muscles = getCheckedValues('muscles');
    data.muscles_secondary = getCheckedValues('muscles_secondary');
    // Handle equipment - always save as array, even if empty
    const equipmentIds = getCheckedValues('equipment');
    data.equipment = Array.isArray(equipmentIds) ? equipmentIds : (equipmentIds ? [equipmentIds] : []);
    // Normalize prerequisites and progressions to arrays
    data.prerequisites = normalizeArray(data.prerequisites);
    data.progressions = normalizeArray(data.progressions);
    // Normalize difficulty to array (it comes from select, so ensure it's an array)
    const difficultyValue = formData.get('difficulty');
    data.difficulty = difficultyValue ? [parseInt(difficultyValue)] : [];
    
    try {
      // Find and update exercise
      const index = exercises.findIndex(ex => ex.id === editingExerciseId);
      if (index === -1) throw new Error('Exercise not found');
      
      exercises[index] = data;
      
      // Save to localStorage
      await saveAllExercises(exercises);
      
      // Refresh the global state so views show updated data
      setStateFn({ exercises: exercises });
      
      showMessage(`Exercise updated successfully!`, 'success');
      cancelEdit();
    } catch (error) {
      showMessage('Error updating exercise: ' + error.message, 'error');
    }
  }
  
  async function handleDeleteExercise(setStateFn) {
    if (!editingExerciseId) return;
    
    if (!confirm(`Are you sure you want to delete this exercise?`)) return;
    
    try {
      // Filter out deleted exercise
      exercises = exercises.filter(ex => ex.id !== editingExerciseId);
      
      // Save to localStorage
      await saveAllExercises(exercises);
      
      // Refresh the global state so views show updated data
      setStateFn({ exercises: exercises });
      
      showMessage(`Exercise deleted successfully!`, 'success');
      cancelEdit();
    } catch (error) {
      showMessage('Error deleting exercise: ' + error.message, 'error');
    }
  }
  
  function cancelEdit() {
    editingExerciseId = null;
    document.getElementById('editForm').reset();
    document.getElementById('editContainer').style.display = 'none';
    document.getElementById('searchExercise').value = '';
    document.getElementById('exerciseList').classList.remove('active');
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
}

window.addEventListener('hashchange', router);
router();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      console.log("[Main] SW Registered");
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              if (confirm('A new version of the app is available. Would you like to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Handle service worker controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      
    }).catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
}
