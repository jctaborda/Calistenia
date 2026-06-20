// views/skill-module-detail-view.js - Updated with proper exercise loading
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
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
  let equipmentList = [];
  let difficultiesList = [];
  
  try {
    const state = getState();
    allExercises = state.exercises || [];
    equipmentList = state.equipment || [];
    difficultiesList = state.difficulties || [];
    
    // Create maps for quick lookup
    const exerciseMap = {};
    allExercises.forEach(ex => {
      exerciseMap[ex.id] = ex;
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
    const exerciseMap = allExercises.reduce((map, ex) => {
      map[ex.id] = ex;
      return map;
    }, {});
    return exerciseMap[parseInt(id)] || null;
  }

  const completedCount = module.exercises.filter(id => isExerciseCompleted(id)).length;
  const progress = Math.round((completedCount / module.exercises.length) * 100);

  // Generate the HTML
  const htmlContent = renderHeader() + `
    <div class="card">
      <div class="module-detail-header">
        <button class="btn btn-secondary" data-nav="#skill-modules">← Back to Modules</button>
        <span class="module-progress">${progress}%</span>
      </div>

      <h1 class="module-name">${module.name}</h1>
      <p class="module-description-text">${module.description || '${t("skill_module_detail.no_description")}'}</p>
      <p><strong>Category:</strong> ${module.category || '${t("skill_module_detail.na")}'}</p>
      <p><strong>Difficulty:</strong> ${module.difficulty || '${t("skill_module_detail.mixed")}'}</p>
      <p><strong>Total Exercises:</strong> ${module.exercises.length}</p>

      <div class="progression-section">
        <h3>Progression Path</h3>
        <p class="progression-description">
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
              <div class="exercise-progression-card ${difficultyClass}" style="cursor: pointer; border-left: ${borderStyle};" data-exercise-id="${exerciseId}">
                <div class="flex-container">
                  <div class="flex-1">
                    <div class="exercise-header">
                      <strong class="exercise-number">${index + 1}. ${exerciseName}</strong>
                      ${isCompleted ? '<span class="completed-indicator">✅ Completed</span>' : ''}
                    </div>
                   <p class="exercise-desc">${description}</p>

                    ${exerciseData ? `
                      <div class="exercise-meta">
                        ${exerciseData.equipment ? `
                          <span>Equipment: 
                            ${Array.isArray(exerciseData.equipment) 
                              ? exerciseData.equipment.map(eqId => {
                                  const equipment = equipmentList.find(e => e.id === eqId);
                                  return equipment ? equipment.name : `Equipment ${eqId}`;
                                }).join(', ') 
                              : '${t("skill_module_detail.na")}'}
                          </span>
                        ` : ''}
                        <span>Difficulty: 
                          ${exerciseData.difficulty ? (Array.isArray(exerciseData.difficulty) 
                            ? exerciseData.difficulty.map(diffId => {
                                const difficulty = difficultiesList.find(d => d.id === diffId);
                                return difficulty ? difficulty.label : `Difficulty ${diffId}`;
                              }).join(', ') 
                            : '${t("skill_module_detail.na")}') : '${t("skill_module_detail.na")}'}
                        </span>
                      </div>
                   ` : ''}
                  </div>
                  <div class="flex-1">
                    <a href="#exercise/${exerciseId}" class="view-details-link">View Details →</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${progress === 100 ? `
        <div class="card completion-card">
          <h3>🎉 Congratulations!</h3>
          <p>You've completed all exercises in the ${module.name} progression. Great work on your dedication and progress!</p>
        </div>
      ` : ''}

      <button class="btn" data-nav="#skill-modules" style="margin-top: 2rem;">Back to Modules</button>
    </div>
  `;

  main.innerHTML = htmlContent;
}

// Export for router usage

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderSkillModuleDetailView };