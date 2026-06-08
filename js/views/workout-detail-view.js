import { getState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { formatDate, formatWorkoutDate } from '../utils/date-formatter.js';
import { show } from '../services/toast-service.js';
import { formatDuration } from '../utils/formatters.js';

export function renderWorkoutDetailView(workoutIndex) {
  const main = document.getElementById('app');
  const state = getState();
  const { history = [], exercises = [] } = state;
  const workout = history[workoutIndex];

  if (!workout) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Workout not found.</p></div>';
    return;
  }

  // Calculate detailed statistics
  const stats = calculateWorkoutStatistics(workout);

  // Group exercises by phase (warmup, main, cooldown) if available
  const exercisesList = workout.exercises || [];

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="workout-detail-header">
        <h1>${workout.routine?.name || 'Custom Workout'}</h1>
        <p class="workout-date">${formatDate(workout.date)}</p>
      </div>

      <!-- Statistics Overview -->
      <div class="stats-overview">
        <h2>📊 Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">${stats.totalSets}</span>
            <span class="stat-label">Sets Completed</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${stats.totalReps}</span>
            <span class="stat-label">Total Reps</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${formatDuration(stats.totalDuration)}</span>
            <span class="stat-label">Total Duration</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${formatDuration(stats.avgRestTime)}</span>
            <span class="stat-label">Avg Rest Time</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${formatDuration(stats.avgSetTime)}</span>
            <span class="stat-label">Avg Set Time</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${exercisesList.length}</span>
            <span class="stat-label">Exercises</span>
          </div>
        </div>
      </div>

      <!-- Exercise Details -->
      <div class="exercise-details">
        <h2>💪 Exercise Details</h2>
        ${exercisesList.map((exercise, exIndex) => `
          <div class="exercise-card">
            <h3>${exercise.exerciseName}</h3>
            <p class="exercise-target"><strong>Target:</strong> ${exercise.targetSets} sets × ${exercise.targetReps} reps</p>
            
            <div class="sets-table">
              <table>
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Reps</th>
                    <th>Set Time</th>
                    <th>Rest Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${exercise.actualReps.map((reps, setIndex) => {
                    const setDetail = stats.setDetails[exIndex]?.[setIndex];
                    const setTime = setDetail?.setTime ?? 0;
                    const restTime = setDetail?.restTime ?? 0;
                    
                    // Don't show rest time for the last set
                    const isLastSet = setIndex === exercise.actualReps.length - 1;
                    const displayRestTime = isLastSet ? 0 : restTime;
                    
                    return `
                    <tr>
                      <td>${setIndex + 1}</td>
                      <td><strong>${reps}</strong></td>
                      <td>${setTime > 0 ? formatDuration(setTime) : '-'}</td>
                      <td>${displayRestTime > 0 ? formatDuration(displayRestTime) : (isLastSet ? '-' : '-')}</td>
                    </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Action Buttons -->
      <div class="workout-actions">
        <button id="copy-workout-btn" class="btn btn-primary">📋 Copy to Memory</button>
        <button id="share-workout-btn" class="btn btn-secondary">📤 Share Workout</button>
        <button id="back-btn" class="btn btn-secondary">← Back to Profile</button>
      </div>
    </div>
  `;

  // Wire up event handlers
  const copyBtn = main.querySelector('#copy-workout-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyWorkoutToMemory(workout, exercisesList));
  }

  const shareBtn = main.querySelector('#share-workout-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => shareWorkout(workout, exercisesList, stats));
  }

  const backBtn = main.querySelector('#back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.hash = '#profile';
    });
  }
}

/**
 * Calculate comprehensive statistics for a workout
 */
function calculateWorkoutStatistics(workout) {
  const exercises = workout.exercises || [];
  const setHistory = workout.setHistory || [];
  
  // Initialize setDetails structure
  const setDetails = {};
  exercises.forEach((_, exIndex) => {
    setDetails[exIndex] = [];
  });

  // Calculate from setHistory if available (from active workout tracking)
  let totalSets = 0;
  let totalReps = 0;
  let totalWorkTime = 0;
  let totalRestTime = 0;

  exercises.forEach((exercise, exIndex) => {
    const actualReps = exercise.actualReps || [];
    totalSets += actualReps.length;
    totalReps += actualReps.reduce((sum, reps) => sum + reps, 0);
  });

  // If we have setHistory from active workout tracking
  if (setHistory.length > 0) {
    setHistory.forEach(setEntry => {
      totalWorkTime += setEntry.duration || 0;
      totalRestTime += setEntry.actualRestTime || 0;

      const exIndex = setEntry.exerciseIndex;
      const setIndex = setEntry.setIndex;

      if (setDetails[exIndex]) {
        setDetails[exIndex][setIndex] = {
          setTime: setEntry.duration || 0,
          restTime: setEntry.actualRestTime || 0
        };
      }
    });
  }

  const totalDuration = totalWorkTime + totalRestTime;
  const avgRestTime = totalSets > 0 ? totalRestTime / totalSets : 0;
  const avgSetTime = totalSets > 0 ? totalWorkTime / totalSets : 0;

  return {
    totalSets,
    totalReps,
    totalDuration,
    totalWorkTime,
    totalRestTime,
    avgRestTime,
    avgSetTime,
    setDetails
  };
}

/**
 * Copy workout to memory (clipboard)
 */
function copyWorkoutToMemory(workout, exercises) {
  const stats = calculateWorkoutStatistics(workout);
  
  // Create a formatted text summary
  let summary = `🏋️ **Workout: ${workout.routine?.name || 'Custom Workout'}**\n`;
  summary += `📅 Date: ${formatDate(workout.date)}\n\n`;
  
  summary += `📊 **Statistics**\n`;
  summary += `- Sets Completed: ${stats.totalSets}\n`;
  summary += `- Total Reps: ${stats.totalReps}\n`;
  summary += `- Duration: ${formatDuration(stats.totalDuration)}\n`;
  summary += `- Avg Rest: ${formatDuration(stats.avgRestTime)}\n`;
  summary += `- Avg Set Time: ${formatDuration(stats.avgSetTime)}\n\n`;
  
  summary += `💪 **Exercises**\n`;
  exercises.forEach((exercise, exIndex) => {
    summary += `\n**${exercise.exerciseName}**\n`;
    summary += `Target: ${exercise.targetSets} sets × ${exercise.targetReps} reps\n`;
    summary += `Sets:\n`;
    
    exercise.actualReps.forEach((reps, setIndex) => {
      const setTime = stats.setDetails[exIndex]?.[setIndex]?.setTime || 0;
      const restTime = stats.setDetails[exIndex]?.[setIndex]?.restTime || 0;
      summary += `  - Set ${setIndex + 1}: ${reps} reps`;
      if (setTime > 0) summary += ` (${formatDuration(setTime)})`;
      if (restTime > 0 && setIndex < exercise.actualReps.length - 1) {
        summary += ` | Rest: ${formatDuration(restTime)}`;
      }
      summary += '\n';
    });
  });

  // Copy to clipboard
  navigator.clipboard.writeText(summary).then(() => {
    show('Workout copied to clipboard! You can paste it anywhere.', 'success');
  }).catch(err => {
    show('Failed to copy workout. Please try again.', 'error');
    console.error('Copy error:', err);
  });
}

/**
 * Share workout (open share dialog or create shareable link)
 */
function shareWorkout(workout, exercises, stats) {
  // For now, just copy to clipboard with a share-friendly format
  copyWorkoutToMemory(workout, exercises);
  show('Workout copied! Share it with your trainer or friends.', 'info');
}

// Export for router usage
window.renderWorkoutDetailView = renderWorkoutDetailView;

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderWorkoutDetailView };
