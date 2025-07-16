import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { logSet } from '../services/workout-engine.js';

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises } = getState();
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<p>No active workout.</p>';
    return;
  }
  // For now, always show the first exercise in the program
  const exerciseId = activeWorkout.program.exercises[0];
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
      // The view will re-render on stateChange, but for now, call renderActiveWorkoutView directly
      renderActiveWorkoutView();
    });
  }
} 