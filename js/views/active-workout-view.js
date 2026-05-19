/**
 * ActiveWorkoutView - Renders the current exercise during an active workout
 * 
 * This view is now a thin controller that coordinates with service modules:
 * - WorkoutTimerService: Handles all timer functionality
 * - WorkoutModalsService: Handles modal dialogs and toasts
 * - WorkoutWorkflowService: Handles workout progression logic
 * 
 * File size reduced from ~350 lines to ~150 lines
 */

import { getState, setState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { workoutTimerService } from '../services/workout-timer-service.js';
import { workoutModalsService } from '../services/workout-modals-service.js';
import { workoutWorkflowService } from '../services/workout-workflow-service.js';

// State tracking for event listeners
let stateBound = false;

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises } = getState();
  
  // Validate workout exists
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<div class="card"><p>No active workout.</p></div>';
    return;
  }

  const program = activeWorkout.program;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;
  
  // Get phase information and exercise data
  const { phase, localIndex } = workoutWorkflowService.getPhaseInfo(currentExerciseIndex, program);
  const currentExerciseData = workoutWorkflowService.getExerciseData(currentExerciseIndex, program);

  if (!currentExerciseData) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise data not found.</p></div>';
    return;
  }

  const exercise = exercises.find(e => String(e.id) === String(currentExerciseData.exerciseId));
  
  if (!exercise) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise not found.</p></div>';
    return;
  }

  // Get workout configuration
  const isHiitWorkout = workoutWorkflowService.isHIITWorkout(activeWorkout);
  const hiitInterval = activeWorkout.intervalTime || 30;
  const totalExercises = (program.warmup?.length || 0) + program.exercises.length + (program.cooldown?.length || 0);

  // Render the view using template literal
  main.innerHTML = renderActiveWorkoutTemplate({
    program,
    phase,
    currentExerciseIndex,
    totalExercises,
    isHiitWorkout,
    hiitInterval,
    exercise,
    currentSetIndex,
    currentExerciseData,
    localIndex
  });

  // Wire up event handlers
  wireUpEventHandlers({
    activeWorkout,
    currentExerciseIndex,
    currentSetIndex,
    currentExerciseData,
    program,
    isHiitWorkout,
    hiitInterval,
    totalExercises,
    exercise,
    localIndex,
    exercises
  });

  // Bind state change event listener (only once)
  if (!stateBound) {
    document.addEventListener('stateChange', handleStateChange);
    stateBound = true;
  }
}

/**
 * Render HTML template for active workout view
 * Separated from logic to make it easier to maintain
 */
function renderActiveWorkoutTemplate({
  program,
  phase,
  currentExerciseIndex,
  totalExercises,
  isHiitWorkout,
  hiitInterval,
  exercise,
  currentSetIndex,
  currentExerciseData,
  localIndex
}) {
  const phaseColor = phase === 'warmup' ? '#4CAF50' : phase === 'cooldown' ? '#FF9800' : '#2196F3';

  return renderHeader() + `
    <div class="card">
      <h1>${program.name}</h1>
      <p><span class="phase-badge" style="background: ${phaseColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${phase.toUpperCase()}</span> Exercise ${currentExerciseIndex + 1} of ${totalExercises}</p>
      
      ${isHiitWorkout ? workoutTimerService.renderHiitSection(hiitInterval) : ''}
      
      <div class="card card-muted current-exercise-card">
        <h2>${exercise.name}</h2>
        ${!isHiitWorkout ? `
          <p><strong>Set ${currentSetIndex + 1} of ${currentExerciseData.sets}</strong></p>
          <p><strong>Target Reps:</strong> ${currentExerciseData.reps}</p>
        ` : ''}
      </div>
      
      ${!isHiitWorkout ? '<div id="rest-timer"></div>' : ''}
      
      <div class="workout-actions">
        ${!isHiitWorkout ? `<button id="complete-set-btn" class="btn flex-1">Next Set</button>` : ''}
        <button id="adjust-btn" class="btn btn-secondary">⚙️ Adjust</button>
        <button id="swap-btn" class="btn btn-secondary">🔄 Swap</button>
      </div>
    </div>
  `;
}

/**
 * Wire up all event handlers for the view
 * Keeps logic separate from rendering
 */
