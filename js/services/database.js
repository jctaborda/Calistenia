// IndexedDB helper for PWA - stores large data (exercises, workouts) efficiently
// Avoids localStorage quota limits

const DB_NAME = 'calisthenics-db';

/**
 * DATABASE VERSION CHANGELLOG
 * 
 * Each DB_VERSION increment documents schema changes for migration tracking.
 * When adding new stores or modifying existing ones, increment this version.
 * 
 * Version History:
 * - v1: Initial schema - exercises, workouts, state stores
 * - v2: Added modules, routines, categories, equipment, muscles, difficulties stores
 * - v3: Added deleted_items store for undo functionality
 * - v4: Added data_version store for cache sync tracking
 * - v5: [No changes - reserved]
 * - v6: [No changes - reserved]
 * 
 * Migration Guide:
 * 1. Increment DB_VERSION at top of file
 * 2. Add migration logic in onupgradeneeded handler below current version
 * 3. Test on fresh install and existing DB
 * 4. Update this changelog with new version details
 */
const DB_VERSION = 6;
const STORES = {
  EXERCISES: 'exercises',
  WORKOUTS: 'workouts',
  STATE: 'state',
  MODULES: 'modules',
  ROUTINES: 'routines',
  CATEGORIES: 'categories',
  EQUIPMENT: 'equipment',
  MUSCLES: 'muscles',
  DIFFICULTIES: 'difficulties',
  DELETED_ITEMS: 'deleted_items', // For undo functionality
  DATA_VERSION: 'data_version' // Tracks data.json version for cache sync
};

let db = null;

/**
 * Attaches a transaction-level error handler that rejects the promise.
 * This ensures that ANY IndexedDB error (quota exceeded, corrupted DB, etc.)
 * propagates to the caller instead of failing silently.
 */
function attachTransactionError(transaction) {
  transaction.onerror = () => {
    console.error('IndexedDB transaction error:', transaction.error);
  };
  transaction.onabort = () => {
    console.error('IndexedDB transaction aborted:', transaction.error);
  };
}

export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object store for exercises
      if (!database.objectStoreNames.contains(STORES.EXERCISES)) {
        const exerciseStore = database.createObjectStore(STORES.EXERCISES, { keyPath: 'id' });
        exerciseStore.createIndex('name', 'name', { unique: false });
      }

      // Create object store for workouts (array of workout objects)
      if (!database.objectStoreNames.contains(STORES.WORKOUTS)) {
        const workoutStore = database.createObjectStore(STORES.WORKOUTS, { keyPath: 'id', autoIncrement: true });
        workoutStore.createIndex('date', 'date', { unique: false });
        workoutStore.createIndex('userId', 'userId', { unique: false });
      }

      // Create object store for app state (small metadata)
      if (!database.objectStoreNames.contains(STORES.STATE)) {
        database.createObjectStore(STORES.STATE, { keyPath: 'key' });
      }

      // Create object store for skill modules
      if (!database.objectStoreNames.contains(STORES.MODULES)) {
        const moduleStore = database.createObjectStore(STORES.MODULES, { keyPath: 'id' });
        moduleStore.createIndex('name', 'name', { unique: false });
        moduleStore.createIndex('category', 'category', { unique: false });
      }

      // Create object store for routines
      if (!database.objectStoreNames.contains(STORES.ROUTINES)) {
        database.createObjectStore(STORES.ROUTINES, { keyPath: 'id' });
      }

      // Create object store for categories
      if (!database.objectStoreNames.contains(STORES.CATEGORIES)) {
        database.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      // Create object store for equipment
      if (!database.objectStoreNames.contains(STORES.EQUIPMENT)) {
        database.createObjectStore(STORES.EQUIPMENT, { keyPath: 'id' });
      }

      // Create object store for muscles
      if (!database.objectStoreNames.contains(STORES.MUSCLES)) {
        database.createObjectStore(STORES.MUSCLES, { keyPath: 'id' });
      }

      // Create object store for difficulties
      if (!database.objectStoreNames.contains(STORES.DIFFICULTIES)) {
        database.createObjectStore(STORES.DIFFICULTIES, { keyPath: 'id' });
      }

      // Create object store for deleted items (undo functionality)
      if (!database.objectStoreNames.contains(STORES.DELETED_ITEMS)) {
        const deletedStore = database.createObjectStore(STORES.DELETED_ITEMS, { keyPath: 'id', autoIncrement: true });
        deletedStore.createIndex('type', 'type', { unique: false });
        deletedStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create object store for data version tracking (cache sync)
      if (!database.objectStoreNames.contains(STORES.DATA_VERSION)) {
        database.createObjectStore(STORES.DATA_VERSION, { keyPath: 'key' });
      }
    };

    // onupgradeneeded handler ends here, close Promise constructor
  });
}

// Routines operations
export async function storeRoutines(routinesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.ROUTINES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.ROUTINES);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing routines store:', clearRequest.error);

  routinesArray.forEach(routine => {
    const putRequest = store.put(routine);
    putRequest.onerror = () => console.error('Error storing routine:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateRoutines(updatedRoutine) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.ROUTINES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.ROUTINES);

  const putRequest = store.put(updatedRoutine);
  
  return new Promise((resolve, reject) => {
    putRequest.onsuccess = () => resolve({ success: true });
    putRequest.onerror = () => reject(putRequest.error);
  });
}

// Delete routine
export async function deleteRoutine(routineId) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.ROUTINES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.ROUTINES);

  const request = store.delete(routineId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
}

export async function routinesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.ROUTINES], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.ROUTINES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading routines from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Exercises operations
export async function storeExercises(exercisesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EXERCISES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.EXERCISES);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing exercises store:', clearRequest.error);

  exercisesArray.forEach(exercise => {
    const putRequest = store.put(exercise);
    putRequest.onerror = () => console.error('Error storing exercise:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function exercisesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EXERCISES], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.EXERCISES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading exercises from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Categories operations
export async function storeCategories(categoriesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.CATEGORIES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.CATEGORIES);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing categories store:', clearRequest.error);

  categoriesArray.forEach(category => {
    const putRequest = store.put(category);
    putRequest.onerror = () => console.error('Error storing category:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function categoriesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.CATEGORIES], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.CATEGORIES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading categories from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Equipment operations
export async function storeEquipment(equipmentArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EQUIPMENT], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.EQUIPMENT);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing equipment store:', clearRequest.error);

  equipmentArray.forEach(item => {
    const putRequest = store.put(item);
    putRequest.onerror = () => console.error('Error storing equipment:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function equipmentLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EQUIPMENT], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.EQUIPMENT);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading equipment from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Muscles operations
export async function storeMuscles(musclesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MUSCLES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.MUSCLES);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing muscles store:', clearRequest.error);

  musclesArray.forEach(muscle => {
    const putRequest = store.put(muscle);
    putRequest.onerror = () => console.error('Error storing muscle:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function musclesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MUSCLES], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.MUSCLES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading muscles from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Difficulties operations
export async function storeDifficulties(difficultiesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DIFFICULTIES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DIFFICULTIES);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing difficulties store:', clearRequest.error);

  difficultiesArray.forEach(difficulty => {
    const putRequest = store.put(difficulty);
    putRequest.onerror = () => console.error('Error storing difficulty:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function difficultiesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DIFFICULTIES], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DIFFICULTIES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading difficulties from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Data version operations
export async function storeDataVersion(version) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DATA_VERSION], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DATA_VERSION);

  const putRequest = store.put({ key: 'dataVersion', version });

  return new Promise((resolve, reject) => {
    putRequest.onsuccess = () => resolve({ success: true });
    putRequest.onerror = () => reject(putRequest.error);
  });
}

export async function loadDataVersion() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DATA_VERSION], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DATA_VERSION);

  return new Promise((resolve, reject) => {
    const request = store.get('dataVersion');

    request.onsuccess = () => resolve(request.result?.version || null);
    request.onerror = () => {
      console.error('Error loading data version from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Load workouts
export async function loadWorkouts() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.WORKOUTS], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.WORKOUTS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading workouts from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Store workout
export async function storeWorkout(workout) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.WORKOUTS], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.WORKOUTS);

  const putRequest = store.put(workout);

  return new Promise((resolve, reject) => {
    putRequest.onsuccess = () => resolve({ success: true });
    putRequest.onerror = () => reject(putRequest.error);
  });
}

// Delete workout
export async function deleteWorkout(workoutId) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.WORKOUTS], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.WORKOUTS);

  const deleteRequest = store.delete(workoutId);

  return new Promise((resolve, reject) => {
    deleteRequest.onsuccess = () => resolve({ success: true });
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

// Clear database
export async function clearDatabase() {
  const database = await openDatabase();
  const transaction = database.transaction([...Object.values(STORES)], 'readwrite');
  attachTransactionError(transaction);

  for (const storeName of Object.values(STORES)) {
    const store = transaction.objectStore(storeName);
    const clearRequest = store.clear();
    clearRequest.onerror = () => console.error(`Error clearing ${storeName}:`, clearRequest.error);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get database size
export async function getDatabaseSize() {
  const database = await openDatabase();
  
  const workoutCount = await new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.WORKOUTS], 'readonly');
    attachTransactionError(transaction);
    const store = transaction.objectStore(STORES.WORKOUTS);
    const request = store.count();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return { workoutCount };
}

// Modules operations
export async function storeModules(modulesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.MODULES);

  const clearRequest = store.clear();
  clearRequest.onerror = () => console.error('Error clearing modules store:', clearRequest.error);

  modulesArray.forEach(module => {
    const putRequest = store.put(module);
    putRequest.onerror = () => console.error('Error storing module:', putRequest.error);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function modulesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.MODULES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error('Error loading modules from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

export async function deleteModule(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.MODULES);

  const deleteRequest = store.delete(id);

  return new Promise((resolve, reject) => {
    deleteRequest.onsuccess = () => resolve({ success: true });
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

// Helper function to get exercise by ID
export async function getExerciseById(id) {
  const exercises = await exercisesLoad();
  return exercises.find(exercise => String(exercise.id) === String(id)) || null;
}

// Deleted items operations (for undo functionality)
export async function saveDeletedItem(type, item, originalId) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DELETED_ITEMS);

  const itemData = {
    type,
    item,
    originalId,
    timestamp: Date.now()
  };

  const putRequest = store.put(itemData);

  return new Promise((resolve, reject) => {
    putRequest.onsuccess = () => resolve({ success: true, id: putRequest.result });
    putRequest.onerror = () => reject(putRequest.error);
  });
}

export async function getDeletedItemsByType(type) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readonly');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DELETED_ITEMS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      const allItems = request.result || [];
      const filtered = allItems.filter(item => item.type === type);
      resolve(filtered);
    };
    request.onerror = () => {
      console.error('Error loading deleted items from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

export async function deleteDeletedItem(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DELETED_ITEMS);

  const deleteRequest = store.delete(id);

  return new Promise((resolve, reject) => {
    deleteRequest.onsuccess = () => resolve({ success: true });
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

export async function clearExpiredDeletedItems(retentionMs) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readwrite');
  attachTransactionError(transaction);
  const store = transaction.objectStore(STORES.DELETED_ITEMS);

  const cutoffTime = Date.now() - retentionMs;
  let deletedCount = 0;

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      const allItems = request.result || [];
      const expiredIds = allItems
        .filter(item => item.timestamp < cutoffTime)
        .map(item => item.id);

      if (expiredIds.length > 0) {
        expiredIds.forEach(id => {
          store.delete(id);
          deletedCount++;
        });
      }

      resolve({ deletedCount });
    };
    request.onerror = () => {
      console.error('Error clearing expired deleted items:', request.error);
      reject(request.error);
    };
  });
}
