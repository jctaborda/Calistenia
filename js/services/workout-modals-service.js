/**
 * WorkoutModalsService - Handles all modal rendering and interactions for active workouts
 * Separated from view logic to improve code organization and maintainability
 */

export class WorkoutModalsService {
  /**
   * Show a generic modal with title and content
   * @param {string} title - Modal title
   * @param {string} content - HTML content for modal body
   * @returns {object} Controller to close the modal manually if needed
   */
  show(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${title}</h2>
        <div class="modal-body">${content}</div>
        <button class="btn btn-secondary close-modal">Close</button>
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
      <div class="flex-container" style="margin: 1rem 0;">
        <button id="decrease-sets-btn" class="btn btn-secondary">-</button>
        <span id="current-sets-display">${currentSets}</span>
        <button id="increase-sets-btn" class="btn flex-1">+</button>
      </div>
      <p id="new-reps-target">(No change to reps)</p>
    `;

    const modalController = this.show('Adjust Sets', content);

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
     showSwapExerciseModal(exerciseIndex, originalExerciseId, activeWorkout, routine, exercises) {
       // Build exercise list (skip current exercise to avoid swapping with itself)
       const exerciseList = exercises
         .filter((_, idx) => idx !== exerciseIndex) // Don't include current exercise
         .map((e, idx) => `<option value="${idx}">${e.name}</option>`).join('');

       const content = `
         <label for="exercise-select">Select a replacement exercise:</label>
         <select id="exercise-select" class="form-control" style="margin-top: 0.5rem;">
           <option value="">-- Select Exercise --</option>
           ${exerciseList}
         </select>
       `;

       const modalController = this.show('Swap Exercise', content);
       const closeBtn = modalController.element.querySelector('.close-modal');
       const selectEl = document.getElementById('exercise-select');

       if (closeBtn) {
         closeBtn.addEventListener('click', () => {
           const selectedIndex = selectEl.selectedIndex;

           if (selectedIndex > 0) { // Must select an actual exercise
             const newExercise = exercises[parseInt(selectEl.value)];

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
   * Show success toast/message
   * @param {string} message - Message to display
   * @param {string} type - 'success', 'info', 'warning', or 'error'
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 1rem 2rem;
      border-radius: 8px;
      color: white;
      z-index: 1000;
      animation: slideDown 0.3s ease;
    `;

    // Add background colors based on type
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Export singleton instance
export const workoutModalsService = new WorkoutModalsService();
