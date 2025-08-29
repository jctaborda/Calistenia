import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getExerciseProgressData } from '../utils/chart-helpers.js';

export function renderExerciseView(exerciseId) {
  const main = document.getElementById('app');
  const { exercises, history } = getState();
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
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>${exercise.name}</h1>
      <p>${exercise.description}</p>
      <p><strong>Skill:</strong> ${exercise.skill}</p>
      <p><strong>Equipment:</strong> ${exercise.equipment}</p>
      <p><strong>Difficulty:</strong> ${exercise.difficulty}</p>

      
      ${exercise.image_url ? `<img src="${exercise.image_url}" alt="${exercise.name}" style="max-width: 200px;">` : ''}
      ${exercise.video_url ? `<video controls width="300"> <source src="${exercise.video_url}" type="video/mp4">Your browser does not support the video tag.</video>` : ''}

      <h2>Categories</h2>
      <p>${exercise.categories.join(', ')}</p>

      <h2>Subcategories</h2>
      <p>${exercise.subcategories.join(', ')}</p>

      <h2>Progress</h2>
      <table>
        <thead><tr><th>Date</th><th>Total Reps</th></tr></thead>
        <tbody>${progressRows}</tbody>
      </table>
    </div>
  `;
} 