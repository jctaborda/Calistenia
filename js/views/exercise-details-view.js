import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getExerciseProgressData } from '../utils/chart-helpers.js';
import { ImageService } from '../services/image-service.js';

export function renderExerciseView(exerciseId) {
  const main = document.getElementById('app');
  const exercises = getState().exercises;
  const history = getState().history;
  const muscles = getState().muscles;
  const categories = getState().categories;
  const equipment = getState().equipment || [];
  const difficulties = getState().difficulties || [];
  
  const exercise = (exercises || []).find(e => String(e.id) === String(exerciseId));
  if (!exercise) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise not found.</p></div>';
    return;
  }

  let progressRows = '';
  const progressData = getExerciseProgressData(exerciseId, history);
  if (progressData.length > 0) {
    progressRows = progressData.map(d => `<tr><td>${new Date(d.date).toLocaleDateString()}</td><td>${d.totalReps}</td></tr>`).join('');
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
      <h1>${exercise.name}</h1>
      <p>${exercise.description}</p>
      <h3>Common Mistakes</h3>
      <p>${exercise.commonMistakes || ''}</p>
      <h3>Form Cues</h3>
      <p>${exercise.formCues || ''}</p>
      <h3>Skill: </h3><p> ${exercise.skill || ''} </p>
      <h3>Equipment: </h3><p> ${equipmentNames}</p>
      <h3>Difficulty: </h3><p>${difficultyLabels}</p>

      ${ImageService.renderExternalMedia(exercise.image_url, 'image', exercise.name)}
      ${exercise.video_url ? ImageService.renderExternalMedia(exercise.video_url, 'video', exercise.name) : ''}

      <h3>Categories: </h3>
      <p>${categoryNames}</p>

      <h3>Muscles: </h3>
      <p>${muscleNames}, ${muscleSecNames}</p>

      <h3>Prerequisites: </h3>
      <p>${prerequisitesLinks || 'None'}</p>

      <h3>Progressions: </h3>
      <p>${progressionsLinks || 'None'}</p>

      <h3>Progress: </h3>
      <table>
        <thead><tr><th>Date</th><th>Total Reps</th></tr></thead>
        <tbody>${progressRows}</tbody>
      </table>

      <div class="muscle-container">
      <div class="muscle-diagram-front">
        <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image">
        ${frontImagesSecondary}
        ${frontImages} 
      </div>
      <div class="muscle-diagram-back">
        <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image">
        ${backImagesSecondary}
        ${backImages} 
      </div>
      </div>
    </div>
  `;
}



// Export as object for wrapView compatibility
export default { render: renderExerciseView };
