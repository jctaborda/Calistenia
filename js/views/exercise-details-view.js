import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getExerciseProgressData } from '../utils/chart-helpers.js';

export function renderExerciseView(exerciseId) {
  const main = document.getElementById('app');
  //const { exercises, history } = getState();
  const exercises = getState().exercises;
  const history = getState().history;
  const muscles = getState().muscles;
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

  // Fetch names for prerequisites and progressions
  function getExerciseName(id) {
    const exercise = (exercises || []).find(e => String(e.id) === String(id));
    return exercise ? exercise.name : 'Unknown';
  }

  const prerequisitesLinks = (exercise.prerequisites || []).map(id => {
    const name = getExerciseName(id);
    //console.log(`Prerequisite ID: ${id}, Name: ${name}`); // Debug log
    return `<a href="#exercise/${id}">${name}</a>`;
  }).join(', ');

  const progressionsLinks = (exercise.progressions || []).map(id => {
    const name = getExerciseName(id);
    return `<a href="#exercise/${id}" >${name}</a>`;
  }).join(', ');

  const frontImages = exercise.muscles.map(muscleId => {
    if (muscles[muscleId-1].is_front) {
      return `<img src="assets/images/muscles/main/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`
  }}).join('');

  const backImages = exercise.muscles.map(muscleId => {
    if (!muscles[muscleId-1].is_front) {
      return `<img src="assets/images/muscles/main/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`
  }}).join('');

  const frontImagesSecondary = exercise.muscles_secondary.map(muscleId => {
    if (muscles[muscleId-1].is_front) {
      return `<img src="assets/images/muscles/secondary/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`
  }}).join('');

  const backImagesSecondary = exercise.muscles_secondary.map(muscleId => {
    if (!muscles[muscleId-1].is_front) {
      return `<img src="assets/images/muscles/secondary/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`
  }}).join('');

  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>${exercise.name}</h1>
      <p>${exercise.description}</p>
      <h3>Common Mistakes</h3>
      <p>${exercise.commonMistakes}</p>
      <h3>Form Cues</h3>
      <p>${exercise.formCues}</p>
      <h3>Skill: </h3><p> ${exercise.skill} </p>
      <h3>Equipment: </h3><p> ${exercise.equipment}</p>
      <h3>Difficulty: </h3><p>${exercise.difficulty}</p>

      ${exercise.image_url ? `<img src="${exercise.image_url}" alt="${exercise.name}" style="max-width: 200px;">` : ''}
      ${exercise.video_url ? `<video controls width="300"> <source src="${exercise.video_url}" type="video/mp4">Your browser does not support the video tag.</video>` : ''}

      <h3>Categories: </h3>
      <p>${exercise.categories.join(', ')}</p>

      <h3>Muscles: </h3>
      <p>${exercise.muscles.join(', ')}</p>

      <h3>Prerequisites: </h3>
      <p>${prerequisitesLinks}</p>

      <h3>Progressions: </h3>
      <p>${progressionsLinks}</p>

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


