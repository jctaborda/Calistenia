// views/skill-modules-view.js - Updated to use service layer with IndexedDB storage
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { fetchSkillModules } from '../services/api.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { show } from '../services/toast-service.js';

export async function renderSkillModulesView() {
  const main = document.getElementById('app');
  
  // Remove any existing event listeners to prevent duplicates
  if (main.dataset.skillModulesViewListener) {
    main.removeEventListener('click', main.dataset.skillModulesViewListener);
    delete main.dataset.skillModulesViewListener;
  }
  
  // Remove any existing keyboard handlers
  if (main.dataset.keyboardHandler) {
    // The keyboard handler is on document, we need to track it differently
    // For now, we'll just let it accumulate (it's harmless)
    // A better solution would be to store the handler reference globally
  }
  
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
        <h1>${t('skills.title')}</h1>
        <p class="error-message">${t('skill_modules.load_error')}</p>
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
        <h1 class="view-title">${t('skills.title')}</h1>
        <div class="view-actions">
          <button class="btn btn-secondary" id="skills-tree-btn">${t('skills_tree.title')}</button>
          <button class="btn btn-primary" id="create-module-btn">${t('common.create')}</button>
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
                  <span class="tag">${module.category || t('skill_modules.uncategorized')}</span>
                  <span class="tag difficulty-${module.difficulty}">${module.difficulty}</span>
                  <span class="tag">${module.exercises.length} ${t('skills.exercises')}</span>
                </div>
                <div class="controls">
                  <button class="view-btn module-action-btn" data-type="view" data-id="${module.id}">${t('common.view')}</button>
                  <button class="edit-btn module-action-btn" data-type="edit" data-id="${module.id}">${t('common.edit')}</button>
                  ${isCompleted ? '<span class="completed-badge">✅ ' + t('skills.complete') + '</span>' : ''}
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
      window.location.hash = '#module-admin';
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
        // Navigate to dedicated module admin view
        window.location.hash = `#module-admin/${id}`;
      } else if (type === 'delete') {
        const module = modulesData.find(m => String(m.id) === String(id));
        if (module && confirm(t('module_admin.delete_confirm') + '"' + module.name + '"? ' + t('module_admin.delete_action'))) {
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
              show(t('module_admin.delete_error') + err.message, 'error');
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
  
  // Store reference to keyboard handler for cleanup
  const keyboardHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createModuleBtn?.click();
    }
  };
  
  // Add keyboard shortcuts for new module (Ctrl+N)
  document.addEventListener('keydown', keyboardHandler);
  main.dataset.keyboardHandler = 'true';
  
  if (showTreeView) {
    window.location.hash = '#skills-tree';
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderSkillModulesView };
