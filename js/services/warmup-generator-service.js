/**
 * WarmUpGeneratorService - Generates dynamic warm-ups based on muscles targeted in a routine
 */

export class WarmUpGeneratorService {
  /**
   * Generate a warm-up routine based on muscles targeted in the main routine
   * @param {object} routine - The routine object with exercises array
   * @param {Array} exercises - Array of all available exercises to choose from
   * @param {Array} muscles - Array of muscle group data
   * @returns {Array} Array of warm-up exercises with sets, reps, and rest
   */
  generateWarmUp(routine, exercises, muscles) {
    if (!routine || !routine.exercises || routine.exercises.length === 0) {
      return [];
    }

    // Collect all targeted muscles from the routine
    const targetedMuscleIds = new Set();
    const muscleGroupCounts = {};

    routine.exercises.forEach(ex => {
      const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
      if (exercise) {
        // Add primary muscles
        (exercise.muscles || []).forEach(muscleId => {
          targetedMuscleIds.add(muscleId);
          muscleGroupCounts[muscleId] = (muscleGroupCounts[muscleId] || 0) + 1;
        });
        // Add secondary muscles
        (exercise.muscles_secondary || []).forEach(muscleId => {
          targetedMuscleIds.add(muscleId);
          muscleGroupCounts[muscleId] = (muscleGroupCounts[muscleId] || 0) + 0.5;
        });
      }
    });

    // Sort muscles by frequency (most targeted first)
    const sortedMuscleIds = Object.entries(muscleGroupCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => parseInt(id));

    // Generate warm-up exercises for top 3-4 muscle groups
    const warmUpExercises = [];
    const maxWarmUpExercises = Math.min(sortedMuscleIds.length, 4);

    for (let i = 0; i < maxWarmUpExercises; i++) {
      const muscleId = sortedMuscleIds[i];
      const muscle = muscles.find(m => m.id === muscleId);
      
      if (muscle) {
        const muscleWarmUp = this.getMuscleSpecificWarmUp(muscleId, exercises);
        if (muscleWarmUp) {
          warmUpExercises.push(muscleWarmUp);
        }
      }
    }

    // Add general mobility warm-up if no specific exercises found
    if (warmUpExercises.length === 0) {
      return this.getGeneralWarmUp(exercises);
    }

    return warmUpExercises;
  }

  /**
   * Get warm-up exercises specific to a muscle group
   * @param {number} muscleId - Muscle group ID
   * @param {Array} exercises - All available exercises
   * @returns {object|null} Warm-up exercise object or null
   */
  getMuscleSpecificWarmUp(muscleId, exercises) {
    const muscle = this.getMuscleById(muscleId);
    if (!muscle) return null;

    // Find beginner-level exercises that target this muscle
    const suitableExercises = exercises.filter(ex => {
      const targetsMuscle = 
        (ex.muscles || []).includes(muscleId) || 
        (ex.muscles_secondary || []).includes(muscleId);
      const isBeginner = ex.difficulty === 'beginner';
      return targetsMuscle && isBeginner;
    });

    if (suitableExercises.length === 0) {
      return null;
    }

    // Pick a random suitable exercise
    const exercise = suitableExercises[Math.floor(Math.random() * suitableExercises.length)];

    return {
      exerciseId: exercise.id,
      sets: 2,
      reps: '10-12',
      restTime: 30,
      name: exercise.name,
      muscleGroup: muscle.name
    };
  }

  /**
   * Get general mobility warm-up exercises
   * @param {Array} exercises - All available exercises
   * @returns {Array} Array of general warm-up exercises
   */
  getGeneralWarmUp(exercises) {
    // Common general warm-up exercises (shoulder circles, arm swings, etc.)
    const generalWarmUpIds = [
      // Find exercises that are good general warm-ups
      ...exercises.filter(ex => 
        ex.difficulty === 'beginner' && 
        (ex.muscles?.[0] === 1 || ex.muscles?.[0] === 2) // Chest or back
      ).slice(0, 2).map(ex => ex.id)
    ];

    if (generalWarmUpIds.length === 0) {
      // Fallback: just return an empty array
      return [];
    }

    return generalWarmUpIds.map(exerciseId => ({
      exerciseId,
      sets: 2,
      reps: '10-12',
      restTime: 30
    }));
  }

  /**
   * Get muscle data by ID
   * @param {number} muscleId - Muscle ID
   * @returns {object|null} Muscle data
   */
  getMuscleById(muscleId) {
    // This would typically come from state, but for now we'll return a simple object
    const muscleNames = {
      1: 'Chest',
      2: 'Back',
      3: 'Shoulders',
      4: 'Biceps',
      5: 'Triceps',
      6: 'Quadriceps',
      7: 'Hamstrings',
      8: 'Glutes',
      9: 'Calves',
      10: 'Abs',
      11: 'Obliques',
      12: 'Forearms'
    };

    return {
      id: muscleId,
      name: muscleNames[muscleId] || `Muscle ${muscleId}`
    };
  }

  /**
   * Get suggested warm-up duration in minutes
   * @param {Array} warmUpExercises - Array of warm-up exercises
   * @returns {number} Duration in minutes
   */
  getWarmUpDuration(warmUpExercises) {
    if (!warmUpExercises || warmUpExercises.length === 0) {
      return 5;
    }

    // Estimate: ~1-2 minutes per exercise including rest
    return Math.round(warmUpExercises.length * 1.5);
  }
}

// Export singleton instance
export const warmUpGeneratorService = new WarmUpGeneratorService();
