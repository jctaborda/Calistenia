// js/utils/helpers.js - Shared utility functions to eliminate duplicate code patterns

/**
 * Get CSS class name for difficulty level
 * @param {string|number|Array} difficulty - Difficulty value (string, numeric ID, or array)
 * @returns {string} Difficulty class for CSS styling
 */
export function getDifficultyColor(difficulty) {
  const difficultyMap = {
    1: 'beginner',
    2: 'intermediate',
    3: 'advanced',
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced'
  };

  let value = difficulty;
  if (Array.isArray(value) && value.length > 0) {
    value = value[0];
  }
  if (typeof value === 'string') {
    value = value.toLowerCase();
  }

  return difficultyMap[value] || 'intermediate';
}

/**
 * Get difficulty class for an exercise based on its ID
 * @param {number|string} exerciseId - Exercise ID
 * @param {Array} exercises - Array of exercise objects
 * @returns {string} Difficulty class for CSS styling
 */
export function getDifficultyClass(exerciseId, exercises) {
  if (!exerciseId || !exercises || !Array.isArray(exercises)) {
    return 'intermediate';
  }

  const exercise = exercises.find(e => String(e.id) === String(exerciseId));
  if (!exercise || !exercise.difficulty) {
    return 'intermediate';
  }

  return getDifficultyColor(exercise.difficulty);
}

/**
 * Check if a module is completed based on workout history
 * @param {Array} exercises - Array of exercise IDs in the module
 * @param {Array} history - Array of completed workouts
 * @returns {boolean} True if all exercises in the module have been completed
 */
export function isModuleCompleted(exercises, history) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return false;
  }
  
  if (!Array.isArray(history) || history.length === 0) {
    return false;
  }
  
  // Get all exercise IDs from the module
  const moduleExerciseIds = exercises.map(ex => String(ex.exerciseId));
  
  // Check if any workout in history contains all module exercises
  for (const workout of history) {
    if (!workout.progress) continue;
    
    // Get all exercise IDs completed in this workout
    const completedExerciseIds = Object.keys(workout.progress).map(id => String(id));
    
    // Check if all module exercises were completed in this workout
    const allCompleted = moduleExerciseIds.every(exId => completedExerciseIds.includes(exId));
    
    if (allCompleted) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if an exercise has been completed in workout history
 * @param {number|string} exerciseId - Exercise ID to check
 * @param {Array} history - Array of completed workouts
 * @returns {boolean} True if the exercise has been completed at least once
 */
export function isExerciseCompleted(exerciseId, history) {
  if (!exerciseId || !Array.isArray(history) || history.length === 0) {
    return false;
  }
  
  // Normalize exerciseId to string for consistent comparison
  const normalizedId = String(exerciseId);
  
  for (const workout of history) {
    if (!workout.progress) continue;
    
    // Check if this exercise was completed in this workout
    const completedExerciseIds = Object.keys(workout.progress).map(id => String(id));
    if (completedExerciseIds.includes(normalizedId)) {
      return true;
    }
  }
  
  return false;
}
