// PWA Offline Storage - Uses IndexedDB for large data (exercises, workouts)
// localStorage only stores small state values to avoid quota limits

import {
  storeExercises,
  exercisesLoad,
  getExerciseById,
  storeWorkout,
  loadWorkouts,
  deleteWorkout,
  clearDatabase,
  getDatabaseSize
} from './database.js';

let exercisesCache = null;

export async function loadExercises() {
  // Try IndexedDB first (migrated from localStorage)
  try {
    const cached = await exercisesLoad();
    if (cached && cached.length > 0) {
      exercisesCache = cached;
      return cached;
    }
  } catch (error) {
    console.error('Error loading exercises from IndexedDB:', error);
  }
  
  // Fall back to data.json
  try {
    const response = await fetch('./data/data.json');
    if (!response.ok) throw new Error('Failed to load exercises');
    const data = await response.json();
    exercisesCache = data.exercises;
    
    // Store in IndexedDB for offline access
    await storeExercises(data.exercises);
    
    return data.exercises;
  } catch (error) {
    console.error('Error loading exercises:', error);
    return [];
  }
}

export async function saveExercises(exercises) {
  try {
    // Store in IndexedDB instead of localStorage
    await storeExercises(exercises);
    
    // Update cache
    exercisesCache = exercises;
    
    console.log('Exercises saved to IndexedDB');
    return { success: true, message: 'Saved to IndexedDB' };
  } catch (error) {
    console.error('Error saving exercises:', error);
    throw error;
  }
}

// Exercise CRUD operations using IndexedDB
export const ExerciseStore = {
  async getAll() {
    return loadExercises();
  },

  async getById(id) {
    return getExerciseById(id);
  },

  async add(exercise) {
    const exercises = await this.getAll();
    
    // Generate new ID (max id + 1)
    const maxId = Math.max(...exercises.map(e => e.id), 0);
    exercise.id = maxId + 1;
    
    exercises.push(exercise);
    await saveExercises(exercises);
    
    return { success: true, exercise };
  },

  async update(exercise) {
    const exercises = await this.getAll();
    const index = exercises.findIndex(e => e.id === exercise.id);
    
    if (index === -1) {
      throw new Error('Exercise not found');
    }
    
    exercises[index] = exercise;
    await saveExercises(exercises);
    
    return { success: true };
  },

  async delete(id) {
    const exercises = await this.getAll();
    const filtered = exercises.filter(e => e.id !== id);
    
    if (filtered.length === exercises.length) {
      throw new Error('Exercise not found');
    }
    
    await saveExercises(filtered);
    return { success: true };
  }
};

// Generic CRUD store for any data type from consolidated data.json
export function createStore(name, filename) {
  // For now, just load from data.json (read-only for reference data)
  return {
    async getAll() {
      try {
        const response = await fetch('./data/data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        return data[name] || [];
      } catch (error) {
        console.error(`Error loading ${name}:`, error);
        return [];
      }
    },

    async getById(id) {
      const items = await this.getAll();
      return items.find(item => item.id === id);
    },

    // Note: Reference data (categories, equipment, etc.) is read-only from data.json
    async add(item) {
      throw new Error('Cannot modify reference data. Edit data/data.json instead.');
    },

    async update(item) {
      throw new Error('Cannot modify reference data. Edit data/data.json instead.');
    },

    async delete(id) {
      throw new Error('Cannot modify reference data. Edit data/data.json instead.');
    }
  };
}

// Workout operations using IndexedDB
export const WorkoutStore = {
  async getAll(userId = null) {
    return loadWorkouts(userId);
  },

  async add(workout) {
    await storeWorkout(workout);
    return { success: true, id: workout.id };
  },

  async update(workout) {
    await storeWorkout(workout);
    return { success: true };
  },

  async delete(id) {
    await deleteWorkout(id);
    return { success: true };
  }
};

// Clear database (for debugging/testing)
export async function clearExerciseData() {
  try {
    await clearDatabase();
    exercisesCache = null;
    console.log('IndexedDB cleared');
    return { success: true };
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

// Get database stats
export async function getStorageStats() {
  return getDatabaseSize();
}
