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
   * Display rest timer in the DOM
   * @param {number} restTime - Rest time in seconds
   * @param {HTMLElement} containerElement - Where to render the timer
   * @returns {object} Timer controller with stop() and updateDisplay() methods
   */
  displayRestTimer(restTime, containerElement) {
    if (!containerElement || restTime <= 0) return null;

    // Clear any existing content
    containerElement.innerHTML = this._renderTimerHTML(restTime);

    return this.startTimer(restTime, {
      container: containerElement,
      onTick: () => {},
      onComplete: () => {}
    });
  }

  /**
   * Start a countdown timer
   * @param {number} duration - Duration in seconds
   * @param {object} options - Timer configuration
   * @param {Function} options.onTick - Callback on each tick (remaining, total)
   * @param {Function} options.onComplete - Callback when timer finishes
   * @returns {object} Controller with stop() method
   */
  startTimer(duration, options = {}) {
    const { onTick = () => {}, onComplete = () => {} } = options;
    let remaining = duration;
    const startTime = Date.now();

    // Clear any existing timer
    this.stopTimer();

    this.activeTimer = {
      duration,
      remaining,
      update: () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remaining = Math.max(0, duration - elapsed);

        // Update display elements if they exist
        const secEl = document.getElementById('timer-seconds');
        const progEl = document.getElementById('timer-progress');

        if (secEl) {
          secEl.textContent = remaining;
        }

        if (progEl && duration > 0) {
          const pct = Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100));
          progEl.style.width = pct + '%';
        }

        onTick(remaining, duration);

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
      getState: () => ({ ...this.activeTimer })
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
   * Render HTML for countdown timer with progress bar
   * @param {number} duration - Duration in seconds
   * @returns {string} HTML string
   */
  _renderTimerHTML(duration) {
    return `
      <div class="rest-timer-container">
        <h3>Rest Time</h3>
        <div class="timer-display">
          <span id="timer-seconds">${duration}</span>s
          <div class="timer-progress-bar">
            <div id="timer-progress" style="width: 0%;"></div>
          </div>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
export const workoutTimerService = new WorkoutTimerService();
