/**
 * WorkoutWorkflowService - Handles workout progression logic (set completion, exercise transitions, etc.)
 * Separated from view to keep business logic organized
 */

export class WorkoutWorkflowService {
  /**
   * Get warmup length from routine (cached per call)
   */
  _getWarmupLength(routine) {
    return (routine.warmup && routine.warmup.length) ? routine.warmup.length : 0;
  }

  /**
   * Handle completing a set of current exercise
   * @param {object} activeWorkout - Current workout state
   * @param {number} currentExerciseIndex - Index of current exercise
   * @param {number} currentSetIndex - Current set index
   * @param {object} currentExerciseData - Exercise data for current exercise
   * @param {object} routine - Routine object
   * @returns {object} Result object with next state and action to take
   */
  completeSet(activeWorkout, currentExerciseIndex, currentSetIndex, currentExerciseData, routine) {
    const newSetIndex = currentSetIndex + 1;

    // Determine workout phases
    const warmupLength = this._getWarmupLength(routine);
    const mainExercisesLength = routine.exercises.length;
    const cooldownLength = (routine.cooldown && routine.cooldown.length) ? routine.cooldown.length : 0;
    const totalExercises = warmupLength + mainExercisesLength + cooldownLength;

    let nextState = { ...activeWorkout };
    let action = 'next_set'; // 'next_set', 'next_exercise', 'complete_workout'

    if (newSetIndex >= currentExerciseData.sets) {
      // Finished all sets of this exercise
      const newExerciseIndex = currentExerciseIndex + 1;

      if (newExerciseIndex >= totalExercises) {
        // Completed entire workout
        nextState.currentExerciseIndex = newExerciseIndex;
        nextState.currentSetIndex = 0;
        action = 'complete_workout';
      } else {
        // Move to next exercise
        nextState.currentExerciseIndex = newExerciseIndex;
        nextState.currentSetIndex = 0;
        action = 'next_exercise';
      }
    } else {
      // Just move to next set of same exercise
      nextState.currentSetIndex = newSetIndex;
      action = 'next_set';
    }

    return {
      newState: nextState,
      action,
      totalExercises,
      warmupLength,
      mainExercisesLength,
      cooldownLength
    };
  }

  /**
   * Determine current phase (warmup, main, or cooldown)
   * @param {number} exerciseIndex - Current exercise index
   * @param {object} routine - Routine object
   * @returns {string} Phase name: 'warmup', 'main', or 'cooldown'
   */
  getCurrentPhase(exerciseIndex, routine) {
    const warmupLength = this._getWarmupLength(routine);
    const mainExercisesLength = routine.exercises.length;

    if (exerciseIndex < warmupLength) {
      return 'warmup';
    } else if (exerciseIndex >= warmupLength + mainExercisesLength) {
      return 'cooldown';
    } else {
      return 'main';
    }
  }

  /**
   * Get the actual exercise index within a phase
   * @param {number} globalExerciseIndex - Index in the full workout
   * @param {object} routine - Routine object
   * @returns {object} Object with phase and local index
   */
  getPhaseInfo(globalExerciseIndex, routine) {
    const warmupLength = this._getWarmupLength(routine);
    const mainExercisesLength = routine.exercises.length;

    if (globalExerciseIndex < warmupLength) {
      return { phase: 'warmup', localIndex: globalExerciseIndex };
    } else if (globalExerciseIndex >= warmupLength + mainExercisesLength) {
      return { 
        phase: 'cooldown', 
        localIndex: globalExerciseIndex - warmupLength - mainExercisesLength 
      };
    } else {
      return {
        phase: 'main',
        localIndex: globalExerciseIndex - warmupLength
      };
    }
  }

  /**
   * Get exercise data based on phase and index
   * @param {number} globalIndex - Global exercise index
   * @param {object} routine - Routine object
   * @returns {object|null} Exercise data or null if not found
   */
  getExerciseData(globalIndex, routine) {
    const { phase, localIndex } = this.getPhaseInfo(globalIndex, routine);

    let exercisesArray;
    if (phase === 'warmup') {
      exercisesArray = routine.warmup || [];
    } else if (phase === 'cooldown') {
      exercisesArray = routine.cooldown || [];
    } else {
      exercisesArray = routine.exercises;
    }

    return exercisesArray[localIndex] || null;
  }

  /**
   * Check if workout is HIIT/Tabata type
   * @param {object} activeWorkout - Current workout state
   * @returns {boolean} True if HIIT workout
   */
  isHIITWorkout(activeWorkout) {
    return activeWorkout.workoutType === 'hiit' || activeWorkout.type === 'hiit';
  }

  /**
   * Check if current exercise is the last one in its phase
   * @param {number} exerciseIndex - Current exercise index
   * @param {object} routine - Routine object
   * @returns {boolean} True if last exercise
   */
  isLastExercise(exerciseIndex, routine) {
    const { phase, localIndex } = this.getPhaseInfo(exerciseIndex, routine);

    let totalInPhase;
    if (phase === 'warmup') {
      totalInPhase = (routine.warmup && routine.warmup.length) ? routine.warmup.length : 0;
    } else if (phase === 'cooldown') {
      totalInPhase = (routine.cooldown && routine.cooldown.length) ? routine.cooldown.length : 0;
    } else {
      totalInPhase = routine.exercises.length;
    }

    return localIndex >= totalInPhase - 1;
  }

  /**
   * Clean up any timers or event listeners when workout is complete
   */
  cleanup() {
    // If using external timer service, call its cleanup
    if (typeof workoutTimerService !== 'undefined' && workoutTimerService.cleanup) {
      workoutTimerService.cleanup();
    }
  }
}

// Export singleton instance
export const workoutWorkflowService = new WorkoutWorkflowService();
