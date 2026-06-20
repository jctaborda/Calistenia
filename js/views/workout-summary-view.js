import { getState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getUnlockedAchievements } from '../services/achievements.js';
import { formatWorkoutSummary } from '../utils/workout-summary.js';

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
  <h2>${lastWorkout.routine.name}</h2>
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
  <button class="btn share-workout-btn" data-share-workout>📋 Copy to Clipboard</button>
  <button class="btn btn-secondary back-to-home-btn" data-nav="#home">${t('summary.back')}</button>
  <button class="btn btn-secondary view-profile-btn" data-nav="#profile">View Profile</button>
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

  // Export for router usage
  }

function showAdaptiveSuggestion(rating) {
  const suggestionEl = document.getElementById('app').querySelector('#adaptive-suggestion');
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
  <li>Moving to an intermediate routine next time</li>
  </ul>
  </div>
  `;
  break;
  
  case 'just_right':
  message = `
  <div class="suggestion-card">
  <h4>👍 Perfect! Keep This Up!</h4>
  <p>Your current routine seems well-suited to your fitness level. Continue with it for the next 2-3 weeks, then consider progressing to a slightly harder routine or adding volume.</p>
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
  <li>Moving to a beginner routine for now</li>
  </ul>
  </div>
  `;
  break;
  }
  
  suggestionEl.innerHTML = message;
  suggestionEl.classList.remove('hidden');
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderWorkoutSummaryView };
