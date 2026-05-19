import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getExerciseProgressData } from '../utils/chart-helpers.js';
import { ImageService } from '../services/image-service.js';
import { formatDate } from '../utils/date-formatter.js';
import { updateState } from '../services/state.js';

export function renderExerciseView(exerciseId) {
  const main = document.getElementById('app');
  const exercises = getState().exercises;
  const history = getState().history;
  const muscles = getState().muscles;
  const categories = getState().categories;
  const equipment = getState().equipment || [];
  const difficulties = getState().difficulties || [];
  
  // Get user's favorite exercise IDs from state
  const user = getState().user || {};
  const favoriteExerciseIds = user.favoriteExerciseIds || [];
  
  const exercise = (exercises || []).find(e => String(e.id) === String(exerciseId));
  if (!exercise) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise not found.</p></div>';
    return;
  }

  let progressRows = '';
  const progressData = getExerciseProgressData(exerciseId, history);
  if (progressData.length > 0) {
    progressRows = progressData.map(d => `<tr><td>${formatDate(d.date)}</td><td>${d.totalReps}</td></tr>`).join('');
  } else {
    progressRows = '<tr><td colspan="2">No data</td></tr>';
  }

  // Helper function to get exercise name for prerequisites/progressions
  function getExerciseName(id) {
    const ex = (exercises || []).find(e => String(e.id) === String(id));
    return ex ? ex.name : 'Unknown';
  }

  // Normalize values to arrays - handles null, undefined, empty strings, and single values
  const normalizeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === '') return [];
    return [value];
  };
  
  // Fetch prerequisites and progressions - handle both array and single value
  const prerequisiteIds = normalizeArray(exercise.prerequisites);
  const prerequisitesLinks = prerequisiteIds.map(id => {
    const name = getExerciseName(id);
    return `<a href="#exercise/${id}">${name}</a>`;
  }).join(', ');

  const progressionIds = normalizeArray(exercise.progressions);
  const progressionsLinks = progressionIds.map(id => {
    const name = getExerciseName(id);
    return `<a href="#exercise/${id}">${name}</a>`;
  }).join(', ');

  // Fetch muscle names - handle both array and single value
  const muscleIds = normalizeArray(exercise.muscles);
  const muscleSecIds = normalizeArray(exercise.muscles_secondary);
  
  const muscleNames = muscleIds.map(muscleId => {
    const muscle = muscles.find(m => m.id === muscleId);
    return muscle ? muscle.name : 'Unknown';
  }).join(', ');
  
  const muscleSecNames = muscleSecIds.map(muscleId => {
    const muscle = muscles.find(m => m.id === muscleId);
    return muscle ? muscle.name : 'Unknown';
  }).join(', ');

  // Fetch equipment names - handle both array and single value
  const equipmentIds = normalizeArray(exercise.equipment);
  const equipmentNames = equipmentIds.map(equipmentId => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip ? equip.name : `Equipment ${equipmentId}`;
  }).join(', ');

  // Fetch difficulty labels - handle both array and single value
  const difficultyIds = normalizeArray(exercise.difficulty);
  const difficultyLabels = difficultyIds.map(diffId => {
    const diff = difficulties.find(d => d.id === diffId);
    return diff ? diff.label : `Difficulty ${diffId}`;
  }).join(', ');

  // Fetch category names - handle both array and single value
  const categoryIds = normalizeArray(exercise.categories);
  const categoryNames = categoryIds.map(categoryId => {
    const categ = categories.find(c => c.id === categoryId);
    return categ ? categ.name : 'Unknown';
  }).join(', ');

  // Generate muscle images with ImageService for error handling
  const frontImages = ImageService.renderMuscleLayer(muscleIds, 'main', true, muscles);
  const backImages = ImageService.renderMuscleLayer(muscleIds, 'main', false, muscles);
  const frontImagesSecondary = ImageService.renderMuscleLayer(muscleSecIds, 'secondary', true, muscles);
  const backImagesSecondary = ImageService.renderMuscleLayer(muscleSecIds, 'secondary', false, muscles);

  main.innerHTML = renderHeader() + `
    <div class="card">
  <div class="exercise-header-actions">
  <h1 class="section-title">${exercise.name}</h1>
  <button class="btn btn-icon favorite-toggle ${favoriteExerciseIds.includes(exercise.id) ? 'favorited' : ''}" 
  onclick="toggleFavorite('${exercise.id}')">
  ${favoriteExerciseIds.includes(exercise.id) ? '⭐' : '☆'} Favorite
  </button>
  </div>
  <p class="description">${exercise.description}</p>
  
  <!-- Exercise Details Grid -->
  <div class="content-block">
  <div class="detail-row">
  <span class="content-label">Skill Level: </span>
  <span class="content-value">${difficultyLabels}</span>
  </div>
  <div class="detail-row">
  <span class="content-label">Equipment: </span>
  <span class="content-value">${equipmentNames || 'None specified'}</span>
  </div>
  <div class="detail-row">
  <span class="content-label">Categories: </span>
  <div class="tags">${categoryNames.split(',').map(cat => `<span class="tag">${cat.trim()}</span>`).join('')}</div>
  </div>
  <div class="detail-row">
  <span class="content-label">Muscles Targeted: </span>
  <p class="content-value">${muscleNames}${muscleSecNames ? ', ' + muscleSecNames : ''}</p>
  </div>
  </div>

  <!-- Exercise Media -->
  ${ImageService.renderExternalMedia(exercise.image_url, 'image', exercise.name)}
  ${exercise.video_url ? ImageService.renderExternalMedia(exercise.video_url, 'video', exercise.name) : ''}

  <!-- Exercise Information -->
  <h2 class="card-title">Exercise Information</h2>
  
  <div class="content-block">
  <span class="content-label">Form Cues: </span>
  <p class="content-value">${exercise.formCues || 'No form cues provided'}</p>
  </div>

  <div class="content-block">
  <span class="content-label">Common Mistakes to Avoid: </span>
  <p class="content-value">${exercise.commonMistakes || 'No common mistakes noted'}</p>
  </div>

  <!-- Progression Chain -->
  <h2 class="card-title">Progression Chain</h2>
  
  <div class="content-block">
  <span class="content-label">Prerequisites: </span>
  <p class="content-value">${prerequisitesLinks || '<span class="text-muted">None - this is a starting exercise</span>'}</p>
  </div>

  <div class="content-block">
  <span class="content-label">Progressions (Next Steps): </span>
  <p class="content-value">${progressionsLinks || `<span class="text-muted">None - you've mastered this exercise!</span>`}</p>
  </div>

  <!-- Progress History -->
  <h2 class="card-title">Performance History</h2>
  
  <div class="table-responsive">
  <table class="progress-table">
  <thead>
  <tr>
  <th>Date: </th>
  <th>Total Reps: </th>
  </tr>
  </thead>
  <tbody>${progressRows}</tbody>
  </table>
  </div>

  <!-- Muscle Diagrams -->
  <h2 class="card-title">Muscle Engagement</h2>
  
  <div class="muscle-container">
  <div class="muscle-diagram-section">
  <h3 class="diagram-title">Front View</h3>
  <div class="muscle-diagram-front">
  <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image">
  ${frontImagesSecondary}
  ${frontImages} 
  </div>
  </div>
  
  <div class="muscle-diagram-section">
  <h3 class="diagram-title">Back View</h3>
  <div class="muscle-diagram-back">
  <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image">
  ${backImagesSecondary}
  ${backImages} 
  </div>
  </div>
  </div>
    </div>
    
    <style>
  /* Card container - ensure it accommodates all content including muscle diagrams */
  .card {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  min-height: calc(100vh - 120px); /* Ensure card is tall enough for content */
  overflow: visible; /* Allow content to flow naturally */
  display: flex;
  flex-direction: column;
  }

.detail-row {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gray-200);
  }
  
  .detail-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
  }
  
  .table-responsive {
  overflow-x: auto;
  margin-top: 1rem;
  }
  
  .progress-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-md);
  overflow: hidden;
  }
  
  .progress-table th,
  .progress-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--gray-200);
  }
  
  .progress-table th {
  background: var(--gray-100);
  font-weight: 600;
  color: var(--primary);
  }
  
  .progress-table tr:hover {
  background: var(--gray-100);
  }
  
  .muscle-diagram-section {
  margin-bottom: 2rem;
  }
  
  .diagram-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 1rem;
  }
  
  @media (max-width: 768px) {
  .muscle-container {
  flex-direction: column;
  }
  
  .muscle-diagram-front,
  .muscle-diagram-back {
  width: 100%;
  margin-top: 1rem;
  }
  }
  
  /* Favorite toggle button */
  .exercise-header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
  }
  
  .favorite-toggle {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  background: var(--gray-100);
  color: var(--gray-700);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  }
  
  .favorite-toggle:hover {
  background: var(--gray-200);
  }
  
  .favorite-toggle.favorited {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: white;
  border-color: #FFA500;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
  }
  
  .favorite-toggle.favorited:hover {
  background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%);
  }
    </style>
  `;
}

// Toggle favorite for exercise - exposed globally for onclick handler
// Toggle favorite for exercise - exposed globally for onclick handler
export function toggleFavorite(exerciseId) {
  const state = getState();
  const user = state.user || {};
  let favoriteExerciseIds = user.favoriteExerciseIds || [];
  
  // Toggle the exercise in favorites
  if (favoriteExerciseIds.includes(exerciseId)) {
    favoriteExerciseIds = favoriteExerciseIds.filter(id => id !== exerciseId);
  } else {
    favoriteExerciseIds.push(exerciseId);
  }
  
  updateState({ user: { ...user, favoriteExerciseIds } });
}

// Expose globally for inline onclick handlers
window.toggleFavorite = toggleFavorite;

// Export as object for wrapView compatibility
export default { render: renderExerciseView };
