import { initializeState, getState, updateState } from './services/state.js';
import { ErrorBoundaryService } from './services/error-boundary-service.js';
import { renderHomeView } from './views/home-view.js';
import { renderExerciseDetailsView } from './views/exercise-details-view.js';
import { renderRoutinesView } from './views/routines-view.js';
import { renderActiveWorkoutView } from './views/active-workout-view.js';
import { renderWorkoutSummaryView } from './views/workout-summary-view.js';
import { renderWorkoutCompletionView } from './views/workout-completion-view.js';
import { renderOnboardingView } from './views/onboarding-view.js';
import { renderProfileView } from './views/profile-view.js';
import { renderBuilderView } from './views/builder-view.js';
import { renderExercisesView } from './views/exercises-view.js';
import { renderRoutineDetailsView } from './views/routine-details-view.js';
import { fetchExercises, fetchRoutines, fetchCategories, fetchEquipment, fetchMuscles, fetchDifficulties, fetchSkillModules } from './services/api.js';
import { getExerciseProgressData } from './utils/workout-summary.js';
import { renderSkillModulesView } from './views/skill-modules-view.js';
import { renderSkillModuleDetailView } from './views/skill-module-detail-view.js';
import { renderSharedWorkoutView } from './views/shared-workout-view.js';
import { renderErrorView as renderErrorViewModule } from './views/error-view.js';
import { showConfirmation } from './services/confirmation-modal.js';
import { renderSpinner, hideSpinner } from './components/spinner.js';
import { renderSkillsTreeView } from './views/skills-tree-view.js';
import { renderHeader } from './components/header.js';
import { initializeDataCache, isCacheStale, syncDataCache } from './services/data-cache.js';
import { renderExportImportView } from './views/export-import-view.js';
import { initUndoService, dismissAllUndoToasts } from './services/undo-service.js';
import { renderExerciseForm } from './views/exercise-form-view.js';
import { initExerciseForm } from './services/exercise-form-service.js';
import { renderModuleAdminView } from './views/module-admin-view.js';
import { initializeEventDelegation, exposeToggleFavorite } from './services/event-delegation.js';
import { setLogLevel } from './services/logger.js';
import { ValidationService } from './services/validation.js';
import { VIEW_INIT_DELAY_MS, ERROR_BOUNDARY_MAX_RETRIES } from './constants.js';

console.log('[main.js] Module loaded');

// Configure production logging
setLogLevel('DEBUG');

initializeState();
console.log('[main.js] State initialized');

// ==================== Root-Level Error Boundary ====================
// Top-level catch-all for any unhandled errors before/during routing
function installRootErrorHandler() {
  function showRootError(message) {
    const main = document.getElementById('app');
    if (main) {
      main.innerHTML = renderErrorViewModule(message);
    } else {
      // DOM not ready yet — wait for it
      document.addEventListener('DOMContentLoaded', () => {
        const m = document.getElementById('app');
        if (m) m.innerHTML = renderErrorViewModule(message);
      }, { once: true });
    }
  }

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    showRootError('An unexpected error occurred. Please refresh the page.');
  });

  // Catch uncaught synchronous errors
  window.addEventListener('error', (event) => {
    event.preventDefault();
    showRootError('An unexpected error occurred. Please refresh the page.');
  });
}

installRootErrorHandler();

// Wait for complete cache initialization AND sync before starting router
async function initializeApp() {
  console.log('[main.js] initializeApp started');
  try {
    await initializeDataCache();
    console.log('[main.js] Data cache initialized');

    // Check if server data has changed since last sync
    try {
      if (await isCacheStale()) {
        console.log('[main.js] Cache stale, syncing...');
        await syncDataCache();
        console.log('[main.js] Cache synced');
      }
    } catch (err) {
      console.warn('Cache sync check failed:', err);
    }
  } catch (err) {
    console.warn('Failed to initialize data cache:', err);
  }

  // Now that cache is fully initialized and synced, start the router
  console.log('[main.js] Starting router...');
  router();
  console.log('[main.js] Router called');

  // Initialize event delegation after router is set up
  setTimeout(() => {
    const main = document.getElementById('app');
    if (main) {
      initializeEventDelegation(main);
      exposeToggleFavorite();
    }
  }, VIEW_INIT_DELAY_MS);

  // Mark that initialization is complete to prevent double calls
  window.appInitialized = true;
}

