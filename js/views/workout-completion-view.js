import { getState, setState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { checkAchievements } from '../services/achievements.js';
import { show } from '../services/toast-service.js';

export async function renderWorkoutCompletionView() {
  const main = document.getElementById('app');
  const state = await getState();
  const { activeWorkout, exercises = [], history = [] } = state;
  
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<div class="card"><p>No active workout to complete.</p></div>';
    return;
  }

  const program = activeWorkout.program;
  
  // Calculate workout statistics from setHistory
  const workoutStats = calculateWorkoutStats(activeWorkout);
  
  // Check for new achievements after workout completion
  const newlyUnlockedAchievements = checkAchievements({ date: new Date().toISOString() });
  
  // Show toast notifications for newly unlocked achievements
  if (newlyUnlockedAchievements.length > 0) {
    newlyUnlockedAchievements.forEach(ach => {
  show(`🎉 Achievement Unlocked: ${ach.name}! ${ach.description}`, 'success');
    });
  }

  main.innerHTML = renderHeader() + `
    <div class="card">
  <h1>Workout Complete!</h1>
  <h2>${program.name}</h2>
  
  ${workoutStats.totalDuration ? `
  <div class="workout-stats">
    <h3>📊 Workout Statistics</h3>
    <p><strong>Total Duration:</strong> ${formatDuration(workoutStats.totalDuration)}</p>
    <p><strong>Total Sets Completed:</strong> ${workoutStats.totalSets}</p>
    <p><strong>Avg Rest Time:</strong> ${formatDuration(workoutStats.avgRestTime)}</p>
  </div>
  ` : ''}
  
  <p>Great job! Now let's log the reps you actually completed for each set.</p>
  
  ${newlyUnlockedAchievements.length > 0 ? `
  <div class="achievements-unlocked">
  <h3>🎉 Achievements Unlocked!</h3>
  ${newlyUnlockedAchievements.map(ach => `
  <div class="achievement-item">
  <span class="achievement-emoji">${ach.emoji}</span>
  <div class="achievement-details">
  <strong>${ach.name}</strong>
  <p>${ach.description}</p>
  </div>
  </div>
  `).join('')}
  </div>
  ` : ''}
  
  <form id="workout-completion-form">
  ${program.exercises.map((exerciseData, exerciseIndex) => {
  const exercise = exercises.find(e => String(e.id) === String(exerciseData.exerciseId));
  return `
  <div class="card completion-exercise-card">
  <h3>${exercise ? exercise.name : 'Unknown Exercise'}</h3>
  <p><strong>Target:</strong> ${exerciseData.sets} sets × ${exerciseData.reps} reps</p>
  
  ${Array.from({ length: exerciseData.sets }, (_, setIndex) => `
  <div class="set-input-row">
  <label>
  Set ${setIndex + 1} - Reps completed:
  <input type="number" 
  name="exercise-${exerciseIndex}-set-${setIndex}" 
  min="0" 
  max="100" 
  value="${exerciseData.reps}"
  class="reps-input">
  </label>
  </div>
  `).join('')}
  </div>
  `;
  }).join('')}
  
  <div class="form-actions">
  <button type="submit" class="btn save-workout-btn">Save Workout Log</button>
  <button type="button" id="skip-logging-btn" class="btn skip-workout-btn">Skip Logging</button>
  </div>
  </form>
    </div>
  `;

  const form = main.querySelector('#workout-completion-form');
  if (form) {
    form.addEventListener('submit', e => {
  e.preventDefault();
  
  // Collect all the rep data
  const workoutLog = {
  program: program,
  date: new Date().toISOString(),
  exercises: program.exercises.map((exerciseData, exerciseIndex) => {
  const exercise = exercises.find(e => String(e.id) === String(exerciseData.exerciseId));
  const sets = Array.from({ length: exerciseData.sets }, (_, setIndex) => {
  const input = form.querySelector(`input[name="exercise-${exerciseIndex}-set-${setIndex}"]`);
  return parseInt(input.value) || 0;
  });
  
  return {
  exerciseId: exerciseData.exerciseId,
  exerciseName: exercise ? exercise.name : 'Unknown Exercise',
  targetSets: exerciseData.sets,
  targetReps: exerciseData.reps,
  actualReps: sets
  };
  }),
  // Include setHistory for detailed timing statistics
  setHistory: activeWorkout.setHistory || []
  };
  
  // Save to history
  const state = getState();
  const history = state.history || [];
  updateState({
  history: [...history, workoutLog],
  activeWorkout: null
  });
  
  // Navigate to summary with difficulty feedback
  window.location.hash = '#summary';
    });
  }

  const skipBtn = main.querySelector('#skip-logging-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
  updateState({ activeWorkout: null });
  window.location.hash = '#summary';
    });
  }
}

/**
 * Calculate workout statistics from setHistory
 */
function calculateWorkoutStats(activeWorkout) {
  const setHistory = activeWorkout.setHistory || [];
  
  if (setHistory.length === 0) {
    return { totalDuration: 0, totalSets: 0, avgRestTime: 0 };
  }
  
  // Count only actual workout sets (exclude rest periods)
  // Each set entry represents one workout set, rest times are stored as actualRestTime
  const totalSets = setHistory.length;
  
  // Calculate total work time
  const totalWorkTime = setHistory.reduce((sum, set) => sum + (set.duration || 0), 0);
  
  // Calculate total rest time (only count actual rest times, not the rest after the last set)
  const totalRestTime = setHistory.reduce((sum, set) => {
    // Only count rest time if it's not zero (last set won't have rest)
    return sum + (set.actualRestTime || 0);
  }, 0);
  
  const avgRestTime = totalSets > 0 ? totalRestTime / totalSets : 0;
  
  // Calculate total workout duration (work time + rest time)
  const totalDuration = totalWorkTime + totalRestTime;
  
  return {
    totalDuration,
    totalSets,
    avgRestTime,
    totalWorkTime,
    totalRestTime
  };
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Export for router usage
window.renderWorkoutCompletionView = renderWorkoutCompletionView;


// Export as object for wrapView compatibility
export default { render: renderWorkoutCompletionView };