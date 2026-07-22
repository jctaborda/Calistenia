// PWA Offline Storage - Uses IndexedDB for large data (exercises, workouts)
// localStorage only stores small state values to avoid quota limits
// Loads locale-specific data files for reference data

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
import { getLocale } from '../i18n.js';
import { loadFromCacheOrFetch } from './cache-utils.js';
import { getDataFilename } from './data-cache.js';
import { generateNextId } from '../utils/array.js';

let exercisesCache = null;

export async function loadExercises() {
  // Try IndexedDB first (migrated from localStorage)
  const cached = await loadFromCacheOrFetch(
    () => exercisesLoad(),
    exercisesCache,
    'exercises'
  );
  if (cached && cached.length > 0) {
    exercisesCache = cached;
    return cached;
  }
  
  // Fall back to locale-specific data.json
  try {
    const filename = getDataFilename();
    const response = await fetch(filename);
    if (!response.ok) throw new Error('Failed to load exercises');
    const data = await response.json();
    exercisesCache = data.exercises;

    // Store in IndexedDB for offline access
    await storeExercises(data.exercises);

    return data.exercises;
  } catch (error) {
    console.error('Error loading exercises from data.json:', error);
    return [];
  }
}

export async function saveExercises(exercises) {
  try {
    // Import validation service for sanitization
    const validationService = await import('./validation.js');
    
    // Sanitize all user-generated content before saving to prevent XSS
    const sanitizedExercises = Array.isArray(exercises) 
  ? exercises.map(exercise => validationService.ValidationService.sanitizeExercise(exercise))
  : exercises;
    
    // Store in IndexedDB instead of localStorage
    await storeExercises(sanitizedExercises);
    
    // Update cache
    exercisesCache = sanitizedExercises;
    
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
    
    // Generate new ID using utility function
    exercise.id = generateNextId(exercises);
    
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

// Clear in-memory exercises cache for locale switching
export function clearExercisesCache() {
  exercisesCache = null;
}
