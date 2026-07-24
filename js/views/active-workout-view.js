/**
 * ActiveWorkoutView - Renders the current exercise during an active workout
 *
 * Manual-only mode: User controls progression by clicking "Next Set" button
 * Flow: Set duration counting → User clicks "Next Set" → Rest timer counting → User clicks "Next Set" → Next set/exercise
 *
 * AI Mode: When enabled, shows camera + skeleton overlay, counts reps automatically,
 * provides form feedback via voice cues.
 */

import { getState, updateState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { workoutTimerService } from '../services/workout-timer-service.js';
import { workoutModalsService } from '../services/workout-modals-service.js';
import { workoutWorkflowService } from '../services/workout-workflow-service.js';
import { escapeHtml } from '../utils/html-helpers.js';
import { voiceCuesService } from '../services/voice-cues-service.js';
import { soundService } from '../services/sound-service.js';
import { show } from '../services/toast-service.js';
import { aiFormService } from '../services/ai-form-service.js';
import { aiFeedbackOverlay } from '../components/ai-feedback-overlay.js';
import { getAIConfig } from '../services/ai-config-service.js';

// Track when set started for duration calculation
let currentSetStartTime = null;

// Track when rest started for actual rest time calculation
let currentRestStartTime = null;

// Track if we're currently showing rest timer (to prevent re-render)
let isShowingRestTimer = false;

// AI tracking state
let aiEnabled = false;
let aiFormScoreInterval = null;
let aiCurrentExerciseId = null;

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');

  // Clean up any stale timers from previous render before starting new ones
  workoutTimerService.cleanup();

  // Clean up AI from previous render
  cleanupAI();

  // Remove stale stateChange listener from previous render (memory leak fix)
  if (main._handleActiveWorkoutStateChange) {
    document.removeEventListener('stateChange', main._handleActiveWorkoutStateChange);
    delete main._handleActiveWorkoutStateChange;
  }

  const { activeWorkout, exercises } = getState();
  // Validate workout exists
  if (!activeWorkout || !activeWorkout.routine) {
    main.innerHTML =
      renderHeader() +
      '<div class="card"><p>' +
      t('active_workout.no_active_workout') +
      '</p></div>';
    return;
  }

  const routine = activeWorkout.routine;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;

  // Get phase information and exercise data
  const { phase, localIndex } = workoutWorkflowService.getPhaseInfo(currentExerciseIndex, routine);
  const currentExerciseData = workoutWorkflowService.getExerciseData(currentExerciseIndex, routine);

  if (!currentExerciseData) {
    main.innerHTML =
      renderHeader() +
      '<div class="card"><p>' +
      t('active_workout.exercise_data_not_found') +
      '</p></div>';
    return;
  }

  const exercise = exercises.find((e) => String(e.id) === String(currentExerciseData.exerciseId));

  if (!exercise) {
    main.innerHTML =
      renderHeader() +
      '<div class="card"><p>' +
      t('active_workout.exercise_not_found') +
      '</p></div>';
    return;
  }

  // Get workout configuration
  const isHiitWorkout = workoutWorkflowService.isHIITWorkout(activeWorkout);
  const hiitInterval = activeWorkout.intervalTime || 30;
  const totalExercises =
    (routine.warmup?.length || 0) + routine.exercises.length + (routine.cooldown?.length || 0);

  // Check if AI mode is active and this exercise has AI support
  const workoutAI = activeWorkout.aiMode;
  const exerciseAIConfig = workoutAI ? getAIConfig(exercise.id) : null;
  const canUseAI = workoutAI && exerciseAIConfig !== null;

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
    localIndex,
    canUseAI,
    aiEnabled,
  });

  // Start live set duration timer using service (AFTER DOM is rendered)
  const setDurationController = workoutTimerService.startTimerCountingUp(0, {
    container: document.getElementById('set-timer-display'),
    onTick: (elapsed) => {
      const durationEl = document.getElementById('set-duration');
      if (durationEl) {
        durationEl.textContent = elapsed;
      }
    },
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
    exercises,
    canUseAI,
    exerciseAIConfig,
  });

  // Start AI tracking if enabled and exercise supports it
  if (canUseAI && !aiEnabled) {
    startAITracking(exercise.id, exerciseAIConfig);
  }

  // Bind state change event listener (with cleanup)
  const handleActiveWorkoutStateChange = () => {
    // Don't re-render if we're currently showing rest timer
    if (isShowingRestTimer) {
      return;
    }

    if (window.location.hash === '#active-workout') {
      renderActiveWorkoutView();
    } else {
      // Cleanup all timers when leaving active workout view
      workoutTimerService.cleanup();
      cleanupAI();
    }
  };

  document.addEventListener('stateChange', handleActiveWorkoutStateChange);
  main._handleActiveWorkoutStateChange = handleActiveWorkoutStateChange;
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
  localIndex,
  canUseAI,
  aiEnabled: aiEnabledState,
}) {
  const phaseColor = phase === 'warmup' ? '#4CAF50' : phase === 'cooldown' ? '#FF9800' : '#2196F3';

  return (
    renderHeader() +
    `
    <div class="card">
      <h1>${escapeHtml(routine.name)}</h1>
      <p><span class="phase-badge" style="background: ${phaseColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${t(`active_workout.${phase}`)}</span> ${t('active_workout.exercise')} ${currentExerciseIndex + 1} ${t('active_workout.of')} ${totalExercises}</p>
      
      ${isHiitWorkout ? workoutTimerService.renderHiitSection(hiitInterval) : ''}
      
      ${
        canUseAI
          ? `
      <div id="ai-workout-container" class="ai-workout-video-container">
        <div class="ai-loading" id="ai-loading">
          <div class="spinner"></div>
          <span>${t('ai_initializing')}</span>
        </div>
      </div>
      <div class="ai-workout-stats" id="ai-workout-stats">
        <div class="ai-workout-stat">
          <span class="stat-label">${t('ai_reps')}</span>
          <span class="stat-value" id="ai-rep-count">0</span>
        </div>
        <div class="ai-workout-stat">
          <span class="stat-label">${t('ai_form_score')}</span>
          <span class="stat-value" id="ai-form-score">-</span>
        </div>
        <div class="ai-workout-stat">
          <span class="stat-label">${t('ai_target_reps')}</span>
          <span class="stat-value">${currentExerciseData.reps}</span>
        </div>
      </div>
      <div class="ai-workout-status" id="ai-status">
        <span class="ai-status-dot" id="ai-status-dot"></span>
        <span id="ai-status-text">${t('ai_waiting')}</span>
      </div>
      `
          : ''
      }
      
      <div id="set-timer-display" class="card margin-bottom-1">
        <h3>⏱ ${t('active_workout.timer')}</h3>
        <p><strong>${t('completion.duration')}:</strong> <span id="set-duration" class="set-duration-value">0</span>s</p>
      </div>
      
      <div class="card card-muted current-exercise-card">
        <h2>${escapeHtml(exercise.name)}</h2>
        ${
          !isHiitWorkout
            ? `
          <p><strong>${t('routine_details.sets')} ${currentSetIndex + 1} ${t('active_workout.of')} ${currentExerciseData.sets}</strong></p>
          <p><strong>${t('routine_details.reps')}:</strong> ${currentExerciseData.reps}</p>
        `
            : ''
        }
      </div>
      
      <div id="rest-timer"></div>
      
      <div class="workout-actions">
        <button id="next-set-btn" class="btn flex-1">${t('active_workout.next_set')}</button>
        <button id="adjust-btn" class="btn flex-1">⚙ ${t('active_workout.adjust')}</button>
        <button id="swap-btn" class="btn flex-1">🔄 ${t('active_workout.swap_exercise')}</button>
        ${
          canUseAI
            ? `<button id="ai-toggle-btn" class="btn btn-secondary flex-1">${aiEnabledState ? '⏹ ' + t('ai_stop_tracking') : '📷 ' + t('ai_start_tracking')}</button>`
            : ''
        }
      </div>
    </div>
  `
  );
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
  localIndex,
  canUseAI,
  exerciseAIConfig,
}) {
  const main = document.getElementById('app');

  // Track set start time when view renders
  currentSetStartTime = Date.now();

  // Adjust button - open modal to add/remove sets
  const adjustBtn = main.querySelector('#adjust-btn');
  if (adjustBtn) {
    adjustBtn.addEventListener('click', () =>
      handleAdjustSets({
        exerciseIndex: currentExerciseIndex,
        exerciseData: currentExerciseData,
        activeWorkout,
        routine,
      })
    );
  }

  // Swap button - open exercise to swap exercise
  const swapBtn = main.querySelector('#swap-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () =>
      handleSwapExercise({
        currentExerciseIndex,
        exerciseId: currentExerciseData.exerciseId,
        activeWorkout,
        routine,
        exercises,
        currentDifficulty: exercise.difficulty,
      })
    );
  }

  // AI toggle button
  if (canUseAI) {
    const aiToggleBtn = main.querySelector('#ai-toggle-btn');
    if (aiToggleBtn) {
      aiToggleBtn.addEventListener('click', () => {
        const exercise = exercises.find(
          (e) => String(e.id) === String(currentExerciseData.exerciseId)
        );
        if (aiEnabled) {
          stopAITracking();
          updateAIButton(false);
        } else if (exerciseAIConfig && exercise) {
          startAITracking(exercise.id, exerciseAIConfig);
          updateAIButton(true);
        }
      });
    }
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
 */
function handleNextSetClick() {
  const { activeWorkout, exercises } = getState();
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;
  const routine = activeWorkout.routine;

  const { phase, localIndex } = workoutWorkflowService.getPhaseInfo(currentExerciseIndex, routine);
  const currentExerciseData = workoutWorkflowService.getExerciseData(currentExerciseIndex, routine);

  if (!currentExerciseData) return;

  const main = document.getElementById('app');
  const restEl = main.querySelector('#rest-timer');
  const restTimerContent = restEl ? restEl.innerHTML : '';

  // Check if we're currently showing rest timer
  if (restTimerContent && restTimerContent.includes('Rest Time')) {
    // User clicked during rest timer - save actual rest time and advance
    const actualRestTime = currentRestStartTime
      ? Math.floor((Date.now() - currentRestStartTime) / 1000)
      : 0;

    if (!activeWorkout.setHistory) {
      activeWorkout.setHistory = [];
    }

    const setDuration = currentSetStartTime
      ? Math.floor((Date.now() - currentSetStartTime) / 1000)
      : 0;

    activeWorkout.setHistory.push({
      exerciseIndex: currentExerciseIndex,
      setIndex: currentSetIndex,
      completedAt: Date.now(),
      duration: setDuration,
      restTime: currentExerciseData.restTime || 60,
      actualRestTime: actualRestTime,
    });

    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;

    advanceWorkout(currentExerciseIndex, currentSetIndex, routine);
  } else {
    // User clicked after set duration
    const totalExercises =
      (routine.warmup?.length || 0) + routine.exercises.length + (routine.cooldown?.length || 0);
    const isLastExercise = currentExerciseIndex >= totalExercises - 1;
    const isLastSet = currentSetIndex >= currentExerciseData.sets - 1;

    if (isLastExercise && isLastSet) {
      const setDuration = currentSetStartTime
        ? Math.floor((Date.now() - currentSetStartTime) / 1000)
        : 0;

      if (!activeWorkout.setHistory) {
        activeWorkout.setHistory = [];
      }

      activeWorkout.setHistory.push({
        exerciseIndex: currentExerciseIndex,
        setIndex: currentSetIndex,
        completedAt: Date.now(),
        duration: setDuration,
        restTime: 0,
        actualRestTime: 0,
      });

      updateState({ activeWorkout }, { silent: true });
      cleanupAI();
      window.location.hash = '#workout-completion';
    } else {
      // Show rest timer
      const restTime = currentExerciseData.restTime || 60;

      const setDurationDisplay = main.querySelector('#set-timer-display');
      if (setDurationDisplay) {
        setDurationDisplay.style.display = 'none';
      }

      const currExEl = main.querySelector('.current-exercise-card');
      if (currExEl) {
        currExEl.style.display = 'none';
      }

      // Pause AI during rest
      if (aiEnabled) {
        stopAITracking();
      }

      const restEl = main.querySelector('#rest-timer');
      if (restEl) {
        currentRestStartTime = Date.now();
        isShowingRestTimer = true;
        workoutTimerService.displayRestTimer(restTime, restEl, () => {
          const settings = getState().settings || {};
          const timerFeedback = settings.timerFeedback || {};

          if (timerFeedback.sound !== false) {
            soundService.playRestComplete();
          }
          if (timerFeedback.vibration !== false) {
            soundService.vibrate([100, 50, 100]);
          }
          if (voiceCuesService.isEnabled()) {
            voiceCuesService.announceRestComplete();
          }
        });
      }

      updateState({ activeWorkout }, { silent: true });
    }
  }
}

/**
 * Advance workout to next set or exercise
 */
function advanceWorkout(currentExerciseIndex, currentSetIndex, routine) {
  const { exercises } = getState();
  const result = workoutWorkflowService.completeSet(
    getState().activeWorkout,
    currentExerciseIndex,
    currentSetIndex,
    workoutWorkflowService.getExerciseData(currentExerciseIndex, routine),
    routine
  );

  if (result.action === 'complete_workout') {
    const { activeWorkout } = getState();
    const actualRestTime = currentRestStartTime
      ? Math.floor((Date.now() - currentRestStartTime) / 1000)
      : 0;

    if (activeWorkout.setHistory && activeWorkout.setHistory.length > 0) {
      const lastEntry = activeWorkout.setHistory[activeWorkout.setHistory.length - 1];
      lastEntry.actualRestTime = actualRestTime;
    }

    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;
    cleanupAI();
    window.location.hash = '#workout-completion';
  } else if (result.action === 'next_exercise') {
    const { activeWorkout } = getState();
    const actualRestTime = currentRestStartTime
      ? Math.floor((Date.now() - currentRestStartTime) / 1000)
      : 0;

    if (activeWorkout.setHistory && activeWorkout.setHistory.length > 0) {
      const lastEntry = activeWorkout.setHistory[activeWorkout.setHistory.length - 1];
      lastEntry.actualRestTime = actualRestTime;
    }

    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;

    updateState({ activeWorkout: result.newState }, { silent: true });

    const nextExerciseData = workoutWorkflowService.getExerciseData(
      result.newState.currentExerciseIndex,
      routine
    );
    if (nextExerciseData) {
      const nextExercise = exercises.find(
        (e) => String(e.id) === String(nextExerciseData.exerciseId)
      );
      if (nextExercise && voiceCuesService.isEnabled()) {
        voiceCuesService.announceNextExercise(nextExercise.name);
      }
    }

    updateState({ stateChange: true }, { silent: false });
  } else {
    const { activeWorkout } = getState();
    const actualRestTime = currentRestStartTime
      ? Math.floor((Date.now() - currentRestStartTime) / 1000)
      : 0;

    if (activeWorkout.setHistory && activeWorkout.setHistory.length > 0) {
      const lastEntry = activeWorkout.setHistory[activeWorkout.setHistory.length - 1];
      lastEntry.actualRestTime = actualRestTime;
    }

    updateState({ activeWorkout }, { silent: true });
    currentRestStartTime = null;
    isShowingRestTimer = false;

    updateState({ activeWorkout: result.newState }, { silent: true });
    updateState({ stateChange: true }, { silent: false });
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
        stateChange: true,
      });
    }

    document.removeEventListener('workoutSetsAdjusted', handler);
  };

  document.addEventListener('workoutSetsAdjusted', handler);
}

