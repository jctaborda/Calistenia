/**
 * ActiveWorkoutView - Renders the current exercise during an active workout
 * 
 * Manual-only mode: User controls progression by clicking "Next Set" button
 * Flow: Set duration counting → User clicks "Next Set" → Rest timer counting → User clicks "Next Set" → Next set/exercise
 */

import { getState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { workoutTimerService } from '../services/workout-timer-service.js';
import { workoutModalsService } from '../services/workout-modals-service.js';
import { workoutWorkflowService } from '../services/workout-workflow-service.js';

// State tracking for event listeners
let stateBound = false;

// Track when set started for duration calculation
let currentSetStartTime = null;

// Track when rest started for actual rest time calculation
let currentRestStartTime = null;

// Track if we're currently showing rest timer (to prevent re-render)
let isShowingRestTimer = false;

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises } = getState();
  
  // Clean up any stale timers from previous render before starting new ones
  workoutTimerService.cleanup();
  
  // Validate workout exists
  if (!activeWorkout || !activeWorkout.routine) {
    main.innerHTML = renderHeader() + '<div class="card"><p>No active workout.</p></div>';
    return;
  }
  
  const routine = activeWorkout.routine;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;
  
  // Get phase information and exercise data
  const { phase, localIndex } = workoutWorkflowService.getPhaseInfo(currentExerciseIndex, routine);
  const currentExerciseData = workoutWorkflowService.getExerciseData(currentExerciseIndex, routine);
  
  if (!currentExerciseData) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise data not found.</p></div>';
    return;
  }
  
  const exercise = exercises.find(e => String(e.id) === String(currentExerciseData.exerciseId));
  
  if (!exercise) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise not found.</p></div>';
    return;
  }
  
  // Start live set duration timer using service
  const setDurationController = workoutTimerService.startTimerCountingUp(0, {
    container: document.getElementById('set-timer-display'),
    onTick: (elapsed) => {
      const durationEl = document.getElementById('set-duration');
      if (durationEl) {
        durationEl.textContent = elapsed;
      }
    }
  });
  
  // Get workout configuration
  const isHiitWorkout = workoutWorkflowService.isHIITWorkout(activeWorkout);
  const hiitInterval = activeWorkout.intervalTime || 30;
  const totalExercises = (routine.warmup?.length || 0) + routine.exercises.length + (routine.cooldown?.length || 0);
  
  // Render the view
  main.innerHTML = renderActiveWorkoutTemplate({
    routine,
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
  
  // Wire up all event handlers for the view
  wireUpEventHandlers({
    activeWorkout,
    currentExerciseIndex,
    currentSetIndex,
    currentExerciseData,
    routine,
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
 */
function renderActiveWorkoutTemplate({
  routine,
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
      <h1>${routine.name}</h1>
      <p><span class="phase-badge" style="background: ${phaseColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${t(`active_workout.${phase}`)}</span> ${t('active_workout.exercise')} ${currentExerciseIndex + 1} ${t('active_workout.of')} ${totalExercises}</p>
      
      ${isHiitWorkout ? workoutTimerService.renderHiitSection(hiitInterval) : ''}
      
      <div id="set-timer-display" class="card margin-bottom-1">
        <h3>⏱ ${t('active_workout.timer')}</h3>
        <p><strong>${t('completion.duration')}:</strong> <span id="set-duration" class="set-duration-value" style="font-size: var(--font-size-base); font-weight: bold;">0</span>s</p>
      </div>
      
      <div class="card card-muted current-exercise-card">
        <h2>${exercise.name}</h2>
        ${!isHiitWorkout ? `
          <p><strong>${t('routine_details.sets')} ${currentSetIndex + 1} ${t('active_workout.of')} ${currentExerciseData.sets}</strong></p>
          <p><strong>${t('routine_details.reps')}:</strong> ${currentExerciseData.reps}</p>
        ` : ''}
      </div>
      
      <div id="rest-timer"></div>
      
      <div class="workout-actions">
        <button id="next-set-btn" class="btn flex-1">${t('active_workout.next_set')}</button>
        <button id="adjust-btn" class="btn flex-1">⚙ ${t('active_workout.adjust')}</button>
        <button id="swap-btn" class="btn flex-1">🔄 ${t('active_workout.swap_exercise')}</button>
      </div>
    </div>
  `;
}

/**
 * Wire up all event handlers for the view
 */
function wireUpEventHandlers({
  activeWorkout,
  currentExerciseIndex,
  currentSetIndex,
  currentExerciseData,
  routine,
  isHiitWorkout,
  hiitInterval,
  totalExercises,
  exercises,
  localIndex
}) {
  const main = document.getElementById('app');
  
  // Track set start time when view renders
  currentSetStartTime = Date.now();
  
  // Adjust button - open modal to add/remove sets
  const adjustBtn = main.querySelector('#adjust-btn');
  if (adjustBtn) {
    adjustBtn.addEventListener('click', () => handleAdjustSets({
      exerciseIndex: currentExerciseIndex,
      exerciseData: currentExerciseData,
      activeWorkout,
      routine
    }));
  }
  
  // Swap button - open exercise to swap exercise
  const swapBtn = main.querySelector('#swap-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => handleSwapExercise({
      currentExerciseIndex,
      exerciseId: currentExerciseData.exerciseId,
      activeWorkout,
      routine,
      exercises
    }));
  }
  
  // Handle HIIT timer if applicable
  if (isHiitWorkout) {
    handleHIITTimer({ hiitInterval, currentExerciseIndex, currentExerciseData, routine });
  }
  
  // Wire up "Next Set" button
  const nextSetBtn = main.querySelector('#next-set-btn');
  if (nextSetBtn) {
    nextSetBtn.addEventListener('click', () => handleNextSetClick());
  }
}

/**
 * Handle next set button click
 * Flow: If showing set duration → show rest timer; If showing rest timer → advance to next set/exercise
 */
function handleNextSetClick() {
  const { activeWorkout, exercises } = getState();
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;
  const routine = activeWorkout.routine;
  
  // Get current exercise data
  const { phase, localIndex } = workoutWorkflowService.getPhaseInfo(currentExerciseIndex, routine);
  const currentExerciseData = workoutWorkflowService.getExerciseData(currentExerciseIndex, routine);
  
  if (!currentExerciseData) return;
  
  const main = document.getElementById('app');
  const restEl = main.querySelector('#rest-timer');
  const restTimerContent = restEl ? restEl.innerHTML : '';
  
  // Check if we're currently showing rest timer
  if (restTimerContent && restTimerContent.includes('Rest Time')) {
    // User clicked during rest timer - save actual rest time and advance
    const actualRestTime = currentRestStartTime ? Math.floor((Date.now() - currentRestStartTime) / 1000) : 0;
    
    // Add current set to history
    if (!activeWorkout.setHistory) {
      activeWorkout.setHistory = [];
    }
    
    const setDuration = currentSetStartTime ? Math.floor((Date.now() - currentSetStartTime) / 1000) : 0;
    
    activeWorkout.setHistory.push({
      exerciseIndex: currentExerciseIndex,
      setIndex: currentSetIndex,
      completedAt: Date.now(),
      duration: setDuration,
      restTime: currentExerciseData.restTime || 60,
      actualRestTime: actualRestTime
    });
    
    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false; // Clear the flag before advancing
    
    // Advance to next set/exercise
    advanceWorkout(currentExerciseIndex, currentSetIndex, routine);
  } else {
    // User clicked after set duration - check if this is the last set of the last exercise
    const totalExercises = (routine.warmup?.length || 0) + routine.exercises.length + (routine.cooldown?.length || 0);
    const isLastExercise = currentExerciseIndex >= totalExercises - 1;
    const isLastSet = currentSetIndex >= currentExerciseData.sets - 1;
    
    if (isLastExercise && isLastSet) {
      // This is the last set of the last exercise - complete workout directly, no rest
      const setDuration = currentSetStartTime ? Math.floor((Date.now() - currentSetStartTime) / 1000) : 0;
      
      if (!activeWorkout.setHistory) {
        activeWorkout.setHistory = [];
      }
      
      activeWorkout.setHistory.push({
        exerciseIndex: currentExerciseIndex,
        setIndex: currentSetIndex,
        completedAt: Date.now(),
        duration: setDuration,
        restTime: 0,
        actualRestTime: 0
      });
      
      updateState({ activeWorkout }, { silent: true });
      
      // Navigate directly to completion view
      window.location.hash = '#workout-completion';
    } else {
      // Not the last set - show rest timer
      const restTime = currentExerciseData.restTime || 60;
      
      // Hide set duration display
      const setDurationDisplay = main.querySelector('#set-timer-display');
      if (setDurationDisplay) {
        setDurationDisplay.style.display = 'none';
      }
      
      // Hide current exercise card
      const currExEl = main.querySelector('.current-exercise-card');
      if (currExEl) {
        currExEl.style.display = 'none';
      }
      
      // Show rest timer BEFORE updating state (to prevent re-render clearing it)
      const restEl = main.querySelector('#rest-timer');
      if (restEl) {
        currentRestStartTime = Date.now();
        isShowingRestTimer = true; // Mark that we're showing rest timer
        workoutTimerService.displayRestTimer(restTime, restEl, () => {
          // Timer completed - user should click "Next Set" to advance
        });
      }
      
      // Note: Don't push to setHistory here - wait until user clicks "Next" during rest
      // The set will be saved when they complete the rest period
      
      updateState({ activeWorkout }, { silent: true });
    }
  }
}

/**
 * Advance workout to next set or exercise
 * When moving to a new exercise, we still need to show rest before starting the new set
 */
function advanceWorkout(currentExerciseIndex, currentSetIndex, routine) {
  const result = workoutWorkflowService.completeSet(
    getState().activeWorkout,
    currentExerciseIndex,
    currentSetIndex,
    workoutWorkflowService.getExerciseData(currentExerciseIndex, routine),
    routine
  );
  
  // Check if we're completing the workout (after final rest)
  if (result.action === 'complete_workout') {
    // Save the final rest time before completing
    const { activeWorkout } = getState();
    const actualRestTime = currentRestStartTime ? Math.floor((Date.now() - currentRestStartTime) / 1000) : 0;
    
    // Update the last entry in setHistory with actual rest time
    if (activeWorkout.setHistory && activeWorkout.setHistory.length > 0) {
      const lastEntry = activeWorkout.setHistory[activeWorkout.setHistory.length - 1];
      lastEntry.actualRestTime = actualRestTime;
    }
    
    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;
    
    // Navigate to completion view
    window.location.hash = '#workout-completion';
  } else if (result.action === 'next_exercise') {
    // Moving to next exercise - save actual rest time from previous exercise's rest
    const { activeWorkout } = getState();
    const actualRestTime = currentRestStartTime ? Math.floor((Date.now() - currentRestStartTime) / 1000) : 0;
    
    // Update the last entry in setHistory with actual rest time
    if (activeWorkout.setHistory && activeWorkout.setHistory.length > 0) {
      const lastEntry = activeWorkout.setHistory[activeWorkout.setHistory.length - 1];
      lastEntry.actualRestTime = actualRestTime;
    }
    
    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;
    
    // Now advance the state to next exercise
    updateState({ activeWorkout: result.newState }, { silent: true });
    
    // Trigger re-render to show the new exercise's set duration
    updateState({ stateChange: true }, { silent: false });
  } else {
    // Just moving to next set of same exercise
    const { activeWorkout } = getState();
    const actualRestTime = currentRestStartTime ? Math.floor((Date.now() - currentRestStartTime) / 1000) : 0;
    
    // Update the last entry in setHistory with actual rest time
    if (activeWorkout.setHistory && activeWorkout.setHistory.length > 0) {
      const lastEntry = activeWorkout.setHistory[activeWorkout.setHistory.length - 1];
      lastEntry.actualRestTime = actualRestTime;
    }
    
    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;
    
    // Now advance to next set
    updateState({ activeWorkout: result.newState }, { silent: true });
    
    // Trigger re-render to show the new set's duration
    updateState({ stateChange: true }, { silent: false });
  }
}

/**
 * Handle global state changes to re-render the view
 */
function handleStateChange() {
  // Don't re-render if we're currently showing rest timer
  // (user is in the middle of resting and will click "Next Set" to advance)
  if (isShowingRestTimer) {
    return;
  }
  
  if (window.location.hash === '#active-workout') {
    renderActiveWorkoutView();
  } else {
    // Cleanup all timers when leaving active workout view
    workoutTimerService.cleanup();
  }
}

/**
 * Event handlers
 */
function handleAdjustSets({ exerciseIndex, exerciseData, activeWorkout, routine }) {
  workoutModalsService.showAdjustSetsModal(exerciseIndex, exerciseData, activeWorkout, routine);
  
  const handler = (e) => {
    const { exerciseIndex: idx, newSetCount, routine: updatedRoutine } = e.detail;
    
    if (idx === exerciseIndex) {
      updateState({
        activeWorkout: { ...activeWorkout, routine: updatedRoutine },
        stateChange: true
      });
    }
    
    document.removeEventListener('workoutSetsAdjusted', handler);
  };
  
  document.addEventListener('workoutSetsAdjusted', handler);
}

function handleSwapExercise({ currentExerciseIndex, exerciseId, activeWorkout, routine, exercises }) {
  workoutModalsService.showSwapExerciseModal(
    currentExerciseIndex,
    exerciseId,
    activeWorkout,
    routine,
    exercises
  );
  
  const handler = (e) => {
    const { exerciseIndex: idx, newExerciseId, routine: updatedRoutine } = e.detail;
    
    if (idx === currentExerciseIndex) {
      updateState({
        activeWorkout: { ...activeWorkout, routine: updatedRoutine },
        stateChange: true
      });
    }
    
    document.removeEventListener('workoutExerciseSwapped', handler);
  };
  
  document.addEventListener('workoutExerciseSwapped', handler);
}

function handleHIITTimer({ hiitInterval, currentExerciseIndex, currentExerciseData, routine }) {
  workoutTimerService.startHIITTimer(hiitInterval, {
    onWorkStart: () => {
      workoutModalsService.showToast(t('toast.work_time'), 'success');
    },
    onWorkEnd: () => {
      workoutModalsService.showToast(t('toast.rest_time'), 'warning');
    },
    onRestEnd: () => {
      document.dispatchEvent(new CustomEvent('stateChange'));
    }
  });
}

// Export for router usage
window.renderActiveWorkoutView = renderActiveWorkoutView;

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderActiveWorkoutView };
