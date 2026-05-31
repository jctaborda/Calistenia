import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getExerciseProgressData } from '../utils/chart-helpers.js';
import { ImageService } from '../services/image-service.js';
import { formatDate } from '../utils/date-formatter.js';
import { updateState } from '../services/state.js';
import { ValidationService } from '../services/validation.js';

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

  // Sanitize all user-generated content to prevent XSS
  const safe = ValidationService.sanitizeExercise(exercise);

  let progressRows = '';
  const progressData = getExerciseProgressData(exerciseId, history);
  if (progressData.length > 0) {
    progressRows = progressData.map(d => `<tr><td>${formatDate(d.date)}</td><td>${ValidationService.sanitizeText(String(d.totalReps))}</td></tr>`).join('');
  } else {
    progressRows = '<tr><td colspan="2">No data</td></tr>';
  }

  // Helper function to get exercise name for prerequisites/progressions (sanitized)
  function getExerciseName(id) {
    const ex = (exercises || []).find(e => String(e.id) === String(id));
    return ex ? ValidationService.sanitizeText(ex.name) : 'Unknown';
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
    return muscle ? ValidationService.sanitizeText(muscle.name || muscle.name_en || 'Unknown') : 'Unknown';
  }).join(', ');
  
  const muscleSecNames = muscleSecIds.map(muscleId => {
    const muscle = muscles.find(m => m.id === muscleId);
    return muscle ? ValidationService.sanitizeText(muscle.name || muscle.name_en || 'Unknown') : 'Unknown';
  }).join(', ');

  // Fetch equipment names - handle both array and single value
  const equipmentIds = normalizeArray(exercise.equipment);
  const equipmentNames = equipmentIds.map(equipmentId => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip ? ValidationService.sanitizeText(equip.name) : `Equipment ${equipmentId}`;
  }).join(', ');

  // Fetch difficulty labels - handle both array and single value
  const difficultyIds = normalizeArray(exercise.difficulty);
  const difficultyLabels = difficultyIds.map(diffId => {
    const diff = difficulties.find(d => d.id === diffId);
    return diff ? ValidationService.sanitizeText(diff.label) : `Difficulty ${diffId}`;
  }).join(', ');

  // Fetch category names - handle both array and single value
  const categoryIds = normalizeArray(exercise.categories);
  const categoryNames = categoryIds.map(categoryId => {
    const categ = categories.find(c => c.id === categoryId);
    return categ ? ValidationService.sanitizeText(categ.name) : 'Unknown';
  }).join(', ');

  // Generate muscle images with ImageService for error handling
  const frontImages = ImageService.renderMuscleLayer(muscleIds, 'main', true, muscles);
  const backImages = ImageService.renderMuscleLayer(muscleIds, 'main', false, muscles);
  const frontImagesSecondary = ImageService.renderMuscleLayer(muscleSecIds, 'secondary', true, muscles);
  const backImagesSecondary = ImageService.renderMuscleLayer(muscleSecIds, 'secondary', false, muscles);

  main.innerHTML = renderHeader() + `
    <div class="card">
  <div class="exercise-header-actions">
  <h1 class="section-title">${safe.name}</h1>
  <button class="btn btn-icon favorite-toggle ${favoriteExerciseIds.includes(safe.id) ? 'favorited' : ''}" 
  onclick="toggleFavorite('${safe.id}')">
  ${favoriteExerciseIds.includes(safe.id) ? '⭐' : '☆'} Favorite
  </button>
  </div>
  <p class="description">${safe.description}</p>
  
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
  ${ImageService.renderExternalMedia(safe.image_url, 'image', safe.name)}
  ${safe.video_url ? ImageService.renderExternalMedia(safe.video_url, 'video', safe.name) : ''}

  <!-- Exercise Information -->
  <h2 class="card-title">Exercise Information</h2>
  
  <div class="content-block">
  <span class="content-label">Form Cues: </span>
  ${(() => {
    const cues = Array.isArray(safe.formCues) ? safe.formCues : (safe.formCues ? [safe.formCues] : []);
    return cues.length > 0
      ? `<ul class="form-cues-list">${cues.map(c => `<li>${c}</li>`).join('')}</ul>`
      : '<p class="content-value text-muted">No form cues provided</p>';
  })()}
  </div>

  <div class="content-block">
  <span class="content-label">Common Mistakes to Avoid: </span>
  ${(() => {
    const mistakes = Array.isArray(safe.commonMistakes) ? safe.commonMistakes : (safe.commonMistakes ? [safe.commonMistakes] : []);
    return mistakes.length > 0
      ? `<ul class="mistakes-list">${mistakes.map(m => `<li>${m}</li>`).join('')}</ul>`
      : '<p class="content-value text-muted">No common mistakes noted</p>';
  })()}
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
  <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image" loading="lazy">
  ${frontImagesSecondary}
  ${frontImages} 
  </div>
  </div>
  
  <div class="muscle-diagram-section">
  <h3 class="diagram-title">Back View</h3>
  <div class="muscle-diagram-back">
  <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image" loading="lazy">
  ${backImagesSecondary}
  ${backImages} 
  </div>
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
  overflow: hidden; /* Ensure images don't overflow */
  }
  
  .muscle-diagram-front,
  .muscle-diagram-back {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  overflow: hidden;
  height: 500px; /* FIXED HEIGHT critical for overlay positioning */
  }
  
  .muscle-diagram-front .base-image, .muscle-diagram-back .base-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
  }
  
  .muscle-diagram-front .muscle-layer, .muscle-diagram-back .muscle-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 2;
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
  max-width: 400px;
  margin: 0 auto;
  position: relative;
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

  /* Form cues and common mistakes lists */
  .form-cues-list,
  .mistakes-list {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
  }

  .form-cues-list li {
  margin-bottom: 0.25rem;
  color: var(--primary);
  }

  .mistakes-list li {
  margin-bottom: 0.25rem;
  color: var(--error, #e74c3c);
  }

  .text-muted {
  color: var(--gray-500);
  font-style: italic;
  }

  /* Dark mode for exercise details */
  html.dark .form-cues-list li {
  color: #e0e0e0;
  }

  html.dark .mistakes-list li {
  color: #ff6b6b;
  }

  html.dark .content-label {
  color: #b0b0b0;
  }

  html.dark .content-value {
  color: #e0e0e0;
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
