import { fetchRoutines, deleteRoutineFromDatabase } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { renderSpinner, hideSpinner } from '../components/spinner.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { show } from '../services/toast-service.js';
import { showConfirmation } from '../services/confirmation-modal.js';
import { escapeHtml } from '../utils/html-helpers.js';
import { getDeletedItemsByType, deleteDeletedItem, storeRoutines } from '../services/database.js';

/**
 * Render routines view with create, view, edit, delete functionality
 * @returns {Promise<string>} HTML string for routines view
 */
export async function renderRoutinesView() {
  const main = document.getElementById('app');
  const state = getState();
  const allRoutines = state.routines || [];
  const exercises = state.exercises || [];
  const categories = state.categories || [];
  
  // Load recently deleted routines
  let deletedRoutines = [];
  try {
    const deletedItems = await getDeletedItemsByType('routine');
    deletedRoutines = deletedItems.map(item => ({
      ...item.item,
      deletedAt: item.deletedAt,
      originalId: item.originalId
    }));
  } catch (error) {
    console.error('Failed to load deleted routines:', error);
  }
  
  // Remove any existing event listeners to prevent duplicates
  if (main.dataset.routinesViewListener === 'true') {
    main.removeEventListener('click', main._handleRoutinesViewClick);
    delete main.dataset.routinesViewListener;
    delete main._handleRoutinesViewClick;
  }
  
  // Event delegation handler for all button interactions
  const handleRoutinesViewClick = async (e) => {
    const target = e.target;
    
    // Create New Routine buttons
    if (target.id === 'create-routine-btn' || 
        target.id === 'create-from-empty') {
      const newState = { 
        createNewRoutine: true, 
        editingRoutine: null, 
        editingModule: null 
      };
      updateState(newState);
      window.location.hash = '#builder';
      return;
    }
    
    // View handlers - routine name or view button
    if (target.closest('[data-action="view"]')) {
      e.preventDefault();
      e.stopPropagation();
      const btn = target.closest('[data-action="view"]');
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      window.location.hash = `#routine-details/${type}/${id}`;
      return;
    }
    
    // Edit button handler
    const editBtn = target.closest('.edit-btn');
    if (editBtn) {
      // Skip if this is a module action button (handled by skill-modules-view.js)
      if (editBtn.classList.contains('module-action-btn')) {
        return;
      }
      const type = editBtn.getAttribute('data-type');
      const id = editBtn.getAttribute('data-id');
      
      // Guard: only process if this is a routine edit button (has data-type attribute)
      // Exercise edit buttons don't have data-type, so skip them
      if (!type || !id) {
        return;
      }
      
      let routine;
      
      if (type === 'routine') {
        routine = allRoutines.find(p => String(p.id) === String(id));
      }
      
      // Guard: only proceed if routine was found
      if (!routine) {
        console.error(`Routine not found: type=${type}, id=${id}`);
        show(t('routines.not_found'), 'error');
        return;
      }
      
    
      updateState({
        editingRoutine: {
          type,
          id,
          routine: {
            name: routine.name,
            exercises: routine.exercises,
            warmup: routine.warmup || [],
            cooldown: routine.cooldown || [],
            description: routine.description || '',
            category: routine.category || '',
            difficulty: routine.difficulty || '',
            duration: routine.duration || 30
          }
        },
        editingModule: null // Clear any previous module editing state
      });
      window.location.hash = '#builder';
      return;
    }
    
    // Delete routine button handler
    const deleteBtn = target.closest('.delete-btn');
    if (deleteBtn) {
      const type = deleteBtn.getAttribute('data-type');
      const id = String(deleteBtn.getAttribute('data-id'));
      
      // Guard: only process if this is a routine delete button (has data-type attribute)
      if (!type || !id) {
        return;
      }
      
      // Only handle delete for routines
      if (type === 'routine') {
        const routine = allRoutines.find(p => String(p.id) === String(id));
        if (routine) {
          const routineName = routine.name;
          const confirmed = await showConfirmation(`Are you sure you want to delete "${routineName}"? You can recover it within 30 days from the "Recently Deleted" section below.`);
          if (confirmed) {
            try {
              // Disable the button and show loading state
              deleteBtn.disabled = true;
              deleteBtn.textContent = t('common.loading');
              document.body.insertAdjacentHTML('beforeend', renderSpinner());
              
              await deleteRoutineFromDatabase(routine.id);
              // Reload routines from IndexedDB and update state
              const refreshedRoutines = await fetchRoutines();
              updateState({ routines: refreshedRoutines });
              // Re-render with updated state
              await renderRoutinesView();
            } catch (error) {
              console.error('Failed to delete routine:', error);
              show(t('routines.delete_error'), 'error');
              // Re-enable button on error
              deleteBtn.disabled = false;
              deleteBtn.textContent = t('common.delete');
            } finally {
              hideSpinner();
            }
          }
        }
      }
      return;
    }
    
    // Restore deleted routine button handler
    const restoreBtn = target.closest('.restore-deleted-btn');
    if (restoreBtn) {
      const originalId = String(restoreBtn.getAttribute('data-id'));
      // Find the deleted routine to get its name
      const deletedRoutine = deletedRoutines.find(r => String(r.originalId) === originalId);
      const routineName = deletedRoutine ? escapeHtml(deletedRoutine.name) : 'this routine';
      const confirmed = await showConfirmation(`Restore routine "${routineName}"?`);
      if (confirmed) {
        try {
          // Disable button and show loading
          restoreBtn.disabled = true;
          restoreBtn.textContent = t('common.loading');
          document.body.insertAdjacentHTML('beforeend', renderSpinner());
          
          // Find the deleted routine
          if (deletedRoutine) {
            // Add it back to routines using immutable update
            const refreshedRoutines = await fetchRoutines();
            const updatedRoutines = [...refreshedRoutines, deletedRoutine];
            await storeRoutines(updatedRoutines);
            
            // Delete from deleted items store
            await deleteDeletedItem(deletedRoutine.id);
            
            // Update state with immutable array
            updateState({ routines: updatedRoutines });
            await renderRoutinesView();
            show('Routine restored successfully!', 'success');
          }
        } catch (error) {
          console.error('Failed to restore routine:', error);
          show('Failed to restore routine', 'error');
          restoreBtn.disabled = false;
          restoreBtn.textContent = 'Restore';
        } finally {
          hideSpinner();
        }
      }
      return;
    }
    
    // Permanently delete button handler
    const permDeleteBtn = target.closest('.permanently-delete-btn');
    if (permDeleteBtn) {
      const deletedItemId = String(permDeleteBtn.getAttribute('data-id'));
      const deletedRoutine = deletedRoutines.find(r => String(r.id) === deletedItemId);
      const routineName = deletedRoutine ? escapeHtml(deletedRoutine.name) : 'this routine';
      const confirmed = await showConfirmation(`Permanently delete "${routineName}"? This cannot be undone.`);
      if (confirmed) {
        try {
          // Disable button and show loading
          permDeleteBtn.disabled = true;
          permDeleteBtn.textContent = t('common.loading');
          document.body.insertAdjacentHTML('beforeend', renderSpinner());
          
          await deleteDeletedItem(deletedItemId);
          await renderRoutinesView();
          show('Routine permanently deleted', 'info');
        } catch (error) {
          console.error('Failed to permanently delete:', error);
          show('Failed to delete routine', 'error');
          permDeleteBtn.disabled = false;
          permDeleteBtn.textContent = 'Delete Forever';
        } finally {
          hideSpinner();
        }
      }
      return;
    }
    
    // Start button logic
    const startBtn = target.closest('.start-btn');
    if (startBtn) {
      const type = startBtn.getAttribute('data-type');
      const id = startBtn.getAttribute('data-id');
      
      // Guard: only process if this is a routine start button
      if (!type || !id) {
        return;
      }
      
      if (type === 'routine') {
        const routine = allRoutines.find(p => String(p.id) === String(id));
        if (routine) {
          updateState({ activeWorkout: { routine: routine, progress: {}, currentExerciseIndex: 0, currentSetIndex: 0 } });
          window.location.hash = '#active-workout';
        }
      }
      return;
    }
  };
  
  // Render with improved visual hierarchy and semantic structure
  main.innerHTML = renderHeader() + `
    <div class="card">
      <!-- Header Section -->
      <h1 class="section-title">Routines</h1>
      
      <div class="filter-section">
        <button class="btn btn-primary" id="create-routine-btn">${t('routines.create')}</button>
      </div>
  
      <!-- Routines List -->
      ${allRoutines.length === 0 ? `
        <div class="empty-state">
          <h2>${t('routines.no_routines')}</h2>
          <p>${t('routines.create')}</p>
          <button class="btn btn-primary" id="create-from-empty">${t('routines.create')}</button>
        </div>
      ` : `
        <div class="list-container">
          ${allRoutines.map(p => `
            <div class="routine-card" data-type="routine" data-id="${p.id}">
              <div class="routine-header">
                <h3 class="routine-name-btn" data-type="routine" data-id="${p.id}" data-action="view">${escapeHtml(p.name)}</h3>
                ${p.difficulty ? `<span class="difficulty-badge difficulty-${p.difficulty.toLowerCase()}">${p.difficulty}</span>` : ''}
              </div>
              ${p.description ? `<p class="routine-desc">${escapeHtml(p.description)}</p>` : ''}
              <div class="routine-meta">
                ${p.category ? `<span class="routine-meta-item" role="img" aria-label="category">📁 ${categories.find(c => String(c.id) === String(p.category))?.name || p.category}</span>` : ''}
                ${p.duration ? `<span class="routine-meta-item" role="img" aria-label="duration">⏱ ${p.duration} min</span>` : ''}
              </div>
              <div class="routine-actions">
                <button class="btn btn-primary view-btn" data-type="routine" data-id="${p.id}" data-action="view">${t('common.view')}</button>
                <button class="btn btn-success start-btn" data-type="routine" data-id="${p.id}" data-action="start">${t('routines.start')}</button>
                <button class="btn btn-warning edit-btn" data-type="routine" data-id="${p.id}" data-action="edit" aria-label="Edit routine">${t('common.edit')}</button>
                <button class="btn btn-danger delete-btn" data-type="routine" data-id="${p.id}" data-action="delete" aria-label="Delete routine">${t('common.delete')}</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    
    <!-- Recently Deleted Section -->
    ${deletedRoutines.length > 0 ? `
      <div class="card deleted-section">
        <h2 class="section-title">🗑️ Recently Deleted (${deletedRoutines.length})</h2>
        <p class="small-text text-muted">Routines are kept for 30 days and can be restored. After that, they are permanently removed.</p>
        <div class="list-container">
          ${deletedRoutines.map(r => `
            <div class="routine-card deleted-card" data-type="routine" data-id="${r.originalId}">
              <div class="routine-header">
                <h3 class="routine-name">${escapeHtml(r.name)}</h3>
                <span class="deleted-date">${new Date(r.deletedAt).toLocaleDateString()}</span>
              </div>
              ${r.description ? `<p class="routine-desc">${escapeHtml(r.description)}</p>` : ''}
              <div class="routine-actions">
                <button class="btn btn-success restore-deleted-btn" data-type="routine" data-id="${r.originalId}" data-action="restore">Restore</button>
                <button class="btn btn-danger permanently-delete-btn" data-type="routine" data-id="${r.id}" data-action="permanently-delete">Delete Forever</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    </div>
  `;
  
  // Add single event listener to main element
  main.addEventListener('click', handleRoutinesViewClick);
  main.dataset.routinesViewListener = 'true';
  main._handleRoutinesViewClick = handleRoutinesViewClick;
  
  // Register cleanup function for router (prevents memory leaks on view exit)
  main._currentViewCleanup = () => {
    main.removeEventListener('click', handleRoutinesViewClick);
    delete main.dataset.routinesViewListener;
    delete main._handleRoutinesViewClick;
  };
  
}


// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderRoutinesView };
