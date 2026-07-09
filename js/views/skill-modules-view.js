// views/skill-modules-view.js - Updated to use service layer with IndexedDB storage
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { fetchSkillModules } from '../services/api.js';
import { ModuleStore } from '../services/modules-service.js';
import { saveForUndo } from '../services/undo-service.js';
import { show } from '../services/toast-service.js';
import { showConfirmation } from '../services/confirmation-modal.js';
import { escapeHtml } from '../utils/html.js';
import { isModuleCompleted } from '../utils/helpers.js';

export async function renderSkillModulesView() {
  const main = document.getElementById('app');
  
  // Remove any existing event listeners to prevent duplicates (memory leak fix)
  if (main.dataset.skillModulesViewListener === 'true') {
    // Remove delegated click handler
    main.removeEventListener('click', main._handleSkillModulesClick);
    
    // Remove keyboard handler from document
    if (main._handleSkillModulesKeydown) {
      document.removeEventListener('keydown', main._handleSkillModulesKeydown);
    }
    
    // Clean up individual button listeners (stored as dataset)
    const createModuleBtn = main.querySelector('#create-module-btn');
    if (createModuleBtn && createModuleBtn._inlineClickListener) {
      createModuleBtn.removeEventListener('click', createModuleBtn._inlineClickListener);
    }
    
    const skillsTreeBtn = main.querySelector('#skills-tree-btn');
    if (skillsTreeBtn && skillsTreeBtn._inlineClickListener) {
      skillsTreeBtn.removeEventListener('click', skillsTreeBtn._inlineClickListener);
    }
    
    delete main.dataset.skillModulesViewListener;
    delete main._handleSkillModulesClick;
    delete main._handleSkillModulesKeydown;
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
          const progress = isModuleCompleted(module.exercises, history) ? 100 : 0;
          const isCompleted = progress === 100;
          
          return `
            <li class="module-item">
              <div class="workout-card module-card">
                <h3 class="module-title">${escapeHtml(module.name)}</h3>
                <p class="module-description">${escapeHtml(module.description || '')}</p>
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
  
  // Create delegated click handler for all button interactions
  const handleSkillModulesClick = async (e) => {
    const target = e.target;
    
    // Create New Module button
    if (target.id === 'create-module-btn') {
      updateState({ editingModule: null, editingProgram: null });
      window.location.hash = '#module-admin';
      return;
    }
    
    // Skills Tree button
    if (target.id === 'skills-tree-btn') {
      window.location.hash = '#skills-tree';
      return;
    }
    
    // Module action buttons (View, Edit, Delete)
    const moduleActionBtn = target.closest('.module-action-btn');
    if (moduleActionBtn) {
      const type = moduleActionBtn.getAttribute('data-type');
      const id = moduleActionBtn.getAttribute('data-id');
      
      if (type === 'view') {
        window.location.hash = `#skill-module/${id}`;
      } else if (type === 'edit') {
        // Navigate to dedicated module admin view
        window.location.hash = `#module-admin/${id}`;
      } else if (type === 'delete') {
        const module = modulesData.find(m => String(m.id) === String(id));
        if (module) {
          const confirmed = await showConfirmation(t('module_admin.delete_confirm') + '"' + module.name + '"? ' + t('module_admin.delete_action'));
          if (confirmed) {
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
        }
      } else if (type === 'start') {
        const module = modulesData.find(m => String(m.id) === String(id));
        if (module) {
          window.location.hash = `#skill-module/${id}`;
        }
      }
    }
  };
  
  // Add delegated click handler
  main.addEventListener('click', handleSkillModulesClick);
  main._handleSkillModulesClick = handleSkillModulesClick;
  
  // Keyboard shortcut for new module (Ctrl+N)
  const handleSkillModulesKeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      const createModuleBtn = main.querySelector('#create-module-btn');
      createModuleBtn?.click();
    }
  };
  
  document.addEventListener('keydown', handleSkillModulesKeydown);
  main._handleSkillModulesKeydown = handleSkillModulesKeydown;
  
  // Mark that listeners have been added
  main.dataset.skillModulesViewListener = 'true';
  
  if (showTreeView) {
    window.location.hash = '#skills-tree';
  }
}

// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderSkillModulesView };
