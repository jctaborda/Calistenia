import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { formatDate } from '../utils/date-formatter.js';

// Simple number formatter: adds K suffix for thousands
function formatNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

// Get difficulty color for badge class names
function getDifficultyColor(difficulty) {
  const colors = {
    'Beginner': 'beginner',
    'Intermediate': 'intermediate',
    'Advanced': 'advanced'
  };
  return colors[difficulty] || 'intermediate';
}

// Helper function to calculate total reps from workout progress
function getTotalReps(progress) {
  if (!progress || !Array.isArray(progress)) return 0;
  return progress.reduce((total, set) => {
    const reps = parseInt(set.reps) || 0;
    const sets = parseInt(set.sets) || 0;
    return total + (reps * sets);
  }, 0);
}

// Helper function to calculate total reps from workout exercises array
function getTotalRepsFromExercises(exercises) {
  if (!exercises || !Array.isArray(exercises)) return 0;
  return exercises.reduce((total, exercise) => {
    const actualReps = exercise.actualReps || [];
    actualReps.forEach(reps => {
      if (reps) total += reps;
    });
    return total;
  }, 0);
}

// Helper function to get total reps from workout (checks both progress and exercises arrays)
function getWorkoutTotalReps(workout) {
  // First try progress array
  if (workout.progress && Array.isArray(workout.progress)) {
    const reps = getTotalReps(workout.progress);
    if (reps > 0) return reps;
  }
  // Then try exercises array with actualReps
  if (workout.exercises && Array.isArray(workout.exercises)) {
    const reps = getTotalRepsFromExercises(workout.exercises);
    if (reps > 0) return reps;
  }
  return 0;
}

// Helper function to check if workout is completed
function isWorkoutCompleted(workout) {
  if (!workout) return false;
  // Workout is completed if it has a completion date
  return workout.completedDate || workout.completed === true;
}

// Helper function to calculate total push-ups from workout history
function calculateTotalPushUps(history) {
  if (!history || !Array.isArray(history)) return 0;
  
  let total = 0;
  history.forEach(workout => {
    if (workout.progress && Array.isArray(workout.progress)) {
      workout.progress.forEach(set => {
        // Assuming push-up related exercises have "pushup" in their name or id
        const exerciseName = (set.exercise?.name || set.exercise?.id || '').toLowerCase();
        if (exerciseName.includes('pushup') || exerciseName.includes('push-up')) {
          const reps = parseInt(set.reps) || 0;
          const sets = parseInt(set.sets) || 0;
          total += (reps * sets);
        }
      });
    }
  });
  
  return total;
}

