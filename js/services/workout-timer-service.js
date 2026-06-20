/**
 * WorkoutTimerService - Handles all timer-related functionality for active workouts
 * Separated from view logic to improve code organization and testability
 */

export class WorkoutTimerService {
  constructor() {
    this.timerInterval = null;
    this.activeTimer = null; // Store current timer state
  }

  /**
    * Display rest timer in the DOM (counts UP from 0, not countdown)
    * @param {number} restTime - Rest time in seconds (target duration)
    * @param {HTMLElement} containerElement - Where to render the timer
    * @param {Function} onComplete - Callback when timer completes
    * @param {number} setTime - Exercise time in seconds (for HIIT mode, optional)
    * @returns {object} Timer controller with stop() and updateDisplay() methods
    */
   displayRestTimer(restTime, containerElement, onComplete = () => {}, setTime = null) {
     if (!containerElement || restTime <= 0) {
       // If no rest time, call onComplete immediately
       if (onComplete) onComplete();
       return null;
     }

     // Clear any existing content
     containerElement.innerHTML = this._renderTimerHTML(restTime, setTime);

     // Start timer counting UP from 0
     return this.startTimerCountingUp(restTime, {
       container: containerElement,
       onTick: (elapsed, targetRestTime) => {
         // Update color based on time mode
         const colorElement = containerElement.querySelector('.timer-display');
         if (colorElement) {
           // Green while within rest time, red after rest time ends
           if (elapsed <= targetRestTime) {
             colorElement.style.color = 'var(--success)'; // Green
           } else {
             colorElement.style.color = 'var(--danger)'; // Red
           }
         }
       },
       onComplete: () => {
         // Don't show "Rest Complete!" message - just keep timer running
         // User should click "Next" to advance
       }
     });
   }

  /**
      * Start a countdown timer using expected end timestamp (resumable on view re-render)
      * @param {number} duration - Duration in seconds
      * @param {object} options - Timer configuration
      * @param {Function} options.onTick - Callback on each tick (elapsed, total)
      * @param {Function} options.onComplete - Callback when timer finishes
      * @param {number} options.startTime - Optional: start timestamp (for resume functionality)
      * @param {number} options.expectedEndTime - Optional: expected end timestamp (for resume functionality)
      * @returns {object} Controller with stop() and getState() methods
      */
     startTimer(duration, options = {}) {
       const { onTick = () => {}, onComplete = () => {}, startTime = null, expectedEndTime = null } = options;
       let remaining = duration;
       const actualStartTime = startTime || Date.now();
       const targetEndTime = expectedEndTime || (actualStartTime + duration * 1000);

       // Clear any existing timer
       this.stopTimer();

       this.activeTimer = {
         duration,
         remaining,
         expectedEndTime: targetEndTime,
         actualStartTime,
         update: () => {
           const now = Date.now();
           const elapsed = Math.floor((now - actualStartTime) / 1000);
           remaining = Math.max(0, duration - elapsed);

           // Update display elements if they exist
           const secEl = document.getElementById('timer-seconds');
           const progEl = document.getElementById('timer-progress');

           if (secEl) {
             secEl.textContent = remaining;
           }

           if (progEl && duration > 0) {
             const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
             progEl.style.width = pct + '%';
           }

           // Pass elapsed time to onTick callback
           onTick(elapsed, duration);

           if (remaining <= 0) {
             this.stopTimer();
             onComplete();
           }
         }
       };

       // Start interval (update every second)
       this.timerInterval = setInterval(this.activeTimer.update, 1000);

       // Initial update
       this.activeTimer.update();

       return {
         stop: () => this.stopTimer(),
         getState: () => { 
           return { 
             ...this.activeTimer,
             remaining 
           }
         }
       };
     }

   /**
      * Start a timer counting UP from 0 (for rest timer)
      * @param {number} targetDuration - Target duration in seconds (for color change)
      * @param {object} options - Timer configuration
      * @param {HTMLElement} options.container - Container element
      * @param {Function} options.onTick - Callback on each tick (elapsed, targetDuration)
      * @param {Function} options.onComplete - Callback when timer finishes (optional)
      * @returns {object} Controller with stop() and getState() methods
      */
     startTimerCountingUp(targetDuration, options = {}) {
       const { container, onTick = () => {}, onComplete = () => {} } = options;
       const actualStartTime = Date.now();

       // Clear any existing timer
       this.stopTimer();

       this.activeTimer = {
         targetDuration,
         actualStartTime,
         update: () => {
           const now = Date.now();
           const elapsed = Math.floor((now - actualStartTime) / 1000);

           // Update display elements if they exist
           const secEl = document.getElementById('timer-seconds');
           const progEl = document.getElementById('timer-progress');

           if (secEl) {
             secEl.textContent = elapsed;
           }

           if (progEl && targetDuration > 0) {
             const pct = Math.min(100, Math.max(0, (elapsed / targetDuration) * 100));
             progEl.style.width = pct + '%';
           }

           // Pass elapsed time to onTick callback
           onTick(elapsed, targetDuration);
         }
       };

       // Start interval (update every second)
       this.timerInterval = setInterval(this.activeTimer.update, 1000);

       // Initial update
       this.activeTimer.update();

       return {
         stop: () => this.stopTimer(),
         getState: () => { 
           const elapsed = Math.floor((Date.now() - this.activeTimer.actualStartTime) / 1000);
           return { 
             ...this.activeTimer,
             elapsed 
           }
         }
       };
     }

  /**
   * Stop the currently active timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.activeTimer = null;
  }

  /**
   * Render HIIT interval timer display
   * @param {number} intervalTime - Work interval in seconds
   * @returns {string} HTML for HIIT timer section
   */
  renderHiitSection(intervalTime) {
    return `
      <div class="hiit-section">
        <h3>HIIT/Tabata Mode</h3>
        <p><strong>Work Time:</strong> ${intervalTime}s</p>
        <div id="hiit-timer-display"></div>
        <button id="start-hiit-btn" class="btn">Start Interval</button>
      </div>
    `;
  }

  /**
   * Start HIIT interval timer
   * @param {number} intervalTime - Work interval in seconds
   * @param {object} options - Configuration
   * @param {Function} options.onWorkStart - Callback when work phase starts
   * @param {Function} options.onWorkEnd - Callback when work phase ends
   * @param {Function} options.onRestEnd - Callback when rest phase ends
   */
  startHIITTimer(intervalTime, options = {}) {
    const { onWorkStart = () => {}, onWorkEnd = () => {}, onRestEnd = () => {} } = options;

    let isWorking = true;
    const timerContainer = document.getElementById('hiit-timer-display');
    const startBtn = document.getElementById('start-hiit-btn');

    if (!timerContainer || !startBtn) return;

    // Stop any existing HIIT timer
    this.stopHIITTimer();

    const updateDisplay = () => {
      const remaining = isWorking ? intervalTime : intervalTime; // For simplicity, rest = work time
      timerContainer.innerHTML = `
        <div class="hiit-timer-active">
          <span class="hiit-phase ${isWorking ? 'work' : 'rest'}">${isWorking ? 'WORK' : 'REST'}</span>
          <span class="hiit-time">${remaining}s</span>
        </div>
      `;
    };

    const togglePhase = () => {
      isWorking = !isWorking;
      updateDisplay();

      if (isWorking) {
        onWorkStart();
      } else {
        onWorkEnd();
        // Auto-start rest phase timer (simplified for now)
        setTimeout(() => {
          onRestEnd();
        }, intervalTime * 1000);
      }
    };

    // Initial display
    updateDisplay();

    // Start button handler
    startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Running...';
      togglePhase();
    }, { once: true });

    this.activeTimer = {
      stop: () => {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Interval';
      }
    };
  }

  /**
   * Stop HIIT timer
   */
  stopHIITTimer() {
    if (this.activeTimer && this.activeTimer.stop) {
      this.activeTimer.stop();
    }
    this.activeTimer = null;
  }

  /**
   * Clean up all timers when view is destroyed
   */
  cleanup() {
    this.stopTimer();
    this.stopHIITTimer();
  }

  // Private helper methods

  /**
       * Render HTML for elapsed time timer with progress bar
       * @param {number} duration - Target duration in seconds (for progress bar)
       * @param {number} setTime - Exercise time in seconds (for HIIT mode)
       * @returns {string} HTML string
       */
      _renderTimerHTML(duration, setTime = null) {
        return `
          <div class="rest-timer-container">
            <h3>Rest Time</h3>
            <div class="timer-display" class="text-success">
              <span id="timer-seconds">0</span>s
              <div class="timer-progress-bar">
                <div id="timer-progress" class="timer-progress-bar"></div>
              </div>
            </div>
          </div>
        `;
      }
}

// Export singleton instance
export const workoutTimerService = new WorkoutTimerService();
