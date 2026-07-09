// js/utils/workout-summary.js - Shared workout summary formatting and chart helpers

/**
 * Format workout data for social media / clipboard sharing
 * @param {Object} workout - Workout object with routine and exercises
 * @returns {string} Formatted summary string
 */
export function formatWorkoutSummary(workout) {
  const routine = workout?.routine;
  const date = new Date(workout?.date || Date.now()).toLocaleDateString();

  let summary = `💪 *Workout Summary*\n`;
  summary += `------------------------------------------------------------\n\n`;
  summary += `📅 *Date:* ${date}\n`;
  summary += `🏋 *Routine:* ${routine?.name || 'Custom Workout'}\n\n`;
  summary += `🔥 *Exercises Completed:* \n`;

  const exercises = workout?.exercises || [];
  exercises.forEach((exercise, index) => {
    summary += `\n${index + 1}. *${exercise.exerciseName}*\n`;
    summary += `   Target: ${exercise.targetSets} sets ✕ ${exercise.targetReps} reps\n`;
    summary += `   Actual: ${(exercise.actualReps || []).join(' ✕ ')} reps`;
  });

  summary += `\n\n------------------------------------------------------------\n`;
  summary += `Great job! Keep pushing your limits! 💯\n`;

  return summary;
}

/**
 * Get exercise progress data for chart visualization
 * @param {number} exerciseId - ID of the exercise
 * @param {Array} history - Workout history array
 * @returns {Array} Array of {date, totalReps, totalVolume} objects
 */
export function getExerciseProgressData(exerciseId, history) {
  return (history || [])
    .filter(w => w.progress && w.progress[exerciseId])
    .map(w => {
      const repsArray = w.progress[exerciseId];
      const totalReps = repsArray.reduce((sum, reps) => sum + reps, 0);
      
      // Calculate volume if weight data available
      let totalVolume = 0;
      if (w.exercises) {
        const exercise = w.exercises.find(ex => ex.exerciseId === exerciseId);
        if (exercise && exercise.actualRepsWithWeight) {
          exercise.actualRepsWithWeight.forEach(set => {
            const reps = typeof set === 'object' ? set.reps : set;
            const weight = typeof set === 'object' ? (set.weight || 0) : 0;
            totalVolume += reps * weight;
          });
        }
      }
      
      return {
        date: w.date,
        totalReps,
        totalVolume
      };
    });
}