function handleSwapExercise({
  currentExerciseIndex,
  exerciseId,
  activeWorkout,
  routine,
  exercises,
  currentDifficulty,
}) {
  workoutModalsService.showSwapExerciseModal(
    currentExerciseIndex,
    exerciseId,
    activeWorkout,
    routine,
    exercises,
    currentDifficulty
  );

  const handler = (e) => {
    const { exerciseIndex: idx, newExerciseId, routine: updatedRoutine } = e.detail;

    if (idx === currentExerciseIndex) {
      updateState({
        activeWorkout: { ...activeWorkout, routine: updatedRoutine },
        stateChange: true,
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
      if (voiceCuesService.isEnabled()) {
        voiceCuesService.announceHIITWork(hiitInterval);
      }
    },
    onWorkEnd: () => {
      workoutModalsService.showToast(t('toast.rest_time'), 'warning');
      if (voiceCuesService.isEnabled()) {
        voiceCuesService.announceHIITRest(hiitInterval);
      }
    },
    onRestEnd: () => {
      document.dispatchEvent(new CustomEvent('stateChange'));
    },
  });
}

// ==================== AI TRACKING ====================

/**
 * Start AI tracking for the current exercise
 */
async function startAITracking(exerciseId, aiConfig) {
  try {
    const loadingEl = document.getElementById('ai-loading');
    if (loadingEl) loadingEl.style.display = 'flex';

    await aiFeedbackOverlay.init('ai-workout-container');

    const { video } = await aiFormService.start({
      exerciseId: String(exerciseId),
      aiConfig,
      mode: 'reps',
      facingMode: 'user',
      resolution: { width: 320, height: 240 },
    });

    aiFeedbackOverlay.setVideo(video);
    aiEnabled = true;
    aiCurrentExerciseId = exerciseId;

    // Hide loading
    if (loadingEl) loadingEl.style.display = 'none';

    // Pose callback
    aiFormService.setPoseCallback((data) => {
      aiFeedbackOverlay.updatePose(data);
      const statusDot = document.getElementById('ai-status-dot');
      const statusText = document.getElementById('ai-status-text');
      if (statusDot && statusText) {
        if (data.isValid) {
          statusDot.className = 'ai-status-dot ai-status-active';
          statusText.textContent = t('ai.ai_tracking_active');
        } else {
          statusDot.className = 'ai-status-dot ai-status-lost';
          statusText.textContent = t('ai.ai_tracking_lost');
        }
      }
    });

    // Rep callback
    aiFormService.setRepCallback((count, meta) => {
      const repEl = document.getElementById('ai-rep-count');
      if (repEl) repEl.textContent = count;

      // Voice cues for rep announcements
      const voiceEvery = aiConfig?.voiceCues?.announceEvery || 5;
      if (
        aiConfig?.voiceCues?.announceReps &&
        count > 0 &&
        count % voiceEvery === 0
      ) {
        voiceCuesService.speak(t('ai_rep_count', { count }));
      }

      // Check if target reps reached
      const { activeWorkout } = getState();
      const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
      const routine = activeWorkout.routine;
      const exerciseData = workoutWorkflowService.getExerciseData(currentExerciseIndex, routine);
      if (exerciseData && count >= exerciseData.reps) {
        show(t('ai_target_reached', { count }), 'success');
        // Auto-advance: trigger the next set click
        const nextBtn = document.getElementById('next-set-btn');
        if (nextBtn) nextBtn.click();
      }
    });

    // Form callback
    aiFormService.setFormCallback((violation) => {
      const locale = localStorage.getItem('locale') || 'en';
      const msg = locale === 'es' ? violation.message_es : violation.message_en;
      show(msg, 'warning');

      if (aiConfig?.voiceCues?.announceForm) {
        voiceCuesService.speak(msg);
      }

      aiFeedbackOverlay.setViolations([violation]);
    });

    // Form score polling
    aiFormScoreInterval = setInterval(() => {
      const stats = aiFormService.getStats();
      const scoreEl = document.getElementById('ai-form-score');
      if (scoreEl) {
        scoreEl.textContent = stats.avgFormScore > 0 ? `${stats.avgFormScore}%` : '-';
      }
      aiFeedbackOverlay.setFormScore(stats.avgFormScore);
    }, 500);
  } catch (error) {
    console.error('[ActiveWorkout] AI tracking failed:', error);
    show(t('ai_camera_error'), 'error');
    aiEnabled = false;
    const loadingEl = document.getElementById('ai-loading');
    if (loadingEl) {
      loadingEl.innerHTML = `<p class="ai-error-text">${t('ai_camera_error')}</p>`;
    }
  }
}

/**
 * Stop AI tracking
 */
function stopAITracking() {
  if (aiFormScoreInterval) {
    clearInterval(aiFormScoreInterval);
    aiFormScoreInterval = null;
  }
  aiFormService.stop();
  aiFeedbackOverlay.destroy();
  aiEnabled = false;
  aiCurrentExerciseId = null;
}

/**
 * Clean up all AI resources
 */
function cleanupAI() {
  stopAITracking();
}

/**
 * Update the AI toggle button text
 */
function updateAIButton(isEnabled) {
  const btn = document.getElementById('ai-toggle-btn');
  if (btn) {
    btn.textContent = isEnabled
      ? '⏹ ' + t('ai_stop_tracking')
      : '📷 ' + t('ai_start_tracking');
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderActiveWorkoutView };
