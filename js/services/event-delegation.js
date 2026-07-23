/**
 * Event Delegation Service
 * Centralized event handling to replace inline onclick handlers
 * Follows project conventions for event delegation
 */

import { getState, updateState } from './state.js';
import { saveForUndo } from './undo-service.js';
import { ModuleStore } from './modules-service.js';
import { show } from './toast-service.js';
import { showConfirmation as showConfirmationModal } from './confirmation-modal.js';
import { formatWorkoutSummary } from '../utils/workout-summary.js';
import { escapeHtml } from '../utils/html-helpers.js';
import { deleteRoutine as dbDeleteRoutine } from './database.js';
import { routinesLoad } from './database.js';
import { storeSharedComments, loadSharedComments } from './database.js';

let mainElementRef = null;
let handlers = [];

/**
 * Initialize all event delegation listeners
 * Call this once during app initialization in main.js
 * @param {HTMLElement} mainElement - The main #app container element
 */
export function initializeEventDelegation(mainElement) {
  mainElementRef = mainElement;

  const navHandler = handleNavigationClick;
  const routineHandler = handleRoutinesClick;
  const exerciseHandler = handleExerciseClick;
  const profileHandler = handleProfileClick;
  const moduleHandler = handleModuleClick;
  const workoutHandler = handleWorkoutClick;
  const errorBoundaryHandler = handleErrorCodeClick;
  const formHandler = handleFormSubmit;
  const headerHandler = handleHeaderClicks;

  mainElement.addEventListener('click', navHandler);
  mainElement.addEventListener('click', routineHandler);
  mainElement.addEventListener('click', exerciseHandler);
  mainElement.addEventListener('click', profileHandler);
  mainElement.addEventListener('click', moduleHandler);
  mainElement.addEventListener('click', workoutHandler);
  mainElement.addEventListener('click', errorBoundaryHandler);
  mainElement.addEventListener('submit', formHandler);
  mainElement.addEventListener('click', headerHandler);

  handlers = [
    { el: mainElement, type: 'click', fn: navHandler },
    { el: mainElement, type: 'click', fn: routineHandler },
    { el: mainElement, type: 'click', fn: exerciseHandler },
    { el: mainElement, type: 'click', fn: profileHandler },
    { el: mainElement, type: 'click', fn: moduleHandler },
    { el: mainElement, type: 'click', fn: workoutHandler },
    { el: mainElement, type: 'click', fn: errorBoundaryHandler },
    { el: mainElement, type: 'submit', fn: formHandler },
    { el: mainElement, type: 'click', fn: headerHandler },
  ];
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
 * Handle header clicks (theme toggle, locale toggle)
 * These are moved here from header.js to persist across header re-renders
 */
async function handleHeaderClicks(e) {
  const themeToggle = e.target.closest('#theme-toggle');
  if (themeToggle) {
    e.preventDefault();
    const i18n = await import('../i18n.js');
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const icon = themeToggle.querySelector('.icon');
    if (icon) {
      icon.textContent = isDark ? i18n.t('theme.light') : i18n.t('theme.dark');
    }
    return;
  }

  const localeToggle = e.target.closest('#locale-toggle');
  if (localeToggle) {
    e.preventDefault();
    const i18n = await import('../i18n.js');
    const locales = i18n.getAvailableLocales();
    const current = i18n.getLocale();
    const idx = locales.findIndex((l) => l.code === current);
    const next = locales[(idx + 1) % locales.length].code;
    i18n.setLocale(next);
    // localeChange event will be dispatched by setLocale
    // main.js listens for it and re-renders everything
    return;
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
}

/**
 * Start routine from home view featured routines
 */
function handleStartRoutinesFromHome(programIndex) {
  const state = getState();
  const routine = state?.routines?.[programIndex];

  if (routine) {
    updateState({
      activeWorkout: {
        routine: routine,
        progress: {},
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        workoutMode: 'manual',
      },
    });
    window.location.hash = '#active-workout';
  }
}

/**
 * Handle edit routine action
 */
function handleEditRoutines(type, id) {
  updateState({
    editingRoutines: { type, id },
  });
  window.location.hash = '#builder';
}

/**
 * Handle copy routine action
 */
function handleCopyRoutines(type, id) {
  const state = getState();
  const exercises = state.exercises || [];

  let routine;
  if (type === 'routine') {
    routine = state.routines?.find((p) => String(p.id) === String(id));
  }

  if (!routine) {
    show('Routine not found.', 'error');
    return;
  }

  // Build routine text
  let programText = `*${routine.name}*\n\n`;

  if (routine.warmup && routine.warmup.length > 0) {
    programText += '*Warmup*\n';
    routine.warmup.forEach((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      programText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets ✕ ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
    });
    programText += '\n';
  }

  programText += '*Exercises*\n';
  routine.exercises.forEach((ex) => {
    const exercise = exercises.find((e) => e.id === ex.exerciseId);
    programText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets ✕ ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
  });

  if (routine.cooldown && routine.cooldown.length > 0) {
    programText += '\n*Cooldown*\n';
    routine.cooldown.forEach((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      programText += `- ${exercise ? exercise.name : 'Unknown'}: ${ex.sets} sets ✕ ${ex.reps} reps (Rest: ${ex.restTime}s)\n`;
    });
  }

  // Copy to clipboard
  navigator.clipboard
    .writeText(programText)
    .then(() => {
      show('Routine copied to clipboard!', 'success');
    })
    .catch((err) => {
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
    updateState({
      createNewRoutine: true,
      editingRoutines: null,
      editingModule: null,
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
  const state = getState();
  const user = state.user || {};
  let favoriteExerciseIds = user.favoriteExerciseIds || [];

  // Normalize exerciseId to string for consistent comparison
  const normalizedId = String(exerciseId);

  // Toggle the exercise in favorites using String comparison
  if (favoriteExerciseIds.some((id) => String(id) === normalizedId)) {
    favoriteExerciseIds = favoriteExerciseIds.filter((id) => String(id) !== normalizedId);
  } else {
    favoriteExerciseIds.push(normalizedId);
  }

  updateState({ user: { ...user, favoriteExerciseIds } });
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

  // Onboarding form - handled inline in onboarding-view.js, don't intercept
  const onboardingForm = e.target.closest('#onboarding-form');
  if (onboardingForm) {
    // Let the inline handler in onboarding-view.js handle this
    // Don't prevent default here
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

async function handleDeleteRoutines(type, id) {
  const state = getState();

  if (type === 'routine') {
    const routine = state.routines?.find((p) => String(p.id) === String(id));
    if (routine) {
      const confirmed = await showConfirmationModal(
        `Are you sure you want to delete "${routine.name}"? This action cannot be undone.`
      );
      if (confirmed) {
        try {
          await saveForUndo('routine', routine, routine.id);
          await dbDeleteRoutine(routine.id);
          // Reload routines from IndexedDB and update state
          const refreshedRoutines = await routinesLoad();
          updateState({ routines: refreshedRoutines });
          show('Routine deleted successfully!', 'success');
          window.location.hash = '#routines';
        } catch (error) {
          console.error('Failed to delete routine:', error);
          show('Failed to delete routine. Please try again.', 'error');
        }
      }
    }
  }
}

function handleDeleteMetric(index) {
  showConfirmationModal('Delete this metric?').then((confirmed) => {
    if (!confirmed) return;

    const state = getState();
    const user = { ...(state.user || {}) };
    user.bodyMetrics = user.bodyMetrics || [];

    const metricToDelete = user.bodyMetrics[index];
    if (metricToDelete) {
      saveForUndo('body-metric', metricToDelete, index);
    }

    user.bodyMetrics.splice(index, 1);
    user.bodyMetrics = user.bodyMetrics.map((metric, i) => ({
      ...metric,
      index: i,
    }));

    updateState({ user });
    // Re-render profile view
    import('../views/profile-view.js').then(({ renderProfileView }) => {
      renderProfileView();
    });
  });
}

function handleDeleteWorkoutHistory(index) {
  showConfirmationModal('Delete this workout from history?').then((confirmed) => {
    if (!confirmed) return;
    const state = getState();
    const historyItem = state.history[index];
    if (!historyItem) return;
    saveForUndo('workout-history', historyItem, index);
    const newHistory = state.history.filter((_, i) => i !== index);
    updateState({ history: newHistory });
    // Re-render profile view
    import('../views/profile-view.js').then(({ renderProfileView }) => {
      renderProfileView();
    });
  });
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
  showConfirmationModal('Are you sure you want to delete this module?').then((confirmed) => {
    if (!confirmed) return;
    ModuleStore.delete(editId)
      .then(() => {
        const editingModule = window.currentEditingModule;
        if (editingModule) {
          saveForUndo('module', editingModule, editId);
        }
        show('Module deleted successfully!', 'success');
        window.location.hash = '#skill-modules';
      })
      .catch((error) => {
        console.error('Error deleting module:', error);
        show('Error deleting module: ' + error.message, 'error');
      });
  });
}

function handleShareWorkout() {
  const state = getState();
  const history = state.history || [];
  const lastWorkout = history.length > 0 ? history[history.length - 1] : null;

  if (!lastWorkout) {
    show('No workout to share.', 'info');
    return;
  }

  const workoutText = formatWorkoutSummary(lastWorkout);

  // Try Web Share API first (native sharing on mobile)
  if (navigator.share) {
    navigator
      .share({
        title: 'My Workout Summary',
        text: workoutText,
      })
      .then(() => {
        show('Workout shared successfully!', 'success');
      })
      .catch((err) => {
        // User cancelled share or share failed — fall back to clipboard
        if (err.name !== 'AbortError') {
          fallbackCopy(workoutText);
        }
      });
  } else {
    fallbackCopy(workoutText);
  }
}

function fallbackCopy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        show('Workout summary copied to clipboard!', 'success');
      })
      .catch(() => {
        prompt('Copy the workout summary below:', text);
      });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      show('Workout summary copied to clipboard!', 'success');
    } catch (err) {
      prompt('Copy the workout summary below:', text);
    }
    document.body.removeChild(textArea);
  }
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

  // Validate body fat if provided using constants
  if (bodyFatInput.value && bodyFatInput.value.trim() !== '') {
    const bodyFatValidation = window.ValidationService.validateNumber(bodyFatInput.value);
    if (!bodyFatValidation.valid) {
      show(bodyFatValidation.error, 'error');
      return;
    }
    if (
      bodyFat < window.calisthenics.constants.BODY_FAT_MIN ||
      bodyFat > window.calisthenics.constants.BODY_FAT_MAX
    ) {
      show(
        `Body fat percentage must be between ${window.calisthenics.constants.BODY_FAT_MIN} and ${window.calisthenics.constants.BODY_FAT_MAX}`,
        'error'
      );
      return;
    }
  }

  const state = getState();
  const user = { ...(state.user || {}) };
  user.bodyMetrics = user.bodyMetrics || [];

  user.bodyMetrics.push({
    date: new Date().toISOString(),
    weight,
    bodyFat,
    index: user.bodyMetrics.length,
  });

  updateState({ user });

  // Clear form and re-render
  weightInput.value = '';
  bodyFatInput.value = '';

  // Re-render profile view
  import('../views/profile-view.js').then(({ renderProfileView }) => {
    renderProfileView();
  });
}

async function handleCommentSubmit(form) {
  const nameInput = form.querySelector('#comment-name');
  const textInput = form.querySelector('#comment-text');
  const name = nameInput.value.trim();
  const text = textInput.value.trim();

  if (!name || !text) {
    show(t('shared_workout.enter_name_comment'), 'error');
    return;
  }

  const workoutId = form.dataset.workoutId;
  if (!workoutId) {
    console.error('Workout ID not found on comment form');
    return;
  }

  // Load existing comments from IndexedDB
  let comments;
  try {
    comments = await loadSharedComments(workoutId);
  } catch (error) {
    console.error('Error loading comments from IndexedDB:', error);
    comments = [];
  }

  comments.push({
    name: escapeHtml(name),
    text: escapeHtml(text),
    date: new Date().toISOString(),
  });

  // Save back to IndexedDB
  try {
    await storeSharedComments(workoutId, comments);
  } catch (error) {
    console.error('Error saving comments to IndexedDB:', error);
    show(t('shared_workout.comment_save_error') || 'Failed to save comment.', 'error');
    return;
  }

  // Clear form and re-render
  nameInput.value = '';
  textInput.value = '';

  // Trigger re-render by dispatching state change
  if (window.calisthenics && window.calisthenics.renderSharedWorkoutView) {
    window.calisthenics.renderSharedWorkoutView(workoutId);
  }
}

/**
 * Get current editing module (for undo save)
 */
export function setCurrentEditingModule(module) {
  window.currentEditingModule = module;
}

/**
 * Clean up all event listeners and release references
 */
export function cleanupEventDelegation() {
  handlers.forEach(({ el, type, fn }) => {
    el.removeEventListener(type, fn);
  });
  handlers = [];
  mainElementRef = null;
}

/**
 * Initialize toggle favorite functionality
 * This is a no-op now since favorite toggling is handled by the main event delegation
 * but kept for backward compatibility
 */
export function exposeToggleFavorite() {
  // Favorite toggling is already handled by initializeEventDelegation
  // This function is kept for API compatibility
  console.log('Toggle favorite is enabled via event delegation');
}
