// Data Cache with i18n support - Store JSON reference data in IndexedDB for fast offline access
// Loads locale-specific data files (data.json for English, data-es.json for Spanish)
import { 
  storeExercises, 
  exercisesLoad,
  storeCategories,
  categoriesLoad,
  storeEquipment,
  equipmentLoad,
  storeMuscles,
  musclesLoad,
  storeDifficulties,
  difficultiesLoad,
  storeRoutines,
  routinesLoad,
  storeDataVersion,
  loadDataVersion
} from './database.js';
import { show } from './toast-service.js';
import { loadFromCacheOrFetch } from './cache-utils.js';

// Avoid circular dependency with i18n.js - get locale from localStorage directly
function getLocale() {
  return localStorage.getItem('locale') || 'en';
}

let cacheInitialized = false;
let cacheInitializationPromise = null;
let cachedDataFile = null; // Stores the parsed data.json to distribute to stores

/**
 * Get the appropriate data filename based on current locale
 */
export function getDataFilename() {
  const locale = getLocale();
  return locale === 'es' ? './data/data-es.json' : './data/data.json';
}

/**
 * Prevents concurrent runs of initializeDataCache().
 * If called while initialization is in progress, returns the existing Promise.
 */
function getInitLock() {
  if (cacheInitializationPromise === null) {
    cacheInitializationPromise = (async () => {
      try {
        await initializeDataCacheInternal();
      } finally {
        cacheInitializationPromise = null;
      }
    })();
  }
  return cacheInitializationPromise;
}

export async function initializeDataCache() {
  if (cacheInitialized) return true;
  
  // If another initialization is already in progress, wait for it
  return getInitLock();
}

// Internal implementation (called only by getInitLock)
async function initializeDataCacheInternal() {
  if (cacheInitialized) return true;
  
  try {
    // Fetch data.json ONCE and distribute to all stores
    const data = await fetchLocaleData();
    
    // Preserve existing user-added exercises before replacing reference data
    const db = await import('./database.js');
    const existingExercises = await db.exercisesLoad();
    const existingRoutines = await db.routinesLoad();
    
    // Build a map of existing user exercises by ID
    const existingMap = new Map();
    existingExercises.forEach(ex => existingMap.set(String(ex.id), ex));
    
    // Merge: start with data.json exercises, overlay any user-added ones
    const mergedExercises = [...(data.exercises || [])];
    const existingIds = new Set(mergedExercises.map(e => String(e.id)));
    existingExercises.forEach(ex => {
      if (!existingIds.has(String(ex.id))) {
        mergedExercises.push(ex);
      }
    });
    
    // Store merged exercises in IndexedDB
    if (mergedExercises.length > 0) {
      await db.storeExercises(mergedExercises);
    }
    
    // Store reference data (categories, equipment, etc.)
    if (data.categories && Array.isArray(data.categories)) {
      await storeCategories(data.categories);
    }
    if (data.equipment && Array.isArray(data.equipment)) {
      await storeEquipment(data.equipment);
    }
    if (data.muscles && Array.isArray(data.muscles)) {
      await storeMuscles(data.muscles);
    }
    if (data.difficulties && Array.isArray(data.difficulties)) {
      await storeDifficulties(data.difficulties);
    }
    if (data.routines && Array.isArray(data.routines)) {
      await storeRoutines(data.routines);
    }
    if (data.dataVersion) {
      await storeDataVersion(data.dataVersion);
    }
    
    // Keep the parsed data in memory for individual load functions
    cachedDataFile = data;
    
    cacheInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing data cache:', error);
    show('Failed to initialize data cache. Some features may not work correctly.', 'error');
    return false;
  }
}

// Fetch and parse locale-specific data.json
async function fetchLocaleData() {
  const filename = getDataFilename();
  const response = await fetch(filename);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Fetch the data version from locale-specific data.json
async function fetchServerVersion() {
  try {
    const filename = getDataFilename();
    const response = await fetch(filename);
    const data = await response.json();
    return data.dataVersion || null;
  } catch (error) {
    console.warn('Could not fetch data version:', error);
    return null;
  }
}

// Check if cached data is stale compared to server
export async function isCacheStale() {
  try {
    const [cachedVersion, serverVersion] = await Promise.all([
      loadDataVersion(),
      fetchServerVersion()
    ]);
    
    // If no server version, cache is not stale
    if (!serverVersion) return false;
    
    // If no cached version, cache is stale (first load)
    if (!cachedVersion) return true;
    
    // Compare versions
    const stale = cachedVersion !== serverVersion;
    if (stale) {
    }
    return stale;
  } catch (error) {
    console.warn('Error checking cache freshness:', error);
    show('Could not verify data freshness. Cache may be stale.', 'warning');
    return false;
  }
}

// Force re-sync cache from data.json (preserves user-added exercises)
export async function syncDataCache() {
  try {
    // Preserve existing user-added exercises before clearing
    const db = await import('./database.js');
    const existingExercises = await db.exercisesLoad();
    const existingRoutines = await db.routinesLoad();
    
    // Clear all cached reference data (categories, equipment, etc.)
    await Promise.all([
      storeCategories([]),
      storeEquipment([]),
      storeMuscles([]),
      storeDifficulties([]),
      storeRoutines([])
    ]);
    
    // Reset initialization flag
    cacheInitialized = false;
    cachedDataFile = null;
    
    // Re-initialize with fresh reference data from data.json
    await initializeDataCacheInternal();
    
    // Re-merge user-added exercises back into IndexedDB
    if (existingExercises.length > 0) {
      await db.storeExercises(existingExercises);
    }
    if (existingRoutines.length > 0) {
      await db.storeRoutines(existingRoutines);
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing data cache:', error);
    show('Failed to sync data cache. Please try again.', 'error');
    return false;
  }
}

// Load exercises from cache or in-memory data
export async function loadAllExercises() {
  return loadFromCacheOrFetch(exercisesLoad, cachedDataFile?.exercises, 'exercises');
}

// Load categories from cache or in-memory data
export async function loadAllCategories() {
  return loadFromCacheOrFetch(categoriesLoad, cachedDataFile?.categories, 'categories');
}

// Load equipment from cache or in-memory data
export async function loadAllEquipment() {
  return loadFromCacheOrFetch(equipmentLoad, cachedDataFile?.equipment, 'equipment');
}

// Load muscles from cache or in-memory data
export async function loadAllMuscles() {
  return loadFromCacheOrFetch(musclesLoad, cachedDataFile?.muscles, 'muscles');
}

// Load difficulties from cache or in-memory data
export async function loadAllDifficulties() {
  return loadFromCacheOrFetch(difficultiesLoad, cachedDataFile?.difficulties, 'difficulties');
}

// Load routines from cache or in-memory data
export async function loadAllRoutines() {
  return loadFromCacheOrFetch(routinesLoad, cachedDataFile?.routines, 'routines');
}

// Clear all data cache (for debugging/testing)
export async function clearDataCache() {
  try {
    await Promise.all([
      storeExercises([]),
      storeCategories([]),
      storeEquipment([]),
      storeMuscles([]),
      storeDifficulties([]),
      storeRoutines([])
    ]);
    cacheInitialized = false;
    cachedDataFile = null;
  } catch (error) {
    console.error('Error clearing data cache:', error);
    show('Failed to clear data cache.', 'error');
  }
}

// Clear all data cache AND force reload from locale-specific file
// Used when switching locales to ensure fresh data is loaded
export async function reloadCacheForLocale() {
  try {
    // Preserve existing user-added exercises before clearing
    const db = await import('./database.js');
    const existingExercises = await db.exercisesLoad();
    
    // Clear IndexedDB reference data
    await clearDataCache();
    
    // Clear JS in-memory caches by re-fetching from locale file
    const filename = getDataFilename();
    const response = await fetch(filename + '?t=' + Date.now());
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    const data = await response.json();
    
    // Merge user exercises with fresh reference data
    const mergedExercises = [...(data.exercises || [])];
    const existingIds = new Set(mergedExercises.map(e => String(e.id)));
    existingExercises.forEach(ex => {
      if (!existingIds.has(String(ex.id))) {
        mergedExercises.push(ex);
      }
    });
    
    // Store all data from the locale file
    if (mergedExercises.length > 0) {
      await db.storeExercises(mergedExercises);
    }
    if (data.categories && Array.isArray(data.categories)) {
      await storeCategories(data.categories);
    }
    if (data.equipment && Array.isArray(data.equipment)) {
      await storeEquipment(data.equipment);
    }
    if (data.muscles && Array.isArray(data.muscles)) {
      await storeMuscles(data.muscles);
    }
    if (data.difficulties && Array.isArray(data.difficulties)) {
      await storeDifficulties(data.difficulties);
    }
    if (data.routines && Array.isArray(data.routines)) {
      await storeRoutines(data.routines);
    }
    if (data.dataVersion) {
      await storeDataVersion(data.dataVersion);
    }
    
    // Cache in memory too
    cachedDataFile = data;
    cacheInitialized = true;
    return true;
  } catch (error) {
    console.error('Error reloading cache for locale:', error);
    show('Failed to reload data cache for locale. Please try again.', 'error');
    return false;
  }
}
