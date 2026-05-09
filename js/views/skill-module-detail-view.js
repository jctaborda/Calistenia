// views/skill-module-detail-view.js - Updated with proper exercise loading
import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
import { getModuleById } from '../services/modules-service.js';
import { fetchSkillModules } from '../services/api.js';

export async function renderSkillModuleDetailView(moduleId) {
  const main = document.getElementById('app');

  // Load module from IndexedDB or file
  let module;
  try {
    module = await getModuleById(moduleId);
    
    if (!module) {
      console.warn('Module not found for ID:', moduleId);
      window.location.hash = '#skill-modules';
      return;
    }
  } catch (error) {
    main.innerHTML = renderHeader() + `
      <div class="card">
        <h1>Skill Module</h1>
        <p class="error-message">Unable to load skill module. Please try again later.</p>
      </div>
    `;
    return;
  }

  // Load exercises from state (should be loaded by router)
  let allExercises = [];
  try {
    const state = getState();
    allExercises = state.exercises || [];
    
    // Create a map for quick lookup
    window.exerciseMap = {};
    allExercises.forEach(ex => {
      window.exerciseMap[ex.id] = ex;
    });
  } catch (error) {
    console.error('Error loading exercises:', error);
  }

  const history = getState().history || [];

  // Calculate progress for this module
  function isExerciseCompleted(exerciseId) {
    for (const workout of history) {
      if (workout.exercises) {
        for (const ex of workout.exercises) {
          if (ex.exerciseId === exerciseId && ex.actualReps && ex.actualReps.some(r => r > 0)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function getExerciseData(id) {
    return window.exerciseMap ? window.exerciseMap[parseInt(id)] : null;
  }

  const completedCount = module.exercises.filter(id => isExerciseCompleted(id)).length;
  const progress = Math.round((completedCount / module.exercises.length) * 100);

  // Generate the HTML
  const htmlContent = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <button class="btn btn-secondary" onclick="window.location.hash = '#skill-modules'">← Back to Modules</button>
        <span style="font-size: 1.5rem; font-weight: bold;">${progress}%</span>
      </div>

      <h1>${module.name}</h1>
      <p>${module.description || 'No description available'}</p>
      <p><strong>Category:</strong> ${module.category || 'N/A'}</p>
      <p><strong>Difficulty:</strong> ${module.difficulty || 'mixed'}</p>
      <p><strong>Total Exercises:</strong> ${module.exercises.length}</p>

      <div style="margin: 2rem 0;">
        <h3>Progression Path</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          Complete these exercises in order to master ${module.name}
        </p>

        <div class="list-container">
          ${module.exercises.map((exerciseId, index) => {
            const isCompleted = isExerciseCompleted(exerciseId);
            const exerciseData = getExerciseData(exerciseId);
            const exerciseName = exerciseData ? exerciseData.name : `Exercise ${exerciseId}`;
            const description = exerciseData ? exerciseData.description : '';
            
            // Get difficulty class based on exercise difficulty ID (1=beginner, 2=intermediate, 3=advanced)
            let difficultyClass = '';
            if (exerciseData && exerciseData.difficulty) {
              const difficulties = Array.isArray(exerciseData.difficulty) ? exerciseData.difficulty : [exerciseData.difficulty];
              // Check for IDs: 3=advanced, 2=intermediate, 1=beginner
              if (difficulties.includes(3)) {
                difficultyClass = 'difficulty-advanced';
              } else if (difficulties.includes(2)) {
                difficultyClass = 'difficulty-intermediate';
              } else if (difficulties.includes(1)) {
                difficultyClass = 'difficulty-beginner';
              }
            }
            
            const borderStyle = isCompleted 
              ? `4px solid #4CAF50` 
              : (difficultyClass ? '' : '4px solid var(--gray-400)');

            return `
              <div class="workout-card ${difficultyClass}" style="cursor: pointer; border-left: ${borderStyle};" onclick="window.location.hash = '#exercise/${exerciseId}'">
                <div class="flex-container">
                  <div class="flex-1">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <strong style="font-size: 1.25rem;">${index + 1}. ${exerciseName}</strong>
                      ${isCompleted ? '<span style="color: #4CAF50; font-weight: bold;">✓ Completed</span>' : ''}
                    </div>
                    <p style="margin-bottom: 0.5rem;">${description}</p>

                    ${exerciseData ? `
                      <div style="display: flex; gap: 1rem; margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">
                        ${exerciseData.equipment ? `<span>Equipment: ${Array.isArray(exerciseData.equipment) ? exerciseData.equipment.join(', ') : exerciseData.equipment}</span>` : ''}
                        <span>Difficulty: ${exerciseData.difficulty ? Array.isArray(exerciseData.difficulty) ? exerciseData.difficulty.join(', ') : exerciseData.difficulty : 'N/A'}</span>
                      </div>
                    ` : ''}
                  </div>
                  <div class="flex-1" style="text-align: right;">
                    <a href="#exercise/${exerciseId}" style="color: #2196F3; font-weight: bold;">View Details →</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${progress === 100 ? `
        <div class="card" style="background: #C8E6C9;">
          <h3>🎉 Congratulations!</h3>
          <p>You've completed all exercises in the ${module.name} progression. Great work on your dedication and progress!</p>
        </div>
      ` : ''}

      <button class="btn" onclick="window.location.hash = '#skill-modules'" style="margin-top: 2rem;">Back to Modules</button>
    </div>
  `;

  main.innerHTML = htmlContent;
}

// Export for router usage
window.renderSkillModuleDetailView = renderSkillModuleDetailView;

// Export as object for wrapView compatibility
export default { render: renderSkillModuleDetailView };
