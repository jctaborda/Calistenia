// IndexedDB helper for PWA - stores large data (exercises, workouts) efficiently
// Avoids localStorage quota limits

const DB_NAME = 'calisthenics-db';
const DB_VERSION = 5; // Incremented to add deleted_items store for undo functionality
const STORES = {
  EXERCISES: 'exercises',
  WORKOUTS: 'workouts',
  STATE: 'state',
  MODULES: 'modules',
  PROGRAMS: 'programs',
  CATEGORIES: 'categories',
  EQUIPMENT: 'equipment',
  MUSCLES: 'muscles',
  DIFFICULTIES: 'difficulties',
  DELETED_ITEMS: 'deleted_items' // For undo functionality
};

let db = null;

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

      // Create object store for programs
      if (!database.objectStoreNames.contains(STORES.PROGRAMS)) {
        database.createObjectStore(STORES.PROGRAMS, { keyPath: 'id' });
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
    };

    // onupgradeneeded handler ends here, close Promise constructor
  });
}

// Programs operations
export async function storePrograms(programsArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.PROGRAMS], 'readwrite');
  const store = transaction.objectStore(STORES.PROGRAMS);

  // Clear existing and add all programs
  await store.clear();

  programsArray.forEach(program => {
    store.put(program);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function programsLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.PROGRAMS], 'readonly');
  const store = transaction.objectStore(STORES.PROGRAMS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Modules operations
export async function storeModules(modulesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readwrite');
  const store = transaction.objectStore(STORES.MODULES);

  // Clear existing and add all modules
  await store.clear();

  modulesArray.forEach(module => {
    store.put(module);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function modulesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readonly');
  const store = transaction.objectStore(STORES.MODULES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getModuleById(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readonly');
  const store = transaction.objectStore(STORES.MODULES);

  return new Promise((resolve, reject) => {
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteModule(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MODULES], 'readwrite');
  const store = transaction.objectStore(STORES.MODULES);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);

    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
}

// Exercises operations
export async function storeExercises(exercisesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EXERCISES], 'readwrite');
  const store = transaction.objectStore(STORES.EXERCISES);

  // Clear existing and add all exercises
  await store.clear();
  
  exercisesArray.forEach(exercise => {
    store.put(exercise);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function exercisesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EXERCISES], 'readonly');
  const store = transaction.objectStore(STORES.EXERCISES);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getExerciseById(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EXERCISES], 'readonly');
  const store = transaction.objectStore(STORES.EXERCISES);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Workouts operations
export async function storeWorkout(workout) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.WORKOUTS], 'readwrite');
  const store = transaction.objectStore(STORES.WORKOUTS);
  
  return new Promise((resolve, reject) => {
    const request = store.add(workout);
    
    request.onsuccess = () => resolve({ success: true, id: request.result });
    request.onerror = (event) => {
      if (event.target.error.name === 'ConstraintError') {
        // Workout exists, update it
        const updateRequest = store.put(workout);
        updateRequest.onsuccess = () => resolve({ success: true });
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(request.error);
      }
    };
  });
}

export async function loadWorkouts(userId = null) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.WORKOUTS], 'readonly');
  const store = transaction.objectStore(STORES.WORKOUTS);
  
  return new Promise((resolve, reject) => {
    let request;
    
    if (userId) {
      const index = store.index('userId');
      request = index.getAll(userId);
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteWorkout(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.WORKOUTS], 'readwrite');
  const store = transaction.objectStore(STORES.WORKOUTS);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    
    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
}

// State operations (metadata only, not full exercises)
export async function storeState(key, value) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.STATE], 'readwrite');
  const store = transaction.objectStore(STORES.STATE);
  
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value });
    
    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(key) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.STATE], 'readonly');
  const store = transaction.objectStore(STORES.STATE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

// Clear database (for testing/debugging)
export async function clearDatabase() {
  const database = await openDatabase();
  const transaction = database.transaction(Object.values(STORES), 'readwrite');
  
  Object.values(STORES).forEach(storeName => {
    transaction.objectStore(storeName).clear();
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get database size (for debugging)
export async function getDatabaseSize() {
  const database = await openDatabase();
  
  // Estimate by counting records in each store
  const exerciseCount = await new Promise(resolve => {
    const transaction = database.transaction([STORES.EXERCISES], 'readonly');
    const count = transaction.objectStore(STORES.EXERCISES).count();
    count.onsuccess = () => resolve(count.result);
    count.onerror = () => resolve(0);
  });

  const workoutCount = await new Promise(resolve => {
    const transaction = database.transaction([STORES.WORKOUTS], 'readonly');
    const count = transaction.objectStore(STORES.WORKOUTS).count();
    count.onsuccess = () => resolve(count.result);
    count.onerror = () => resolve(0);
  });

  return {
    exerciseCount,
    workoutCount,
    estimatedSize: 'IndexedDB (much larger than localStorage)'
  };
}

// Categories operations
export async function storeCategories(categoriesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.CATEGORIES], 'readwrite');
  const store = transaction.objectStore(STORES.CATEGORIES);
  
  await store.clear();
  categoriesArray.forEach(category => {
    store.put(category);
  });
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function categoriesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.CATEGORIES], 'readonly');
  const store = transaction.objectStore(STORES.CATEGORIES);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Equipment operations
export async function storeEquipment(equipmentArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EQUIPMENT], 'readwrite');
  const store = transaction.objectStore(STORES.EQUIPMENT);
  
  await store.clear();
  equipmentArray.forEach(item => {
    store.put(item);
  });
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function equipmentLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.EQUIPMENT], 'readonly');
  const store = transaction.objectStore(STORES.EQUIPMENT);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Muscles operations
export async function storeMuscles(musclesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MUSCLES], 'readwrite');
  const store = transaction.objectStore(STORES.MUSCLES);
  
  await store.clear();
  musclesArray.forEach(muscle => {
    store.put(muscle);
  });
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function musclesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.MUSCLES], 'readonly');
  const store = transaction.objectStore(STORES.MUSCLES);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Difficulties operations
export async function storeDifficulties(difficultiesArray) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DIFFICULTIES], 'readwrite');
  const store = transaction.objectStore(STORES.DIFFICULTIES);
  
  await store.clear();
  difficultiesArray.forEach(difficulty => {
    store.put(difficulty);
  });
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve({ success: true });
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function difficultiesLoad() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DIFFICULTIES], 'readonly');
  const store = transaction.objectStore(STORES.DIFFICULTIES);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Deleted Items operations (Undo functionality)
export async function saveDeletedItem(type, item, originalId) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readwrite');
  const store = transaction.objectStore(STORES.DELETED_ITEMS);
  
  const deletedItem = {
    type,
    item,
    originalId,
    timestamp: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(deletedItem);
    
    request.onsuccess = () => resolve({ success: true, id: request.result });
    request.onerror = () => reject(request.error);
  });
}

export async function getDeletedItemsByType(type) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readonly');
  const store = transaction.objectStore(STORES.DELETED_ITEMS);
  const index = store.index('type');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(type);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDeletedItem(id) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readwrite');
  const store = transaction.objectStore(STORES.DELETED_ITEMS);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    
    request.onsuccess = () => resolve({ success: true });
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredDeletedItems(maxAgeMs) {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readwrite');
  const store = transaction.objectStore(STORES.DELETED_ITEMS);
  const index = store.index('timestamp');
  
  const cutoffTime = Date.now() - maxAgeMs;
  
  return new Promise((resolve, reject) => {
    const request = index.openCursor();
    let deletedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.timestamp < cutoffTime) {
          // Expired - delete this entry
          const deleteRequest = cursor.delete();
          deleteRequest.onsuccess = () => {
            deletedCount++;
            cursor.continue();
          };
          deleteRequest.onerror = () => {
            cursor.continue();
          };
        } else {
          // Not expired yet - continue searching
          cursor.continue();
        }
      } else {
        resolve({ success: true, deletedCount });
      }
    };
    
    request.onerror = () => reject(transaction.error);
  });
}

export async function getDeletedItemsCount() {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.DELETED_ITEMS], 'readonly');
  const store = transaction.objectStore(STORES.DELETED_ITEMS);
  
  return new Promise((resolve, reject) => {
    const request = store.count();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
