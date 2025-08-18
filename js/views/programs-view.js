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
      <h1>Programs</h1>
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
    <div id="program-details" class="card hidden">
      <h3 id="program-details-title"></h3>
      <div id="program-details-content"></div>
      <button id="close-details" class="btn">Close Details</button>
    </div>
  `;

  function showProgramDetails(type, id) {
    const detailsDiv = main.querySelector('#program-details');
    const titleEl = main.querySelector('#program-details-title');
    const contentEl = main.querySelector('#program-details-content');
    
    let program;
    if (type === 'program') {
      program = programs.find(p => String(p.id) === String(id));
    } else if (type === 'custom') {
      const routine = customRoutines[Number(id)];
      program = { name: routine.name, exercises: routine.exercises };
    }
    
    if (!program) return;
    
    titleEl.textContent = program.name;
    contentEl.innerHTML = `
      <h4>Exercises:</h4>
      <ul>
        ${program.exercises.map(ex => {
          const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
          return `
            <li>
              <strong>${exercise ? exercise.name : 'Unknown Exercise'}</strong><br>
              Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s
            </li>
          `;
        }).join('')}
      </ul>
    `;
    detailsDiv.classList.remove('hidden');
    detailsDiv.scrollIntoView({ behavior: 'smooth' });
  }

  // Program name click handlers
  main.querySelectorAll('.program-name-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      showProgramDetails(type, id);
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

  // Close details button
  const closeBtn = main.querySelector('#close-details');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      main.querySelector('#program-details').classList.add('hidden');
    });
  }
} 