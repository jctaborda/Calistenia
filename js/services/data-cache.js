// Data Cache - Store JSON reference data in IndexedDB for fast offline access
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
  storePrograms,
  programsLoad,
  storeDataVersion,
  loadDataVersion
} from './database.js';

let cacheInitialized = false;
let cacheInitializationPromise = null;

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
    // Load all reference data and cache to IndexedDB
    const [exercises, categories, equipment, muscles, difficulties, programs, serverVersion] = await Promise.all([
      loadAllExercises(),
      loadAllCategories(),
      loadAllEquipment(),
      loadAllMuscles(),
      loadAllDifficulties(),
      loadAllPrograms(),
      fetchServerVersion()
    ]);
    
    // Store in IndexedDB for offline access
    await storeExercises(exercises);
    await storeCategories(categories);
    await storeEquipment(equipment);
    await storeMuscles(muscles);
    await storeDifficulties(difficulties);
    await storePrograms(programs);
    
    // Store the server version for future sync checks
    if (serverVersion) {
      await storeDataVersion(serverVersion);
    }
    
    cacheInitialized = true;
    console.log('✅ Data cache initialized');
    return true;
  } catch (error) {
    console.error('Error initializing data cache:', error);
    return false;
  }
}

// Fetch the data version from data.json
async function fetchServerVersion() {
  try {
    const response = await fetch('./data/data.json');
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
      console.log(`🔄 Cache stale: ${cachedVersion} → ${serverVersion}`);
    }
    return stale;
  } catch (error) {
    console.warn('Error checking cache freshness:', error);
    return false;
  }
}

// Force re-sync cache from data.json (clears and reloads all data)
export async function syncDataCache() {
  try {
    console.log('🔄 Syncing data cache from server...');
    
    // Clear all cached data
    await Promise.all([
      storeExercises([]),
      storeCategories([]),
      storeEquipment([]),
      storeMuscles([]),
      storeDifficulties([]),
      storePrograms([])
    ]);
    
    // Reset initialization flag
    cacheInitialized = false;
    
    // Re-initialize with fresh data
    await initializeDataCacheInternal();
    
    console.log('✅ Data cache synced');
    return true;
  } catch (error) {
    console.error('Error syncing data cache:', error);
    return false;
  }
}

// Load exercises from cache or file
export async function loadAllExercises() {
  try {
    const cached = await exercisesLoad();
    if (cached && cached.length > 0) {
      console.log('📦 Loaded exercises from IndexedDB');
      return cached;
    }
  } catch (error) {
    console.warn('No cached exercises, loading from file');
  }
  
  // Load from data.json as fallback
  const response = await fetch('./data/data.json');
  const data = await response.json();
  return data.exercises || [];
}

// Load categories from cache or file
export async function loadAllCategories() {
  try {
    const cached = await categoriesLoad();
    if (cached && cached.length > 0) {
      console.log('📦 Loaded categories from IndexedDB');
      return cached;
    }
  } catch (error) {
    console.warn('No cached categories, loading from file');
  }
  
  const response = await fetch('./data/data.json');
  const data = await response.json();
  return data.categories || [];
}

// Load equipment from cache or file
export async function loadAllEquipment() {
  try {
    const cached = await equipmentLoad();
    if (cached && cached.length > 0) {
      console.log('📦 Loaded equipment from IndexedDB');
      return cached;
    }
  } catch (error) {
    console.warn('No cached equipment, loading from file');
  }
  
  const response = await fetch('./data/data.json');
  const data = await response.json();
  return data.equipment || [];
}

// Load muscles from cache or file
export async function loadAllMuscles() {
  try {
    const cached = await musclesLoad();
    if (cached && cached.length > 0) {
      console.log('📦 Loaded muscles from IndexedDB');
      return cached;
    }
  } catch (error) {
    console.warn('No cached muscles, loading from file');
  }
  
  const response = await fetch('./data/data.json');
  const data = await response.json();
  return data.muscles || [];
}

// Load difficulties from cache or file
export async function loadAllDifficulties() {
  try {
    const cached = await difficultiesLoad();
    if (cached && cached.length > 0) {
      console.log('📦 Loaded difficulties from IndexedDB');
      return cached;
    }
  } catch (error) {
    console.warn('No cached difficulties, loading from file');
  }
  
  const response = await fetch('./data/data.json');
  const data = await response.json();
  return data.difficulties || [];
}

// Load programs from cache or file
export async function loadAllPrograms() {
  try {
    const cached = await programsLoad();
    if (cached && cached.length > 0) {
      console.log('📦 Loaded programs from IndexedDB');
      return cached;
    }
  } catch (error) {
    console.warn('No cached programs, loading from file');
  }
  
  const response = await fetch('./data/data.json');
  const data = await response.json();
  return data.programs || [];
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
      storePrograms([])
    ]);
    cacheInitialized = false;
    console.log('🗑️ Data cache cleared');
  } catch (error) {
    console.error('Error clearing data cache:', error);
  }
}
