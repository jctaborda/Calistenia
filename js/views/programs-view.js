import { fetchPrograms } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { setState, getState } from '../services/state.js';

export async function renderProgramsView() {
  const main = document.getElementById('app');
  const programs = await fetchPrograms();
  const user = getState().user || {};
  const customRoutines = user.customRoutines || [];
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Programs</h1>
      <ul>
        ${programs.map(p => `<li>${p.name} <button class="btn" data-type="program" data-id="${p.id}">Start</button></li>`).join('')}
      </ul>
    </div>
    <div class="card">
      <h2>Custom Routines</h2>
      <ul>
        ${customRoutines.length === 0 ? '<li>No custom routines yet.</li>' : customRoutines.map((r, i) => `<li>${r.name} <button class="btn" data-type="custom" data-id="${i}">Start</button></li>`).join('')}
      </ul>
    </div>
  `;

  // Start button logic for both types
  main.querySelectorAll('button[data-type][data-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      if (type === 'program') {
        const program = programs.find(p => String(p.id) === String(id));
        if (program) {
          setState({ activeWorkout: { program, progress: {} } });
          window.location.hash = '#active-workout';
        }
      } else if (type === 'custom') {
        const routine = customRoutines[Number(id)];
        if (routine) {
          setState({ activeWorkout: { program: { id: 'custom-' + id, name: routine.name, exercises: routine.exercises }, progress: {} } });
          window.location.hash = '#active-workout';
        }
      }
    });
  });
} 