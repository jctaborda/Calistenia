// views/skill-modules-view.js - Updated to use service layer with IndexedDB storage
import { renderHeader } from '../components/header.js';
import { getState, updateState } from '../services/state.js';
import { fetchSkillModules } from '../services/api.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';

export async function renderSkillModulesView() {
  const main = document.getElementById('app');
  
  // Check if we should show tree view by default (from localStorage or hash)
  let showTreeView = window.location.hash === '#skills-tree';
  const savedPreference = localStorage.getItem('showSkillTree');
  if (savedPreference !== null) {
    showTreeView = savedPreference === 'true';
  }
  
  // Load skill modules from service (IndexedDB or data/skill-modules.json)
  let modulesData;
  try {
    modulesData = await fetchSkillModules();
    if (!Array.isArray(modulesData)) {
      throw new Error('Expected array of modules');
    }
  } catch (error) {
    main.innerHTML = renderHeader() + `
      <div class="card">
        <h1>Skill Modules</h1>
        <p class="error-message">Unable to load skill modules. Please try again later.</p>
      </div>
    `;
    return;
  }
  
  const history = getState().history || [];
  
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
  
  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="view-header">
        <h1 class="view-title">Skill Modules</h1>
        <div class="view-actions">
          <button class="btn btn-secondary" id="skills-tree-btn">🌳 Skill Tree</button>
          <button class="btn btn-primary" id="create-module-btn">New Module</button>
        </div>
      </div>
      
      <ul class="modules-list">
        ${modulesData.map(module => {
          const progress = calculateModuleProgress(module);
          const isCompleted = progress === 100;
          
          return `
            <li class="module-item">
              <div class="workout-card module-card">
                <h3 class="module-title">${module.name}</h3>
                <p class="module-description">${module.description}</p>
                <div class="module-tags">
                  <span class="tag">${module.category || 'Uncategorized'}</span>
                  <span class="tag difficulty-${module.difficulty}">${module.difficulty}</span>
                  <span class="tag">${module.exercises.length} Exercises</span>
                </div>
                <div class="controls">
                  <button class="view-btn module-action-btn" data-type="view" data-id="${module.id}">View</button>
                  <button class="edit-btn module-action-btn" data-type="edit" data-id="${module.id}">Edit</button>
                  ${isCompleted ? '<span class="completed-badge">✓ Completed</span>' : ''}
                </div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
  
  // Create New Module button handler
  const createModuleBtn = main.querySelector('#create-module-btn');
  if (createModuleBtn) {
    createModuleBtn.addEventListener('click', () => {
      updateState({ editingModule: null, editingProgram: null });
      window.location.hash = '#builder';
    });
  }

  // Skills Tree button handler
  const skillsTreeBtn = main.querySelector('#skills-tree-btn');
  if (skillsTreeBtn) {
    skillsTreeBtn.addEventListener('click', () => {
      window.location.hash = '#skills-tree';
    });
  }
  
  // Module action button handlers (View, Edit, Delete)
  main.querySelectorAll('.module-action-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      
      if (type === 'view') {
        window.location.hash = `#skill-module/${id}`;
      } else if (type === 'edit') {
        // Find the module to edit from loaded data
        const moduleToEdit = modulesData.find(m => String(m.id) === String(id));
        if (moduleToEdit) {
          updateState({ 
            editingModule: {
              id: moduleToEdit.id,
              module: moduleToEdit
            },
            editingProgram: null
          });
          window.location.hash = '#builder';
        }
      } else if (type === 'delete') {
        const module = modulesData.find(m => String(m.id) === String(id));
        if (module && confirm(`Are you sure you want to delete "${module.name}"?`)) {
          // Delete the module via service
          ModuleStore.delete(id)
            .then(() => {
              // Save for undo before refreshing
              saveForUndo('module', module, id);
              
              // Reload modules to reflect changes
              fetchSkillModules().then(newModules => {
                window.location.hash = '#skill-modules';
              });
            })
            .catch(err => {
              alert('Error deleting module: ' + err.message);
            });
        }
      } else if (type === 'start') {
        const module = modulesData.find(m => String(m.id) === String(id));
        if (module) {
          window.location.hash = `#skill-module/${id}`;
        }
      }
    });
  });
  
  // Add keyboard shortcuts for new module (Ctrl+N)
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createModuleBtn?.click();
    }
  });
  
  if (showTreeView) {
    window.location.hash = '#skills-tree';
  }
}

// Export as object for wrapView compatibility
export default { render: renderSkillModulesView };
