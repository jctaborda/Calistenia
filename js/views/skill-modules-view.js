import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';

export async function renderSkillModulesView() {
  const main = document.getElementById('app');
  const state = await getState();
  
  // Check if we should show tree view by default (from localStorage or hash)
  let showTreeView = window.location.hash === '#skills-tree';
  const savedPreference = localStorage.getItem('showSkillTree');
  if (savedPreference !== null) {
    showTreeView = savedPreference === 'true';
  }
  
  // Load exercises data from data/data.json (new unified structure)
  let exercisesData;
  try {
    const response = await fetch('./data/data.json');
    if (!response.ok) throw new Error('Failed to load exercise data');
    const data = await response.json();
    
    const exercisesArray = data.exercises || [];
    const categoriesMap = {};
    
    // Build category map for quick lookup
    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach(cat => {
        categoriesMap[cat.id] = cat;
      });
    }
    
    // Group exercises by category (maps to skill modules)
    const categoryGroups = {};
    exercisesArray.forEach(ex => {
      if (!ex.categories || ex.categories.length === 0) return;
      
      ex.categories.forEach(catId => {
        const cat = categoriesMap[catId] || { id: catId, name: `Category ${catId}` };
        
        if (!categoryGroups[catId]) {
          categoryGroups[catId] = {
            id: catId,
            name: cat.name,
            description: `${cat.name} exercises for building strength and mastering skills`,
            difficulty: 'mixed',
            exercises: []
          };
        }
        categoryGroups[catId].exercises.push(ex.id);
      });
    });
    
    // Convert to array and sort by name
    exercisesData = Object.values(categoryGroups).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    main.innerHTML = renderHeader() + `
      <div class="card">
        <h1>Skill Modules</h1>
        <p class="error-message">Unable to load exercises. Please try again later.</p>
      </div>
    `;
    return;
  }
  
  const history = state.history || [];
  
  // Calculate progress for each module (percentage of exercises completed)
  function calculateModuleProgress(module) {
    if (!module.exercises || module.exercises.length === 0) return 0;
    
    const completedExercises = new Set();
    
    for (const workout of history) {
      if (workout.exercises) {
        for (const exercise of workout.exercises) {
          if (module.exercises.includes(exercise.exerciseId)) {
            // Check if actually completed (positive reps)
            if (exercise.actualReps && exercise.actualReps.some(r => r > 0)) {
              completedExercises.add(exercise.exerciseId);
            }
          }
        }
      }
    }
    
    return Math.round((completedExercises.size / module.exercises.length) * 100);
  }

  // Function to save view preference
  function saveViewPreference(showTree) {
    localStorage.setItem('showSkillTree', showTree.toString());
  }

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h1>Skill Modules</h1>
        <div style="display: flex; gap: 0.5rem;">
          <button 
            class="btn ${!showTreeView ? 'btn-primary' : 'btn-secondary'}"
            onclick="window.updateSkillModulesView(false); return false;"
          >
            List View
          </button>
          <button 
            class="btn ${showTreeView ? 'btn-primary' : 'btn-secondary'}"
            onclick="window.updateSkillModulesView(true); return false;"
          >
            Skill Tree
          </button>
        </div>
      </div>
      
      ${!showTreeView ? `
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
          Dedicated training paths to master specific calisthenics skills. Choose a module to start your progression!
        </p>
      ` : `
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
          Visual representation of the skill progression tree. Start from beginner exercises and unlock advanced skills!
        </p>
      `}
      
      ${!showTreeView ? renderSkillModulesList(exercisesData, calculateModuleProgress) : renderTreeViewButton()}
    </div>
  `;
  
  if (showTreeView) {
    window.location.hash = '#skills-tree';
  }
}

function renderSkillModulesList(modules, calculateModuleProgress) {
  return `
    <div class="list-container">
      ${modules.map(module => {
        const progress = calculateModuleProgress(module);
        const isCompleted = progress === 100;
        
        return `
          <div class="workout-card" style="cursor: pointer;" onclick="console.log('Clicked module:', '${module.id}'); window.location.hash = '#skill-module/${module.id}'; return false;">
            <div class="flex-container">
              <div class="flex-1">
                <h3>${module.name}</h3>
                <p>${module.description}</p>
                <p><strong>Difficulty:</strong> ${module.difficulty}</p>
                <p><strong>Exercises:</strong> ${module.exercises.length}</p>
              </div>
              <div class="flex-1" style="text-align: right;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${progress}%</div>
                ${isCompleted ? '<span style="color: #4CAF50; font-weight: bold;">✓ Completed</span>' : ''}
              </div>
            </div>
            <div class="progress-bar" style="height: 8px; background: var(--gray-200); border-radius: 4px; overflow: hidden; margin-top: 1rem;">
              <div style="height: 100%; width: ${progress}%; background: ${isCompleted ? '#4CAF50' : '#2196F3'}; transition: width 0.3s;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderTreeViewButton() {
  return `
    <button class="btn btn-primary" onclick="window.location.hash = '#skills-tree'" style="width: 100%; margin-top: 2rem; padding: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="font-size: 2rem;">🌳</span>
        <div style="text-align: left;">
          <strong>View Exercise Progression Tree</strong>
          <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">
            Interactive tree showing all exercise progressions by difficulty level
          </p>
        </div>
      </div>
    </button>
    
    <style>
      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    </style>
  `;
}

// Export for global access (for toggle buttons)
window.updateSkillModulesView = function(showTree) {
  if (showTree) {
    window.location.hash = '#skills-tree';
  } else {
    window.location.hash = '#skill-modules';
  }
};

// Export for router usage
window.renderSkillModulesView = renderSkillModulesView;


// Export as object for wrapView compatibility
export default { render: renderSkillModulesView };
