import { getState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getUnlockedAchievements } from '../services/achievements.js';

export function renderWorkoutSummaryView() {
  const main = document.getElementById('app');
  const { history = [] } = getState();
  
  // Get the most recent workout
  const lastWorkout = history.length > 0 ? history[history.length - 1] : null;
  
  // Get unlocked achievements to display
  const unlockedAchievements = getUnlockedAchievements();

  main.innerHTML = renderHeader() + `
    <div class="card">
  <h1>Workout Complete!</h1>
  
  ${lastWorkout ? `
  <h2>${lastWorkout.program.name}</h2>
  <p>You completed ${lastWorkout.exercises.length} exercises today! Great work!</p>
  ` : ''}
  
  ${unlockedAchievements.length > 0 ? `
  <div class="achievements-section">
  <h3>🎉 Recent Achievements</h3>
  ${unlockedAchievements.slice(0, 5).map(ach => `
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
  
  <h3 class="feedback-heading">How was today's workout?</h3>
  <p class="feedback-instruction">Rate the difficulty to help us improve your future workouts:</p>
  
  <div class="difficulty-buttons">
  <button class="btn btn-difficulty btn-difficult-easy" data-rating="too_easy">
  😊 Too Easy
  </button>
  <button class="btn btn-difficulty btn-difficulty-right" data-rating="just_right">
  😐 Just Right
  </button>
  <button class="btn btn-difficulty btn-difficulty-hard" data-rating="too_hard">
  😓 Too Hard
  </button>
  </div>
  
  <div id="adaptive-suggestion" class="adaptive-suggestion hidden"></div>
  
  <div class="summary-actions">
  <button class="btn share-workout-btn" onclick="shareWorkout()">📋 Copy to Clipboard</button>
  <button class="btn btn-secondary back-to-home-btn" onclick="window.location.hash = '#home'">Back to Home</button>
  <button class="btn btn-secondary view-profile-btn" onclick="window.location.hash = '#profile'">View Profile</button>
  </div>
    </div>
  `;

  // Add difficulty rating event listeners
  const difficultyButtons = main.querySelectorAll('.btn-difficulty');
  difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
  const rating = btn.getAttribute('data-rating');
  
  // Update adaptive suggestion based on rating
  showAdaptiveSuggestion(rating);
  
  // Save the rating to user state (for achievement checking)
  const state = getState();
  const user = state.user || {};
  user.lastDifficultyRating = rating;
  updateState({ user });
  
  // Hide buttons after selection
  difficultyButtons.forEach(b => b.disabled = true);
    });
  });

// Expose shareWorkout globally for onclick handler
window.shareWorkout = async function() {
  // Also export as window variable for legacy compatibility
    if (!lastWorkout) {
  alert('No workout to share.');
  return;
    }
    
    // Format workout summary for social media/WhatsApp
    const workoutText = formatWorkoutSummary(lastWorkout);
    
    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
  navigator.clipboard.writeText(workoutText).then(() => {
    alert('✅ Workout summary copied to clipboard!\n\nYou can now paste it in WhatsApp, social media, or any text message.');
  }).catch(() => {
    // Fallback: show text for manual copy
    prompt('Copy the workout summary below:', workoutText);
  });
    } else {
  // Fallback for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = workoutText;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    alert('✅ Workout summary copied to clipboard!\n\nYou can now paste it in WhatsApp, social media, or any text message.');
  } catch (err) {
    prompt('Copy the workout summary below:', workoutText);
  }
  document.body.removeChild(textArea);
    }
  }
  
  // Format workout summary for social media/WhatsApp
  function formatWorkoutSummary(workout) {
    const program = workout.program;
    const date = new Date(workout.date).toLocaleDateString();
    
    let summary = `💪 *Workout Summary*\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    summary += `📅 *Date:* ${date}\n`;
    summary += `🏋️ *Program:* ${program.name}\n\n`;
    summary += `🔥 *Exercises Completed:*\n`;
    
    workout.exercises.forEach((exercise, index) => {
      summary += `\n${index + 1}. *${exercise.exerciseName}*\n`;
      summary += `   Target: ${exercise.targetSets} sets × ${exercise.targetReps} reps\n`;
      summary += `   Actual: ${exercise.actualReps.join(' × ')} reps`;
    });
    
    summary += `\n\n━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `Great job! Keep pushing your limits! 💯\n`;
    
    return summary;
  }
  
  function showAdaptiveSuggestion(rating) {
    const suggestionEl = main.querySelector('#adaptive-suggestion');
    let message;
    
    switch (rating) {
  case 'too_easy':
  message = `
  <div class="suggestion-card">
  <h4>💡 Suggestion: Try to Increase Intensity!</h4>
  <p>If today felt too easy, consider:</p>
  <ul>
  <li>Adding more sets or reps to your exercises</li>
  <li>Reducing rest time between sets (e.g., from 60s to 45s)</li>
  <li>Progressing to a harder variation of exercises</li>
  <li>Moving to an intermediate program next time</li>
  </ul>
  </div>
  `;
  break;
  
  case 'just_right':
  message = `
  <div class="suggestion-card">
  <h4>👍 Perfect! Keep This Up!</h4>
  <p>Your current program seems well-suited to your fitness level. Continue with it for the next 2-3 weeks, then consider progressing to a slightly harder routine or adding volume.</p>
  </div>
  `;
  break;
  
  case 'too_hard':
  message = `
  <div class="suggestion-card">
  <h4>💪 Good Job! Try These Adjustments:</h4>
  <p>If today felt too hard, consider:</p>
  <ul>
  <li>Reducing the number of sets (e.g., from 3 to 2)</li>
  <li>Using easier exercise variations</li>
  <li>Increasing rest time between sets</li>
  <li>Moving to a beginner program for now</li>
  </ul>
  </div>
  `;
  break;
    }
    
    suggestionEl.innerHTML = message;
    suggestionEl.classList.remove('hidden');
  }
}

// Export for router usage
window.renderWorkoutSummaryView = renderWorkoutSummaryView;


// Export as object for wrapView compatibility
export default { render: renderWorkoutSummaryView };