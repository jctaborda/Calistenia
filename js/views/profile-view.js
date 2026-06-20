// views/profile-view.js - Updated with IndexedDB storage pattern
import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { saveForUndo } from '../services/undo-service.js';
import { getAllAchievementStatus } from '../services/achievements.js';
import { formatDate, formatWorkoutDate } from '../utils/date-formatter.js';
import { t } from '../i18n.js';
import { ValidationService } from '../services/validation.js';
import { show } from '../services/toast-service.js';

export async function renderProfileView() {
  const main = document.getElementById('app');
  const state = getState();
  const { user = {}, history = [] } = state;
  const achievementStatus = getAllAchievementStatus();

  // Get body metrics from user state
  const bodyMetrics = user.bodyMetrics || [];

  main.innerHTML = renderHeader() + `
    <div class="card">
  <h1>${t('profile.title')}</h1>
  
  <!-- Export/Import Section -->
  <div class="profile-section">
  <h2>${t('profile.data_management')}</h2>
  <p><strong>Backup & Restore:</strong> Export your workout history and routines, or restore from a backup file.</p>
  <a href="#export-import" class="btn btn-primary">
  ${t('profile.export_import')}
  </a>
  </div>
  
  <p><strong>${t('profile.name')}:</strong> ${user?.name || ''}</p>
  <p><strong>${t('profile.level')}:</strong> ${user?.level || ''}</p>
  
  <!-- Body Metrics Section -->
  <div class="profile-section">
  <h2>${t('profile.body_metrics')}</h2>
  
  <form id="body-metrics-form" class="metrics-form">
  <div class="form-input-group">
  <label for="weight">${t('profile.weight')}</label>
  <input type="number" id="weight" step="0.1" required placeholder="${t('profile.weight_placeholder')}">
  </div>
  <div class="form-input-group">
  <label for="bodyFat">${t('profile.body_fat')}</label>
  <input type="number" id="bodyFat" step="0.1" placeholder="${t('profile.body_fat_placeholder')}">
  </div>
  <button type="submit" class="btn add-metric-btn">${t('profile.add_metric')}</button>
  </form>
  
  ${bodyMetrics.length > 0 ? `
  <table class="metrics-table">
  <thead>
  <tr>
  <th>${t('profile.metrics_date')}</th>
  <th>${t('profile.metrics_weight')}</th>
  <th>${t('profile.metrics_body_fat')}</th>
  <th>${t('profile.metrics_action')}</th>
  </tr>
  </thead>
  <tbody>
  ${bodyMetrics.map(metric => `
  <tr>
  <td>${formatDate(metric.date)}</td>
  <td>${metric.weight}</td>
  <td>${metric.bodyFat || '-'}</td>
  <td><button class="btn btn-danger btn-sm" data-delete-metric data-index="${metric.index}">${t('profile.metrics_delete')}</button></td>
  </tr>
  `).join('')}
  </tbody>
  </table>
  ` : `<p class="metrics-empty">${t('profile.no_metrics')}</p>`}
  </div>
  
  <!-- Achievements Section -->
  <div class="profile-section">
  <h2>${t('profile.achievements')}</h2>
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
  ` : `<p class="achievements-empty">${t('profile.no_achievements')}</p>`}
  
  <div style="margin-top: 1rem;">
  <h3>${t('profile.potential_achievements')}</h3>
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
   <h2>${t('profile.workout_history')}</h2>
   ${history.length === 0 ? `<p>${t('profile.no_workouts')}</p>` : `
           <ul class="workout-history-list">
             ${history.map((w, index) => `
               <li class="workout-item" data-workout-item data-index="${index}" style="cursor: pointer;">
                 <div class="workout-info">
                   <span class="workout-routine">${w.routine?.name || 'Custom Workout'}</span>
                   <span class="workout-date">${formatWorkoutDate(w.date, false)}</span>
                 </div>
                 ${w.completedExercises ? `<span class="workout-count">${w.completedExercises.length} exercises</span>` : ''}
                 <button class="btn btn-danger btn-sm" data-delete-workout data-index="${index}" title="Delete this workout">✕</button>
               </li>
             `).join('')}
           </ul>
         `}
   </div>
  
  <button class="btn back-to-home-btn" data-nav="#home" style="margin-top: 2rem;">${t('profile.back_to_home')}</button>
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
  
  // Validate weight
  const weightValidation = ValidationService.validateNumber(weight.toString());
  if (!weightValidation.valid) {
    show(weightValidation.error, 'error');
    return;
  }
  
  // Validate body fat if provided
  if (bodyFatInput.value && bodyFatInput.value.trim() !== '') {
    const bodyFatValidation = ValidationService.validateNumber(bodyFatInput.value);
    if (!bodyFatValidation.valid) {
      show(bodyFatValidation.error, 'error');
      return;
    }
    // Body fat should be between 0-100%
    if (bodyFat < 0 || bodyFat > 100) {
      show(t('profile.body_fat_range'), 'error');
      return;
    }
  }
  
  // Add metric to user state
  const state = getState();
  const user = { ...(state.user || {}) };
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
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderProfileView };
