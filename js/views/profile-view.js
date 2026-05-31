// views/profile-view.js - Updated with IndexedDB storage pattern
import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { saveForUndo } from '../services/undo-service.js';
import { getAllAchievementStatus } from '../services/achievements.js';
import { formatDate, formatWorkoutDate } from '../utils/date-formatter.js';

export async function renderProfileView() {
  const main = document.getElementById('app');
  const { user, history = [] } = getState();
  const achievementStatus = getAllAchievementStatus();

  // Get body metrics from user state
  const bodyMetrics = user.bodyMetrics || [];

  main.innerHTML = renderHeader() + `
    <div class="card">
  <h1>Profile</h1>
  
  <!-- Export/Import Section -->
  <div class="profile-section">
  <h2>Data Management</h2>
  <p><strong>Backup & Restore:</strong> Export your workout history and custom routines, or restore from a backup file.</p>
  <a href="#export-import" class="btn btn-primary">
  📤 Export / Import Data
  </a>
  </div>
  
  <p><strong>Name:</strong> ${user?.name || ''}</p>
  <p><strong>Level:</strong> ${user?.level || ''}</p>
  
  <!-- Body Metrics Section -->
  <div class="profile-section">
  <h2>Body Metrics</h2>
  
  <form id="body-metrics-form" class="metrics-form">
  <div class="form-input-group">
  <label for="weight">Weight (kg/lbs):</label>
  <input type="number" id="weight" step="0.1" required placeholder="e.g., 70">
  </div>
  <div class="form-input-group">
  <label for="bodyFat">Body Fat (%):</label>
  <input type="number" id="bodyFat" step="0.1" placeholder="e.g., 15">
  </div>
  <button type="submit" class="btn add-metric-btn">Add Metric</button>
  </form>
  
  ${bodyMetrics.length > 0 ? `
  <table class="metrics-table">
  <thead>
  <tr>
  <th>Date</th>
  <th>Weight</th>
  <th>Body Fat</th>
  <th>Action</th>
  </tr>
  </thead>
  <tbody>
  ${bodyMetrics.map(metric => `
  <tr>
  <td>${formatDate(metric.date)}</td>
  <td>${metric.weight}</td>
  <td>${metric.bodyFat || '-'}</td>
  <td><button class="btn btn-danger btn-sm" data-index="${metric.index}" onclick="deleteMetric(this)">Delete</button></td>
  </tr>
  `).join('')}
  </tbody>
  </table>
  ` : '<p class="metrics-empty">No metrics logged yet.</p>'}
  </div>
  
  <!-- Achievements Section -->
  <div class="profile-section">
  <h2>Achievements</h2>
  ${achievementStatus.some(a => a.unlocked) ? `
  <div class="achievements-section">
  ${achievementStatus.filter(a => a.unlocked).map(ach => `
  <div class="achievement-item achievement-unlocked" style="opacity: 0.7;">
  <span class="achievement-emoji">${ach.emoji}</span>
  <div class="achievement-details">
  <strong>${ach.name}</strong>
  <p>${ach.description}</p>
  </div>
  </div>
  `).join('')}
  </div>
  ` : '<p class="achievements-empty">No achievements unlocked yet. Complete workouts to earn them!</p>'}
  
  <div style="margin-top: 1rem;">
  <h3>Potential Achievements</h3>
  ${achievementStatus.filter(a => !a.unlocked).map(ach => `
  <div class="achievement-item achievement-pending" style="opacity: 0.5; border-left: 4px solid var(--gray-400);">
  <span class="achievement-emoji">${ach.emoji}</span>
  <div class="achievement-details">
  <strong>${ach.name}</strong>
  <p>${ach.description}</p>
  </div>
  </div>
  `).join('')}
  </div>
  </div>
  
  <div class="profile-section">
   <h2>Workout History</h2>
   ${history.length === 0 ? '<p>No workouts completed yet.</p>' : `
           <ul class="workout-history-list">
             ${history.map((w, index) => `
               <li class="workout-item" onclick="window.navigateToWorkoutDetail(${index})" style="cursor: pointer;">
                 <div class="workout-info">
                   <span class="workout-program">${w.program?.name || 'Custom Workout'}</span>
                   <span class="workout-date">${formatWorkoutDate(w.date, false)}</span>
                 </div>
                 ${w.completedExercises ? `<span class="workout-count">${w.completedExercises.length} exercises</span>` : ''}
                 <button class="btn btn-danger btn-sm delete-history-btn" data-index="${index}" title="Delete this workout">×</button>
               </li>
             `).join('')}
           </ul>
         `}
   </div>
  
  <button class="btn back-to-home-btn" onclick="window.location.hash = '#home'" style="margin-top: 2rem;">Back to Home</button>
    </div>
  `;

  // Set up event delegation for delete buttons
  const deleteBtnHandler = (e) => {
    if (e.target.classList.contains('delete-history-btn')) {
  window.deleteWorkoutHistory(e.target);
    }
  };

  main.addEventListener('click', deleteBtnHandler);

  // Handle body metrics form submission
  const form = main.querySelector('#body-metrics-form');
  if (form) {
    form.addEventListener('submit', e => {
  e.preventDefault();
  
  const weightInput = main.querySelector('#weight');
  const bodyFatInput = main.querySelector('#bodyFat');
  const weight = parseFloat(weightInput.value);
  const bodyFat = bodyFatInput.value ? parseFloat(bodyFatInput.value) : null;
  
  if (!weight || isNaN(weight)) {
  alert('Please enter a valid weight.');
  return;
  }
  
  // Add metric to user state
  const state = getState();
  const user = { ...state.user };
  user.bodyMetrics = user.bodyMetrics || [];
  
  // Add index for deletion reference
  user.bodyMetrics.push({
  date: new Date().toISOString(),
  weight,
  bodyFat,
  index: user.bodyMetrics.length
  });
  
  updateState({ user });
  
  // Clear form and re-render
  weightInput.value = '';
  bodyFatInput.value = '';
  renderProfileView();
    });
  }

  // Make deleteMetric available globally
  window.deleteMetric = function(button) {
    const index = parseInt(button.getAttribute('data-index'));
    
    if (!confirm('Delete this metric?')) return;
    
    const state = getState();
    const user = { ...state.user };
    user.bodyMetrics = user.bodyMetrics || [];
    
    // Find the metric before removing it (for undo)
    const metricToDelete = user.bodyMetrics[index];
    if (metricToDelete) {
  saveForUndo('body-metric', metricToDelete, index);
    }
    
    // Remove the metric
    user.bodyMetrics.splice(index, 1);
    
    // Renumber remaining indices
    user.bodyMetrics = user.bodyMetrics.map((metric, i) => ({
  ...metric,
  index: i
    }));
    
    updateState({ user });
    renderProfileView();
  };
  
  // Make deleteWorkoutHistory available globally
  window.deleteWorkoutHistory = function(button) {
    const index = parseInt(button.getAttribute('data-index'));
    const state = getState();
    const historyItem = state.history[index];
    
    if (!historyItem) return;
    
    if (!confirm('Delete this workout from history?')) return;
    
    // Save for undo before deleting
    saveForUndo('workout-history', historyItem, index);
    
    // Remove from history immutably
    const newHistory = state.history.filter((_, i) => i !== index);
    updateState({ history: newHistory });
    
    // Re-render the profile view
    renderProfileView();
  };

  // Make navigateToWorkoutDetail available globally
  window.navigateToWorkoutDetail = function(index) {
    window.location.hash = `#workout-detail/${index}`;
  };
}


// Export as object for wrapView compatibility
export default { render: renderProfileView };