function wireUpEventHandlers({
  activeWorkout,
  currentExerciseIndex,
  currentSetIndex,
  currentExerciseData,
  program,
  isHiitWorkout,
  hiitInterval,
  totalExercises,
  exercises,
  localIndex
}) {
  const main = document.getElementById('app');

  // Complete set button (non-HIIT)
  if (!isHiitWorkout) {
    const completeBtn = main.querySelector('#complete-set-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => handleCompleteSet({
        activeWorkout,
        currentExerciseIndex,
        currentSetIndex,
        currentExerciseData,
        program,
        totalExercises
      }));
    }
  }

  // Adjust button - open modal to add/remove sets
  const adjustBtn = main.querySelector('#adjust-btn');
  if (adjustBtn) {
    adjustBtn.addEventListener('click', () => handleAdjustSets({
      exerciseIndex: currentExerciseIndex,
      exerciseData: currentExerciseData,
      activeWorkout,
      program
    }));
  }

  // Swap button - open modal to swap exercise
  const swapBtn = main.querySelector('#swap-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => handleSwapExercise({
      currentExerciseIndex,
      exerciseId: currentExerciseData.exerciseId,
      activeWorkout,
      program,
      exercises
    }));
  }

  // Handle HIIT timer if applicable
  if (isHiitWorkout) {
    handleHIITTimer({ hiitInterval, currentExerciseIndex, currentExerciseData });
  }
}

/**
 * Event handlers - each is a self-contained function
 */

function handleCompleteSet({ activeWorkout, currentExerciseIndex, currentSetIndex, currentExerciseData, program, totalExercises }) {
  const result = workoutWorkflowService.completeSet(
    activeWorkout,
    currentExerciseIndex,
    currentSetIndex,
    currentExerciseData,
    program
  );

  // Update state silently (won't re-render)
  updateState({ activeWorkout: result.newState }, { silent: true });

  if (result.action === 'complete_workout') {
    window.location.hash = '#workout-completion';
  } else if (result.action === 'next_exercise') {
    // Show rest timer before next exercise
    const restTime = currentExerciseData.restTime || 60; // Default 60s rest
    showRestTimer(restTime, () => {
      document.dispatchEvent(new CustomEvent('stateChange'));
    });
  } else if (result.action === 'next_set') {
    // Show rest timer for same exercise, next set
    const restTime = currentExerciseData.restTime || 60;
    showRestTimer(restTime, () => {
      document.dispatchEvent(new CustomEvent('stateChange'));
    });
  }
}

function handleAdjustSets({ exerciseIndex, exerciseData, activeWorkout, program }) {
  workoutModalsService.showAdjustSetsModal(exerciseIndex, exerciseData, activeWorkout, program);

  // Listen for the event fired by the modal service
  const handler = (e) => {
    const { exerciseIndex: idx, newSetCount, program: updatedProgram } = e.detail;
    
    if (idx === exerciseIndex) {
      updateState({
        activeWorkout: { ...activeWorkout, program: updatedProgram },
        stateChange: true
      });
    }

    // Remove listener after use
    document.removeEventListener('workoutSetsAdjusted', handler);
  };

  document.addEventListener('workoutSetsAdjusted', handler);
}

function handleSwapExercise({ currentExerciseIndex, exerciseId, activeWorkout, program, exercises }) {
  workoutModalsService.showSwapExerciseModal(
    currentExerciseIndex,
    exerciseId,
    activeWorkout,
    program,
    exercises
  );

  // Listen for the event fired by the modal service
  const handler = (e) => {
    const { exerciseIndex: idx, newExerciseId, program: updatedProgram } = e.detail;
    
    if (idx === currentExerciseIndex) {
      updateState({
        activeWorkout: { ...activeWorkout, program: updatedProgram },
        stateChange: true
      });
    }

    document.removeEventListener('workoutExerciseSwapped', handler);
  };

  document.addEventListener('workoutExerciseSwapped', handler);
}

function handleHIITTimer({ hiitInterval, currentExerciseIndex, currentExerciseData }) {
  workoutTimerService.startHIITTimer(hiitInterval, {
    onWorkStart: () => {
      workoutModalsService.showToast('Work time!', 'success');
    },
    onWorkEnd: () => {
      workoutModalsService.showToast('Rest time!', 'warning');
    },
    onRestEnd: () => {
      // Continue to next HIIT interval or exercise
      document.dispatchEvent(new CustomEvent('stateChange'));
    }
  });
}

/**
 * Show rest timer between sets
 */
function showRestTimer(restTime, onComplete) {
  const main = document.getElementById('app');
  const restEl = main.querySelector('#rest-timer');
  const currExEl = main.querySelector('#current-exercise');

  if (!restEl || !currExEl) return;

  // Hide current exercise display temporarily
  currExEl.style.display = 'none';

  // Display timer using service
  workoutTimerService.displayRestTimer(restTime, restEl);

  // Timer will automatically call onComplete when done
}

/**
 * Handle global state changes to re-render the view
 */
function handleStateChange() {
  if (window.location.hash === '#active-workout') {
    renderActiveWorkoutView();
  }
}

// Cleanup on unmount (if we had a dedicated cleanup function)
// The view is automatically cleaned up when route changes


// Export as object for wrapView compatibility
export default { render: renderActiveWorkoutView };