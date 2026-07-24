// views/routine-details-view.js
import { renderHeader } from '../components/header.js';
import { renderSpinner, hideSpinner } from '../components/spinner.js';
import { t } from '../i18n.js';
import { updateState, getState } from '../services/state.js';
import { show } from '../services/toast-service.js';
import { showConfirmation } from '../services/confirmation-modal.js';
import { escapeHtml } from '../utils/html-helpers.js';
import { getDifficultyClass } from '../utils/helpers.js';
import { warmUpGeneratorService } from '../services/warmup-generator-service.js';
import { routineHasAIExercises } from '../services/ai-config-service.js';

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

  // Check if routine has any exercises with AI form tracking support
  const hasAISupport = routineHasAIExercises(routine, exercises);
  
  // Helper function to safely find exercise by ID
  function findExerciseById(exerciseId) {
    return exercises.find(e => String(e.id) === String(exerciseId));
  }
  
  // Render exercise list helper
  function renderExerciseList(exercisesArray, sectionName) {
    if (!exercisesArray || exercisesArray.length === 0) {
      return '';
    }
    
    const sectionItems = exercisesArray.map(ex => {
      const exercise = findExerciseById(ex.exerciseId);
      const difficultyClass = getDifficultyClass(ex.exerciseId, exercises);
      
      return `
        <li class="exercise-item ${difficultyClass}">
          <div class="exercise-info">
            <strong>${escapeHtml(exercise ? exercise.name : t('routine_details.unknown_exercise') + ex.exerciseId + ')')}</strong>
            <div class="exercise-details">
              Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s${ex.weight ? ` | Weight: ${ex.weight}kg` : ''}
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
          ← ${t('routine_details.back')}
        </button>
        <div class="routine-actions">
          <button class="btn btn-sm" id="edit-routine-btn" data-type="${type}" data-id="${id}">
            ${t('routine_details.edit')}
          </button>
          <button class="btn btn-sm" id="copy-routine-btn" data-type="${type}" data-id="${id}">
            ${t('routine_details.copy')}
          </button>
          <button class="btn btn-sm" id="generate-warmup-btn" data-type="${type}" data-id="${id}">
            🔄 ${t('routine_details.generate_warmup')}
          </button>
          <button class="btn btn-danger btn-sm" id="delete-routine-btn" data-type="${type}" data-id="${id}">
            ${t('routine_details.delete')}
          </button>
        </div>
      </div>
      <h1 class="routine-title">${escapeHtml(routine.name)}</h1>
      <div class="routine-details-content">
        ${routine.difficulty ? `<span class="difficulty-badge difficulty-${routine.difficulty.toLowerCase()}">${routine.difficulty}</span>` : ''}
        ${routine.description ? `<p class="routine-desc">${escapeHtml(routine.description)}</p>` : ''}
        <div class="routine-meta">
          ${routine.category ? `<span class="routine-meta-item">📁 ${categories.find(c => String(c.id) === String(routine.category))?.name || routine.category}</span>` : ''}
          ${routine.duration ? `<span class="routine-meta-item">⏱ ${routine.duration} min</span>` : ''}
        </div>
        ${renderExerciseList(routine.warmup, t('routine_details.warmup'))}
        
        <h3 class="section-title">${t('routine_details.exercises_section')}</h3>
        <ul class="exercise-list">
          ${(routine.exercises || []).map(ex => {
            const exercise = findExerciseById(ex.exerciseId);
            const exerciseDifficultyClass = getDifficultyClass(ex.exerciseId, exercises);
            
            return `
              <li class="exercise-item ${exerciseDifficultyClass}">
                <div class="exercise-info">
                  <strong>${escapeHtml(exercise ? exercise.name : t('routine_details.unknown_exercise') + ex.exerciseId + ')')}</strong>
                  <div class="exercise-details">
                    Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s${ex.weight ? ` | Weight: ${ex.weight}kg` : ''}
                  </div>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
        
        ${renderExerciseList(routine.cooldown, t('routine_details.cooldown'))}
        
        <div class="start-routine-container">
          ${hasAISupport ? `
          <label class="ai-mode-toggle">
            <input type="checkbox" id="ai-mode-checkbox">
            <span class="ai-mode-toggle-label">${t('ai_mode')}</span>
          </label>
          ` : ''}
          <button class="btn" id="start-routine-btn" data-type="${type}" data-id="${id}">
            ${t('routine_details.start')}
          </button>
        </div>

        <!-- Muscle Diagrams -->
        <div class="routine-muscle-section">
          <h3 class="section-title">${t('routine_details.target_muscles')}</h3>
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
             routineText += `*${t('routine_details.warmup')}*\n`;
             routine.warmup.forEach(ex => {
               const exercise = findExerciseById(ex.exerciseId);
               routineText += `- ${exercise ? exercise.name : t('completion.unknown')}: ${ex.sets} sets ✕ ${ex.reps} reps (Rest: ${ex.restTime}s${ex.weight ? `, Weight: ${ex.weight}kg` : ''})\n`;
             });
             routineText += '\n';
           }
      
           routineText += `*${t('routine_details.exercises_section')}*\n`;
           routine.exercises.forEach(ex => {
             const exercise = findExerciseById(ex.exerciseId);
             routineText += `- ${exercise ? exercise.name : t('completion.unknown')}: ${ex.sets} sets ✕ ${ex.reps} reps (Rest: ${ex.restTime}s${ex.weight ? `, Weight: ${ex.weight}kg` : ''})\n`;
           });
      
           if (routine.cooldown && routine.cooldown.length > 0) {
             routineText += `\n*${t('routine_details.cooldown')}*\n`;
             routine.cooldown.forEach(ex => {
               const exercise = findExerciseById(ex.exerciseId);
               routineText += `- ${exercise ? exercise.name : t('completion.unknown')}: ${ex.sets} sets ✕ ${ex.reps} reps (Rest: ${ex.restTime}s${ex.weight ? `, Weight: ${ex.weight}kg` : ''})\n`;
             });
           }
      
      // Copy to clipboard
      navigator.clipboard.writeText(routineText).then(() => {
        show(t('routine_details.routine_copy_clipboard'), 'success');
      }).catch(err => {
        console.error('Failed to copy:', err);
        show(t('routine_details.routine_copy_failed'), 'error');
      });
    });
  }
  
  // Generate warm-up button handler
  const generateWarmUpBtn = main.querySelector('#generate-warmup-btn');
  if (generateWarmUpBtn) {
    generateWarmUpBtn.addEventListener('click', async () => {
      try {
        // Show loading state
        generateWarmUpBtn.disabled = true;
        generateWarmUpBtn.textContent = t('common.loading');
        document.body.insertAdjacentHTML('beforeend', renderSpinner());
        
        // Generate warm-up based on muscles targeted
        const generatedWarmUp = warmUpGeneratorService.generateWarmUp(routine, exercises, muscles);
        
        // Hide spinner before showing confirmation dialog
        hideSpinner();
        
        if (generatedWarmUp.length === 0) {
          show('Could not generate a warm-up. Try adding exercises that target specific muscle groups.', 'warning');
          generateWarmUpBtn.disabled = false;
          generateWarmUpBtn.textContent = t('routine_details.generate_warmup');
          return;
        }
        
        const duration = warmUpGeneratorService.getWarmUpDuration(generatedWarmUp);
        const confirmed = await showConfirmation(
          `Generate a custom warm-up targeting the muscles in this routine? This will replace the current warm-up.\n\n` +
          `Estimated duration: ${duration} minutes\n` +
          `Exercises: ${generatedWarmUp.map(w => w.name).join(', ')}`
        );
        
        if (!confirmed) {
          generateWarmUpBtn.disabled = false;
          generateWarmUpBtn.textContent = t('routine_details.generate_warmup');
          hideSpinner();
          return;
        }
        
        // Update routine with new warm-up
        const updatedRoutine = {
          ...routine,
          warmup: generatedWarmUp
        };
        
        // Save to IndexedDB
        const allRoutines = await import('../services/database.js').then(db => db.routinesLoad());
        const updatedRoutines = allRoutines.map(r => 
          String(r.id) === String(id) ? updatedRoutine : r
        );
        
        await import('../services/database.js').then(db => db.storeRoutines(updatedRoutines));
        updateState({ routines: updatedRoutines });
        
        show(`Warm-up generated successfully! ${duration} minutes.`, 'success');
        
        // Re-render to show new warm-up
        await renderRoutineDetailsView(type, id);
      } catch (error) {
        console.error('Error generating warm-up:', error);
        show('Failed to generate warm-up. Please try again.', 'error');
      } finally {
        hideSpinner();
        if (generateWarmUpBtn) {
          generateWarmUpBtn.disabled = false;
          generateWarmUpBtn.textContent = t('routine_details.generate_warmup');
        }
      }
    });
  }
  
  // Delete routine button handler
  const deleteBtn = main.querySelector('#delete-routine-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmation(t('routine_details.delete_confirm') + '"' + routine.name + '"? ' + t('routine_details.delete_action'));
      if (confirmed) {
        try {
          // Show loading state
          deleteBtn.disabled = true;
          deleteBtn.textContent = t('common.loading');
          document.body.insertAdjacentHTML('beforeend', renderSpinner());
          
          // Load routines from IndexedDB
          const allRoutines = await import('../services/database.js').then(db => db.routinesLoad());
          
          // Filter out the routine to delete
          const remainingRoutines = allRoutines.filter(r => String(r.id) !== String(id));
          
          // Save back to IndexedDB
          await import('../services/database.js').then(db => db.storeRoutines(remainingRoutines));
          
          // Update state with correct property name
          updateState({ routines: remainingRoutines });
          
          show(t('routine_details.delete_success'), 'success');
          window.location.hash = '#routines';
        } catch (error) {
          console.error('Error deleting routine:', error);
          show(t('routine_details.delete_error') + error.message, 'error');
          deleteBtn.disabled = false;
          deleteBtn.textContent = t('routine_details.delete');
        } finally {
          hideSpinner();
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
      const aiModeCheckbox = main.querySelector('#ai-mode-checkbox');
      const aiMode = aiModeCheckbox ? aiModeCheckbox.checked : false;
      handleStartRoutine(type, id, aiMode);
    });
  }
}

/**
 * Start workout directly (manual mode only) - now handled by event delegation
 */
function handleStartRoutine(type, id, aiMode = false) {
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
        workoutMode: 'manual',
        aiMode: aiMode
      }
    });
    
    // Dispatch routine started event for install prompt tracking
    document.dispatchEvent(new CustomEvent('routineStarted', {
      detail: { routineId: routine.id, routineName: routine.name }
    }));
    
    window.location.hash = '#active-workout';
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderRoutineDetailsView };
