// IndexedDB helper for PWA - stores large data (exercises, workouts) efficiently
// Avoids localStorage quota limits

const DB_NAME = 'calisthenics-db';
const DB_VERSION = 1;
const STORES = {
  EXERCISES: 'exercises',
  WORKOUTS: 'workouts',
  STATE: 'state',
  MODULES: 'modules' // Add modules store
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
    };
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
