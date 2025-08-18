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
        <div class="card">
          <h3>Routine Name</h3>
          <input 
            type="text" 
            id="routine-name" 
            class="filter-input" 
            placeholder="Enter routine name..." 
            required
          >
        </div>
        <div id="selected-exercises">
          <h3>Selected Exercises</h3>
          <div id="exercise-list"></div>
        </div>
        <div class="card">
          <h3>Available Exercises</h3>
          <input 
            type="text" 
            id="available-exercise-filter" 
            class="filter-input" 
            placeholder="Search available exercises..." 
            autocomplete="off"
          >
          <ul id="available-exercises-list" class="checkbox-list">
            ${exercises.map(e => `
              <li data-exercise-name="${e.name.toLowerCase()}">
                <label>
                  <input type="checkbox" data-exercise-id="${e.id}" data-exercise-name="${e.name}">
                  <span>${e.name}</span>
                </label>
              </li>
            `).join('')}
          </ul>
        </div>
        <button class="btn margin-top-1" type="submit">Save Routine</button>
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
      <div class="card margin-bottom-1">
        <h4>${ex.name}</h4>
        <div class="exercise-form-grid">
          <label>Sets: <input type="number" min="1" max="10" value="${ex.sets}" data-index="${index}" data-field="sets"></label>
          <label>Reps: <input type="number" min="1" max="50" value="${ex.reps}" data-index="${index}" data-field="reps"></label>
          <label>Rest (s): <input type="number" min="15" max="300" step="15" value="${ex.restTime}" data-index="${index}" data-field="restTime"></label>
          <button type="button" class="btn btn-danger" data-remove="${index}">Remove</button>
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
        const exerciseId = selectedExercises[index].exerciseId;
        
        // Uncheck the corresponding checkbox
        const checkbox = main.querySelector(`input[type="checkbox"][data-exercise-id="${exerciseId}"]`);
        if (checkbox) {
          checkbox.checked = false;
        }
        
        selectedExercises.splice(index, 1);
        updateExerciseList();
      });
    });
  }

  // Add filter functionality for available exercises
  const filterInput = main.querySelector('#available-exercise-filter');
  const exercisesList = main.querySelector('#available-exercises-list');
  const exerciseItems = exercisesList.querySelectorAll('li[data-exercise-name]');

  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      const filterText = e.target.value.toLowerCase().trim();
      
      exerciseItems.forEach(item => {
        const exerciseName = item.getAttribute('data-exercise-name');
        if (exerciseName.includes(filterText)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Add event listeners for exercise checkboxes
  main.querySelectorAll('input[type="checkbox"][data-exercise-id]').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const exerciseId = parseInt(e.target.dataset.exerciseId);
      const exerciseName = e.target.dataset.exerciseName;
      
      if (e.target.checked) {
        // Add exercise to selected list
        if (!selectedExercises.some(ex => ex.exerciseId === exerciseId)) {
          selectedExercises.push({
            exerciseId,
            name: exerciseName,
            sets: 3,
            reps: 8,
            restTime: 60
          });
          updateExerciseList();
        }
      } else {
        // Remove exercise from selected list
        const index = selectedExercises.findIndex(ex => ex.exerciseId === exerciseId);
        if (index !== -1) {
          selectedExercises.splice(index, 1);
          updateExerciseList();
        }
      }
    });
  });

  const form = main.querySelector('#routine-builder-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      
      const nameInput = main.querySelector('#routine-name');
      const name = nameInput.value.trim();
      
      if (!name) {
        alert('Please enter a name for your routine.');
        nameInput.focus();
        return;
      }
      
      if (selectedExercises.length === 0) {
        alert('Please select at least one exercise.');
        return;
      }
      
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