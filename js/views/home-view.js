import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';

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
          <div class="stat-icon">🏋️</div>
          <div class="stat-info">
            <span class="stat-number">${totalWorkouts}</span>
            <span class="stat-label">Total Workouts</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <span class="stat-number">${currentStreak}</span>
            <span class="stat-label">Day Streak</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💪</div>
          <div class="stat-info">
            <span class="stat-number">${formatNumber(totalPushUps)}</span>
            <span class="stat-label">Total Push-Ups</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-info">
            <span class="stat-number">${achievements.length}</span>
            <span class="stat-label">Achievements Unlocked</span>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="action-grid">
          <button class="action-card" onclick="window.location.hash='#programs'">
            <span class="action-icon">📋</span>
            <span class="action-title">Start Program</span>
            <span class="action-desc">Choose from pre-made routines</span>
          </button>
          
          <button class="action-card" onclick="window.location.hash='#builder'">
            <span class="action-icon">✨</span>
            <span class="action-title">Create Routine</span>
            <span class="action-desc">Build your custom workout</span>
          </button>
          
          <button class="action-card" onclick="window.location.hash='#skills'">
            <span class="action-icon">🌟</span>
            <span class="action-title">Skill Tree</span>
            <span class="action-desc">Track your skill progression</span>
          </button>
          
          <button class="action-card" onclick="window.location.hash='#exercises'">
            <span class="action-icon">🏃</span>
            <span class="action-title">Browse Exercises</span>
            <span class="action-desc">Discover new movements</span>
          </button>
        </div>
      </section>

      <!-- Featured Programs -->
      ${state.programs && state.programs.length > 0 ? `
      <section class="featured-section">
        <h2>Featured Programs</h2>
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
              <button class="btn btn-primary" onclick="window.location.hash='#program/${program.id}'">Start Now</button>
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}

      <!-- Recent Activity -->
      <section class="recent-section">
        <h2>Recent Activity</h2>
        ${recentWorkouts.length > 0 ? `
        <div class="workout-history">
          ${recentWorkouts.map(workout => `
            <div class="workout-item">
              <div class="workout-header">
                <span class="workout-title">${workout.program?.name || 'Custom Workout'}</span>
                <span class="workout-date">${formatDate(workout.date)}</span>
              </div>
              <div class="workout-details">
                <span class="badge">💪 ${getTotalReps(workout.progress)} total reps</span>
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

      .stat-icon {
        font-size: 2rem;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%);
        border-radius: 12px;
      }

      .stat-number {
        display: block;
        font-size: 1.8rem;
        font-weight: bold;
        color: var(--primary);
      }

      .stat-label {
        font-size: 0.9rem;
        color: #666;
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
        font-size: 2rem;
        display: block;
        margin-bottom: 0.5rem;
      }

      .action-title {
        display: block;
        font-weight: bold;
        color: var(--primary);
        margin-bottom: 0.3rem;
      }

      .action-desc {
        font-size: 0.85rem;
        color: #666;
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
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        line-height: 1.4;
      }

      .program-stats {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        color: #666;
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
        color: #666;
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
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
      }

      .no-data p {
        color: #666;
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

        .stat-icon {
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
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

// Helper functions
function calculateTotalPushUps(history) {
  if (!history || history.length === 0) return 0;
  
  return history.reduce((total, workout) => {
    if (workout?.progress) {
      const progressKeys = Object.keys(workout.progress);
      if (progressKeys.length > 0) {
        workout.progress[progressKeys[0]]?.forEach(reps => {
          total += reps || 0;
        });
      }
    }
    return total;
  }, 0);
}

function calculateCurrentStreak(history) {
  if (!history || history.length === 0) return 0;
  
  const dates = history.map(w => new Date(w.date).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);
  
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = new Date(Date.now() - 86400000).setHours(0, 0, 0, 0);
  
  // Check if last workout was today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }
  
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const currentDay = dates[i];
    const prevDay = dates[i - 1];
    
    // Gap of more than 1 day breaks streak
    if (prevDay - currentDay > 86400000) {
      break;
    }
    streak++;
  }
  
  return streak;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getDifficultyColor(difficulty) {
  const colors = {
    'beginner': 'beginner',
    'intermediate': 'intermediate',
    'advanced': 'advanced'
  };
  return colors[difficulty] || 'intermediate';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function getTotalReps(progress) {
  if (!progress) return 0;
  let total = 0;
  Object.values(progress).forEach(set => {
    if (Array.isArray(set)) {
      set.forEach(reps => total += reps || 0);
    }
  });
  return total;
}

function getRatingLabel(rating) {
  const labels = {
    1: 'Too Easy',
    2: 'Just Right',
    3: 'Too Hard'
  };
  return labels[rating] || '';
}
