import { getState, setState } from '../services/state.js';
import { renderHeader } from '../components/header.js';

export function renderWorkoutCompletionView() {
  const main = document.getElementById('app');
  const { activeWorkout, exercises } = getState();
  
  if (!activeWorkout || !activeWorkout.program) {
    main.innerHTML = renderHeader() + '<div class="card"><p>No active workout to complete.</p></div>';
    return;
  }

  const program = activeWorkout.program;
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Workout Complete!</h1>
      <h2>${program.name}</h2>
      <p>Great job! Now let's log the reps you actually completed for each set.</p>
      
      <form id="workout-completion-form">
        ${program.exercises.map((exerciseData, exerciseIndex) => {
          const exercise = exercises.find(e => String(e.id) === String(exerciseData.exerciseId));
          return `
            <div class="card" style="margin-bottom: 1rem;">
              <h3>${exercise ? exercise.name : 'Unknown Exercise'}</h3>
              <p><strong>Target:</strong> ${exerciseData.sets} sets × ${exerciseData.reps} reps</p>
              
              ${Array.from({ length: exerciseData.sets }, (_, setIndex) => `
                <div style="margin-bottom: 0.5rem;">
                  <label>
                    Set ${setIndex + 1} - Reps completed:
                    <input type="number" 
                           name="exercise-${exerciseIndex}-set-${setIndex}" 
                           min="0" 
                           max="100" 
                           value="${exerciseData.reps}"
                           style="margin-left: 0.5rem; width: 80px;">
                  </label>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
        
        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
          <button type="submit" class="btn" style="flex: 1;">Save Workout Log</button>
          <button type="button" id="skip-logging-btn" class="btn" style="background: #6c757d;">Skip Logging</button>
        </div>
      </form>
    </div>
  `;

  const form = main.querySelector('#workout-completion-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      
      // Collect all the rep data
      const workoutLog = {
        program: program,
        date: new Date().toISOString(),
        exercises: program.exercises.map((exerciseData, exerciseIndex) => {
          const exercise = exercises.find(e => String(e.id) === String(exerciseData.exerciseId));
          const sets = Array.from({ length: exerciseData.sets }, (_, setIndex) => {
            const input = form.querySelector(`input[name="exercise-${exerciseIndex}-set-${setIndex}"]`);
            return parseInt(input.value) || 0;
          });
          
          return {
            exerciseId: exerciseData.exerciseId,
            exerciseName: exercise ? exercise.name : 'Unknown Exercise',
            targetSets: exerciseData.sets,
            targetReps: exerciseData.reps,
            actualReps: sets
          };
        })
      };
      
      // Save to history
      const state = getState();
      const history = state.history || [];
      setState({
        history: [...history, workoutLog],
        activeWorkout: null
      });
      
      alert('Workout logged successfully!');
      window.location.hash = '#summary';
    });
  }

  const skipBtn = main.querySelector('#skip-logging-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      // Just clear the active workout without logging
      setState({ activeWorkout: null });
      window.location.hash = '#home';
    });
  }
}
