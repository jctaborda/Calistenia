import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { getExerciseProgressData } from '../utils/chart-helpers.js';

export function renderExerciseView(exerciseId) {
  const main = document.getElementById('app');
  const { exercises, history } = getState();
  const exercise = (exercises || []).find(e => String(e.id) === String(exerciseId));
  if (!exercise) {
    main.innerHTML = renderHeader() + '<p>Exercise not found.</p>';
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
    <h1>${exercise.name}</h1>
    <p>${exercise.description}</p>
    <p><strong>Difficulty:</strong> ${exercise.difficulty}</p>
    <h2>Progress</h2>
    <table>
      <thead><tr><th>Date</th><th>Total Reps</th></tr></thead>
      <tbody>${progressRows}</tbody>
    </table>
  `;
} 