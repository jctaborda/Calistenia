// views/routine-details-view.js
import { renderHeader } from '../components/header.js';
import { updateState, getState } from '../services/state.js';
import { show } from '../services/toast-service.js';

export async function renderRoutineDetailsView(type, id) {
  const main = document.getElementById('app');
  
  // Get state values (these are synchronous but data must be loaded first)
  const state = getState();
  const routines = state.routines || [];
  const muscles = state.muscles || [];
  const exercises = state.exercises || [];
  const categories = state.categories || [];
  
  let routine;
  if (type === 'routine') {
    routine = routines.find(p => String(p.id) === String(id));
  }
  
  if (!routine) {
    window.location.hash = '#routines';
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
    
    const sectionItems = exercisesArray.map(ex => {
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
    }).join('');
    
    return `
      <div class="exercise-list-section">
        <h3 class="section-title">${sectionName}</h3>
        <ul class="exercise-list">
          ${sectionItems}
        </ul>
      </div>
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
      <div class="routine-header">
        <button class="back-button" data-nav="#routines">
          ← Back to Routines
        </button>
        <div class="routine-actions">
          <button class="btn btn-sm" id="edit-routine-btn" data-type="${type}" data-id="${id}">
            Edit Routine
          </button>
          <button class="btn btn-sm" id="copy-routine-btn" data-type="${type}" data-id="${id}">
            📋 Copy Routine
          </button>
          <button class="btn btn-danger btn-sm" id="delete-routine-btn" data-type="${type}" data-id="${id}">
            Delete Routine
          </button>
        </div>
      </div>
      <h1 class="routine-title">${routine.name}</h1>
      <div class="routine-details-content">
        ${routine.difficulty ? `<span class="difficulty-badge difficulty-${routine.difficulty.toLowerCase()}">${routine.difficulty}</span>` : ''}
        ${routine.description ? `<p class="routine-desc">${routine.description}</p>` : ''}
        <div class="routine-meta">
          ${routine.category ? `<span class="routine-meta-item">📁 ${categories.find(c => String(c.id) === String(routine.category))?.name || routine.category}</span>` : ''}
          ${routine.duration ? `<span class="routine-meta-item">⏱️ ${routine.duration} min</span>` : ''}
        </div>
        ${renderExerciseList(routine.warmup, 'Warmup')}
        
        <h3 class="section-title">Exercises</h3>
        <ul class="exercise-list">
          ${(routine.exercises || []).map(ex => {
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
        
        ${renderExerciseList(routine.cooldown, 'Cooldown')}
        
        <div class="start-routine-container">
          <button class="btn" id="start-routine-btn" data-type="${type}" data-id="${id}">
            Start Routine
          </button>
        </div>

        <!-- Muscle Diagrams -->
        <div class="routine-muscle-section">
          <h3 class="section-title">Target Muscles</h3>
          <div class="muscle-container">
            <div class="muscle-diagram-front">
              <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image">
              ${generateMuscleImages(routine.exercises, muscles, true, true)}
              ${generateMuscleImages(routine.exercises, muscles, false, true)}
            </div>
            <div class="muscle-diagram-back">
              <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image">
              ${generateMuscleImages(routine.exercises, muscles, true, false)}
              ${generateMuscleImages(routine.exercises, muscles, false, false)}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  // Edit button handler
  const editBtn = main.querySelector('#edit-routine-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      updateState({
        editingRoutine: {
          type,
          id,
          routine: {
            name: routine.name,
            exercises: routine.exercises,
            warmup: routine.warmup || [],
            cooldown: routine.cooldown || [],
            description: routine.description || '',
            category: routine.category || '',
            difficulty: routine.difficulty || '',
            duration: routine.duration || 30
          }
        } 
      });
      window.location.hash = '#builder';
    });
  }
  
  // Copy routine button handler
  const copyBtn = main.querySelector('#copy-routine-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      // Build routine text
      let routineText = `*${routine.name}*\n\n`;
      
      if (routine.warmup && routine.warmup.length > 0) {
        routineText += '*Warmup*\n';
        routine.warmup.forEach(ex => {
          const exercise = findExerciseById(ex.exerciseId);
          routineText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets × ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
        });
        routineText += '\n';
      }
      
      routineText += '*Exercises*\n';
      routine.exercises.forEach(ex => {
        const exercise = findExerciseById(ex.exerciseId);
        routineText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets × ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
      });
      
      if (routine.cooldown && routine.cooldown.length > 0) {
        routineText += '\n*Cooldown*\n';
        routine.cooldown.forEach(ex => {
          const exercise = findExerciseById(ex.exerciseId);
          routineText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets × ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
        });
      }
      
      // Copy to clipboard
      navigator.clipboard.writeText(routineText).then(() => {
        show('Routine copied to clipboard!', 'success');
      }).catch(err => {
        console.error('Failed to copy:', err);
        show('Failed to copy routine to clipboard.', 'error');
      });
    });
  }
  
  // Delete routine button handler
  const deleteBtn = main.querySelector('#delete-routine-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${routine.name}"? This action cannot be undone.`)) {
        try {
          // Load routines from IndexedDB
          const allRoutines = await import('../services/database.js').then(db => db.routinesLoad());
          
          // Filter out the routine to delete
          const remainingRoutines = allRoutines.filter(r => String(r.id) !== String(id));
          
          // Save back to IndexedDB
          await import('../services/database.js').then(db => db.storeRoutines(remainingRoutines));
          
          // Update state with correct property name
          updateState({ routines: remainingRoutines });
          
          show('Routine deleted successfully!', 'success');
          window.location.hash = '#routines';
        } catch (error) {
          console.error('Error deleting routine:', error);
          show('Error deleting routine: ' + error.message, 'error');
        }
      }
    });
  }
  
  // Start button handler - start workout directly (manual mode only)
  const startBtn = main.querySelector('#start-routine-btn');
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const type = startBtn.dataset.type;
      const id = startBtn.dataset.id;
      handleStartRoutine(type, id);
    });
  }
}

/**
 * Start workout directly (manual mode only) - now handled by event delegation
 */
function handleStartRoutine(type, id) {
  let routine;
  const state = getState();
  
  if (type === 'routine') {
    routine = state.routines.find(p => String(p.id) === String(id));
  }
  
  if (routine) {
    updateState({
      activeWorkout: {
        routine: routine,
        progress: {},
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        workoutMode: 'manual' // Always manual mode
      }
    });
    window.location.hash = '#active-workout';
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderRoutineDetailsView };
