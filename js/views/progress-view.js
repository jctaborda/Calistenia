/**
 * ProgressView - Displays progress tracking with charts and analytics
 */

import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState } from '../services/state.js';
import { notificationService } from '../services/notification-service.js';
import { progressTrackingService } from '../services/progress-tracking-service.js';
import { routineSchedulingService } from '../services/routine-scheduling-service.js';
import { show } from '../services/toast-service.js';
import { escapeHtml } from '../utils/html.js';
import { formatDuration } from '../utils/formatters.js';

// Simple SVG chart renderer (no external dependencies)
class SimpleChartRenderer {
  static render(container, chartData) {
    if (chartData.error) {
      container.innerHTML = `<p class="error-message">${chartData.error}</p>`;
      return;
    }

    const { type, title, labels, datasets } = chartData;

    if (type === 'line') {
      this.renderLineChart(container, title, labels, datasets);
    } else if (type === 'bar') {
      this.renderBarChart(container, title, labels, datasets);
    } else if (type === 'doughnut') {
      this.renderDoughnutChart(container, title, datasets);
    }
  }

  static renderLineChart(container, title, labels, datasets) {
    const width = Math.max(600, labels.length * 80);
    const height = 300;
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate scales
    const allValues = datasets.flatMap(ds => ds.data);
    const maxValue = Math.max(...allValues, 1);

    let svgContent = `<svg width="${width}" height="${height}" class="chart-svg">`;
    
    // Title
    svgContent += `<text x="${width / 2}" y="25" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>`;

    // Y-axis
    svgContent += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1"/>`;

    // X-axis
    svgContent += `<line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1"/>`;

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * i);
      const y = height - padding.bottom - (i * (chartHeight / 5));
      svgContent += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="11">${value}</text>`;
      svgContent += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#eee" stroke-dasharray="2,2"/>`;
    }

    // Draw datasets
    datasets.forEach((dataset, dsIndex) => {
      const color = dataset.borderColor || (dsIndex === 0 ? 'var(--btn-start, #4CAF50)' : 'var(--btn-view, #2196F3)');
      
      // Draw line
      svgContent += `<path d="`;
      dataset.data.forEach((value, i) => {
        const x = padding.left + (i * (chartWidth / (dataset.data.length - 1 || 1)));
        const y = height - padding.bottom - (value / maxValue) * chartHeight;
        if (i === 0) svgContent += `M ${x} ${y}`;
        else svgContent += ` L ${x} ${y}`;
      });
      svgContent += `" stroke="${color}" stroke-width="2" fill="none"/>`;

      // Draw points
      dataset.data.forEach((value, i) => {
        const x = padding.left + (i * (chartWidth / (dataset.data.length - 1 || 1)));
        const y = height - padding.bottom - (value / maxValue) * chartHeight;
        svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
      });
    });

    // X-axis labels
    const labelStep = Math.ceil(labels.length / 10);
    labels.forEach((label, i) => {
      if (i % labelStep === 0 || i === labels.length - 1) {
        const x = padding.left + (i * (chartWidth / (labels.length - 1 || 1)));
        svgContent += `<text x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="10" transform="rotate(-45 ${x} ${height - padding.bottom + 20})">${label}</text>`;
      }
    });

    svgContent += `</svg>`;

    container.innerHTML = svgContent;
  }

  static renderBarChart(container, title, labels, datasets) {
    const width = Math.max(600, labels.length * 80);
    const height = 400;
    const padding = { top: 40, right: 20, bottom: 120, left: 60 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...datasets.flatMap(ds => ds.data), 1);

    let svgContent = `<svg width="${width}" height="${height}" class="chart-svg">`;
    
    svgContent += `<text x="${width / 2}" y="25" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>`;

    // Y-axis
    svgContent += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1"/>`;
    svgContent += `<line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="var(--border-color)" stroke-width="1"/>`;

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * i);
      const y = height - padding.bottom - (i * (chartHeight / 5));
      svgContent += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="11">${value}</text>`;
      svgContent += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#eee" stroke-dasharray="2,2"/>`;
    }

    // Draw bars
    const barWidth = Math.min(40, chartWidth / (labels.length * 2));
    const groupWidth = chartWidth / labels.length;

    datasets.forEach((dataset, dsIndex) => {
      const color = dataset.backgroundColor || (dsIndex === 0 ? 'var(--btn-view, #2196F3)' : 'var(--btn-start, #4CAF50)');
      
      dataset.data.forEach((value, i) => {
        const x = padding.left + (i * groupWidth) + ((groupWidth - barWidth) / 2) + (dsIndex * barWidth);
        const barHeight = (value / maxValue) * chartHeight;
        const y = height - padding.bottom - barHeight;
        
        svgContent += `<rect x="${x}" y="${y}" width="${barWidth - 4}" height="${barHeight}" fill="${color}" rx="3"/>`;
      });
    });

    // X-axis labels
    labels.forEach((label, i) => {
      const x = padding.left + (i * groupWidth) + (groupWidth / 2);
      svgContent += `<text x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="10" transform="rotate(-45 ${x} ${height - padding.bottom + 20})">${label}</text>`;
    });

    svgContent += `</svg>`;

    container.innerHTML = svgContent;
  }

  static renderDoughnutChart(container, title, datasets) {
    const size = 300;
    const center = size / 2;
    const radius = size / 2 - 40;

    let svgContent = `<svg width="${size}" height="${size}" class="chart-svg">`;
    
    svgContent += `<text x="${center}" y="25" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>`;

    const total = datasets[0].data.reduce((sum, val) => sum + val, 0);
    let startAngle = -90;

    datasets[0].data.forEach((value, i) => {
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      const color = datasets[0].backgroundColor?.[i] || `hsl(${i * 45}, 70%, 60%)`;

      const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = center + radius * Math.cos(((startAngle + angle) * Math.PI) / 180);
      const y2 = center + radius * Math.sin(((startAngle + angle) * Math.PI) / 180);

      const largeArc = angle > 180 ? 1 : 0;

      svgContent += `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="white" stroke-width="2"/>`;

      startAngle += angle;
    });

    // Inner circle for doughnut effect
    svgContent += `<circle cx="${center}" cy="${center}" r="${radius * 0.6}" fill="white"/>`;

    // Legend
    let legendY = size + 10;
    datasets[0].data.forEach((value, i) => {
      const percentage = ((value / total) * 100).toFixed(1);
      const color = datasets[0].backgroundColor?.[i] || `hsl(${i * 45}, 70%, 60%)`;
      const label = datasets[0].labels?.[i] || `Item ${i + 1}`;

      svgContent += `<circle cx="20" cy="${legendY}" r="8" fill="${color}"/>`;
      svgContent += `<text x="35" y="${legendY + 3}" font-size="12">${label}: ${percentage}%</text>`;
      legendY += 20;
    });

    svgContent += `</svg>`;

    container.innerHTML = svgContent;
  }
}

export async function renderProgressView() {
  const main = document.getElementById('app');
  const state = await getState();
  const { user } = state;

  // Clean up previous event listeners
  if (main.dataset.progressViewListener === 'true') {
    const tabs = main.querySelectorAll('[data-tab]');
    tabs.forEach(tab => tab.removeEventListener('click', main._handleTabClick));
    delete main.dataset.progressViewListener;
    delete main._handleTabClick;
  }

  // Load data
  const weeklyVolume = await progressTrackingService.getWeeklyVolume(4);
  const prs = await progressTrackingService.getExercisePRs();
  const muscleBalance = await progressTrackingService.getMuscleGroupBalance();
  const streakData = await progressTrackingService.getStreakData();
  const scheduleStats = await routineSchedulingService.getStatistics();
  const durationTrends = await progressTrackingService.getWorkoutDurationTrends(8);

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="flex-between mb-1rem">
        <h1>${t('progress.title') || 'Progress & Analytics'}</h1>
        <button class="btn btn-secondary btn-sm" data-nav="#home">${t('common.back')}</button>
      </div>

      <!-- Statistics Overview -->
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="stat-card stat-card--overview">
          <div class="stat-value" style="color: var(--btn-start, #4CAF50);">${streakData.totalWorkouts}</div>
          <div class="stat-label">${t('progress.total_workouts') || 'Total Workouts'}</div>
        </div>
        <div class="stat-card stat-card--overview">
          <div class="stat-value" style="color: var(--warning-dark, #FF9800);">${streakData.currentStreak}</div>
          <div class="stat-label">${t('progress.current_streak') || 'Day Streak'}</div>
        </div>
        <div class="stat-card stat-card--overview">
          <div class="stat-value" style="color: var(--btn-view, #2196F3);">${scheduleStats.upcoming}</div>
          <div class="stat-label">${t('progress.upcoming') || 'Scheduled'}</div>
        </div>
        <div class="stat-card stat-card--overview">
          <div class="stat-value" style="color: var(--purple, #9C27B0);">${scheduleStats.completionRate}%</div>
          <div class="stat-label">${t('progress.completion_rate') || 'Completion'}</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="progress-tabs">
        <button class="tab-btn active" data-tab="weekly-volume">
          ${t('progress.weekly_volume') || 'Weekly Volume'}
        </button>
        <button class="tab-btn" data-tab="exercise-prs">
          ${t('progress.exercise_prs') || 'Exercise PRs'}
        </button>
        <button class="tab-btn" data-tab="weight-progress">
          ${t('progress.weight_progress') || 'Weight Progress'}
        </button>
        <button class="tab-btn" data-tab="muscle-balance">
          ${t('progress.muscle_balance') || 'Muscle Balance'}
        </button>
        <button class="tab-btn" data-tab="duration-trends">
          ${t('progress.duration_trends') || 'Duration Trends'}
        </button>
        <button class="tab-btn" data-tab="schedules">
          ${t('progress.schedules') || 'Schedules'}
        </button>
      </div>

      <!-- Tab Content -->
      <div id="tab-content">
        <!-- Weekly Volume Chart -->
        <div id="weekly-volume" class="tab-content active">
          <div id="weekly-volume-chart" class="chart-container"></div>
          <div class="schedule-section">
            <h3>${t('progress.schedule_workout') || 'Schedule a Workout'}</h3>
            <form id="schedule-form" class="schedule-form">
              <select id="schedule-routine" class="form-input form-input--flex">
                <option value="">${t('common.select_routine') || 'Select Routine'}</option>
                ${(state.routines || []).map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}
              </select>
              <input type="date" id="schedule-date" class="form-input">
              <label class="form-check-label">
                <input type="checkbox" id="schedule-recurring" class="form-check-input">
                <span>${t('progress.recurring') || 'Recurring'}</span>
              </label>
              <button type="submit" class="btn">${t('common.schedule') || 'Schedule'}</button>
            </form>
          </div>
        </div>

        <!-- Exercise PRs -->
        <div id="exercise-prs" class="tab-content">
          <div id="exercise-prs-chart" class="chart-container"></div>
          <div class="card-section">
            <h3>${t('progress.top_prs') || 'Top Personal Records'}</h3>
            <div class="list-grid">
              ${(prs.slice(0, 10) || []).map(pr => `
                <div class="card-row">
                  <div>
                    <strong>${escapeHtml(pr.exerciseName)}</strong>
                    <div class="detail-text">
                      ${pr.maxWeight ? `${pr.maxWeight}kg x ${pr.maxReps} reps` : ''}
                      ${pr.estimated1RM ? ` | 1RM: ${pr.estimated1RM}kg` : ''}
                    </div>
                  </div>
                  <button class="btn btn-secondary btn-sm" data-nav="#exercise/${pr.exerciseId}">${t('common.view') || 'View'}</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Weight Progress -->
        <div id="weight-progress" class="tab-content">
          <div id="weight-progress-chart" class="chart-container"></div>
          <div class="card-section">
            <h3>${t('progress.weight_progress_exercises') || 'Weight Progression by Exercise'}</h3>
            <p class="text-secondary">Track your weight progression across exercises. Shows volume (reps × weight) over time for exercises where you've used weight.</p>
            <div id="weight-exercise-list" class="list-grid card-section"></div>
          </div>
        </div>

        <!-- Muscle Balance -->
        <div id="muscle-balance" class="tab-content">
          <div id="muscle-balance-chart" class="chart-container chart-container--centered"></div>
          <div class="card-section">
            <h3>${t('progress.muscle_details') || 'Muscle Group Details'}</h3>
            <div class="list-grid">
              ${Object.values(muscleBalance)
                .filter(m => m.volume > 0)
                .sort((a, b) => b.volume - a.volume)
                .map(m => `
                  <div class="card-row">
                    <div class="flex-between">
                      <strong>${escapeHtml(m.name)}</strong>
                      <span class="text-secondary">${m.percentage}%</span>
                    </div>
                    <div class="progress-bar-track">
                      <div class="progress-bar-fill" style="width: ${m.percentage}%;"></div>
                    </div>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>

        <!-- Duration Trends -->
        <div id="duration-trends" class="tab-content">
          <div id="duration-trends-chart" class="chart-container"></div>
          <div class="card-section">
            <h3>${t('progress.duration_stats') || 'Duration Statistics'}</h3>
            <div class="stats-mini-grid">
              <div class="text-center">
                <div class="stat-value" style="color: var(--btn-view, #2196F3);">${durationTrends.avgDuration ? formatDuration(durationTrends.avgDuration) : '0'}</div>
                <div class="stat-label">${t('progress.avg_duration') || 'Average Duration'}</div>
              </div>
              <div class="text-center">
                <div class="stat-value" style="color: var(--btn-start, #4CAF50);">${durationTrends.maxDuration ? formatDuration(durationTrends.maxDuration) : '0'}</div>
                <div class="stat-label">${t('progress.max_duration') || 'Longest Workout'}</div>
              </div>
              <div class="text-center">
                <div class="stat-value" style="color: var(--warning-dark, #FF9800);">${durationTrends.minDuration ? formatDuration(durationTrends.minDuration) : '0'}</div>
                <div class="stat-label">${t('progress.min_duration') || 'Shortest Workout'}</div>
              </div>
              <div class="text-center">
                <div class="stat-value" style="color: var(--purple, #9C27B0);">${durationTrends.workoutsCount || 0}</div>
                <div class="stat-label">${t('progress.total_workouts') || 'Total Workouts'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Schedules -->
        <div id="schedules" class="tab-content">
          <div class="list-grid">
            <div>
              <h3>${t('progress.upcoming_workouts') || 'Upcoming Workouts'}</h3>
              <div class="list-grid">
                ${(routineSchedulingService.getUpcomingSchedules(10) || []).map(schedule => `
                  <div class="card-row">
                    <div>
                      <strong>${escapeHtml(schedule.routineName)}</strong>
                      <div class="detail-text">
                        ${new Date(schedule.scheduledDate).toLocaleDateString()}
                        ${schedule.recurring ? ` • ${t('progress.recurring')} (Day ${schedule.dayOfWeek})` : ''}
                      </div>
                    </div>
                    <div class="btn-group">
                      <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#routine-details/routine/${schedule.routineId}'">${t('common.view') || 'View'}</button>
                      <button class="btn btn-secondary btn-sm" onclick="routineSchedulingService.cancelSchedule(${schedule.id})">${t('common.cancel') || 'Cancel'}</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div>
              <h3>${t('progress.recurring_workouts') || 'Recurring Workouts'}</h3>
              <div class="list-grid">
                ${(routineSchedulingService.getRecurringSchedules() || []).map(schedule => `
                  <div class="card-row">
                    <div>
                      <strong>${escapeHtml(schedule.routineName)}</strong>
                      <div class="detail-text">
                        Every ${t('progress.day_of_week')[schedule.dayOfWeek] || 'Day ' + schedule.dayOfWeek}
                      </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="routineSchedulingService.cancelSchedule(${schedule.id})">${t('common.cancel') || 'Cancel'}</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render charts
  const weeklyVolumeChart = document.getElementById('weekly-volume-chart');
  if (weeklyVolumeChart) {
    const chartData = await progressTrackingService.getChartData('weekly-volume');
    SimpleChartRenderer.render(weeklyVolumeChart, chartData);
  }

  const exercisePRsChart = document.getElementById('exercise-prs-chart');
  if (exercisePRsChart) {
    const chartData = await progressTrackingService.getChartData('exercise-pr');
    SimpleChartRenderer.render(exercisePRsChart, chartData);
  }

  const weightProgressChart = document.getElementById('weight-progress-chart');
  if (weightProgressChart) {
    await renderWeightProgressChart(weightProgressChart, state.history, state.exercises);
  }

  const muscleBalanceChart = document.getElementById('muscle-balance-chart');
  if (muscleBalanceChart) {
    const chartData = await progressTrackingService.getChartData('muscle-balance');
    SimpleChartRenderer.render(muscleBalanceChart, chartData);
  }

  // Tab switching
  const handleTabClick = (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;

    const tabName = tab.getAttribute('data-tab');
    
    // Update tab buttons
    main.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Show tab content
    main.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName);
    });

    // Re-render charts if needed
    if (tabName === 'weekly-volume') {
      const chart = document.getElementById('weekly-volume-chart');
      if (chart) {
        const chartData = progressTrackingService.getChartData('weekly-volume');
        SimpleChartRenderer.render(chart, chartData);
      }
    } else if (tabName === 'exercise-prs') {
      const chart = document.getElementById('exercise-prs-chart');
      if (chart) {
        const chartData = progressTrackingService.getChartData('exercise-pr');
        SimpleChartRenderer.render(chart, chartData);
      }
    } else if (tabName === 'weight-progress') {
      // Render weight progression chart when tab is clicked
      const chart = document.getElementById('weight-progress-chart');
      if (chart) {
        const state = getState();
        renderWeightProgressChart(chart, state.history, state.exercises);
      }
    } else if (tabName === 'muscle-balance') {
      const chart = document.getElementById('muscle-balance-chart');
      if (chart) {
        const chartData = progressTrackingService.getChartData('muscle-balance');
        SimpleChartRenderer.render(chart, chartData);
      }
    } else if (tabName === 'duration-trends') {
      const chart = document.getElementById('duration-trends-chart');
      if (chart) {
        const chartData = progressTrackingService.getChartData('duration-trends');
        SimpleChartRenderer.render(chart, chartData);
      }
    }
  };

  main._handleTabClick = handleTabClick;
  main.addEventListener('click', handleTabClick);
  main.dataset.progressViewListener = 'true';

  // Schedule form handler
  const scheduleForm = document.getElementById('schedule-form');
  if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const routineId = document.getElementById('schedule-routine').value;
      const scheduleDate = document.getElementById('schedule-date').value;
      const recurring = document.getElementById('schedule-recurring').checked;

      if (!routineId) {
        show(t('common.select_routine') || 'Please select a routine', 'error');
        return;
      }

      if (!scheduleDate) {
        show(t('common.select_date') || 'Please select a date', 'error');
        return;
      }

      const routine = state.routines?.find(r => r.id === parseInt(routineId));
      if (!routine) {
        show(t('common.error') || 'Error: Routine not found', 'error');
        return;
      }

      const scheduledDate = new Date(scheduleDate);
      
      await routineSchedulingService.scheduleWorkout(
        { id: routine.id, name: routine.name },
        scheduledDate,
        recurring ? scheduledDate.getDay() : null,
        recurring
      );

      show(t('progress.scheduled_success') || 'Workout scheduled successfully!', 'success');
      scheduleForm.reset();
    });
  }
}

