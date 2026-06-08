/**
 * Event Delegation Service
 * Centralized event handling to replace inline onclick handlers
 * Follows project conventions for event delegation
 */

import { updateState } from './state.js';
import { saveForUndo } from './undo-service.js';
import { ModuleStore } from './modules-service.js';
import { show } from './toast-service.js';

/**
 * Initialize all event delegation listeners
 * Call this once during app initialization in main.js
 * @param {HTMLElement} mainElement - The main #app container element
 */
export function initializeEventDelegation(mainElement) {
  // Navigation handlers
  mainElement.addEventListener('click', handleNavigationClick);
  
  // Routine/Workout handlers
  mainElement.addEventListener('click', handleRoutinesClick);
  
  // Exercise handlers
  mainElement.addEventListener('click', handleExerciseClick);
  
  // Profile handlers
  mainElement.addEventListener('click', handleProfileClick);
  
  // Module handlers
  mainElement.addEventListener('click', handleModuleClick);
  
  // Workout handlers
  mainElement.addEventListener('click', handleWorkoutClick);
  
  // Error boundary handlers
  mainElement.addEventListener('click', handleErrorCodeClick);
  
  // Form submission handlers
  mainElement.addEventListener('submit', handleFormSubmit);
}

/**
 * Handle navigation clicks (hash changes)
 */
function handleNavigationClick(e) {
  const button = e.target.closest('[data-nav]');
  if (!button) return;
  
  e.preventDefault();
  const navTarget = button.dataset.nav;
  
  // Special case: "back" means go back in history
  if (navTarget === 'back') {
    window.history.back();
  } else {
    window.location.hash = navTarget;
  }
}

/**
 * Handle routine and workout clicks
 */
function handleRoutinesClick(e) {
  // Start routine button (from home-view)
  const startBtn = e.target.closest('[data-start-routine]');
  if (startBtn) {
    e.preventDefault();
    const routineIndex = startBtn.dataset.routineIndex ?? startBtn.dataset.programIndex;
    const programIndex = parseInt(routineIndex);
    handleStartRoutinesFromHome(programIndex);
    return;
  }
  
  // Start routine button (from routine-details-view)
  const startDetailsBtn = e.target.closest('[data-start-routine]');
  if (startDetailsBtn) {
    e.preventDefault();
    const type = startDetailsBtn.dataset.type;
    const id = startDetailsBtn.dataset.id;
    handleStartRoutines(type, id);
    return;
  }
  
  // Edit routine button
  const editBtn = e.target.closest('[data-edit-routine]');
  if (editBtn) {
    e.preventDefault();
    const type = editBtn.dataset.type;
    const id = editBtn.dataset.id;
    handleEditRoutines(type, id);
    return;
  }
  
  // Copy routine button
  const copyBtn = e.target.closest('[data-copy-routine]');
  if (copyBtn) {
    e.preventDefault();
    const type = copyBtn.dataset.type;
    const id = copyBtn.dataset.id;
    handleCopyRoutines(type, id);
    return;
  }
  
  // Delete routine button
  const deleteBtn = e.target.closest('[data-delete-routine]');
  if (deleteBtn) {
    e.preventDefault();
    const type = deleteBtn.dataset.type;
    const id = deleteBtn.dataset.id;
    handleDeleteRoutines(type, id);
    return;
  }
}

/**
 * Start routine from home view featured routines
 */
function handleStartRoutinesFromHome(programIndex) {
  const state = window.getState();
  const routine = state?.routines?.[programIndex];
  
  if (routine) {
    window.updateState({
      activeWorkout: {
        routine: routine,
        progress: {},
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        workoutMode: 'manual'
      }
    });
    window.location.hash = '#active-workout';
  }
}

/**
 * Handle edit routine action
 */
function handleEditRoutines(type, id) {
  window.updateState({
    editingRoutines: { type, id }
  });
  window.location.hash = '#builder';
}

/**
 * Handle copy routine action
 */
function handleCopyRoutines(type, id) {
  const state = window.getState();
  const exercises = state.exercises || [];
  
  let routine;
  if (type === 'routine') {
    routine = state.routines?.find(p => String(p.id) === String(id));
  }
  
  if (!routine) {
    show('Routine not found.', 'error');
    return;
  }
  
  // Build routine text
  let programText = `*${routine.name}*\n\n`;
  
  if (routine.warmup && routine.warmup.length > 0) {
    programText += '*Warmup*\n';
    routine.warmup.forEach(ex => {
      const exercise = exercises.find(e => e.id === ex.exerciseId);
      programText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets × ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
    });
    programText += '\n';
  }
  
  programText += '*Exercises*\n';
  routine.exercises.forEach(ex => {
    const exercise = exercises.find(e => e.id === ex.exerciseId);
    programText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets × ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
  });
  
  if (routine.cooldown && routine.cooldown.length > 0) {
    programText += '\n*Cooldown*\n';
    routine.cooldown.forEach(ex => {
      const exercise = exercises.find(e => e.id === ex.exerciseId);
      programText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets × ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
    });
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(programText).then(() => {
    show('Routine copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    show('Failed to copy routine to clipboard.', 'error');
  });
}

/**
 * Handle exercise clicks
 */
function handleExerciseClick(e) {
  // Favorite toggle button (exercise-card-favorite class)
  const favBtn = e.target.closest('.exercise-card-favorite');
  if (favBtn) {
    e.preventDefault();
    e.stopPropagation();
    const exerciseId = favBtn.getAttribute('data-exercise-id');
    if (exerciseId) {
      handleToggleFavorite(exerciseId);
    }
    return;
  }
  
  // Favorite toggle (data-favorite attribute - for backward compatibility)
  const favBtnAttr = e.target.closest('[data-favorite]');
  if (favBtnAttr) {
    e.preventDefault();
    const exerciseId = favBtnAttr.dataset.favorite;
    handleToggleFavorite(exerciseId);
    return;
  }
  
  // Create Routine action (from home view)
  const createRoutinesBtn = e.target.closest('[data-action="create-routine"]');
  if (createRoutinesBtn) {
    e.preventDefault();
    e.stopPropagation();
    window.updateState({ 
      createNewRoutine: true, 
      editingRoutines: null, 
      editingModule: null 
    });
    window.location.hash = '#builder';
    return;
  }
  
  // IGNORE: Don't handle clicks on checkboxes in builder view
  // Checkboxes have data-exercise-id but shouldn't navigate to details
  if (e.target.closest('input[type="checkbox"][data-exercise-id]')) {
    return;
  }
  
  // Exercise card click (navigate to details)
  const exerciseCard = e.target.closest('[data-exercise-id]');
  if (exerciseCard) {
    e.preventDefault();
    const exerciseId = exerciseCard.dataset.exerciseId;
    window.location.hash = `#exercise/${exerciseId}`;
    return;
  }
}

/**
 * Toggle favorite for exercise
 */
function handleToggleFavorite(exerciseId) {
  const state = window.getState();
  const user = state.user || {};
  let favoriteExerciseIds = user.favoriteExerciseIds || [];
  
  // Toggle the exercise in favorites
  if (favoriteExerciseIds.includes(exerciseId)) {
    favoriteExerciseIds = favoriteExerciseIds.filter(id => id !== exerciseId);
  } else {
    favoriteExerciseIds.push(exerciseId);
  }
  
  window.updateState({ user: { ...user, favoriteExerciseIds } });
}

/**
 * Handle profile clicks
 */
function handleProfileClick(e) {
  // Delete metric button
  const deleteMetricBtn = e.target.closest('[data-delete-metric]');
  if (deleteMetricBtn) {
    e.preventDefault();
    const index = parseInt(deleteMetricBtn.dataset.index);
    handleDeleteMetric(index);
    return;
  }
  
  // Delete workout history button
  const deleteHistoryBtn = e.target.closest('[data-delete-workout]');
  if (deleteHistoryBtn) {
    e.preventDefault();
    const index = parseInt(deleteHistoryBtn.dataset.index);
    handleDeleteWorkoutHistory(index);
    return;
  }
  
  // Navigate to workout detail
  const workoutItem = e.target.closest('[data-workout-item]');
  if (workoutItem) {
    e.preventDefault();
    const index = parseInt(workoutItem.dataset.index);
    window.location.hash = `#workout-detail/${index}`;
    return;
  }
}

/**
 * Handle module admin clicks
 */
function handleModuleClick(e) {
  // Remove exercise button
  const removeExerciseBtn = e.target.closest('[data-remove-exercise]');
  if (removeExerciseBtn) {
    e.preventDefault();
    const exId = parseInt(removeExerciseBtn.dataset.exId);
    handleRemoveExercise(exId);
    return;
  }
  
  // Reset exercise selection
  const resetBtn = e.target.closest('[data-reset-exercises]');
  if (resetBtn) {
    e.preventDefault();
    handleResetExerciseSelection();
    return;
  }
  
  // Confirm delete module
  const confirmDeleteBtn = e.target.closest('[data-confirm-delete]');
  if (confirmDeleteBtn) {
    e.preventDefault();
    const editId = confirmDeleteBtn.dataset.editId;
    handleConfirmDeleteModule(editId);
    return;
  }
}

/**
 * Handle workout summary clicks
 */
function handleWorkoutClick(e) {
  // Share workout button
  const shareBtn = e.target.closest('[data-share-workout]');
  if (shareBtn) {
    e.preventDefault();
    handleShareWorkout();
    return;
  }
}

/**
 * Handle form submissions
 */
function handleFormSubmit(e) {
  // Body metrics form
  const bodyMetricsForm = e.target.closest('#body-metrics-form');
  if (bodyMetricsForm) {
    e.preventDefault();
    handleBodyMetricsSubmit(e.target);
    return;
  }
  
  // Comment form
  const commentForm = e.target.closest('#comment-form');
  if (commentForm) {
    e.preventDefault();
    handleCommentSubmit(e.target);
    return;
  }
  
  // Module form
  const moduleForm = e.target.closest('#module-form');
  if (moduleForm) {
    e.preventDefault();
    handleModuleFormSubmit(e.target);
    return;
  }
}

/**
 * Handle error boundary button clicks
 */
function handleErrorCodeClick(e) {
  // Go home button (from error-boundary-service)
  const goHomeBtn = e.target.closest('[data-error-go-home]');
  if (goHomeBtn) {
    e.preventDefault();
    window.location.hash = '#';
    return;
  }
  
  // Reload page button (from error-boundary-service)
  const reloadBtn = e.target.closest('[data-error-reload]');
  if (reloadBtn) {
    e.preventDefault();
    location.reload();
    return;
  }
}

/**
 * ==================== ACTION HANDLERS ====================
 */

function handleStartRoutines(type, id) {
  // Navigate to routine details view
  window.location.hash = `#routine-details/${type}/${id}`;
}

function handleDeleteRoutines(type, id) {
  const state = window.getState();
  
  if (type === 'routine') {
    const routine = state.routines?.find(p => String(p.id) === String(id));
    if (routine) {
      if (confirm(`Are you sure you want to delete "${routine.name}"? This action cannot be undone.`)) {
        show('Routine deleted successfully! (Note: This is a demo - in production, the routine would be deleted from the database)', 'success');
        window.location.hash = '#routines';
      }
    }
  }
}

function handleDeleteMetric(index) {
  if (!confirm('Delete this metric?')) return;
  
  const state = window.getState();
  const user = { ...state.user };
  user.bodyMetrics = user.bodyMetrics || [];
  
  const metricToDelete = user.bodyMetrics[index];
  if (metricToDelete) {
    saveForUndo('body-metric', metricToDelete, index);
  }
  
  user.bodyMetrics.splice(index, 1);
  user.bodyMetrics = user.bodyMetrics.map((metric, i) => ({
    ...metric,
    index: i
  }));
  
  updateState({ user });
  // Re-render will be triggered by state change if view supports it
}

function handleDeleteWorkoutHistory(index) {
  const state = window.getState();
  const historyItem = state.history[index];
  
  if (!historyItem) return;
  
  if (!confirm('Delete this workout from history?')) return;
  
  saveForUndo('workout-history', historyItem, index);
  
  const newHistory = state.history.filter((_, i) => i !== index);
  updateState({ history: newHistory });
  // Re-render will be triggered by state change if view supports it
}

function handleRemoveExercise(exId) {
  // This will be handled by the specific view's state
  if (window.removeExerciseFromModule) {
    window.removeExerciseFromModule(exId);
  }
}

function handleResetExerciseSelection() {
  if (window.resetExerciseSelection) {
    window.resetExerciseSelection();
  }
}

function handleConfirmDeleteModule(editId) {
  if (!confirm('Are you sure you want to delete this module?')) return;
  
  ModuleStore.delete(editId)
    .then(() => {
      const editingModule = window.currentEditingModule;
      if (editingModule) {
        saveForUndo('module', editingModule, editId);
      }
      show('Module deleted successfully!', 'success');
      window.location.hash = '#skill-modules';
    })
    .catch(error => {
      console.error('Error deleting module:', error);
      show('Error deleting module: ' + error.message, 'error');
    });
}

function handleShareWorkout() {
  const state = window.getState();
  const history = state.history || [];
  const lastWorkout = history.length > 0 ? history[history.length - 1] : null;
  
  if (!lastWorkout) {
    show('No workout to share.', 'info');
    return;
  }
  
  const workoutText = formatWorkoutSummary(lastWorkout);
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(workoutText).then(() => {
      show('Workout summary copied to clipboard!\n\nYou can now paste it in WhatsApp, social media, or any text message.', 'success');
    }).catch(() => {
      prompt('Copy the workout summary below:', workoutText);
    });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = workoutText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      show('Workout summary copied to clipboard!\n\nYou can now paste it in WhatsApp, social media, or any text message.', 'success');
    } catch (err) {
      prompt('Copy the workout summary below:', workoutText);
    }
    document.body.removeChild(textArea);
  }
}

function formatWorkoutSummary(workout) {
  const routine = workout.routine;
  const date = new Date(workout.date).toLocaleDateString();
  
  let summary = `💪 *Workout Summary*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  summary += `📅 *Date:* ${date}\n`;
  summary += `🏋️ *Routine:* ${routine.name}\n\n`;
  summary += `🔥 *Exercises Completed:*\n`;
  
  workout.exercises.forEach((exercise, index) => {
    summary += `\n${index + 1}. *${exercise.exerciseName}*\n`;
    summary += `   Target: ${exercise.targetSets} sets × ${exercise.targetReps} reps\n`;
    summary += `   Actual: ${exercise.actualReps.join(' × ')} reps`;
  });
  
  summary += `\n\n━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `Great job! Keep pushing your limits! 💯\n`;
  
  return summary;
}

function handleBodyMetricsSubmit(form) {
  const weightInput = form.querySelector('#weight');
  const bodyFatInput = form.querySelector('#bodyFat');
  const weight = parseFloat(weightInput.value);
  const bodyFat = bodyFatInput.value ? parseFloat(bodyFatInput.value) : null;
  
  // Validate weight
  const weightValidation = window.ValidationService.validateNumber(weight.toString());
  if (!weightValidation.valid) {
    show(weightValidation.error, 'error');
    return;
  }
  
  // Validate body fat if provided
  if (bodyFatInput.value && bodyFatInput.value.trim() !== '') {
    const bodyFatValidation = window.ValidationService.validateNumber(bodyFatInput.value);
    if (!bodyFatValidation.valid) {
      show(bodyFatValidation.error, 'error');
      return;
    }
    if (bodyFat < 0 || bodyFat > 100) {
      show('Body fat percentage must be between 0 and 100', 'error');
      return;
    }
  }
  
  const state = window.getState();
  const user = { ...state.user };
  user.bodyMetrics = user.bodyMetrics || [];
  
  user.bodyMetrics.push({
    date: new Date().toISOString(),
    weight,
    bodyFat,
    index: user.bodyMetrics.length
  });
  
  updateState({ user });
  
  // Clear form and re-render
  weightInput.value = '';
  bodyFatInput.value = '';
  
  // Re-render profile view
  if (window.renderProfileView) {
    window.renderProfileView();
  }
}

function handleCommentSubmit(form) {
  const nameInput = form.querySelector('#comment-name');
  const textInput = form.querySelector('#comment-text');
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  
  if (!name || !text) {
    show('Please enter both a name and comment.', 'error');
    return;
  }
  
  const workoutId = form.dataset.workoutId;
  const comments = JSON.parse(localStorage.getItem(`sharedComments_${workoutId}`) || '[]');
  comments.push({
    name,
    text,
    date: new Date().toISOString()
  });
  
  localStorage.setItem(`sharedComments_${workoutId}`, JSON.stringify(comments));
  
  // Clear form and re-render
  nameInput.value = '';
  textInput.value = '';
  
  if (window.renderSharedWorkoutView) {
    window.renderSharedWorkoutView(workoutId);
  }
}

function handleModuleFormSubmit(form) {
  // This will be handled by the module-admin-view's own event listener
  // The form handler in that view has more context about exercises
  if (window.handleModuleFormSubmit) {
    window.handleModuleFormSubmit(form);
  }
}

/**
 * Handle create routine action from home view
 */
function handleCreateRoutine() {
  const state = window.getState();
  const user = { ...state.user };
  
  // Initialize customRoutines if not exists
  user.customRoutines = user.customRoutines || [];
  
  window.updateState({
    user,
    createNewRoutines: true,
    editingRoutines: null,
    editingModule: null
  });
  
  window.location.hash = '#builder';
}

/**
 * Get current editing module (for undo save)
 */
export function setCurrentEditingModule(module) {
  window.currentEditingModule = module;
}

/**
 * Expose handleToggleFavorite globally for exercises view
 */
export function exposeToggleFavorite() {
  // Find the handleToggleFavorite function and expose it
  // This is a workaround since we can't directly reference it from outside the module
  window.handleToggleFavorite = function(exerciseId) {
    const state = window.getState();
    const user = state.user || {};
    let favoriteExerciseIds = user.favoriteExerciseIds || [];
    
    // Toggle the exercise in favorites
    if (favoriteExerciseIds.includes(exerciseId)) {
      favoriteExerciseIds = favoriteExerciseIds.filter(id => id !== exerciseId);
    } else {
      favoriteExerciseIds.push(exerciseId);
    }
    
    window.updateState({ user: { ...user, favoriteExerciseIds } });
  };
}

/**
 * Clean up all event listeners (for cleanup on app shutdown)
 */
export function cleanupEventDelegation() {
  // No cleanup needed - listeners are on main element which gets replaced on navigation
  // The old listeners become garbage collected when main element is replaced
}
