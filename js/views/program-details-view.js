// views/program-details-view.js
import { renderHeader } from '../components/header.js';
import { setState, updateState, getState } from '../services/state.js';

export async function renderProgramDetailsView(type, id) {
  const main = document.getElementById('app');
  
  // Get state values (these are synchronous but data must be loaded first)
  const state = getState();
  const programs = state.programs || [];
  const muscles = state.muscles || [];
  const exercises = state.exercises || [];
  const user = state.user || {};
  const customRoutines = user.customRoutines || [];
  
  let program;
  if (type === 'program') {
    program = programs.find(p => String(p.id) === String(id));
  } else if (type === 'custom') {
    const routine = customRoutines.find(r => String(r.id) === String(id));
    program = { id: 'custom-' + id, name: routine.name, exercises: routine.exercises };
  }
  
  if (!program) {
    window.location.hash = '#programs';
    return;
  }
  
  // Helper function to safely find exercise by ID
  function findExerciseById(exerciseId) {
    return exercises.find(e => String(e.id) === String(exerciseId));
  }
  
 // Render exercise list helper
  function renderExerciseList(exercisesArray, sectionName) {
    if (!exercisesArray || exercisesArray.length === 0) {
      return '';
    }
    
        // Helper to get difficulty class based on exercise difficulty ID (1=beginner, 2=intermediate, 3=advanced)
    function getDifficultyClass(exerciseId) {
      const exercise = findExerciseById(exerciseId);
      if (exercise && exercise.difficulty) {
        const difficulties = Array.isArray(exercise.difficulty) ? exercise.difficulty : [exercise.difficulty];
        // Check for IDs: 3=advanced, 2=intermediate, 1=beginner
        if (difficulties.includes(3)) return 'difficulty-advanced';
        if (difficulties.includes(2)) return 'difficulty-intermediate';
        if (difficulties.includes(1)) return 'difficulty-beginner';
      }
      return '';
    }
    
    return `
      <h3>${sectionName}:</h3>
      <ul class="exercise-list">
        ${exercisesArray.map(ex => {
          const exercise = findExerciseById(ex.exerciseId);
          const difficultyClass = getDifficultyClass(ex.exerciseId);
          
          return `
            <li class="exercise-item ${difficultyClass}">
              <div class="exercise-info">
                <strong>${exercise ? exercise.name : 'Unknown Exercise (ID: ' + ex.exerciseId + ')'}</strong>
                <div class="exercise-details">
                  Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s
                </div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }
  
  // Generate muscle images helper
  function generateMuscleImages(exercisesArray, muscleData, isSecondary, isFront) {
    if (!exercisesArray || exercisesArray.length === 0) {
      return '';
    }
    
    return exercisesArray.map(ex => {
      const fullExercise = findExerciseById(ex.exerciseId);
      if (!fullExercise) {
        return '';
      }
      
      const muscleIds = isSecondary ? fullExercise.muscles_secondary : fullExercise.muscles;
      
      return muscleIds.map(muscleId => {
        const muscle = muscleData[muscleId - 1];
        if (muscle && muscle.is_front === isFront) {
          const folder = isSecondary ? 'secondary' : 'main';
          return `<img src="assets/images/muscles/${folder}/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`;
        }
        return '';
      }).join('');
    }).join('');
  }
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '#programs'">
          ← Back to Programs
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn" id="edit-program-btn" data-type="${type}" data-id="${id}">
            Edit Program
          </button>
          ${type === 'custom' ? `
            <button class="btn btn-danger" id="delete-routine-btn" data-id="${id}">
              Delete Routine
            </button>
          ` : ''}
        </div>
      </div>
      <h1>${program.name}</h1>
      <div class="program-details-content">
        ${renderExerciseList(program.warmup, 'Warmup')}
        <h3>Exercises:</h3>
        <ul class="exercise-list">
          ${(program.exercises || []).map(ex => {
            const exercise = findExerciseById(ex.exerciseId);
            
            // Get difficulty class based on exercise difficulty ID (1=beginner, 2=intermediate, 3=advanced)
            let exerciseDifficultyClass = '';
            if (exercise && exercise.difficulty) {
              const difficulties = Array.isArray(exercise.difficulty) ? exercise.difficulty : [exercise.difficulty];
              // Check for IDs: 3=advanced, 2=intermediate, 1=beginner
              if (difficulties.includes(3)) {
                exerciseDifficultyClass = 'difficulty-advanced';
              } else if (difficulties.includes(2)) {
                exerciseDifficultyClass = 'difficulty-intermediate';
              } else if (difficulties.includes(1)) {
                exerciseDifficultyClass = 'difficulty-beginner';
              }
            }
            
            return `
              <li class="exercise-item ${exerciseDifficultyClass}">
                <div class="exercise-info">
                  <strong>${exercise ? exercise.name : 'Unknown Exercise (ID: ' + ex.exerciseId + ')'}</strong>
                  <div class="exercise-details">
                    Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s
                  </div>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
        ${renderExerciseList(program.cooldown, 'Cooldown')}
        
        <!-- Muscle Diagrams -->
        <div class="muscle-container">
          <div class="muscle-diagram-front">
            <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image">
            ${generateMuscleImages(program.exercises, muscles, true, true)}
            ${generateMuscleImages(program.exercises, muscles, false, true)}
          </div>
          <div class="muscle-diagram-back">
            <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image">
            ${generateMuscleImages(program.exercises, muscles, true, false)}
            ${generateMuscleImages(program.exercises, muscles, false, false)}
          </div>
        </div>
        
        <div style="margin-top: 2rem;">
          <button class="btn" id="start-program-btn" data-type="${type}" data-id="${id}">
            Start Program
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Edit button handler
  const editBtn = main.querySelector('#edit-program-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      updateState({
        editingProgram: {
          type,
          id,
          program: {
            name: program.name,
            exercises: program.exercises,
            warmup: program.warmup || [],
            cooldown: program.cooldown || []
          }
        } 
      });
      window.location.hash = '#builder';
    });
  }
  
  // Delete routine button handler (only for custom routines)
  if (type === 'custom') {
    const deleteBtn = main.querySelector('#delete-routine-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${program.name}"? This action cannot be undone.`)) {
          const state = getState();
          const user = { ...state.user };
          user.customRoutines = user.customRoutines || [];
          
          const routineIndex = user.customRoutines.findIndex(r => String(r.id) === String(id));
          if (routineIndex !== -1) {
            user.customRoutines.splice(routineIndex, 1);
          }
          
          updateState({ user });
          alert('Routine deleted successfully!');
          window.location.hash = '#programs';
        }
      });
    }
  }
  
  // Start button handler
  const startBtn = main.querySelector('#start-program-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (type === 'program') {
        const originalProgram = programs.find(p => String(p.id) === String(id));
        if (originalProgram) {
          updateState({
            activeWorkout: {
              program: originalProgram,
              progress: {},
              currentExerciseIndex: 0,
              currentSetIndex: 0
            }
          });
          window.location.hash = '#active-workout';
        }
      } else if (type === 'custom') {
        const routine = customRoutines.find(r => String(r.id) === String(id));
        if (routine) {
          updateState({
            activeWorkout: {
              program: {
                id: 'custom-' + id,
                name: routine.name,
                exercises: routine.exercises,
                warmup: routine.warmup || [],
                cooldown: routine.cooldown || []
              },
              progress: {},
              currentExerciseIndex: 0,
              currentSetIndex: 0
            }
          });
          window.location.hash = '#active-workout';
        }
      }
    });
  }
}

// Export as object for wrapView compatibility
export default { render: renderProgramDetailsView };
