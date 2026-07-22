import { t } from '../i18n.js';
import { show as showToastShared } from './toast-service.js';
import { exerciseSuggestionService } from './exercise-suggestion-service.js';
import { escapeHtml } from '../utils/html-helpers.js';

/**
 * WorkoutModalsService - Handles all modal rendering and interactions for active workouts
 * Separated from view logic to improve code organization and maintainability
 */

export class WorkoutModalsService {
  /**
   * Show a generic modal with title and content
   * @param {string} title - Modal title
   * @param {string} content - HTML content for modal body (will be escaped)
   * @returns {object} Controller to close the modal manually if needed
   */
  show(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const escapedTitle = escapeHtml(title);
    // Escape content to prevent XSS - treat as plain text, not HTML
    const escapedContent = escapeHtml(content);
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${escapedTitle}</h2>
        <div class="modal-body">${escapedContent}</div>
        <button class="btn btn-secondary close-modal">${t('common.close')}</button>
      </div>
    `;

    const closeModal = () => {
      modal.remove();
    };

    // Close button handler
    modal.querySelector('.close-modal').addEventListener('click', closeModal);

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.body.appendChild(modal);

    return {
      close: closeModal,
      element: modal
    };
  }

  /**
   * Show modal to adjust number of sets for current exercise
   * @param {number} exerciseIndex - Index of exercise in routine
   * @param {object} exerciseData - Current exercise data (has sets property)
   * @param {object} activeWorkout - Current workout state
   * @param {object} routine - Routine object with exercises array
   */
  showAdjustSetsModal(exerciseIndex, exerciseData, activeWorkout, routine) {
    const currentSets = exerciseData.sets;

    const content = `
      <label><strong>Current Sets: ${currentSets}</strong></label>
      <div class="flex-container" class="margin-y-1">
        <button id="decrease-sets-btn" class="btn btn-secondary">-</button>
        <span id="current-sets-display">${currentSets}</span>
        <button id="increase-sets-btn" class="btn flex-1">+</button>
      </div>
      <p id="new-reps-target">(No change to reps)</p>
    `;

    const modalController = this.show(t('active_workout.adjust'), content);

    let setsCount = currentSets;
    const displayEl = document.getElementById('current-sets-display');
    const decreaseBtn = document.getElementById('decrease-sets-btn');
    const increaseBtn = document.getElementById('increase-sets-btn');
    const closeBtn = modalController.element.querySelector('.close-modal');

    // Disable decrease button if at minimum (1 set)
    if (decreaseBtn && setsCount <= 1) {
      decreaseBtn.disabled = true;
    }

    // Decrease sets handler
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        if (setsCount > 1) {
          setsCount--;
          displayEl.textContent = setsCount;
        }
      });
    }

    // Increase sets handler
    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        setsCount++;
        displayEl.textContent = setsCount;
        
        // Note: reps are not changed, only set count
        // The actual workout execution will use the new set count
      });
    }

    // Apply changes when closing modal
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        // Update the routine with new set count for this exercise
        const updatedRoutine = {
          ...routine,
          exercises: routine.exercises.map((ex, idx) => 
            idx === exerciseIndex ? { ...ex, sets: setsCount } : ex
          )
        };

        // Dispatch event to update state (caller should handle setState)
        document.dispatchEvent(new CustomEvent('workoutSetsAdjusted', {
          detail: {
            exerciseIndex,
            newSetCount: setsCount,
            routine: updatedRoutine
          }
        }));
      });
    }

    return modalController;
  }

  /**
   /**
      * Show modal to swap current exercise with another
      * @param {number} exerciseIndex - Index of current exercise in routine
      * @param {number} originalExerciseId - ID of the exercise being replaced
      * @param {object} activeWorkout - Current workout state
      * @param {object} routine - Routine object
      * @param {Array} exercises - Array of all available exercises
      */
     showSwapExerciseModal(exerciseIndex, originalExerciseId, activeWorkout, routine, exercises, currentDifficulty) {
       // Get suggested substitutions first
       const suggestions = exerciseSuggestionService.getSuggestedSubstitutions(
         originalExerciseId, 
         exercises, 
         currentDifficulty || 'intermediate'
       );

       // Build exercise list with suggestions highlighted
       const exerciseList = exercises
         .filter((e, idx) => e.id !== originalExerciseId)
         .map((e) => {
           const isSuggested = suggestions.some(s => s.id === e.id);
           const suggestion = suggestions.find(s => s.id === e.id);
           const suggestionBadge = isSuggested 
             ? `<span style="color: var(--success, #28a745); font-size: 0.85em; margin-left: 0.5rem;">⭐ ${suggestion.suggestionReason}</span>`
             : '';
           return `<option value="${e.id}" data-suggested="${isSuggested}">${e.name} ${suggestionBadge}</option>`;
         }).join('');

       const suggestionsHtml = suggestions.length > 0 ? `
         <div style="background: var(--gray-50, #f8f9fa); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
           <strong style="color: var(--success, #28a745);">⭐ Suggestions based on same muscle groups:</strong>
           <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9em;">
             ${suggestions.slice(0, 3).map(s => `
               <li>${s.name} - ${s.suggestionReason}</li>
             `).join('')}
           </ul>
         </div>
       ` : '';

       const content = `
         ${suggestionsHtml}
         <label for="exercise-select">Select a replacement exercise:</label>
         <select id="exercise-select" class="form-control">
           <option value="">-- Select Exercise --</option>
           ${exerciseList}
         </select>
         <p style="font-size: 0.85em; color: var(--gray-600); margin-top: 0.5rem;">
           ⭐ Marked exercises target the same muscle groups as your current exercise
         </p>
       `;

       const modalController = this.show(t('active_workout.swap_exercise'), content);
       const closeBtn = modalController.element.querySelector('.close-modal');
       const selectEl = document.getElementById('exercise-select');

       if (closeBtn) {
         closeBtn.addEventListener('click', () => {
           const selectedIndex = selectEl.selectedIndex;

           if (selectedIndex > 0) { // Must select an actual exercise
             const newExerciseId = parseInt(selectEl.value);
             const newExercise = exercises.find(e => e.id === newExerciseId);

             // Create updated routine with swapped exercise
             const updatedRoutine = {
               ...routine,
               exercises: routine.exercises.map((ex, idx) => 
                 idx === exerciseIndex ? { ...ex, exerciseId: newExercise.id } : ex
               )
             };

             // Dispatch event for state update
             document.dispatchEvent(new CustomEvent('workoutExerciseSwapped', {
               detail: {
                 exerciseIndex,
                 newExerciseId: newExercise.id,
                 routine: updatedRoutine
               }
             }));
           }
         });
       }

       return modalController;
     }

  /**
   * Show success toast/message — delegates to the shared toast service
   * @param {string} message - Message to display
   * @param {string} type - 'success', 'info', 'warning', or 'error'
   */
  showToast(message, type = 'info') {
    showToastShared(message, type);
  }
}

// Export singleton instance
export const workoutModalsService = new WorkoutModalsService();
