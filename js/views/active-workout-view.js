import { getState, setState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { renderTimer, startTimer } from '../components/timer.js';

let bound = false;

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises } = getState();
  
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<div class="card"><p>No active workout.</p></div>';
    return;
  }

  const program = activeWorkout.program;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;
  
  if (currentExerciseIndex >= program.exercises.length) {
    // Workout completed, go to completion view
    window.location.hash = '#workout-completion';
    return;
  }

  const currentExerciseData = program.exercises[currentExerciseIndex];
  const exercise = exercises.find(e => String(e.id) === String(currentExerciseData.exerciseId));
  
  if (!exercise) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise not found.</p></div>';
    return;
  }

  const isLastSet = currentSetIndex >= currentExerciseData.sets - 1;
  const isLastExercise = currentExerciseIndex >= program.exercises.length - 1;

  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Active Workout: ${program.name}</h1>
      <div class="margin-bottom-1">
        <small>Exercise ${currentExerciseIndex + 1} of ${program.exercises.length}</small>
      </div>
      
      <h2>${exercise.name}</h2>
      <p>${exercise.description}</p>
      
      <div class="card card-muted">
        <h3>Current Set</h3>
        <p><strong>Set ${currentSetIndex + 1} of ${currentExerciseData.sets}</strong></p>
        <p><strong>Target Reps:</strong> ${currentExerciseData.reps}</p>
        ${!isLastSet ? `<p><strong>Rest after this set:</strong> ${currentExerciseData.restTime}s</p>` : ''}
      </div>

      <div class="flex-container">
        <button id="complete-set-btn" class="btn flex-1">Complete Set</button>
        ${!isLastSet || !isLastExercise ? `<button id="skip-exercise-btn" class="btn btn-secondary">Skip Exercise</button>` : ''}
      </div>
      
      <div id="rest-timer"></div>
    </div>
  `;

  // Complete set button
  const completeBtn = main.querySelector('#complete-set-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      const newSetIndex = currentSetIndex + 1;
      
      if (newSetIndex >= currentExerciseData.sets) {
        // Move to next exercise
        const newExerciseIndex = currentExerciseIndex + 1;
        setState({
          activeWorkout: {
            ...activeWorkout,
            currentExerciseIndex: newExerciseIndex,
            currentSetIndex: 0
          }
        }, { silent: true });
        
        if (newExerciseIndex >= program.exercises.length) {
          // Workout completed
          window.location.hash = '#workout-completion';
        } else {
          // Show rest timer and then move to next exercise
          showRestTimer(currentExerciseData.restTime, () => {
            document.dispatchEvent(new CustomEvent('stateChange'));
          });
        }
      } else {
        // Move to next set
        setState({
          activeWorkout: {
            ...activeWorkout,
            currentSetIndex: newSetIndex
          }
        }, { silent: true });
        
        // Show rest timer and then update view
        showRestTimer(currentExerciseData.restTime, () => {
          document.dispatchEvent(new CustomEvent('stateChange'));
        });
      }
    });
  }

  // Skip exercise button
  const skipBtn = main.querySelector('#skip-exercise-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      const newExerciseIndex = currentExerciseIndex + 1;
      setState({
        activeWorkout: {
          ...activeWorkout,
          currentExerciseIndex: newExerciseIndex,
          currentSetIndex: 0
        }
      });
      
      if (newExerciseIndex >= program.exercises.length) {
        window.location.hash = '#workout-completion';
      }
    });
  }

  function showRestTimer(restTime, onComplete) {
    const restEl = main.querySelector('#rest-timer');
    if (!restEl) return;
    
    restEl.innerHTML = renderTimer(restTime);
    
    startTimer(restTime, {
      onTick: (remaining, total) => {
        const secEl = document.getElementById('timer-seconds');
        const progEl = document.getElementById('timer-progress');
        if (secEl) secEl.textContent = Math.max(0, remaining);
        if (progEl) {
          const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
          progEl.style.width = pct + '%';
        }
      },
      onComplete: onComplete
    });
  }

  if (!bound) {
    document.addEventListener('stateChange', () => {
      if (window.location.hash === '#active-workout') {
        renderActiveWorkoutView();
      }
    });
    bound = true;
  }
} 