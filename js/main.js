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
import { renderSettingsView } from './views/settings-view.js';
import { renderBuilderView } from './views/builder-view.js';
import { renderExercisesView } from './views/exercises-view.js';
import { renderRoutineDetailsView } from './views/routine-details-view.js';
import { fetchExercises, fetchRoutines, fetchCategories, fetchEquipment, fetchMuscles, fetchDifficulties, fetchSkillModules } from './services/api.js';
import { renderSkillModulesView } from './views/skill-modules-view.js';
import { renderSkillModuleDetailView } from './views/skill-module-detail-view.js';
import { renderSharedWorkoutView } from './views/shared-workout-view.js';
import { renderErrorView as renderErrorViewModule } from './views/error-view.js';
import { showConfirmation } from './services/confirmation-modal.js';
import { renderSpinner, hideSpinner } from './components/spinner.js';
import { renderSkillsTreeView } from './views/skills-tree-view.js';
import { renderProgressView } from './views/progress-view.js';
import { renderHeader } from './components/header.js';
import { initializeDataCache, isCacheStale, syncDataCache } from './services/data-cache.js';
import { renderExportImportView } from './views/export-import-view.js';
import { initUndoService, dismissAllUndoToasts } from './services/undo-service.js';
import { renderExerciseForm } from './views/exercise-form-view.js';
import { initExerciseForm } from './services/exercise-form-service.js';
import { renderModuleAdminView } from './views/module-admin-view.js';
import { initializeEventDelegation, exposeToggleFavorite } from './services/event-delegation.js';
import { ValidationService } from './services/validation.js';
import { VIEW_INIT_DELAY_MS } from './constants.js';
import { installPromptService } from './services/install-prompt-service.js';
import { t } from './i18n.js';
import './components/install-banner.js';
import { registerGlobalErrorHandlers } from './services/error-boundary-service.js';

initializeState();

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

  // Catch unhandled promise rejections - let error-boundary-service handle specific cases
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection:', event.reason);
  });
  
  // Catch uncaught synchronous errors - let error-boundary-service handle specific cases
  window.addEventListener('error', (event) => {
    console.warn('Uncaught error:', event.error);
  });
}

installRootErrorHandler();

// Register global error handlers for comprehensive error tracking
registerGlobalErrorHandlers();

// Wait for complete cache initialization AND sync before starting router
async function initializeApp() {
  try {
    await initializeDataCache();

    // Check if server data has changed since last sync
    try {
      if (await isCacheStale()) {
        await syncDataCache();
      }
    } catch (err) {
      console.warn('Cache sync check failed:', err);
    }
  } catch (err) {
    console.warn('Failed to initialize data cache:', err);
  }

  // Now that cache is fully initialized and synced, start the router
  router();

  // Initialize event delegation after router is set up
  setTimeout(() => {
    const main = document.getElementById('app');
    if (main) {
      initializeEventDelegation(main);
      exposeToggleFavorite();
    }
  }, VIEW_INIT_DELAY_MS);

  // Initialize PWA install prompt service
  installPromptService.init();

  // Handle messages from Service Worker (push notifications, background sync)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NAVIGATE') {
        window.location.hash = event.data.hash;
      }
    });
  }

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

// Shared promises for in-flight loads (dedupe concurrent calls)
const loadingPromises = {
  exercises: null,
  routines: null,
  modules: null,
  categories: null,
  equipment: null,
  muscles: null,
  difficulties: null
};

// Generic data loading helper — deduplicates ensure*Loaded pattern
function ensureDataLoaded(key, fetchFn, { showErrorView = false, errorMessage = '' } = {}) {
  if (loadingPromises[key]) return loadingPromises[key];

  const state = getState();
  const alreadyLoaded = Array.isArray(state[key])
    ? state[key].length > 0
    : state[key] != null;

  if (!alreadyLoaded) {
    loadingFlags[key] = true;
    loadingPromises[key] = (async () => {
      try {
        const data = await fetchFn();
        updateState({ [key]: data });
      } catch (error) {
        console.error(`Failed to load ${key}:`, error);
        if (showErrorView) {
          const main = document.getElementById('app');
          if (main) main.innerHTML = renderErrorViewModule(errorMessage || `Failed to load ${key}. Please check your connection.`);
        }
      } finally {
        loadingFlags[key] = false;
        loadingPromises[key] = null;
      }
    })();
  }

  return loadingPromises[key] || Promise.resolve();
}

function ensureExercisesLoaded() {
  return ensureDataLoaded('exercises', fetchExercises, {
    showErrorView: true,
    errorMessage: 'Failed to load exercises. Please check your connection.'
  });
}

function ensureRoutinesLoaded() {
  return ensureDataLoaded('routines', fetchRoutines, {
    showErrorView: true,
    errorMessage: 'Failed to load routines. Please check your connection.'
  });
}

function ensureModulesLoaded() {
  return ensureDataLoaded('modules', fetchSkillModules);
}

function ensureCategoriesLoaded() {
  return ensureDataLoaded('categories', fetchCategories);
}

function ensureEquipmentLoaded() {
  return ensureDataLoaded('equipment', fetchEquipment);
}

function ensureMusclesLoaded() {
  return ensureDataLoaded('muscles', fetchMuscles);
}

function ensureDifficultiesLoaded() {
  return ensureDataLoaded('difficulties', fetchDifficulties);
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
  '#settings':   { view: 'settings-view.js',   fn: 'renderSettingsView',   args: [], awaitRender: true },
  '#progress':   { view: 'progress-view.js',   fn: 'renderProgressView',   args: [], awaitRender: true },
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
  // Cleanup any existing view listeners before rendering new view (prevents memory leaks)
  const main = document.getElementById('app');
  if (main) {
    // Call cleanup function if exists (set by previous view)
    if (main._currentViewCleanup && typeof main._currentViewCleanup === 'function') {
      main._currentViewCleanup();
      delete main._currentViewCleanup;
    }
  }
  
  // Get fresh state
  const state = getState();
  const hash = window.location.hash;
  
  // Handle unauthenticated users FIRST - before loading data
  if (!state.user && hash !== '#onboarding' && !hash.startsWith('#shared-workout/')) {
    // Show onboarding view directly without loading all data
    const main = document.getElementById('app');
    if (main) {
      const viewModule = await import('./views/onboarding-view.js');
      const wrapped = ErrorBoundaryService.wrapView(viewModule, 'onboarding-view.js');
      if (wrapped.render) {
        await wrapped.render();
      }
    }
    return;
  }
  
  // Load data if needed (only if not onboarding)
  const needsInitialLoad = !state.exercises || state.exercises.length === 0 ||
                           !state.routines || state.routines.length === 0;
  
  if (needsInitialLoad) {
    const main = document.getElementById('app');
    if (!main) return;
    main.innerHTML = renderSpinner();

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
  const currentHash = window.location.hash || '#home';
    
  // Clear current view content first
  const main = document.getElementById('app');
  if (main) {
    main.innerHTML = '';
  }
    
  // Update header
  const header = document.getElementById('app-header');
  if (header) {
    header.outerHTML = renderHeader();
  }
    
  // Single consolidated cache reload with loading state
  try {
    const dataCache = await import('./services/data-cache.js');
    await dataCache.reloadCacheForLocale();
      
    // Reload all data from IndexedDB
    const { fetchExercises, fetchRoutines, fetchCategories, fetchEquipment, fetchMuscles, fetchDifficulties } = await import('./services/api.js');
    const { fetchSkillModules } = await import('./services/api.js');
    updateState({
      exercises: await fetchExercises(),
      routines: await fetchRoutines(),
      categories: await fetchCategories(),
      equipment: await fetchEquipment(),
      muscles: await fetchMuscles(),
      difficulties: await fetchDifficulties(),
      modules: await fetchSkillModules()
    });
      
    // Re-render current view with new locale
    window.location.hash = ''; // Clear hash to force router to use currentHash
    await new Promise(resolve => setTimeout(resolve, 10)); // Allow DOM update
    window.location.hash = currentHash;
  } catch (err) {
    console.warn('Could not reload data on locale change:', err);
    // Fallback: just re-render current view
    router();
  }
});

// Initialize undo service after main app is ready
initUndoService();

// ==================== Background Data Sync Check ====================
// Periodically check for data updates when online
async function checkForDataUpdates() {
  // Only check if we're online
  if (!navigator.onLine) {
    return;
  }
  
  try {
    const db = await import('./services/database.js');
    const { getDataFilename } = await import('./services/data-cache.js');
    
    const filename = getDataFilename();
    
    // Fetch data version from network
    const response = await fetch(filename + '?t=' + Date.now());
    if (!response.ok) {
      return;
    }
    
    const newData = await response.json();
    const currentVersion = await db.loadDataVersion();
    
    // Compare versions
    if (newData.dataVersion && currentVersion !== newData.dataVersion) {
      const { show } = await import('./services/toast-service.js');
      show('Updating exercise data...', 'info');
      
      // Sync the cache
      const { syncDataCache } = await import('./services/data-cache.js');
      await syncDataCache();
      
      // Re-render current view to reflect updates
      router();
      
      show('Data updated successfully!', 'success');
    }
  } catch (error) {
    console.warn('[DataSync] Error checking for updates:', error);
  }
}

// Check for updates periodically (every 5 minutes when online)
let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function scheduleDataSyncCheck() {
  // Check on page load if we've been away
  const timeSinceLastCheck = Date.now() - lastCheckTime;
  if (timeSinceLastCheck > CHECK_INTERVAL_MS || lastCheckTime === 0) {
    checkForDataUpdates();
  }
  
  // Schedule next check
  setTimeout(() => {
    lastCheckTime = Date.now();
    scheduleDataSyncCheck();
  }, CHECK_INTERVAL_MS);
}

// Listen for online/offline events
window.addEventListener('online', () => {
  checkForDataUpdates();
});

// Start background sync check after a delay
setTimeout(scheduleDataSyncCheck, 30000); // First check after 30 seconds

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
              showConfirmation(t('sw_update.message')).then(confirmed => {
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
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          reloading = true;
          window.location.reload();
        }
      });

    }).catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });

  // Handle messages from Service Worker (push notifications, background sync)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE') {
      window.location.hash = event.data.hash;
    }
    // Add handlers for other SW message types as needed
  });
}
