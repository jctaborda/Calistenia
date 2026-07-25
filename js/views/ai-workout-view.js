// AI Workout View - Camera feed with real-time pose detection and form feedback
import { aiFormService } from '../services/ai-form-service.js';
import { aiFeedbackOverlay } from '../components/ai-feedback-overlay.js';
import { show } from '../services/toast-service.js';
import { voiceCuesService } from '../services/voice-cues-service.js';
import { t } from '../i18n.js';
import { getState } from '../services/state.js';

let aiViewCleanup = null;
let aiRepCallback = null;

/**
 * Render AI workout view
 */
async function render(exerciseId) {
  console.log('[AIWorkoutView] Rendering with exerciseId:', exerciseId);
  
  // Cleanup previous instance
  if (aiViewCleanup) {
    aiViewCleanup();
    aiViewCleanup = null;
  }
  
  // Check browser support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('[AIWorkoutView] Camera not supported');
    show(t('ai_not_supported'));
    return;
  }
  
  console.log('[AIWorkoutView] Camera API available, creating view...');
  
  // Get exercises from state for dropdown
  const { exercises } = getState();
  
  // Create view container
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="view view-ai-workout">
      <div class="view-header">
        <h2>${t('ai_form_tracking')}</h2>
        <button class="btn btn-secondary btn-small" id="ai-stop-btn">${t('ai_stop')}</button>
      </div>
      
      <div class="ai-workout-content">
        <div class="ai-exercise-selector">
          <label for="exercise-select">${t('ai_select_exercise')}:</label>
          <select id="exercise-select" class="form-select">
            <option value="">${t('ai_select_exercise_prompt')}</option>
            ${exercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}
          </select>
        </div>
        
        <div id="ai-workout-container" class="ai-video-container">
          <div class="ai-permission-prompt" id="ai-permission-prompt">
            <p>📷 ${t('ai_permission_explainer')}</p>
            <ul>
              <li>${t('ai_info_lighting')}</li>
              <li>${t('ai_info_full_body')}</li>
              <li>${t('ai_info_contrast')}</li>
            </ul>
            <button class="btn btn-primary" id="ai-start-camera-btn">${t('ai_start_camera')}</button>
          </div>
        </div>
        
        <div class="ai-controls">
          <div class="ai-stats">
            <div class="stat">
              <span class="stat-label">${t('ai_reps')}</span>
              <span class="stat-value" id="ai-rep-count">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">${t('ai_form_score')}</span>
              <span class="stat-value" id="ai-form-score">-</span>
            </div>
            <div class="stat">
              <span class="stat-label">${t('ai_target_reps')}</span>
              <span class="stat-value" id="ai-target-reps">-</span>
            </div>
          </div>
          
          <div class="ai-status">
            <span id="ai-status-text" class="status-indicator">${t('ai_waiting')}</span>
          </div>
          
          <div class="ai-auto-advance">
            <label class="checkbox-label">
              <input type="checkbox" id="ai-auto-advance-toggle">
              <span>${t('ai_auto_advance_enabled')}</span>
            </label>
          </div>
          
          <div class="ai-info">
            <p>${t('ai_info')}</p>
            <ul>
              <li>${t('ai_info_lighting')}</li>
              <li>${t('ai_info_full_body')}</li>
              <li>${t('ai_info_contrast')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  
  console.log('[AIWorkoutView] View DOM created, initializing overlay...');
  
  // Initialize exercise selector
  const exerciseSelect = document.getElementById('exercise-select');
  if (exerciseSelect) {
    // If exerciseId was passed, select it
    if (exerciseId) {
      exerciseSelect.value = exerciseId;
    }
    
    // Listen for exercise selection changes
    exerciseSelect.addEventListener('change', async (e) => {
      const selectedExerciseId = e.target.value;
      if (selectedExerciseId) {
        console.log('[AIWorkoutView] Exercise changed to:', selectedExerciseId);
        if (aiViewCleanup) {
          // Camera is already running — restart with new exercise
          await restartAIWithExercise(selectedExerciseId);
        } else {
          // Camera was not started — just update the target reps display
          const { exercises: allExercises } = getState();
          const exercise = allExercises.find(ex => String(ex.id) === String(selectedExerciseId));
          const targetRepsEl = document.getElementById('ai-target-reps');
          if (targetRepsEl) {
            targetRepsEl.textContent = exercise?.reps || '-';
          }
        }
      }
    });
  }
  
  // Initialize overlay - wait for container to exist
  try {
    // The container needs to exist before we can initialize the overlay
    const container = document.getElementById('ai-workout-container');
    if (!container) {
      throw new Error('AI workout container not found in DOM');
    }
    
    aiFeedbackOverlay.init(container.id);
    console.log('[AIWorkoutView] Overlay initialized');
  } catch (overlayError) {
    console.error('[AIWorkoutView] Overlay init failed:', overlayError);
    show('Failed to initialize overlay: ' + overlayError.message);
    return;
  }
  
  // Set up stop button handler
  const stopBtn = document.getElementById('ai-stop-btn');
  stopBtn.addEventListener('click', () => {
    console.log('[AIWorkoutView] Stop button clicked');
    stopAITracking();
  });
  
  // Set up auto-advance toggle
  const autoAdvanceToggle = document.getElementById('ai-auto-advance-toggle');
  if (autoAdvanceToggle) {
    autoAdvanceToggle.addEventListener('change', (e) => {
      console.log('[AIWorkoutView] Auto-advance toggle:', e.target.checked);
    });
  }
  
  // "Start Camera" button — requires user gesture for mobile browsers
  const startCameraBtn = document.getElementById('ai-start-camera-btn');
  if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async () => {
      const exerciseToUse = exerciseId || exerciseSelect?.value;
      if (!exerciseToUse) {
        show(t('ai_select_exercise_prompt'));
        return;
      }

      startCameraBtn.disabled = true;
      startCameraBtn.textContent = t('ai_initializing');

      try {
        await startAITracking(exerciseToUse);
        // Remove permission prompt after successful start
        const promptEl = document.getElementById('ai-permission-prompt');
        if (promptEl) promptEl.remove();
        console.log('[AIWorkoutView] AI tracking started successfully');
      } catch (error) {
        console.error('[AIWorkoutView] Failed to start:', error);

        let errorMsg = t('ai_camera_error');
        const msg = error.message || '';
        if (error.name === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
          errorMsg = t('ai_camera_not_allowed');
        } else if (error.name === 'NotFoundError' || msg.includes('No video devices')) {
          errorMsg = t('ai_camera_not_found');
        } else if (error.name === 'NotReadableError' || msg.includes('in use')) {
          errorMsg = t('ai_camera_in_use');
        }

        show(errorMsg, 'error');

        const container = document.getElementById('ai-workout-container');
        if (container) {
          container.innerHTML = `
            <div class="ai-camera-error">
              <p>${errorMsg}</p>
              <button class="btn btn-primary" id="ai-retry-btn">${t('ai_try_again')}</button>
            </div>`;

          document.getElementById('ai-retry-btn').addEventListener('click', () => {
            render(exerciseId);
          });
        }
      }
    });
  }
}

/**
 * Restart AI tracking with a new exercise
 */
async function restartAIWithExercise(exerciseId) {
  console.log('[AIWorkoutView] Restarting AI with exercise:', exerciseId);
  
  // Cleanup current tracking
  if (aiViewCleanup) {
    aiViewCleanup();
    aiViewCleanup = null;
  }
  
  // Remove loading overlay if exists
  const loadingEl = document.querySelector('.ai-loading');
  if (loadingEl) {
    loadingEl.remove();
  }
  
  // Reset UI
  document.getElementById('ai-rep-count').textContent = '0';
  document.getElementById('ai-form-score').textContent = '-';
  document.getElementById('ai-target-reps').textContent = '-';
  
  // Start new tracking
  try {
    const cleanup = await startAITracking(exerciseId);
    aiViewCleanup = cleanup;
  } catch (error) {
    console.error('[AIWorkoutView] Failed to restart:', error);

    let errorMsg = t('ai_camera_error');
    const msg = error.message || '';
    if (error.name === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
      errorMsg = t('ai_camera_not_allowed');
    } else if (error.name === 'NotFoundError' || msg.includes('No video devices')) {
      errorMsg = t('ai_camera_not_found');
    } else if (error.name === 'NotReadableError' || msg.includes('in use')) {
      errorMsg = t('ai_camera_in_use');
    }

    show(errorMsg, 'error');
  }
}

/**
 * Start AI pose tracking
 */
async function startAITracking(exerciseId) {
  console.log('[AIFormService] Starting with exercise:', exerciseId);
  
  const statusText = document.getElementById('ai-status-text');
  const repCountEl = document.getElementById('ai-rep-count');
  const formScoreEl = document.getElementById('ai-form-score');
  const targetRepsEl = document.getElementById('ai-target-reps');
  
  // Get exercise details to find target reps
  const { exercises } = getState();
  const exercise = exercises.find(e => String(e.id) === String(exerciseId));
  
  // Set target reps from exercise definition
  if (exercise && exercise.reps) {
    targetRepsEl.textContent = exercise.reps;
  } else {
    targetRepsEl.textContent = '-';
  }
  
  // Start camera and pose detection
  console.log('[AIFormService] Calling start()...');
  const { video, canvas } = await aiFormService.start({
    exerciseId: exerciseId,
    mode: 'reps',
    facingMode: 'user',
    resolution: { width: 320, height: 240 }
  });
  
  console.log('[AIFormService] Camera started, setting up callbacks...');
  
  // Update status immediately
  if (statusText) {
    statusText.textContent = t('ai_tracking_active');
    statusText.className = 'status-indicator active';
  }
  
  // Set video in overlay
  aiFeedbackOverlay.setVideo(video);
  
  // Set up callbacks
  aiFormService.setPoseCallback((data) => {
    console.log('[AIFormService] Pose callback called:', data);
    aiFeedbackOverlay.setPoseData(data);
    
    if (statusText) {
      statusText.textContent = data.isValid ? t('ai_tracking_active') : t('ai_tracking_lost');
      statusText.className = data.isValid ? 'status-indicator active' : 'status-indicator lost';
    }
  });
  
  // Set up rep callback with auto-advance logic
  aiRepCallback = (count) => {
    repCountEl.textContent = count;
    
    // Check auto-advance setting
    const autoAdvanceToggle = document.getElementById('ai-auto-advance-toggle');
    const autoAdvanceEnabled = autoAdvanceToggle?.checked || false;
    
    // Voice cue for rep milestone
    if (count % 5 === 0 && count > 0) {
      voiceCuesService.speak(`Rep ${count}`);
    }
    
    // Check if auto-advance is enabled and target reps reached
    const targetReps = parseInt(targetRepsEl.textContent);
    if (autoAdvanceEnabled && targetReps && count >= targetReps) {
      console.log('[AIWorkoutView] Target reps reached, triggering auto-advance');
      show(t('toast.ai_reps_completed', { count: targetReps }));
      
      // Auto-navigate back to active workout to advance
      setTimeout(() => {
        window.location.hash = '#active-workout';
      }, 1000);
    }
  };
  
  aiFormService.setRepCallback(aiRepCallback);
  
  aiFormService.setFormCallback((violation) => {
    const message = violation.message_en || violation.message;
    show(message);
    voiceCuesService.speak(message);
    
    aiFeedbackOverlay.setViolations([violation]);
  });
  
  // Update form score periodically
  const formScoreInterval = setInterval(() => {
    const stats = aiFormService.getStats();
    if (formScoreEl) {
      formScoreEl.textContent = stats.avgFormScore;
    }
    aiFeedbackOverlay.setFormScore(stats.avgFormScore);
  }, 500);
  
  console.log('[AIFormService] All callbacks set up');
  
  // Cleanup on view exit
  aiViewCleanup = () => {
    console.log('[AIFormService] Cleanup called');
    clearInterval(formScoreInterval);
    aiFormService.stop();
    aiFeedbackOverlay.destroy();
    
    // Save AI stats to workout history (if applicable)
    const stats = aiFormService.getStats();
    console.log('[AIWorkoutView] Workout ended with stats:', stats);
  };
  
  // Return cleanup function for use after loading overlay removal
  return aiViewCleanup;
}

/**
 * Stop AI tracking immediately
 */
function stopAITracking() {
  if (aiViewCleanup) {
    aiViewCleanup();
    aiViewCleanup = null;
  }
}

// Export in the pattern expected by ErrorBoundaryService.wrapView
export default {
  render,
  stopAITracking
};
