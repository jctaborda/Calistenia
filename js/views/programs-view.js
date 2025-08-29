import { fetchPrograms } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { setState, getState } from '../services/state.js';

export async function renderProgramsView() {
  const main = document.getElementById('app');
  const programs = await fetchPrograms();
  const user = getState().user || {};
  const customRoutines = user.customRoutines || [];
  const { exercises } = getState();
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h1>Programs</h1>
        <button class="btn" id="create-routine-btn">Create New Routine</button>
      </div>
      <ul>
        ${programs.map(p => `
          <li>
            <button class="program-name-btn btn-link" data-type="program" data-id="${p.id}">
              ${p.name}
            </button>
            <button class="btn" data-type="program" data-id="${p.id}" data-action="start">Start</button>
          </li>
        `).join('')}
      </ul>
    </div>
    <div class="card">
      <h2>Custom Routines</h2>
      <ul>
        ${customRoutines.length === 0 ? '<li>No custom routines yet.</li>' : customRoutines.map((r, i) => `
          <li>
            <button class="program-name-btn btn-link" data-type="custom" data-id="${i}">
              ${r.name}
            </button>
            <button class="btn" data-type="custom" data-id="${i}" data-action="start">Start</button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  // Create New Routine button handler
  const createRoutineBtn = main.querySelector('#create-routine-btn');
  if (createRoutineBtn) {
    createRoutineBtn.addEventListener('click', () => {
      // Clear any editing state and navigate to builder
      setState({ editingProgram: null });
      window.location.hash = '#builder';
    });
  }

  // Program name click handlers - navigate to details page
  main.querySelectorAll('.program-name-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      window.location.hash = `#program-details/${type}/${id}`;
    });
  });

  // Start button logic
  main.querySelectorAll('button[data-action="start"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      if (type === 'program') {
        const program = programs.find(p => String(p.id) === String(id));
        if (program) {
          setState({ activeWorkout: { program, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      } else if (type === 'custom') {
        const routine = customRoutines[Number(id)];
        if (routine) {
          setState({ activeWorkout: { program: { id: 'custom-' + id, name: routine.name, exercises: routine.exercises }, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      }
    });
  });


} 