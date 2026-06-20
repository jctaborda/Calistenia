import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getExerciseProgressData } from '../utils/workout-summary.js';
import { ImageService } from '../services/image-service.js';
import { formatDate } from '../utils/date-formatter.js';
import { updateState } from '../services/state.js';
import { ValidationService } from '../services/validation.js';
import { normalizeArray } from '../utils/array.js';

export async function renderExerciseDetailsView(exerciseId) {
  const main = document.getElementById('app');
  const state = await getState();
  const exercises = state.exercises || [];
  const history = state.history || [];
  const muscles = state.muscles || [];
  const categories = state.categories || [];
  const equipment = getState().equipment || [];
  const difficulties = getState().difficulties || [];
  
  // Get user's favorite exercise IDs from state
  const user = getState().user || {};
  const favoriteExerciseIds = user.favoriteExerciseIds || [];
  
  const exercise = (exercises || []).find(e => String(e.id) === String(exerciseId));
  if (!exercise) {
    main.innerHTML = renderHeader() + `<div class="card"><p>${t('exercise_details.not_found')}</p></div>`;
    return;
  }

  // Sanitize all user-generated content to prevent XSS
  const safe = ValidationService.sanitizeExercise(exercise);

  let progressRows = '';
  const progressData = getExerciseProgressData(exerciseId, history);
  if (progressData.length > 0) {
    progressRows = progressData.map(d => `<tr><td>${formatDate(d.date)}</td><td>${ValidationService.sanitizeText(String(d.totalReps))}</td></tr>`).join('');
  } else {
    progressRows = `<tr><td colspan="2">${t('exercise_details.no_data')}</td></tr>`;
  }

  // Helper function to get exercise name for prerequisites/progressions (sanitized)
  function getExerciseName(id) {
    const ex = (exercises || []).find(e => String(e.id) === String(id));
    return ex ? ValidationService.sanitizeText(ex.name) : t('completion.unknown');
  }

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
    return muscle ? ValidationService.sanitizeText(muscle.name || muscle.name_en || t('completion.unknown')) : t('completion.unknown');
  }).join(', ');
  
  const muscleSecNames = muscleSecIds.map(muscleId => {
    const muscle = muscles.find(m => m.id === muscleId);
    return muscle ? ValidationService.sanitizeText(muscle.name || muscle.name_en || t('completion.unknown')) : t('completion.unknown');
  }).join(', ');

  // Fetch equipment names - handle both array and single value
  const equipmentIds = normalizeArray(exercise.equipment);
  const equipmentNames = equipmentIds.map(equipmentId => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip ? ValidationService.sanitizeText(equip.name) : `${t('exercise_details.none_specified')} ${equipmentId}`;
  }).join(', ');

  // Fetch difficulty labels - handle both array and single value
  const difficultyIds = normalizeArray(exercise.difficulty);
  const difficultyLabels = difficultyIds.map(diffId => {
    const diff = difficulties.find(d => d.id === diffId);
    return diff ? ValidationService.sanitizeText(diff.label) : `${t('exercise_details.none_specified')} ${diffId}`;
  }).join(', ');

  // Fetch category names - handle both array and single value
  const categoryIds = normalizeArray(exercise.categories);
  const categoryNames = categoryIds.map(categoryId => {
    const categ = categories.find(c => c.id === categoryId);
    return categ ? ValidationService.sanitizeText(categ.name) : t('completion.unknown');
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
  <button class="btn btn-icon favorite-toggle ${favoriteExerciseIds.some(id => String(id) === String(safe.id)) ? 'favorited' : ''}" 
  data-favorite="${safe.id}">
  ${favoriteExerciseIds.some(id => String(id) === String(safe.id)) ? '★' : '☆'} ${t('exercise_details.favorite')}
  </button>
  </div>
  <p class="description">${safe.description}</p>
  
  <!-- Exercise Details Grid -->
  <div class="content-block">
  <div class="detail-row">
  <span class="content-label">${t('exercise_details.skill_level')}</span>
  <span class="content-value">${difficultyLabels}</span>
  </div>
  <div class="detail-row">
  <span class="content-label">${t('exercise_details.equipment_label')}</span>
  <span class="content-value">${equipmentNames || t('exercise_details.none_specified')}</span>
  </div>
  <div class="detail-row">
  <span class="content-label">${t('exercise_details.categories_label')}</span>
  <div class="tags">${categoryNames.split(',').map(cat => `<span class="tag">${cat.trim()}</span>`).join('')}</div>
  </div>
  <div class="detail-row">
  <span class="content-label">${t('exercise_details.muscles_targeted')}</span>
  <p class="content-value">${muscleNames}${muscleSecNames ? ', ' + muscleSecNames : ''}</p>
  </div>
  </div>

  <!-- Exercise Media -->
  ${ImageService.renderExternalMedia(safe.image_url, 'image', safe.name)}
  ${safe.video_url ? ImageService.renderExternalMedia(safe.video_url, 'video', safe.name) : ''}

  <!-- Exercise Information -->
  <h2 class="card-title">${t('exercise_details.exercise_information')}</h2>
  
  <div class="content-block">
  <span class="content-label">${t('exercise_details.form_cues_label')}</span>
  ${(() => {
    const cues = Array.isArray(safe.formCues) ? safe.formCues : (safe.formCues ? [safe.formCues] : []);
    return cues.length > 0
      ? `<ul class="form-cues-list">${cues.map(c => `<li>${c}</li>`).join('')}</ul>`
      : `<p class="content-value text-muted">${t('exercise_details.no_form_cues')}</p>`;
  })()}
  </div>

  <div class="content-block">
  <span class="content-label">${t('exercise_details.common_mistakes_label')}</span>
  ${(() => {
    const mistakes = Array.isArray(safe.commonMistakes) ? safe.commonMistakes : (safe.commonMistakes ? [safe.commonMistakes] : []);
    return mistakes.length > 0
      ? `<ul class="mistakes-list">${mistakes.map(m => `<li>${m}</li>`).join('')}</ul>`
      : `<p class="content-value text-muted">${t('exercise_details.no_common_mistakes')}</p>`;
  })()}
  </div>

  <!-- Progression Chain -->
  <h2 class="card-title">${t('exercise_details.progression_chain')}</h2>
  
  <div class="content-block">
  <span class="content-label">${t('exercise_details.prerequisites_label')}</span>
  <p class="content-value">${prerequisitesLinks || `<span class="text-muted">${t('exercise_details.prereq_none')}</span>`}</p>
  </div>

  <div class="content-block">
  <span class="content-label">${t('exercise_details.progressions_label')}</span>
  <p class="content-value">${progressionsLinks || `<span class="text-muted">${t('exercise_details.progression_none')}</span>`}</p>
  </div>

  <!-- Progress History -->
  <h2 class="card-title">${t('exercise_details.performance_history')}</h2>
  
  <div class="table-responsive">
  <table class="progress-table">
  <thead>
  <tr>
  <th>${t('exercise_details.date_label')}</th>
  <th>${t('exercise_details.reps_label')}</th>
  </tr>
  </thead>
  <tbody>${progressRows}</tbody>
  </table>
  </div>

  <!-- Muscle Diagrams -->
  <h2 class="card-title">${t('exercise_details.muscle_engagement')}</h2>
  
  <div class="muscle-container">
  <div class="muscle-diagram-section">
  <h3 class="diagram-title">${t('exercise_details.front_view')}</h3>
  <div class="muscle-diagram-front">
  <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image" loading="lazy">
  ${frontImagesSecondary}
  ${frontImages} 
  </div>
  </div>
  
  <div class="muscle-diagram-section">
  <h3 class="diagram-title">${t('exercise_details.back_view')}</h3>
  <div class="muscle-diagram-back">
  <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image" loading="lazy">
  ${backImagesSecondary}
  ${backImages} 
  </div>
  </div>
  </div>
  </div>
    </div>
    
  `;
}

// Toggle favorite for exercise - handled by event delegation
// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderExerciseDetailsView };
