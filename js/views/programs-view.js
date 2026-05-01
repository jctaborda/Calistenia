import { fetchPrograms } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { setState, getState } from '../services/state.js';


export async function renderProgramsView() {
  const main = document.getElementById('app');
  //const programs = await fetchPrograms();
  const programs = await getState().programs;
  const user = getState().user || {};
  const customRoutines = user.customRoutines || [];
  const { exercises } = getState();
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h1>Programs</h1>
        <button class="btn" id="create-routine-btn">New Routine</button>
      </div>
      <ul>
        ${programs.map(p => `
          <li class="flex-container">
            <div class="workout-card">
              <h2 program-name-btn data-type="program" data-id="${p.id}" data-action="view">${p.name}</h2>
              <p>
              <div class="controls">
                <button class="view-btn program-name-btn" data-type="program" data-id="${p.id}" data-action="view">View</button>
                <button class="start-btn" data-type="program" data-id="${p.id}" data-action="start">Start</button>
                <button class="edit-btn" data-type="program" data-id="${p.id}" data-action="edit">Edit</button>
                <button class="delete-btn" data-type="program" data-id="${p.id}" data-action="delete">Delete</button>
              </div>
            </div>
          </li>
        `).join('')}
      </ul>
      <h1>Custom Routines</h1>
      <ul>
        ${customRoutines.length === 0 ? '<li>No custom routines yet.</li>' : customRoutines.map((r) => `
          <li class="flex-container">
            <div class="workout-card">
              <h2 program-name-btn data-type="custom" data-id="${r.id}" data-action="view">${r.name}</h2>
              
              <div class="controls">
              
                <button class="view-btn program-name-btn" data-type="custom" data-id="${r.id}" data-action="view">View</button>
                <button class="start-btn" data-type="custom" data-id="${r.id}" data-action="start">Start</button>
                <button class="edit-btn" data-type="custom" data-id="${r.id}" data-action="edit">Edit</button>
                <button class="delete-btn" data-type="custom" data-id="${r.id}" data-action="delete">Delete</button>
              </div>
            </div>
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

  // View click handlers - navigate to details page
  main.querySelectorAll('.program-name-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      window.location.hash = `#program-details/${type}/${id}`;
    });
  });

  // Edit button handler
  main.querySelectorAll('.edit-btn').forEach(editBtn =>{
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        // Store the program data for editing
        const type = editBtn.getAttribute('data-type');
        const id = editBtn.getAttribute('data-id');
        let program;
          if (type === 'program') {
            program = programs.find(p => String(p.id) === String(id));
          } else if (type === 'custom') {
            const routine = customRoutines.find(r => String(r.id)==String(id));
            program = { id: id, name: routine.name, exercises: routine.exercises };
          }
    
        setState({
          editingProgram: {
            type,
            id,
            program: {
              name: program.name,
              exercises: program.exercises
            }
          } 
        });
        window.location.hash = '#builder';
      });
    }
  });

  // Delete routine button handler (only for custom routines)
  main.querySelectorAll('.delete-btn').forEach(deleteBtn => {
    if (deleteBtn) { 
      deleteBtn.addEventListener('click', () => {
        const type = deleteBtn.getAttribute('data-type');
        const id = String(deleteBtn.getAttribute('data-id'));
        let program;
        if (type === 'custom') {
          const routine = customRoutines.find(r => String(r.id) === String(id));
          if (routine) {
            const programName = routine.name;
            if (confirm(`Are you sure you want to delete "${programName}"? This action cannot be undone.`)) {
              const state = getState();
              const user = { ...state.user };
              user.customRoutines = user.customRoutines || [];
              const routineIndex = user.customRoutines.findIndex(r => String(r.id) === String(id));
              if (routineIndex !== -1) {
                user.customRoutines.splice(routineIndex, 1);
              }
              setState({ user });
              alert('Routine deleted successfully!');
              renderProgramsView();
            }
          }
        }
      });
    }
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
        const routine = customRoutines.find(r => String(r.id)==String(id));
        if (routine) {
          setState({ activeWorkout: { program: { id: id, name: routine.name, exercises: routine.exercises, warmup: routine.warmup || [], cooldown: routine.cooldown || [] }, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      }
    });
  });


} 

