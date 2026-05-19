import { fetchPrograms } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { setState, getState, updateState } from '../services/state.js';


export async function renderProgramsView() {
  const main = document.getElementById('app');
  const allPrograms = (await getState().programs) || [];
  const user = getState().user || {};
  const customRoutines = user.customRoutines || [];
  const { exercises } = getState();
  
  // Render with improved visual hierarchy and semantic structure
  main.innerHTML = renderHeader() + `
    <div class="card">
      <!-- Header Section -->
      <h1 class="section-title">Programs</h1>
      
      <div class="filter-section">
        <button class="btn btn-primary" id="create-routine-btn">✨ Create New Routine</button>
      </div>

      <!-- Standard Programs List -->
      <h2 class="card-title">Available Programs</h2>
      ${allPrograms.length === 0 ? `
        <div class="empty-state">
          <h2>No Programs Available</h2>
          <p>Create your first routine to get started with your workout journey!</p>
          <button class="btn btn-primary" id="create-from-empty">✨ Create New Routine</button>
        </div>
      ` : `
        <div class="list-container">
          ${allPrograms.map(p => `
            <div class="program-card" data-type="program" data-id="${p.id}">
              <div class="program-header">
                <h3 program-name-btn data-type="program" data-id="${p.id}" data-action="view">${p.name}</h3>
              </div>
              ${p.description ? `<p class="program-desc">${p.description}</p>` : ''}
              <div class="program-actions">
                <button class="btn btn-primary view-btn" data-type="program" data-id="${p.id}" data-action="view">View</button>
                <button class="btn btn-success start-btn" data-type="program" data-id="${p.id}" data-action="start">Start</button>
                <button class="btn btn-warning edit-btn" data-type="program" data-id="${p.id}" data-action="edit">Edit</button>
                <button class="btn btn-danger delete-btn" data-type="program" data-id="${p.id}" data-action="delete">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- Custom Routines Section -->
      <h2 class="card-title mt-2">My Custom Routines</h2>
      ${customRoutines.length === 0 ? `
        <div class="empty-state">
          <h2>No Custom Routines Yet</h2>
          <p>Create your first custom workout to track your progress!</p>
          <button class="btn btn-primary" id="create-custom-empty">✨ Create Custom Routine</button>
        </div>
      ` : `
        <div class="list-container">
          ${customRoutines.map((r) => {
            // Get difficulty class based on exercise difficulty ID (1=beginner, 2=intermediate, 3=advanced)
            let difficultyClass = '';
            if (r.exercises && r.exercises.length > 0) {
              const firstExId = r.exercises[0].exerciseId;
              const ex = exercises.find(e => String(e.id) === String(firstExId));
              if (ex && ex.difficulty) {
                const difficulties = Array.isArray(ex.difficulty) ? ex.difficulty : [ex.difficulty];
                // Check for IDs: 3=advanced, 2=intermediate, 1=beginner
                if (difficulties.includes(3)) {
                  difficultyClass = 'difficulty-advanced';
                } else if (difficulties.includes(2)) {
                  difficultyClass = 'difficulty-intermediate';
                } else if (difficulties.includes(1)) {
                  difficultyClass = 'difficulty-beginner';
                }
              }
            }
            
            return `
              <div class="program-card ${difficultyClass}" data-type="custom" data-id="${r.id}">
                <div class="program-header">
                  <h3 program-name-btn data-type="custom" data-id="${r.id}" data-action="view">${r.name}</h3>
                </div>
                <div class="program-actions">
                  <button class="btn btn-primary view-btn" data-type="custom" data-id="${r.id}" data-action="view">View</button>
                  <button class="btn btn-success start-btn" data-type="custom" data-id="${r.id}" data-action="start">Start</button>
                  <button class="btn btn-warning edit-btn" data-type="custom" data-id="${r.id}" data-action="edit">Edit</button>
                  <button class="btn btn-danger delete-btn" data-type="custom" data-id="${r.id}" data-action="delete">Delete</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  // Create New Routine button handler
  const createRoutineBtn = main.querySelector('#create-routine-btn');
  if (createRoutineBtn) {
    createRoutineBtn.addEventListener('click', () => {
      console.log('🔴 PROGRAMS-VIEW: Clicking Create New Routine button');
      const newState = { 
        createNewProgram: true, 
        editingProgram: null, 
        editingModule: null 
      };
      console.log('  Setting state:', newState);
      updateState(newState);
      console.log('  Navigating to #builder');
      window.location.hash = '#builder';
    });
  }

  // Empty state button handlers
  const createFromEmptyBtn = main.querySelector('#create-from-empty');
  if (createFromEmptyBtn) {
    createFromEmptyBtn.addEventListener('click', () => {
      const newState = { 
        createNewProgram: true, 
        editingProgram: null, 
        editingModule: null 
      };
      updateState(newState);
      window.location.hash = '#builder';
    });
  }

  const createCustomEmptyBtn = main.querySelector('#create-custom-empty');
  if (createCustomEmptyBtn) {
    createCustomEmptyBtn.addEventListener('click', () => {
      const newState = { 
        createNewProgram: true, 
        editingProgram: null, 
        editingModule: null 
      };
      updateState(newState);
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
            program = allPrograms.find(p => String(p.id) === String(id));
          } else if (type === 'custom') {
            const routine = customRoutines.find(r => String(r.id)==String(id));
            program = { id: id, name: routine.name, exercises: routine.exercises };
          }
    
        updateState({
          editingProgram: {
            type,
            id,
            program: {
              name: program.name,
              exercises: program.exercises
            }
          },
          editingModule: null // Clear any previous module editing state
        });
        window.location.hash = '#builder';
      });
    }
  });

  // View button handler - navigate to details page
  main.querySelectorAll('.view-btn').forEach(viewBtn => {
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        const type = viewBtn.getAttribute('data-type');
        const id = viewBtn.getAttribute('data-id');
        window.location.hash = `#program-details/${type}/${id}`;
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
              updateState({ user });
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
        const program = allPrograms.find(p => String(p.id) === String(id));
        if (program) {
          updateState({ activeWorkout: { program, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      } else if (type === 'custom') {
        const routine = customRoutines.find(r => String(r.id)==String(id));
        if (routine) {
          updateState({ activeWorkout: { program: { id: id, name: routine.name, exercises: routine.exercises, warmup: routine.warmup || [], cooldown: routine.cooldown || [] }, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      }
    });
  });


} 


// Export as object for wrapView compatibility
export default { render: renderProgramsView };
