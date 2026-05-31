import { initializeState, setState, getState, updateState } from './services/state.js';
import { ErrorBoundaryService } from './services/error-boundary-service.js';
import { renderHomeView } from './views/home-view.js';
import { renderExerciseDetailsView } from './views/exercise-details-view.js';
import { renderProgramsView } from './views/programs-view.js';
import { renderActiveWorkoutView } from './views/active-workout-view.js';
import { renderWorkoutSummaryView } from './views/workout-summary-view.js';
import { renderWorkoutCompletionView } from './views/workout-completion-view.js';
import { renderOnboardingView } from './views/onboarding-view.js';
import { renderProfileView } from './views/profile-view.js';
import { renderBuilderView } from './views/builder-view.js';
import { renderExercisesView } from './views/exercises-view.js';
import { renderProgramDetailsView } from './views/program-details-view.js';
import { fetchExercises, fetchPrograms, fetchCategories, fetchEquipment, fetchMuscles, fetchDifficulties, fetchSkillModules } from './services/api.js';
import { getExerciseProgressData } from './utils/chart-helpers.js';
import { renderSkillModulesView } from './views/skill-modules-view.js';
import { renderSkillModuleDetailView } from './views/skill-module-detail-view.js';
import { renderSharedWorkoutView } from './views/shared-workout-view.js';
import { renderErrorView } from './views/error-view.js';
import { renderSpinner, hideSpinner } from './components/spinner.js';
import { renderSkillsTreeView } from './views/skills-tree-view.js';
import { renderHeader } from './components/header.js';
import { initializeDataCache, isCacheStale, syncDataCache } from './services/data-cache.js';
import { renderExportImportView } from './views/export-import-view.js';
import { initUndoService, dismissAllUndoToasts } from './services/undo-service.js';
import { initExerciseForm } from './services/exercise-form-service.js';
import { renderWorkoutDetailView } from './views/workout-detail-view.js';

initializeState();

// Initialize data cache from IndexedDB on first load
const dataCacheInitialized = initializeDataCache().then(async () => {
  console.log('✅ Data cache ready');
  
  // Check if server data has changed since last sync
  try {
    if (await isCacheStale()) {
      console.log('🔄 Server data changed — syncing cache...');
      await syncDataCache();
      console.log('✅ Cache synced — re-rendering with fresh data');
    }
  } catch (err) {
    console.warn('⚠️ Cache sync check failed:', err);
  }
}).catch(err => {
  console.warn('⚠️ Failed to initialize data cache:', err);
});

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
    } else if (hash === '#export-import') {
      const exportImportView = ErrorBoundaryService.wrapView(
        await import('./views/export-import-view.js'), 
        'Export/Import'
      );
      await exportImportView.render();
    } else if (hash === '#builder') {
      // Ensure all data is loaded before rendering builder
      await Promise.all([
        ensureExercisesLoaded(),
        ensureModulesLoaded(),
        ensureCategoriesLoaded(),
        ensureEquipmentLoaded(),
        ensureMusclesLoaded(),
        ensureDifficultiesLoaded()
      ]);
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
    } else if (hash.startsWith('#workout-detail/')) {
      // Parse workout index from hash: #workout-detail/0, #workout-detail/1, etc.
      const workoutIndex = parseInt(hash.split('/')[1]);
      renderWorkoutDetailView(workoutIndex);
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

// Re-export exercise form service for backward compatibility
window.initExerciseFormService = initExerciseForm;

async function loadExerciseForm() {
  const app = document.getElementById('app');
  
  // Check sessionStorage for edit ID first (from click handler), then URL params or hash
  const editIdFromSession = sessionStorage.getItem('editingExerciseId');
  const urlParams = new URLSearchParams(window.location.search);
  const editIdParam = urlParams.get('edit');
  
  // Also check if hash contains edit parameter like #exercise-form?edit=5
  let editId;
  if (editIdFromSession) {
    editId = editIdFromSession;
  } else if (editIdParam) {
    editId = editIdParam;
  } else {
    // Check hash for ?edit= parameter
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const searchParams = new URLSearchParams(hashParts[1]);
      editId = searchParams.get('edit');
    }
  }
  
  console.log('[loadExerciseForm] Edit ID:', editId, 'Session:', editIdFromSession, 'Param:', editIdParam);
  
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
      
      // Manually trigger initialization since DOMContentLoaded won't fire again
      setTimeout(() => {
        const formDiv = document.querySelector('.exercise-form-container');
        if (formDiv && initExerciseFormService) {
          initExerciseFormService(editId, setState);
        }
      }, 50);
    })
    .catch(error => {
      console.error('Failed to load exercise form:', error);
      renderErrorView('Failed to load the Exercise Manager page.');
    });
}

window.addEventListener('hashchange', router);
router();

// Initialize undo service after main app is ready
initUndoService();

// Expose updateState globally for inline onclick handlers
window.updateState = updateState;

// Clean up undo toasts on page unload
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
