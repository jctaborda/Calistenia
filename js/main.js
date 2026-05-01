import { initializeState, setState, getState } from './services/state.js';
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
import { fetchExercises, fetchPrograms, fetchCategories, fetchEquipment, fetchMuscles } from './services/api.js';
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
      setState({ exercises });
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
      setState({ programs });
    } catch (error) {
      console.error('Failed to load programs:', error);
      renderErrorView('Failed to load programs. Please check your connection.');
    }
  }
}

async function ensureCategoriesLoaded(){
  if (!getState().categories){
    try {
      const categories = await fetchCategories();
      setState({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }
}

async function ensureEquipmentLoaded(){
  if (!getState().equipment){
    try {
      const equipment = await fetchEquipment();
      setState({ equipment });
    } catch (error) {
      console.error('Failed to load equipment:', error);
    }
  }
}

async function ensureMusclesLoaded(){
  if (!getState().muscles){
    try {
      const muscles = await fetchMuscles();
      setState({ muscles });
    } catch (error) {
      console.error('Failed to load muscles:', error);
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
      ensureCategoriesLoaded(),
      ensureEquipmentLoaded(),
      ensureMusclesLoaded()
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
    if (hash === '#onboarding') {
      renderOnboardingView();
    } else if (hash === '' || hash === '#home') {
      renderHomeView();
    } else if (hash.startsWith('#exercise/')) {
      const id = hash.split('/')[1];
      renderExerciseView(id);
    } else if (hash === '#programs') {
      renderProgramsView();
    } else if (hash.startsWith('#program-details/')) {
      const parts = hash.split('/');
      const type = parts[1];
      const id = parts[2];
      renderProgramDetailsView(type, id);
    } else if (hash === '#active-workout') {
      renderActiveWorkoutView();
    } else if (hash === '#workout-completion') {
      renderWorkoutCompletionView();
    } else if (hash === '#summary') {
      renderWorkoutSummaryView();
    } else if (hash === '#exercises') {
      renderExercisesView();
    } else if (hash === '#profile') {
      renderProfileView();
    } else if (hash === '#builder') {
      renderBuilderView();
    } else if (hash === '#skill-modules') {
      await renderSkillModulesView();
    } else if (hash.startsWith('#skill-module/')) {
      const moduleId = hash.split('/')[1];
      renderSkillModuleDetailView(moduleId);
    } else if (hash === '#skills-tree') {
      renderSkillsTreeView();
    } else if (hash.startsWith('#shared-workout/')) {
      const workoutId = hash.split('/')[2];
      renderSharedWorkoutView(workoutId);
    } else if (hash === '#exercise-form') {
      loadExerciseForm();
    }
    // else: do nothing for now
  } catch (error) {
    console.error('Router error:', error);
    renderErrorView('An error occurred while loading this page.');
  }
}

function loadExerciseForm() {
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
            const API_BASE = '/api';
            let references = { categories: [], muscles: [], equipment: [] };
            let editingExerciseId = null;
            
            // Setup event listeners
            setupTabs();
            setupFormListeners();
            
            // Helper functions for form initialization
            function populateEquipmentSelects() {
              const selectOptions = references.equipment.map(eq => 
                `<option value="${eq.id}">${eq.name}</option>`
              ).join('');
              
              document.getElementById('equipment').innerHTML = '<option value="">Select Equipment...</option>' + selectOptions;
              document.getElementById('editEquipment').innerHTML = '<option value="">Select Equipment...</option>' + selectOptions;
            }
            
            function populateCategoryCheckboxes() {
              const container = document.getElementById('categories-container');
              container.innerHTML = references.categories.map(cat => 
                `<label class="checkbox-item">
                  <input type="checkbox" name="categories" value="${cat.id}">
                  ${cat.name}
                </label>`
              ).join('');
            }
            
            function populateMuscleCheckboxes() {
              const musclesContainer = document.getElementById('muscles-container');
              musclesContainer.innerHTML = references.muscles.map(mus => 
                `<label class="checkbox-item">
                  <input type="checkbox" name="muscles" value="${mus.id}">
                  ${mus.name_en}
                </label>`
              ).join('');

              const secondaryContainer = document.getElementById('muscles-secondary-container');
              secondaryContainer.innerHTML = references.muscles.map(mus => 
                `<label class="checkbox-item">
                  <input type="checkbox" name="muscles_secondary" value="${mus.id}">
                  ${mus.name_en}
                </label>`
              ).join('');
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
            
            function setupFormListeners() {
              // Add exercise form
              document.getElementById('exerciseForm').addEventListener('submit', handleAddExercise);
              
              // Edit exercise form
              document.getElementById('editForm').addEventListener('submit', handleEditExercise);
              document.getElementById('deleteBtn').addEventListener('click', handleDeleteExercise);
              document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
              
              // Search for exercises
              const searchInput = document.getElementById('searchExercise');
              if (searchInput) {
                searchInput.addEventListener('input', debounce(searchExercises, 300));
              }
            }
            
            async function loadReferences() {
              try {
                const response = await fetch(`${API_BASE}/references`);
                if (!response.ok) throw new Error('Failed to load references');
                
                references = await response.json();
                
                populateEquipmentSelects();
                populateCategoryCheckboxes();
                populateMuscleCheckboxes();
              } catch (error) {
                showMessage('Error loading reference data: ' + error.message, 'error');
              }
            }
            
            async function loadExerciseForEditById(exerciseId) {
              try {
                const response = await fetch(`${API_BASE}/exercises/${exerciseId}`);
                if (!response.ok) throw new Error('Failed to load exercise');
                
                const exercise = await response.json();
                editingExerciseId = exercise.id;
                
                document.getElementById('editName').value = exercise.name || '';
                document.getElementById('editDescription').value = exercise.description || '';
                document.getElementById('editSkill').value = exercise.skill || '';
                document.getElementById('editEquipment').value = exercise.equipment || '';
                document.getElementById('editDifficulty').value = exercise.difficulty || 'beginner';
                document.getElementById('editImage_url').value = exercise.image_url || '';
                document.getElementById('editVideo_url').value = exercise.video_url || '';
                
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
            
            async function searchExercises() {
              const searchTerm = document.getElementById('searchExercise').value.toLowerCase();
              const listContainer = document.getElementById('exerciseList');
              
              if (!searchTerm) {
                listContainer.classList.remove('active');
                return;
              }
              
              try {
                const response = await fetch(`${API_BASE}/exercises`);
                if (!response.ok) throw new Error('Failed to load exercises');
                
                const exercises = await response.json();
                const filtered = exercises.filter(ex => 
                  ex.name.toLowerCase().includes(searchTerm) ||
                  ex.description.toLowerCase().includes(searchTerm)
                );
                
                displayExerciseList(filtered);
              } catch (error) {
                showMessage('Error searching exercises: ' + error.message, 'error');
              }
            }
            
            function displayExerciseList(exercises) {
              const listContainer = document.getElementById('exerciseList');
              
              if (exercises.length === 0) {
                listContainer.innerHTML = '<p>No exercises found.</p>';
              } else {
                listContainer.innerHTML = `
                  <h2>Found ${exercises.length} exercises</h2>
                  ${exercises.map(ex => `
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
            
            async function handleAddExercise(e) {
              e.preventDefault();
              
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              
              data.categories = getCheckedValues('categories');
              data.muscles = getCheckedValues('muscles');
              data.muscles_secondary = getCheckedValues('muscles_secondary');
              
              try {
                const response = await fetch(`${API_BASE}/exercises`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Failed to add exercise');
                
                const result = await response.json();
                showMessage(`Exercise added successfully! (ID: ${result.exercise.id})`, 'success');
                e.target.reset();
              } catch (error) {
                showMessage('Error adding exercise: ' + error.message, 'error');
              }
            }
            
            async function handleEditExercise(e) {
              e.preventDefault();
              
              if (!editingExerciseId) return;
              
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              data.id = editingExerciseId;
              
              data.categories = getCheckedValues('categories');
              data.muscles = getCheckedValues('muscles');
              data.muscles_secondary = getCheckedValues('muscles_secondary');
              
              try {
                const response = await fetch(`${API_BASE}/exercises`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Failed to update exercise');
                
                showMessage(`Exercise updated successfully!`, 'success');
                cancelEdit();
              } catch (error) {
                showMessage('Error updating exercise: ' + error.message, 'error');
              }
            }
            
            async function handleDeleteExercise() {
              if (!editingExerciseId) return;
              
              if (!confirm(`Are you sure you want to delete this exercise?`)) return;
              
              try {
                const response = await fetch(`${API_BASE}/exercises/${editingExerciseId}`, {
                  method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Failed to delete exercise');
                
                showMessage(`Exercise deleted successfully!`, 'success');
                cancelEdit();
              } catch (error) {
                showMessage('Error deleting exercise: ' + error.message, 'error');
              }
            }
            
            function getCheckedValues(name) {
              const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
              return Array.from(checkboxes).map(cb => parseInt(cb.value));
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
            
            // Initialize the form
            loadReferences().then(() => {
              const editIdFromSession = sessionStorage.getItem('editingExerciseId');
              const editId = editIdFromSession || window.exerciseFormEditId;
              
              if (editId) {
                sessionStorage.removeItem('editingExerciseId');
                document.querySelector('[data-tab="edit"]').click();
                loadExerciseForEditById(editId);
              }
            });
          }
        }, 50);
      }, 10);
    })
    .catch(error => {
      console.error('Failed to load exercise form:', error);
      renderErrorView('Failed to load the Exercise Manager page.');
    });
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
