import { fetchExercises } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { getState, setState } from '../services/state.js';

export async function renderBuilderView() {
  const main = document.getElementById('app');
  const exercises = await fetchExercises();
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Routine Builder</h1>
      <form id="routine-builder-form">
        <div id="selected-exercises">
          <h3>Selected Exercises</h3>
          <div id="exercise-list"></div>
        </div>
        <div class="card">
          <h3>Available Exercises</h3>
          <ul>
            ${exercises.map(e => `
              <li>
                <button type="button" class="btn" data-exercise-id="${e.id}" data-exercise-name="${e.name}">
                  Add ${e.name}
                </button>
              </li>
            `).join('')}
          </ul>
        </div>
        <button class="btn" type="submit" style="margin-top: 1rem;">Save Routine</button>
      </form>
    </div>
  `;
  let selectedExercises = [];

  function updateExerciseList() {
    const exerciseList = main.querySelector('#exercise-list');
    if (selectedExercises.length === 0) {
      exerciseList.innerHTML = '<p>No exercises selected yet.</p>';
      return;
    }
    
    exerciseList.innerHTML = selectedExercises.map((ex, index) => `
      <div class="card" style="margin-bottom: 1rem;">
        <h4>${ex.name}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
          <label>Sets: <input type="number" min="1" max="10" value="${ex.sets}" data-index="${index}" data-field="sets"></label>
          <label>Reps: <input type="number" min="1" max="50" value="${ex.reps}" data-index="${index}" data-field="reps"></label>
          <label>Rest (s): <input type="number" min="15" max="300" step="15" value="${ex.restTime}" data-index="${index}" data-field="restTime"></label>
          <button type="button" class="btn" data-remove="${index}" style="background: #dc3545; color: white;">Remove</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for input changes
    exerciseList.querySelectorAll('input[data-index]').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        selectedExercises[index][field] = parseInt(e.target.value) || 1;
      });
    });

    // Add event listeners for remove buttons
    exerciseList.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.remove);
        selectedExercises.splice(index, 1);
        updateExerciseList();
      });
    });
  }

  // Add event listeners for "Add Exercise" buttons
  main.querySelectorAll('button[data-exercise-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      const exerciseId = parseInt(e.target.dataset.exerciseId);
      const exerciseName = e.target.dataset.exerciseName;
      
      // Check if exercise is already added
      if (selectedExercises.some(ex => ex.exerciseId === exerciseId)) {
        alert('Exercise already added to routine!');
        return;
      }
      
      selectedExercises.push({
        exerciseId,
        name: exerciseName,
        sets: 3,
        reps: 8,
        restTime: 60
      });
      updateExerciseList();
    });
  });

  const form = main.querySelector('#routine-builder-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (selectedExercises.length === 0) {
        alert('Please add at least one exercise.');
        return;
      }
      const name = prompt('Enter a name for your routine:');
      if (!name) return;
      
      const state = getState();
      const user = { ...state.user };
      user.customRoutines = user.customRoutines || [];
      user.customRoutines.push({ 
        name, 
        exercises: selectedExercises.map(ex => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          restTime: ex.restTime
        }))
      });
      setState({ user });
      alert('Routine saved!');
      window.location.hash = '#programs';
    });
  }

  updateExerciseList();
} 