// views/profile-view.js - Updated with IndexedDB storage pattern
import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
import { getAllAchievementStatus } from '../services/achievements.js';
import { formatDate, formatWorkoutDate } from '../utils/date-formatter.js';
import { t } from '../i18n.js';
import { ValidationService } from '../services/validation.js';
import { show } from '../services/toast-service.js';
import { escapeHtml } from '../utils/html.js';
import { getDatabaseSize, clearDatabase } from '../services/database.js';

/**
 * Render profile view
 * @returns {Promise<string>} HTML string for profile view
 */
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
  
  
  <p><strong>${t('profile.name')}:</strong> ${escapeHtml(user?.name || '')}</p>
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
  <button type="submit" class="btn add-metric-btn" aria-label="Add metric">${t('profile.add_metric')}</button>
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
  <td><button class="btn btn-danger btn-sm" data-delete-metric data-index="${metric.index}" aria-label="Delete metric">${t('profile.metrics_delete')}</button></td>
  </tr>
  `).join('')}
  </tbody>
  </table>
  ` : `<p class="metrics-empty">${t('profile.no_metrics')}</p>`}
  
  ${bodyMetrics.length > 0 && history.length > 0 ? `
  <div class="weight-performance-chart">
    <h3>${t('profile.weight_performance_correlation')}</h3>
    <div id="weight-performance-chart-container"></div>
    <p class="chart-description">${t('profile.weight_performance_desc')}</p>
  </div>
  ` : ''}
  </div>
  
  <!-- Achievements Section -->
  <div class="profile-section">
  <h2>${t('profile.achievements')}</h2>
  ${achievementStatus.some(a => a.unlocked) ? `
  <div class="achievements-section">
  ${achievementStatus.filter(a => a.unlocked).map(ach => `
  <div class="achievement-item achievement-unlocked">
  <span class="achievement-emoji">${ach.emoji}</span>
  <div class="achievement-details">
  <strong>${ach.name}</strong>
  <p>${ach.description}</p>
  </div>
  </div>
  `).join('')}
  </div>
  ` : `<p class="achievements-empty">${t('profile.no_achievements')}</p>`}
  
  <div class="potential-achievements">
  <h3>${t('profile.potential_achievements')}</h3>
  ${achievementStatus.filter(a => !a.unlocked).map(ach => `
  <div class="achievement-item achievement-pending">
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
                <li class="workout-item" data-workout-item data-index="${index}">
                 <div class="workout-info">
                   <span class="workout-routine">${w.routine?.name || 'Custom Workout'}</span>
                   <span class="workout-date">${formatWorkoutDate(w.date, false)}</span>
                 </div>
                 ${w.completedExercises ? `<span class="workout-count">${w.completedExercises.length} exercises</span>` : ''}
                 <button class="btn btn-danger btn-sm" data-delete-workout data-index="${index}" aria-label="Delete workout">✕</button>
               </li>
             `).join('')}
           </ul>
         `}
   </div>
  
  <!-- Export/Import Section -->
  <div class="profile-section">
  <h2>${t('profile.data_management')}</h2>
  <p><strong>Backup & Restore:</strong> Export your workout history and routines, or restore from a backup file.</p>
  <a href="#export-import" class="btn btn-primary">
  ${t('profile.export_import')}
  </a>
  </div>
  
  <!-- Storage Stats Section -->
  <div class="profile-section">
  <h2>${t('profile.storage_usage')}</h2>
  <div id="storage-stats">
    <p><em>Loading storage stats...</em></p>
  </div>
  <button id="clear-data-btn" class="btn btn-danger clear-data-btn" aria-label="Clear all data">${t('profile.clear_data')}</button>
  </div>
  
  <button class="btn back-to-home-btn" data-nav="#home">${t('profile.back_to_home')}</button>
    </div>
  `;

  // Initialize storage stats and clear data handler after view renders
  initProfileStorageStats();
  
  // Add form validation for body metrics
  initBodyMetricsForm();
  
  // Render weight-performance correlation chart if data available
  if (bodyMetrics.length > 0 && history.length > 0) {
    renderWeightPerformanceChart(bodyMetrics, history);
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderProfileView };

// Exposed render function for event delegation service
if (typeof window !== 'undefined') {
  window.calisthenics = window.calisthenics || {};
  window.calisthenics.renderProfileView = renderProfileView;
}

// Initialize storage stats and clear data handler
// This function is called from renderProfileView after the DOM is ready
async function initProfileStorageStats() {
  const clearDataBtn = document.getElementById('clear-data-btn');
  if (!clearDataBtn) return;
  
  // Load storage stats
  await loadStorageStats();
  
  // Clear data button handler
  clearDataBtn.addEventListener('click', async () => {
    const confirmed = await import('../services/confirmation-modal.js').then(m => 
      m.showConfirmation('This will delete ALL your data including workouts, routines, and custom exercises. This cannot be undone!')
    );
    
    if (!confirmed) return;
    
    try {
      await clearDatabase();
      show('All data cleared successfully. Please reload the page.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to clear database:', error);
      show('Failed to clear data. Please try again.', 'error');
    }
  });
}

async function loadStorageStats() {
  const statsContainer = document.getElementById('storage-stats');
  if (!statsContainer) return;
  
  try {
    const stats = await getDatabaseSize();
    const { storageEstimate, totalItems, storeCount } = stats;
    
    if (storageEstimate) {
      const { quota, usage, usagePercent } = storageEstimate;
      const usageMB = (usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (quota / (1024 * 1024)).toFixed(2);
      
      let quotaBar = '';
      // Use CSS variables instead of hardcoded colors
      if (usagePercent >= 90) {
        quotaBar = `<div class="quota-bar quota-bar-danger">`;
      } else if (usagePercent >= 70) {
        quotaBar = `<div class="quota-bar quota-bar-warning">`;
      } else {
        quotaBar = `<div class="quota-bar quota-bar-success">`;
      }
      quotaBar += `<div class="quota-bar-fill" style="width: ${Math.min(usagePercent, 100)}%;"></div></div>`;
      
      statsContainer.innerHTML = `
        <p><strong>Storage Used:</strong> ${usageMB} MB / ${quotaMB} MB (${usagePercent}% full)</p>
        ${quotaBar}
        <p><strong>Data Items:</strong> ${totalItems} items across ${storeCount} stores</p>
        <p class="storage-status-text">
          ${usagePercent >= 90 ? `<strong class="storage-critical">⚠️ Storage nearly full! Consider clearing old data or exporting a backup.</strong>` : ''}
          ${usagePercent >= 70 && usagePercent < 90 ? `<span class="storage-warning">⚠️ Storage getting full. Consider periodic cleanup.</span>` : ''}
        </p>
      `;
    } else {
      statsContainer.innerHTML = `<p><strong>Data Items:</strong> ${totalItems} items across ${storeCount} stores</p>`;
    }
  } catch (error) {
    console.error('Failed to load storage stats:', error);
    statsContainer.innerHTML = '<p><em>Could not load storage stats.</em></p>';
  }
}

// Initialize body metrics form with validation
function initBodyMetricsForm() {
  const form = document.getElementById('body-metrics-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const weightInput = document.getElementById('weight');
    const bodyFatInput = document.getElementById('bodyFat');
    
    // Clear previous errors
    ValidationService.clearAllErrors();
    
    // Validate weight (required)
    const weightValue = weightInput.value.trim();
    if (!weightValue) {
      ValidationService.showError('weight', t('profile.weight_validation'));
      weightInput.focus();
      return;
    }
    
    // Validate body fat (optional but must be valid number 0-100)
    const bodyFatValue = bodyFatInput.value.trim();
    if (bodyFatValue !== '') {
      const bodyFatNum = parseFloat(bodyFatValue);
      if (isNaN(bodyFatNum) || bodyFatNum < 0 || bodyFatNum > 100) {
        ValidationService.showError('bodyFat', t('profile.body_fat_range'));
        bodyFatInput.focus();
        return;
      }
    }
    
    // All validations passed - save the metric
    const user = window.getState()?.user || {};
    const bodyMetrics = user.bodyMetrics || [];
    const newMetric = {
      index: bodyMetrics.length,
      date: new Date().toISOString().split('T')[0],
      weight: parseFloat(weightValue),
      bodyFat: bodyFatValue !== '' ? parseFloat(bodyFatValue) : null
    };
    
    bodyMetrics.push(newMetric);
    window.updateState({ user: { ...user, bodyMetrics } });
    
    // Clear form and show success message
    weightInput.value = '';
    bodyFatInput.value = '';
    show(t('profile.add_metric'), 'success');
    
    // Re-render profile view to show new metric
    if (window.calisthenics && window.calisthenics.renderProfileView) {
      await window.calisthenics.renderProfileView();
    }
  });
}