// Named + default export
export default { render: renderProgressView };

/**
 * Render weight progression chart
 * @param {HTMLElement} container - Chart container element
 * @param {Array} history - Workout history
 * @param {Array} exercises - Exercise list
 */
async function renderWeightProgressChart(container, history, exercises) {
  // Collect weight progression data by exercise
  const exerciseWeights = {};
  
  (history || []).forEach(workout => {
    (workout.exercises || []).forEach(exercise => {
      const exId = exercise.exerciseId;
      if (!exerciseWeights[exId]) {
        const ex = exercises.find(e => e.id === exId);
        exerciseWeights[exId] = {
          name: ex?.name || 'Unknown Exercise',
          data: []
        };
      }
      
      // Get weight data if available
      const sets = exercise.actualRepsWithWeight || [];
      const maxWeightInWorkout = Math.max(...sets.map(s => (typeof s === 'object' ? s.weight || 0 : 0)));
      const totalVolume = sets.reduce((sum, s) => {
        const reps = typeof s === 'object' ? s.reps : s;
        const weight = typeof s === 'object' ? (s.weight || 0) : 0;
        return sum + (reps * weight);
      }, 0);
      
      if (maxWeightInWorkout > 0) {
        exerciseWeights[exId].data.push({
          date: new Date(workout.date).toLocaleDateString(),
          maxWeight: maxWeightInWorkout,
          totalVolume: totalVolume
        });
      }
    });
  });
  
  // Find exercises with weight data
  const exercisesWithWeight = Object.entries(exerciseWeights)
    .filter(([_, data]) => data.data.length > 0)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.data.length - a.data.length);
  
  // Display exercise list
  const exerciseListEl = document.getElementById('weight-exercise-list');
  if (exerciseListEl) {
    exerciseListEl.innerHTML = exercisesWithWeight
      .slice(0, 5)
      .map(ex => `
        <div style="background: var(--card-bg); padding: 0.75rem; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${escapeHtml(ex.name)}</strong>
            <span style="color: var(--text-secondary);">${ex.data.length} workouts with weight</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Max weight: ${Math.max(...ex.data.map(d => d.maxWeight))}kg | 
            Total volume: ${ex.data.reduce((sum, d) => sum + d.totalVolume, 0)}kg
          </div>
        </div>
      `).join('');
  }
  
  if (exercisesWithWeight.length === 0) {
    container.innerHTML = '<p class="empty-state">No weight data yet. Start adding weight to your exercises to track progression!</p>';
    return;
  }
  
  // Render chart for top exercise
  const topExercise = exercisesWithWeight[0];
  const labels = topExercise.data.map(d => d.date);
  const maxWeightData = topExercise.data.map(d => d.maxWeight);
  const volumeData = topExercise.data.map(d => d.totalVolume);
  
  const chartData = {
    type: 'line',
    title: `${topExercise.name} - Weight & Volume Progression`,
    labels,
    datasets: [
      {
        label: 'Max Weight (kg)',
        data: maxWeightData,
        borderColor: 'var(--btn-start, #4CAF50)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Total Volume (kg)',
        data: volumeData,
        borderColor: 'var(--btn-view, #2196F3)',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  };
  
  SimpleChartRenderer.render(container, chartData);
}