// Initialize data cache from IndexedDB on first load
// Only initialize if not already done
if (!window.appInitialized) {
  initializeApp();
}

// Loading flags to prevent concurrent loads
const loadingFlags = {
  exercises: false,
  routines: false,
  modules: false,
  categories: false,
  equipment: false,
  muscles: false,
  difficulties: false
};

async function ensureExercisesLoaded() {
  if (loadingFlags.exercises) return;
  if (!getState().exercises || getState().exercises.length === 0) {
    loadingFlags.exercises = true;
    try {
      const exercises = await fetchExercises();
      updateState({ exercises });
    } catch (error) {
      console.error('Failed to load exercises:', error);
      const main = document.getElementById('app');
      if (main) main.innerHTML = renderErrorViewModule('Failed to load exercises. Please check your connection.');
    } finally {
      loadingFlags.exercises = false;
    }
  }
}

async function ensureRoutinesLoaded() {
  if (loadingFlags.routines) return;
  if (!getState().routines || getState().routines.length === 0) {
    loadingFlags.routines = true;
    try {
      const routines = await fetchRoutines();
      updateState({ routines });
    } catch (error) {
      console.error('Failed to load routines:', error);
      const main = document.getElementById('app');
      if (main) main.innerHTML = renderErrorViewModule('Failed to load routines. Please check your connection.');
    } finally {
      loadingFlags.routines = false;
    }
  }
}

async function ensureModulesLoaded() {
  if (loadingFlags.modules) return;
  if (!getState().modules) {
    loadingFlags.modules = true;
    try {
      const modules = await fetchSkillModules();
      updateState({ modules });
    } catch (error) {
      console.error('Failed to load skill modules:', error);
      // Don't render error view, just log - modules are less critical than routines
      console.warn('Skill modules will be loaded on demand');
    } finally {
      loadingFlags.modules = false;
    }
  }
}

async function ensureCategoriesLoaded() {
  if (loadingFlags.categories) return;
  if (!getState().categories || getState().categories.length === 0) {
    loadingFlags.categories = true;
    try {
      const categories = await fetchCategories();
      updateState({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      loadingFlags.categories = false;
    }
  }
}

async function ensureEquipmentLoaded() {
  if (loadingFlags.equipment) return;
  if (!getState().equipment || getState().equipment.length === 0) {
    loadingFlags.equipment = true;
    try {
      const equipment = await fetchEquipment();
      updateState({ equipment });
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      loadingFlags.equipment = false;
    }
  }
}

async function ensureMusclesLoaded() {
  if (loadingFlags.muscles) return;
  if (!getState().muscles || getState().muscles.length === 0) {
    loadingFlags.muscles = true;
    try {
      const muscles = await fetchMuscles();
      updateState({ muscles });
    } catch (error) {
      console.error('Failed to load muscles:', error);
    } finally {
      loadingFlags.muscles = false;
    }
  }
}

async function ensureDifficultiesLoaded() {
  if (loadingFlags.difficulties) return;
  if (!getState().difficulties || getState().difficulties.length === 0) {
    loadingFlags.difficulties = true;
    try {
      const difficulties = await fetchDifficulties();
      updateState({ difficulties });
    } catch (error) {
      console.error('Failed to load difficulties:', error);
    } finally {
      loadingFlags.difficulties = false;
    }
  }
}

// ==================== Render Route Map ====================
// Centralized map of routes to their async render functions and args
const renderRoutes = {
  '#onboarding': { view: 'onboarding-view.js', fn: 'renderOnboardingView', args: [], awaitRender: true },
  '#home':       { view: 'home-view.js',       fn: 'renderHomeView',       args: [], awaitRender: true },
  '#exercises':  { view: 'exercises-view.js',  fn: 'renderExercisesView',  args: [], awaitRender: true },
  '#routines':   { view: 'routines-view.js',   fn: 'renderRoutinesView',   args: [], awaitRender: true },
  '#active-workout': { view: 'active-workout-view.js', fn: 'renderActiveWorkoutView', args: [], awaitRender: true },
  '#workout-completion': { view: 'workout-completion-view.js', fn: 'renderWorkoutCompletionView', args: [], awaitRender: true },
  '#summary':    { view: 'workout-summary-view.js', fn: 'renderWorkoutSummaryView', args: [], awaitRender: true },
  '#profile':    { view: 'profile-view.js',    fn: 'renderProfileView',    args: [], awaitRender: true },
  '#export-import': { view: 'export-import-view.js', fn: 'renderExportImportView', args: [], awaitRender: true },
  '#builder':    { view: 'builder-view.js',    fn: 'renderBuilderView',    args: [], awaitRender: true },
  '#skill-modules': { view: 'skill-modules-view.js', fn: 'renderSkillModulesView', args: [], awaitRender: true },
  '#skills-tree': { view: 'skills-tree-view.js', fn: 'renderSkillsTreeView', args: [], awaitRender: true },
};

// Routes with dynamic parameters
const paramRoutes = {
  '#exercise/':              { view: 'exercise-details-view.js',       fn: 'renderExerciseDetailsView',       args: [1],  awaitRender: true },
  '#routine-details/':       { view: 'routine-details-view.js',        fn: 'renderRoutineDetailsView',        args: null, awaitRender: true },  // args computed
  '#skill-module/':          { view: 'skill-module-detail-view.js',    fn: 'renderSkillModuleDetailView', args: [1],  awaitRender: true },
  '#shared-workout/':        { view: 'shared-workout-view.js',         fn: 'renderSharedWorkoutView',       args: [1],  awaitRender: true },
  '#workout-detail/':        { view: 'workout-detail-view.js',         fn: 'renderWorkoutDetailView',         args: [1],  awaitRender: true },
};

/**
 * Resolve a hash to its route config and extract parameters
 */
function resolveRoute(hash) {
  // Exact matches first
  if (renderRoutes[hash]) {
    return { ...renderRoutes[hash], params: [] };
  }

  // Check param-based routes
  for (const [prefix, config] of Object.entries(paramRoutes)) {
    if (hash.startsWith(prefix)) {
      const cleanHash = hash.replace('#', '');
      const parts = cleanHash.split('/');

      // Build args based on the route type
      let args = [];
      if (prefix === '#exercise/') {
        args = [parts[1]];
      } else if (prefix === '#routine-details/') {
        // Format: #routine-details/type/id or #routine-details/id
        if (parts.length === 3) {
          args = [parts[1], parts[2]];
        } else {
          args = ['routine', parts[1]];
        }
      } else if (prefix === '#skill-module/') {
        args = [parts[1]];
      } else if (prefix === '#shared-workout/') {
        args = [parts[1]];
      } else if (prefix === '#workout-detail/') {
        args = [parseInt(parts[1])];
      }

      return { ...config, params: args };
    }
  }

  return null;
}

async function router() {
  console.log('[main.js] router() called, hash:', window.location.hash);
  const state = getState();
  console.log('[main.js] router state: user=', !!state.user, 'exercises=', state.exercises?.length, 'routines=', state.routines?.length);
  const needsInitialLoad = !state.exercises || state.exercises.length === 0 ||
                           !state.routines || state.routines.length === 0;

  // If data is not loaded, show spinner and load it
  if (needsInitialLoad) {
    document.getElementById('app').innerHTML = renderSpinner();

    await Promise.all([
      ensureExercisesLoaded(),
      ensureRoutinesLoaded(),
      ensureModulesLoaded(),
      ensureCategoriesLoaded(),
      ensureEquipmentLoaded(),
      ensureMusclesLoaded(),
      ensureDifficultiesLoaded()
    ]);

    hideSpinner();
  }

  const hash = window.location.hash;

  // Handle unauthenticated users
  if (!state.user && hash !== '#onboarding' && !hash.startsWith('#shared-workout/')) {
    window.location.hash = '#onboarding';
    return;
  }

  try {
    // Module admin routes (use direct functions, not lazy-loaded views)
    if (hash === '#exercise-form') {
      await renderExerciseForm();
      return;
    }
    if (hash === '#module-admin' || hash.startsWith('#module-admin/')) {
      if (hash === '#module-admin') {
        await renderModuleAdminView(null);
      } else {
        const parts = hash.split('/');
        const moduleId = parts.length > 1 && parts[1] ? parseInt(parts[1]) : null;
        await renderModuleAdminView(moduleId);
      }
      return;
    }

    // Default to home on empty hash
    if (hash === '') {
      window.location.hash = '#home';
      return;
    }

    // Error/404 fallback
    if (hash.startsWith('#error')) {
      const main = document.getElementById('app');
      if (main) main.innerHTML = renderErrorViewModule('Page not found. The requested route does not exist.');
      return;
    }

    // Resolve and render route
    const routeConfig = resolveRoute(hash);
    if (!routeConfig) {
      const main = document.getElementById('app');
      if (main) main.innerHTML = renderErrorViewModule('Page not found. The requested route does not exist.');
      return;
    }

    // Lazy-load the view module and render with error boundary
    const viewModule = await import(`./views/${routeConfig.view}`);
    const wrapped = ErrorBoundaryService.wrapView(viewModule, routeConfig.view);

    if (wrapped.render) {
      await wrapped.render(...routeConfig.params);
    }
  } catch (error) {
    console.error('Router error:', error);
    const main = document.getElementById('app');
    if (main) main.innerHTML = renderErrorViewModule('An error occurred while loading this page.');
  }
}

// Exercise CRUD helpers for offline PWA - uses IndexedDB instead of localStorage
async function loadAllExercises() {
  const storage = await import('./services/storage.js');
  return storage.loadExercises();
}

async function saveAllExercises(exercises) {
  const storage = await import('./services/storage.js');
  return storage.saveExercises(exercises);
}

// Listen for hash changes and route accordingly
window.addEventListener('hashchange', router);

// Listen for locale changes and re-render the current view + header
document.addEventListener('localeChange', async () => {
  const header = document.getElementById('app-header');
  if (header) {
    header.outerHTML = renderHeader();
  }

  // 1. Clear IndexedDB data cache and reload from new locale file
  try {
    const dataCache = await import('./services/data-cache.js');
    await dataCache.reloadCacheForLocale();
  } catch (err) {
    console.warn('Could not reload data cache on locale change:', err);
  }

  // 2. Clear JS in-memory caches
  try {
    const apiModule = await import('./services/api.js');
    apiModule.clearAllCaches();
  } catch (err) {
    console.warn('Could not clear API cache:', err);
  }

  try {
    const storageModule = await import('./services/storage.js');
    storageModule.clearExercisesCache();
  } catch (err) {
    console.warn('Could not clear storage cache:', err);
  }

  // 3. Load all data fresh from IndexedDB (already repopulated by reloadCacheForLocale)
  try {
    const { fetchExercises, fetchRoutines, fetchCategories, fetchEquipment, fetchMuscles, fetchDifficulties } = await import('./services/api.js');
    updateState({
      exercises: await fetchExercises(),
      routines: await fetchRoutines(),
      categories: await fetchCategories(),
      equipment: await fetchEquipment(),
      muscles: await fetchMuscles(),
      difficulties: await fetchDifficulties()
    });
  } catch (err) {
    console.warn('Could not reload data on locale change:', err);
  }

  // 4. Re-render current view
  router();
});

// Initialize undo service after main app is ready
initUndoService();

// ==================== Public API: window.calisthenics ====================
// All public APIs are exposed through this namespace instead of polluting window directly
window.calisthenics = {
  // State management
  getState,
  updateState,

  // Exercise form service (backward compatibility)
  initExerciseForm: initExerciseForm,

  // Undo service
  dismissAllUndoToasts,

  // Router
  router,

  // Data loading
  loadAllExercises,
  saveAllExercises,

  // Constants (read-only reference)
  constants: {
    TOAST_TIMEOUTS: Object.freeze({
      info: 5000,
      success: 3000,
      warning: 5000,
      error: 8000
    }),
    UNDO_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
    MAX_RETRIES: 2
  },

  // Validation service (for event-delegation.js backward compat)
  ValidationService: ValidationService
};

// Backward compatibility: attach key functions to window
// These are kept for views and services that reference them directly
window.getState = getState;
window.updateState = updateState;
window.ValidationService = ValidationService;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              showConfirmation('A new version of the app is available. Would you like to update?').then(confirmed => {
                if (confirmed) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              });
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
