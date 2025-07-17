import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { logSet } from '../services/workout-engine.js';

let bound = false;

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises } = getState();
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<p>No active workout.</p>';
    return;
  }
  // Find the current exercise (first one in program.exercises that has no progress or incomplete set)
  const progress = activeWorkout.progress || {};
  const programExercises = activeWorkout.program.exercises;
  let currentIdx = 0;
  for (let i = 0; i < programExercises.length; i++) {
    if (!progress[programExercises[i]] || progress[programExercises[i]].length === 0) {
      currentIdx = i;
      break;
    }
    if (i === programExercises.length - 1) currentIdx = i;
  }
  const exerciseId = programExercises[currentIdx];
  const exercise = (exercises || []).find(e => String(e.id) === String(exerciseId));
  if (!exercise) {
    main.innerHTML = renderHeader() + '<p>Exercise not found.</p>';
    return;
  }
  main.innerHTML = renderHeader() + `
    <h1>Active Workout</h1>
    <h2>${exercise.name}</h2>
    <p>${exercise.description}</p>
    <form id="log-set-form">
      <label>Reps Completed: <input type="number" name="reps" min="1" required></label>
      <button type="submit">Log Set</button>
    </form>
  `;
  const form = main.querySelector('#log-set-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const reps = form.elements['reps'].value;
      logSet(reps);
      // No direct re-render; will re-render on stateChange
    });
  }
  if (!bound) {
    document.addEventListener('stateChange', () => {
      if (window.location.hash === '#active-workout') {
        renderActiveWorkoutView();
      }
    });
    bound = true;
  }
} 