/**
 * Render weight-performance correlation chart
 */
function renderWeightPerformanceChart(bodyMetrics, history) {
  
  // Sort both arrays by date
  const sortedMetrics = [...bodyMetrics].sort((a, b) => new Date(a.date) - new Date(b.date));
  const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Create chart data points
  const chartData = sortedMetrics.map(metric => {
    // Find closest workout date
    const closestWorkout = sortedHistory.find(w => {
      const workoutDate = new Date(w.date);
      const metricDate = new Date(metric.date);
      const diffInDays = Math.abs(workoutDate - metricDate) / (1000 * 60 * 60 * 24);
      return diffInDays <= 1; // Within 1 day
    });
    
    return {
      date: metric.date,
      weight: metric.weight,
      workoutCount: closestWorkout ? 1 : 0,
      totalReps: closestWorkout ? (closestWorkout.completedExercises?.reduce((sum, ex) => sum + (ex.actualReps?.reduce((s, r) => s + r, 0) || 0), 0) || 0) : 0
    };
  });
  
  // Simple SVG chart
  const width = 400;
  const height = 200;
  const padding = 40;
  
  const maxWeight = Math.max(...chartData.map(d => d.weight));
  const minWeight = Math.min(...chartData.map(d => d.weight));
  const weightRange = maxWeight - minWeight || 1;
  
  const maxWorkouts = Math.max(...chartData.map(d => d.totalReps), 1);
  
  let svgContent = `<svg width="${width}" height="${height}" style="background: var(--card-bg, #fff); border-radius: 8px; border: 1px solid var(--gray-200);">`;
  
  // Draw axes
  svgContent += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--gray-400)" stroke-width="1"/>`;
  svgContent += `<line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--gray-400)" stroke-width="1"/>`;
  
  // Draw weight points (line chart)
  svgContent += `<polyline points="${chartData.map((d, i) => {
    const x = padding + (i / (chartData.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.weight - minWeight) / weightRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ')}" fill="none" stroke="var(--success, #28a745)" stroke-width="2"/>`;
  
  // Draw workout reps (bars)
  chartData.forEach((d, i) => {
    if (d.totalReps > 0) {
      const x = padding + (i / (chartData.length - 1 || 1)) * (width - 2 * padding);
      const barHeight = (d.totalReps / maxWorkouts) * (height - 2 * padding);
      svgContent += `<rect x="${x - 5}" y="${height - padding - barHeight}" width="10" height="${barHeight}" fill="var(--info, #2196F3)" opacity="0.7"/>`;
    }
  });
  
  // Draw points
  chartData.forEach((d, i) => {
    const x = padding + (i / (chartData.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.weight - minWeight) / weightRange) * (height - 2 * padding);
    svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="var(--success, #28a745)"/>`;
  });
  
  // Labels
  svgContent += `<text x="${padding}" y="${padding - 5}" font-size="10" fill="var(--gray-600)">Weight (kg/lbs)</text>`;
  svgContent += `<text x="${width - padding}" y="${height - padding + 15}" font-size="10" fill="var(--gray-600)">Reps per workout</text>`;
  
  svgContent += `</svg>`;
  
  container.innerHTML = svgContent;
}
