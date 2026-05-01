import { getState, setState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getAllAchievementStatus } from '../services/achievements.js';

export function renderProfileView() {
  const main = document.getElementById('app');
  const { user, history = [] } = getState();
  const achievementStatus = getAllAchievementStatus();

  // Get body metrics from user state
  const bodyMetrics = user.bodyMetrics || [];

  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Profile</h1>
      <p><strong>Name:</strong> ${user?.name || ''}</p>
      <p><strong>Level:</strong> ${user?.level || ''}</p>
      
      <!-- Body Metrics Section -->
      <div style="margin-top: 2rem;">
        <h2>Body Metrics</h2>
        
        <form id="body-metrics-form" style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px;">
            <label for="weight">Weight (kg/lbs):</label>
            <input type="number" id="weight" step="0.1" required placeholder="e.g., 70">
          </div>
          <div style="flex: 1; min-width: 150px;">
            <label for="bodyFat">Body Fat (%):</label>
            <input type="number" id="bodyFat" step="0.1" placeholder="e.g., 15">
          </div>
          <button type="submit" class="btn">Add Metric</button>
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
                  <td>${new Date(metric.date).toLocaleDateString()}</td>
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
      <div style="margin-top: 2rem;">
        <h2>Achievements</h2>
        ${achievementStatus.some(a => a.unlocked) ? `
          <div class="achievements-section">
            ${achievementStatus.filter(a => a.unlocked).map(ach => `
              <div class="achievement-item" style="opacity: 0.7;">
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
            <div class="achievement-item" style="opacity: 0.5; border-left: 4px solid var(--gray-400);">
              <span class="achievement-emoji">${ach.emoji}</span>
              <div class="achievement-details">
                <strong>${ach.name}</strong>
                <p>${ach.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <h2 style="margin-top: 2rem;">Workout History</h2>
      ${history.length === 0 ? '<ul><li>No workouts completed yet.</li></ul>' : `
        <ul>
          ${history.map(w => `<li>${w.program.name} - ${new Date(w.date).toLocaleString()}</li>`).join('')}
        </ul>
      `}
      
      <button class="btn" onclick="window.location.hash = '#home'" style="margin-top: 2rem;">Back to Home</button>
    </div>
  `;

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
      
      setState({ user });
      
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
    
    // Remove the metric
    user.bodyMetrics.splice(index, 1);
    
    // Renumber remaining indices
    user.bodyMetrics = user.bodyMetrics.map((metric, i) => ({
      ...metric,
      index: i
    }));
    
    setState({ user });
    renderProfileView();
  };
}
