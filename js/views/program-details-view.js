// views/program-details-view.js
import { fetchPrograms } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { setState, getState } from '../services/state.js';

export async function renderProgramDetailsView(type, id) {
  const main = document.getElementById('app');
  const programs = await getState().programs;
  const muscles = await getState().muscles;
  const user = getState().user || {};
  const customRoutines = user.customRoutines || [];
  const exercises = getState().exercises;
  
  let program;
  if (type === 'program') {
    program = programs.find(p => String(p.id) === String(id));
  } else if (type === 'custom') {
    const routine = customRoutines[Number(id)];
    program = { id: 'custom-' + id, name: routine.name, exercises: routine.exercises };
  }
  
  if (!program) {
    window.location.hash = '#programs';
    return;
  }
  
  
  
  function generateFrontImages(myExercises, myMuscles) {
  return myExercises.map(exercise => { 
    // Fetch the full exercise object based on the exercise ID
    const fullExercise = exercises.find(ex => ex.id === exercise.exerciseId);
    //if (!fullExercise) {
    //  return ''; // Or handle the error in a more appropriate way
    //}
    return fullExercise.muscles.map(muscleId => {
      if (muscles[muscleId - 1] && muscles[muscleId - 1].is_front) {
        return `<img src="assets/images/muscles/main/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`;
      }
      return ''; // Handle cases where muscle data is missing
    }).join('');
  }).join('');
  }

  function generateFrontImagesSecondary(myExercises, myMuscles) {
  return myExercises.map(exercise => { 
    // Fetch the full exercise object based on the exercise ID
    const fullExercise = exercises.find(ex => ex.id === exercise.exerciseId);
    //if (!fullExercise) {
    //  return ''; // Or handle the error in a more appropriate way
    //}
    return fullExercise.muscles_secondary.map(muscleId => {
      if (muscles[muscleId - 1] && muscles[muscleId - 1].is_front) {
        return `<img src="assets/images/muscles/secondary/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`;
      }
      return ''; // Handle cases where muscle data is missing
    }).join('');
  }).join('');
  }

  function generateBackImages(myExercises, myMuscles) {
  return myExercises.map(exercise => { 
    // Fetch the full exercise object based on the exercise ID
    const fullExercise = exercises.find(ex => ex.id === exercise.exerciseId);
    //if (!fullExercise) {
    //  return ''; // Or handle the error in a more appropriate way
    //}
    return fullExercise.muscles.map(muscleId => {
      if (muscles[muscleId - 1] && muscles[muscleId - 1].is_front) {
        return `<img src="assets/images/muscles/main/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`;
      }
      return ''; // Handle cases where muscle data is missing
    }).join('');
  }).join('');
  }

  function generateBackImagesSecondary(myExercises, myMuscles) {
  return myExercises.map(exercise => { 
    // Fetch the full exercise object based on the exercise ID
    const fullExercise = exercises.find(ex => ex.id === exercise.exerciseId);
    //if (!fullExercise) {
    //  return ''; // Or handle the error in a more appropriate way
    //}
    return fullExercise.muscles_secondary.map(muscleId => {
      if (muscles[muscleId - 1] && muscles[muscleId - 1].is_front) {
        return `<img src="assets/images/muscles/secondary/muscle-${muscleId}.svg" alt="Muscle ${muscleId}" class="muscle-layer" />`;
      }
      return ''; // Handle cases where muscle data is missing
    }).join('');
  }).join('');
  }

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '#programs'">
          ← Back to Programs
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn" id="edit-program-btn" data-type="${type}" data-id="${id}">
            Edit Program
          </button>
          ${type === 'custom' ? `
            <button class="btn btn-danger" id="delete-routine-btn" data-id="${id}">
              Delete Routine
            </button>
          ` : ''}
        </div>
      </div>
      <h1>${program.name}</h1>
      <div class="program-details-content">
        ${program.warmup && program.warmup.length > 0 ? `
          <h3>Warmup:</h3>
          <ul class="exercise-list">
            ${program.warmup.map(ex => {
              const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
              return `
                <li class="exercise-item">
                  <div class="exercise-info">
                    <strong>${exercise ? exercise.name : 'Unknown Exercise'}</strong>
                    <div class="exercise-details">
                      Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s
                    </div>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        ` : ''}
        <h3>Exercises:</h3>
        <ul class="exercise-list">
          ${program.exercises.map(ex => {
            const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
            return `
              <li class="exercise-item">
                <div class="exercise-info">
                  <strong>${exercise ? exercise.name : 'Unknown Exercise'}</strong>
                  <div class="exercise-details">
                    Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s
                  </div>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
        ${program.cooldown && program.cooldown.length > 0 ? `
          <h3>Cooldown:</h3>
          <ul class="exercise-list">
            ${program.cooldown.map(ex => {
              const exercise = exercises.find(e => String(e.id) === String(ex.exerciseId));
              return `
                <li class="exercise-item">
                  <div class="exercise-info">
                    <strong>${exercise ? exercise.name : 'Unknown Exercise'}</strong>
                    <div class="exercise-details">
                      Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.restTime}s
                    </div>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        ` : ''}
        <div class="muscle-container">
          <div class="muscle-diagram-front">
            <img src="./assets/images/muscles/muscular_system_front.svg" alt="Muscular System Front" class="base-image">
            ${generateFrontImagesSecondary(program.exercises, muscles)}
            ${generateFrontImages(program.exercises, muscles)}
            
          </div>
          <div class="muscle-diagram-back">
            <img src="./assets/images/muscles/muscular_system_back.svg" alt="Muscular System Back" class="base-image">
            ${generateBackImagesSecondary(program.exercises, muscles)}
            ${generateBackImages(program.exercises, muscles)}
            
          </div>
        <div style="margin-top: 2rem;">
          <button class="btn" id="start-program-btn" data-type="${type}" data-id="${id}">
            Start Program
          </button>
        </div>
      </div>
    </div>
  `;

  // Edit button handler
  const editBtn = main.querySelector('#edit-program-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Store the program data for editing
      setState({
        editingProgram: {
          type,
          id,
          program: {
            name: program.name,
            exercises: program.exercises
          }
        } 
      });
      window.location.hash = '#builder';
    });
  }

  // Delete routine button handler (only for custom routines)
  if (type === 'custom') {
    const deleteBtn = main.querySelector('#delete-routine-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${program.name}"? This action cannot be undone.`)) {
          const state = getState();
          const user = { ...state.user };
          user.customRoutines = user.customRoutines || [];
          
          // Remove the routine at the specified index
          user.customRoutines.splice(Number(id), 1);
          
          // Update state
          setState({ user });
          
          // Navigate back to programs view
          alert('Routine deleted successfully!');
          window.location.hash = '#programs';
        }
      });
    };
  }

  // Start button handler
  const startBtn = main.querySelector('#start-program-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (type === 'program') {
        const originalProgram = programs.find(p => String(p.id) === String(id));
        if (originalProgram) {
          setState({
            activeWorkout: {
              program: originalProgram,
              progress: {},
              currentExerciseIndex: 0,
              currentSetIndex: 0
            }
          });
          window.location.hash = '#active-workout';
        }
      } else if (type === 'custom') {
        const routine = customRoutines[Number(id)];
        if (routine) {
          setState({
            activeWorkout: {
              program: {
                id: 'custom-' + id,
                name: routine.name,
                exercises: routine.exercises
              },
              progress: {},
              currentExerciseIndex: 0,
              currentSetIndex: 0
            }
          });
          window.location.hash = '#active-workout';
        }
      }
    });
  }
}
