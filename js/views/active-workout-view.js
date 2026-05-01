import { getState, setState } from '../services/state.js';
import { renderHeader } from '../components/header.js';
import { renderTimer, startTimer } from '../components/timer.js';
let bound = false;

// Modal for swapping exercises and adjusting sets
function showModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <div class="modal-body">${content}</div>
      <button class="btn btn-secondary close-modal">Close</button>
    </div>
  `;

  modal.querySelector('.close-modal').addEventListener('click', () => {
    modal.remove();
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

export function renderActiveWorkoutView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises, equipment, muscles, categories } = getState();
  
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<div class="card"><p>No active workout.</p></div>';
    return;
  }
  
  const program = activeWorkout.program;
  const currentExerciseIndex = activeWorkout.currentExerciseIndex || 0;
  const currentSetIndex = activeWorkout.currentSetIndex || 0;
  
  // Determine if we're in warm-up or cooldown phase
  const warmupLength = (program.warmup && program.warmup.length) ? program.warmup.length : 0;
  const mainExercisesLength = program.exercises.length;
  const cooldownLength = (program.cooldown && program.cooldown.length) ? program.cooldown.length : 0;
  
  let phase = 'main'; // 'warmup', 'main', or 'cooldown'
  let actualExerciseIndex = currentExerciseIndex;
  
  if (currentExerciseIndex < warmupLength) {
    phase = 'warmup';
    actualExerciseIndex = currentExerciseIndex;
  } else if (currentExerciseIndex >= warmupLength + mainExercisesLength) {
    phase = 'cooldown';
    actualExerciseIndex = currentExerciseIndex - warmupLength - mainExercisesLength;
  }
  
  if (actualExerciseIndex >= (phase === 'warmup' ? program.warmup.length : phase === 'cooldown' ? program.cooldown.length : program.exercises.length)) {
    window.location.hash = '#workout-completion';
    return;
  }
  
  // Get the current exercise data based on phase
  let currentExerciseData;
  if (phase === 'warmup') {
    currentExerciseData = program.warmup[actualExerciseIndex];
  } else if (phase === 'cooldown') {
    currentExerciseData = program.cooldown[actualExerciseIndex];
  } else {
    currentExerciseData = program.exercises[actualExerciseIndex];
  }
  
  const exercise = exercises.find(e => String(e.id) === String(currentExerciseData.exerciseId));
  
  if (!exercise) {
    main.innerHTML = renderHeader() + '<div class="card"><p>Exercise not found.</p></div>';
    return;
  }
  
  const isLastSet = currentSetIndex >= currentExerciseData.sets - 1;
  const isLastExercise = (phase === 'warmup' && actualExerciseIndex >= warmupLength - 1) ||
                         (phase === 'main' && actualExerciseIndex >= mainExercisesLength - 1) ||
                         (phase === 'cooldown' && actualExerciseIndex >= cooldownLength - 1);
  
  // Check if it's a HIIT/Tabata workout
  const isHiitWorkout = activeWorkout.workoutType === 'hiit' || activeWorkout.type === 'hiit';
  const hiitInterval = activeWorkout.intervalTime || 30; // default 30 seconds
  
  // Determine total exercises count for progress display
  const totalExercises = warmupLength + mainExercisesLength + cooldownLength;
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>${program.name}</h1>
      <p><span style="background: ${phase === 'warmup' ? '#4CAF50' : phase === 'cooldown' ? '#FF9800' : '#2196F3'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${phase.toUpperCase()}</span> Exercise ${currentExerciseIndex + 1} of ${totalExercises}</p>
      
      ${isHiitWorkout ? renderHiitSection(currentExerciseData, hiitInterval) : ''}
      
      <div class="card card-muted" id="current-exercise">
        <h2>${exercise.name}</h2>
        ${!isHiitWorkout ? `
          <p><strong>Set ${currentSetIndex + 1} of ${currentExerciseData.sets}</strong></p>
          <p><strong>Target Reps:</strong> ${currentExerciseData.reps}</p>
        ` : ''}
      </div>
      
      ${!isHiitWorkout ? `<div id="rest-timer"></div>` : ''}
      
      <div class="flex-container" style="margin-top: 1rem;">
        ${!isHiitWorkout ? `<button id="complete-set-btn" class="btn flex-1">Next Set</button>` : ''}
        <button id="adjust-btn" class="btn btn-secondary">⚙️ Adjust</button>
        <button id="swap-btn" class="btn btn-secondary">🔄 Swap</button>
      </div>
    </div>
  `;
  
  // Complete set button (non-HIIT)
  if (!isHiitWorkout) {
    const completeBtn = main.querySelector('#complete-set-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => handleCompleteSet(
        activeWorkout, 
        currentExerciseIndex, 
        currentSetIndex, 
        currentExerciseData, 
        program,
        isLastExercise
      ));
    }
  }
  
  // Adjust button - open modal to add/remove sets
  const adjustBtn = main.querySelector('#adjust-btn');
  if (adjustBtn) {
    adjustBtn.addEventListener('click', () => showAdjustSetsModal(
      currentExerciseIndex,
      currentExerciseData,
      activeWorkout,
      program
    ));
  }
  
  // Swap button - open modal to swap exercise
  const swapBtn = main.querySelector('#swap-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => showSwapExerciseModal(
      currentExerciseIndex,
      currentExerciseData.exerciseId,
      activeWorkout,
      program,
      exercises
    ));
  }
  
  function handleCompleteSet(activeWorkout, currentExerciseIndex, currentSetIndex, currentExerciseData, program, isLastExercise) {
    const newSetIndex = currentSetIndex + 1;
    
    if (newSetIndex >= currentExerciseData.sets) {
      const newExerciseIndex = currentExerciseIndex + 1;
      
      // Check what phase we're transitioning to
      const warmupLength = (program.warmup && program.warmup.length) ? program.warmup.length : 0;
      const mainExercisesLength = program.exercises.length;
      const cooldownLength = (program.cooldown && program.cooldown.length) ? program.cooldown.length : 0;
      const totalExercises = warmupLength + mainExercisesLength + cooldownLength;
      
      setState({
        activeWorkout: {
          ...activeWorkout,
          currentExerciseIndex: newExerciseIndex,
          currentSetIndex: 0
        }
      }, { silent: true });
      
      // If we've completed all exercises (including warmup and cooldown)
      if (newExerciseIndex >= totalExercises) {
        window.location.hash = '#workout-completion';
      } else if (newExerciseIndex < totalExercises) {
        showRestTimer(currentExerciseData.restTime, () => {
          document.dispatchEvent(new CustomEvent('stateChange'));
        });
      }
    } else {
      setState({
        activeWorkout: {
          ...activeWorkout,
          currentSetIndex: newSetIndex
        }
      }, { silent: true });
      
      showRestTimer(currentExerciseData.restTime, () => {
        document.dispatchEvent(new CustomEvent('stateChange'));
      });
    }
  }
  
  function showRestTimer(restTime, onComplete) {
    const restEl = main.querySelector('#rest-timer');
    const currExEl = main.querySelector('#current-exercise');
    
    if (!restEl) return;
    
    currExEl.style.display = 'none';
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
      onComplete: () => {
        currExEl.style.display = 'block';
        restEl.innerHTML = '';
        onComplete();
      }
    });
  }
  
  function showAdjustSetsModal(exerciseIndex, exerciseData, activeWorkout, program) {
    showModal('Adjust Sets', `
      <label><strong>Current Sets: ${exerciseData.sets}</strong></label>
      <div class="flex-container" style="margin: 1rem 0;">
        <button id="decrease-sets-btn" class="btn btn-secondary">-</button>
        <span id="current-sets-display">${exerciseData.sets}</span>
        <button id="increase-sets-btn" class="btn flex-1">+</button>
      </div>
      <p id="new-reps-target">(No change to reps)</p>
    `);
    
    let currentSets = exerciseData.sets;
    const display = document.getElementById('current-sets-display');
    
    // Decrease sets
    const decreaseBtn = document.getElementById('decrease-sets-btn');
    if (decreaseBtn && currentSets > 1) {
      decreaseBtn.addEventListener('click', () => {
        currentSets--;
        display.textContent = currentSets;
      });
    } else if (decreaseBtn) {
      decreaseBtn.disabled = true;
    }
    
    // Increase sets
    const increaseBtn = document.getElementById('increase-sets-btn');
    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        currentSets++;
        display.textContent = currentSets;
        
        // Calculate new reps based on the new set count
        const originalSets = exerciseData.sets;
        const originalRepsPerSet = parseFloat(currentExerciseData.reps) || 10;
        
        if (exerciseData.reps.includes('x')) {
          // Format: "12x3" means 12 reps x 3 sets -> new format with more sets
          const [reps, sets] = exerciseData.reps.split('x').map(Number);
          display.textContent = `${sets} x ${reps} reps`;
        } else {
          display.textContent = currentSets;
        }
      });
    }
    
    // Update program state with new set count
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        setState({
          activeWorkout: {
            ...activeWorkout,
            program: {
              ...program,
              exercises: program.exercises.map((ex, idx) => 
                idx === exerciseIndex ? { ...ex, sets: currentSets } : ex
              )
            }
          },
          stateChange: true
        });
      });
    }
  }
  
  function showSwapExerciseModal(currentExerciseIndex, originalExerciseId, activeWorkout, program, exercises) {
    const exerciseList = exercises
      .map((e, idx) => `<option value="${idx}">${e.name}</option>`)
      .join('');
    
    showModal('Swap Exercise', `
      <select id="exercise-select" class="form-control">
        ${exerciseList}
      </select>
    `);
    
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        const select = document.getElementById('exercise-select');
        if (select && select.selectedIndex > 0) {
          const newExerciseIndex = parseInt(select.value);
          const newExercise = exercises[newExerciseIndex];
          
          setState({
            activeWorkout: {
              ...activeWorkout,
              program: {
                ...program,
                exercises: program.exercises.map((ex, idx) => 
                  idx === currentExerciseIndex ? { ...ex, exerciseId: newExercise.id } : ex
                )
              }
            },
            stateChange: true
          });
        }
      });
    }
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

function renderHiitSection(exerciseData, intervalTime) {
  return `
    <div class="hiit-section">
      <h3>HIIT/Tabata Mode</h3>
      <p><strong>Work Time:</strong> ${intervalTime}s</p>
      <div id="hiit-timer-display"></div>
      <button id="start-hiit-btn" class="btn">Start Interval</button>
    </div>
  `;
}