// Helper function to calculate current streak in days
function calculateCurrentStreak(history) {
  if (!history || !Array.isArray(history) || history.length === 0) return 0;
  
  // Get unique workout dates sorted descending
  const dates = [...new Set(history.map(w => new Date(w.date).toDateString()))]
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b - a);
  
  if (dates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if most recent workout is today or yesterday
  const mostRecent = dates[0];
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();
  
  if (mostRecent.toDateString() !== todayStr && mostRecent.toDateString() !== yesterdayStr) {
    return 0; // No recent activity
  }
  
  let streak = 1;
  let currentDate = mostRecent;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    if (dates[i].toDateString() === prevDate.toDateString()) {
      streak++;
      currentDate = dates[i];
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}

// Helper function to get rating label
function getRatingLabel(rating) {
  const labels = {
    1: 'Beginner',
    2: 'Intermediate', 
    3: 'Advanced'
  };
  return labels[rating] || `Level ${rating}`;
}

// Helper function to start workout from home button
function startWorkoutFromHome(program) {
  updateState({
    activeWorkout: {
      program: program,
      progress: {},
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      workoutMode: 'manual' // Always manual mode
    }
  });
  window.location.hash = '#active-workout';
}

/**
 * Renders the home page view with welcome message, quick stats, 
 * recent workouts, and featured content
 */
async function renderHomeView() {
  const state = getState();
  const user = state.user || { name: 'Athlete' };
  const history = state.history || [];
  const achievements = state.user?.achievements || [];
  
  // Get last 5 completed workouts for recent activity
  const recentWorkouts = history.slice(-5).reverse();
  
  // Calculate quick stats
  const totalWorkouts = history.length;
  const totalPushUps = calculateTotalPushUps(history);
  const currentStreak = calculateCurrentStreak(history);
  
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + `
    <div class="home-container">
  <!-- Welcome Section -->
  <section class="welcome-section">
  <h1>Welcome back, ${user.name}! 👋</h1>
  <p class="subtitle">Ready to challenge yourself today?</p>
  </section>

  <!-- Quick Stats Cards -->
  <section class="stats-grid">
  <div class="stat-card">
  <div class="stat-icon-wrapper">
    <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 18.49l6-5.49 4 4h11v-2.5H14l-4-4-4.5 4.01L3.5 18.5z"/>
      <path d="M20 4H4v2h16V4z"/>
    </svg>
  </div>
  <div class="stat-info">
  <span class="stat-number">${totalWorkouts}</span>
  <span class="stat-label">Total Workouts</span>
  </div>
  </div>
  
  <div class="stat-card">
  <div class="stat-icon-wrapper">
    <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/>
    </svg>
  </div>
  <div class="stat-info">
  <span class="stat-number">${currentStreak}</span>
  <span class="stat-label">Day Streak</span>
  </div>
  </div>
  
  <div class="stat-card">
  <div class="stat-icon-wrapper">
    <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7l3.57-3.43L10.57 2 7 5.57 5.57 4.14 4.14 5.57 5.57 7 2 12.57 3.43 14 7 10.43 15.57 19 12 22.57 13.43 24 14.86 22.57 18.43 19l3.57 3.57L24 21.17 20.57 17.71 17 21.29 15.57 19.86z"/>
    </svg>
  </div>
  <div class="stat-info">
  <span class="stat-number">${formatNumber(totalPushUps)}</span>
  <span class="stat-label">Total Push-Ups</span>
  </div>
  </div>
  
  <div class="stat-card">
  <div class="stat-icon-wrapper">
    <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
    </svg>
  </div>
  <div class="stat-info">
  <span class="stat-number">${achievements.length}</span>
  <span class="stat-label">Achievements Unlocked</span>
  </div>
  </div>
  </section>

  <!-- Quick Actions -->
  <section class="quick-actions">
  <h2 class="card-title">Quick Actions</h2>
  <div class="action-grid">
  <button class="action-card" onclick="window.location.hash='#programs'">
  <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
  <span class="action-title">Start Program</span>
  <span class="action-desc">Choose from pre-made routines</span>
  </button>
  
  <button class="action-card" onclick="window.location.hash='#builder'; updateState({ editingProgram: null, editingModule: null, createNewProgram: true })">
  <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9.1 8.6 2 9.3l5.5 4.2L5.8 20 12 16.3 18.2 20l-1.7-6.5L22 9.3l-7.1-.7z"/>
  </svg>
  <span class="action-title">Create Routine</span>
  <span class="action-desc">Build your custom workout</span>
  </button>
  
  <button class="action-card" onclick="window.location.hash='#skills-tree'">
  <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.3l6.18-3.73L21 12l-5.5-4.33L17 4l-5 3-5-3-.5 3.67L3 12l2.82 1.57z"/>
  </svg>
  <span class="action-title">Skill Tree</span>
  <span class="action-desc">Track your skill progression</span>
  </button>
  
  <button class="action-card" onclick="window.location.hash='#exercises'">
  <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
  </svg>
  <span class="action-title">Browse Exercises</span>
  <span class="action-desc">Discover new movements</span>
  </button>
  </div>
  </section>

  <!-- Featured Programs -->
  ${state.programs && state.programs.length > 0 ? `
  <section class="featured-section">
  <h2 class="card-title">Featured Programs</h2>
  <div class="programs-grid">
  ${state.programs.slice(0, 3).map(program => `
  <div class="program-card">
  <div class="program-header">
  <h3>${program.name}</h3>
  <span class="difficulty-badge difficulty-${getDifficultyColor(program.difficulty)}">${program.difficulty || 'Intermediate'}</span>
  </div>
  <p class="program-desc">${program.description || 'A comprehensive workout program'}</p>
  <div class="program-stats">
  <span>📅 ${program.duration || '30 min'}</span>
  <span>💪 ${program.exercises?.length || 0} exercises</span>
  </div>
  <button class="btn btn-primary" onclick="startWorkoutFromHome(${JSON.stringify(program).replace(/"/g, '&quot;')})">Start Now</button>
  </div>
  `).join('')}
  </div>
  </section>
  ` : ''}

  <!-- Recent Activity -->
  <section class="recent-section">
  <h2 class="card-title">Recent Activity</h2>
  ${recentWorkouts.length > 0 ? `
  <div class="workout-history">
  ${recentWorkouts.map(workout => `
  <div class="workout-item">
  <div class="workout-header">
  <span class="workout-title">${workout.program?.name || 'Custom Workout'}</span>
  <span class="workout-date">${formatDate(workout.date)}</span>
  </div>
  <div class="workout-details">
  <span class="badge">💪 ${getWorkoutTotalReps(workout)} total reps</span>
  ${workout.rating ? `<span class="badge rating-${workout.rating}">${getRatingLabel(workout.rating)}</span>` : ''}
  </div>
  </div>
  `).join('')}
  </div>
  ` : `
  <div class="no-data">
  <p>No workouts completed yet. Start your first workout to see activity here!</p>
  <button class="btn btn-primary" onclick="window.location.hash='#programs'">Start Workout</button>
  </div>
  `}
  </section>

  <!-- Motivational Quote -->
  <section class="quote-section">
  <blockquote>"The only bad workout is the one that didn't happen."</blockquote>
  <cite>- Unknown</cite>
  </section>
    </div>
    
    <style>
    .home-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    }

    .welcome-section {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    color: white;
    border-radius: 16px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }

    .welcome-section h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: white;
    }

    .welcome-section .subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    color: white;
    }

    /* Stats Grid */
    .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
    }

    .stat-card {
    background: white;
    color: var(--gray-800);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }

    .stat-icon-wrapper {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%);
    border-radius: 12px;
    }

    .stat-icon {
    width: 28px;
    height: 28px;
    fill: white;
    }

    .stat-number {
    display: block;
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--primary);
    }

    .stat-label {
    font-size: 0.9rem;
    color: var(--gray-600);
    }

    /* Quick Actions */
    .quick-actions h2,
    .featured-section h2,
    .recent-section h2 {
    margin-bottom: 1.5rem;
    color: var(--primary);
    font-size: 1.5rem;
    }

    .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
    }

    .action-card {
    background: white;
    color: var(--gray-800);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    width: 100%;
    }

    .action-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    background: var(--light);
    }

    .action-icon {
    width: 32px;
    height: 32px;
    display: block;
    margin-bottom: 0.5rem;
    fill: var(--primary);
    line-height: 1;
    }

    .action-title {
    display: block;
    font-weight: bold;
    color: var(--primary);
    margin-bottom: 0.3rem;
    }

    .action-desc {
    font-size: 0.85rem;
    color: var(--gray-600);
    }

    /* Featured Programs */
    .programs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
    }

    .program-card {
    background: white;
    color: var(--gray-800);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    transition: transform 0.3s ease;
    }

    .program-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }

    .program-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
    }

    .program-header h3 {
    color: var(--primary);
    font-size: 1.2rem;
    margin: 0;
    }

    .difficulty-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    }

    .difficulty-beginner { background: #d4edda; color: #155724; }
    .difficulty-intermediate { background: #fff3cd; color: #856404; }
    .difficulty-advanced { background: #f8d7da; color: #721c24; }

    .program-desc {
    color: var(--gray-600);
    font-size: 0.9rem;
    margin-bottom: 1rem;
    line-height: 1.4;
    }

    .program-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: var(--gray-600);
    }

    /* Recent Activity */
    .recent-section {
    margin-bottom: 3rem;
    }

    .workout-history {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    }

    .workout-item {
    background: white;
    color: var(--gray-800);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .workout-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    }

    .workout-title {
    font-weight: bold;
    color: var(--primary);
    }

    .workout-date {
    font-size: 0.85rem;
    color: var(--gray-600);
    }

    .workout-details {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    }

    .badge {
    padding: 0.3rem 0.8rem;
    background: var(--accent);
    color: white;
    border-radius: 12px;
    font-size: 0.8rem;
    }

    .rating-beginner { background: #d4edda; color: #155724; }
    .rating-intermediate { background: #fff3cd; color: #856404; }
    .rating-advanced { background: #f8d7da; color: #721c24; }

    .no-data {
    text-align: center;
    padding: 3rem;
    background: white;
    color: var(--gray-800);
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    }

    .no-data p {
    color: var(--gray-600);
    margin-bottom: 1rem;
    }

    /* Motivational Quote */
    .quote-section {
    text-align: center;
    padding: 3rem;
    background: linear-gradient(135deg, var(--light) 0%, #ff9a7b 100%);
    border-radius: 16px;
    color: white;
    }

    .quote-section blockquote {
    font-size: 1.3rem;
    font-style: italic;
    margin-bottom: 1rem;
    line-height: 1.5;
    }

    .quote-section cite {
    font-size: 0.9rem;
    opacity: 0.9;
    }

    /* Dark mode support for home view */
    html.dark .home-container,
    html.dark .stat-card,
    html.dark .action-card,
    html.dark .program-card,
    html.dark .workout-item,
    html.dark .no-data {
    background: #1e1e1e;
    color: #e0e0e0;
    border: 1px solid #333;
    }

    html.dark .stat-number {
    color: #e0e0e0;
    }

    html.dark .stat-label {
    color: #a0a0a0;
    }

    html.dark .action-title {
    color: #e0e0e0;
    }

    html.dark .action-desc {
    color: #a0a0a0;
    }

    html.dark .program-header h3,
    html.dark .workout-title {
    color: #ffffff;
    }

    html.dark .program-desc,
    html.dark .program-stats,
    html.dark .workout-date {
    color: #a0a0a0;
    }

    html.dark .action-card:hover {
    background: #333;
    }

    html.dark .quote-section {
    background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
    }

    html.dark .no-data p {
    color: #a0a0a0;
    }

    html.dark .section-title,
    html.dark h2 {
    color: #ffffff;
    }

@media (max-width: 600px) {
  .welcome-section h1 {
  font-size: 1.5rem;
  }
  
  .stats-grid {
  grid-template-columns: repeat(2, 1fr);
  }
  
  .action-grid {
  grid-template-columns: 1fr;
  }
  
  .programs-grid {
  grid-template-columns: 1fr;
  }
  
  .stat-icon-wrapper {
  width: 40px;
  height: 40px;
  }
  
  .stat-icon {
  width: 22px;
  height: 22px;
  }
  
  .stat-number {
  font-size: 1.5rem;
  }
  }
    </style>
  `;
}

// Export as function for direct imports AND add render property for wrapView compatibility
export { renderHomeView };
export default { render: renderHomeView };

// Expose globally for inline onclick handlers
window.startWorkoutFromHome = startWorkoutFromHome;
