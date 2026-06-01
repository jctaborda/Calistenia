import { fetchPrograms } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';


export async function renderProgramsView() {
  const main = document.getElementById('app');
  const allPrograms = (await getState().programs) || [];
  const user = getState().user || {};
  const customRoutines = user.customRoutines || [];
  const exercises = (await getState().exercises) || [];
  
  // Remove any existing event listeners to prevent duplicates
  if (main.dataset.programsViewListener === 'true') {
    main.removeEventListener('click', main._handleProgramsViewClick);
    delete main.dataset.programsViewListener;
    delete main._handleProgramsViewClick;
  }
  
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

  // Event delegation handler for all button interactions
  const handleProgramsViewClick = (e) => {
    const target = e.target;
    
    // Create New Routine buttons
    if (target.id === 'create-routine-btn' || 
        target.id === 'create-from-empty' || 
        target.id === 'create-custom-empty') {
      const newState = { 
        createNewProgram: true, 
        editingProgram: null, 
        editingModule: null 
      };
      updateState(newState);
      window.location.hash = '#builder';
      return;
    }
    
    // View handlers - program name or view button
    if (target.closest('[data-action="view"]')) {
      const btn = target.closest('[data-action="view"]');
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      window.location.hash = `#program-details/${type}/${id}`;
      return;
    }
    
    // Edit button handler
    const editBtn = target.closest('.edit-btn');
    if (editBtn) {
      const type = editBtn.getAttribute('data-type');
      const id = editBtn.getAttribute('data-id');
      
      // Guard: only process if this is a program edit button (has data-type attribute)
      // Exercise edit buttons don't have data-type, so skip them
      if (!type || !id) {
        return;
      }
      
      let program;
      
      if (type === 'program') {
        program = allPrograms.find(p => String(p.id) === String(id));
      } else if (type === 'custom') {
        const routine = customRoutines.find(r => String(r.id) === String(id));
        if (routine) {
          program = { id: id, name: routine.name, exercises: routine.exercises };
        }
      }
      
      // Guard: only proceed if program was found
      if (!program) {
        console.error(`Program or routine not found: type=${type}, id=${id}`);
        alert('Program not found. Please refresh the page.');
        return;
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
      return;
    }
    
    // Delete routine button handler (only for custom routines)
    const deleteBtn = target.closest('.delete-btn');
    if (deleteBtn) {
      const type = deleteBtn.getAttribute('data-type');
      const id = String(deleteBtn.getAttribute('data-id'));
      
      // Guard: only process if this is a program delete button (has data-type attribute)
      if (!type || !id) {
        return;
      }
      
      // Only handle delete for custom routines
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
      return;
    }
    
    // Start button logic
    const startBtn = target.closest('.start-btn');
    if (startBtn) {
      const type = startBtn.getAttribute('data-type');
      const id = startBtn.getAttribute('data-id');
      
      // Guard: only process if this is a program start button
      if (!type || !id) {
        return;
      }
      
      if (type === 'program') {
        const program = allPrograms.find(p => String(p.id) === String(id));
        if (program) {
          updateState({ activeWorkout: { program, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      } else if (type === 'custom') {
        const routine = customRoutines.find(r => String(r.id) === String(id));
        if (routine) {
          updateState({ activeWorkout: { program: { id: id, name: routine.name, exercises: routine.exercises, warmup: routine.warmup || [], cooldown: routine.cooldown || [] }, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      }
      return;
    }
  };
  
  // Add single event listener to main element
  main.addEventListener('click', handleProgramsViewClick);
  main.dataset.programsViewListener = 'true';
  main._handleProgramsViewClick = handleProgramsViewClick;
  
} 


// Export as object for wrapView compatibility
export default { render: renderProgramsView };
