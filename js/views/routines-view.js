import { fetchRoutines, deleteRoutineFromDatabase } from '../services/api.js';
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState, updateState } from '../services/state.js';
import { show } from '../services/toast-service.js';


export async function renderRoutinesView() {
  const main = document.getElementById('app');
  const state = getState();
  const allRoutines = state.routines || [];
  const exercises = state.exercises || [];
  const categories = state.categories || [];
  
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
          if (confirm(`Are you sure you want to delete "${routineName}"? This action cannot be undone.`)) {
            try {
              await deleteRoutineFromDatabase(routine.id);
              // Reload routines from IndexedDB and update state
              const refreshedRoutines = await fetchRoutines();
              updateState({ routines: refreshedRoutines });
              // Re-render with updated state
              await renderRoutinesView();
            } catch (error) {
              console.error('Failed to delete routine:', error);
              show(t('routines.delete_error'), 'error');
            }
          }
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
                <h3 routine-name-btn data-type="routine" data-id="${p.id}" data-action="view">${p.name}</h3>
                ${p.difficulty ? `<span class="difficulty-badge difficulty-${p.difficulty.toLowerCase()}">${p.difficulty}</span>` : ''}
              </div>
              ${p.description ? `<p class="routine-desc">${p.description}</p>` : ''}
              <div class="routine-meta">
                ${p.category ? `<span class="routine-meta-item" role="img" aria-label="category">📁 ${categories.find(c => String(c.id) === String(p.category))?.name || p.category}</span>` : ''}
                ${p.duration ? `<span class="routine-meta-item" role="img" aria-label="duration">⏱ ${p.duration} min</span>` : ''}
              </div>
              <div class="routine-actions">
                <button class="btn btn-primary view-btn" data-type="routine" data-id="${p.id}" data-action="view">${t('common.view')}</button>
                <button class="btn btn-success start-btn" data-type="routine" data-id="${p.id}" data-action="start">${t('routines.start')}</button>
                <button class="btn btn-warning edit-btn" data-type="routine" data-id="${p.id}" data-action="edit">${t('common.edit')}</button>
                <button class="btn btn-danger delete-btn" data-type="routine" data-id="${p.id}" data-action="delete">${t('common.delete')}</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
  
  // Add single event listener to main element
  main.addEventListener('click', handleRoutinesViewClick);
  main.dataset.routinesViewListener = 'true';
  main._handleRoutinesViewClick = handleRoutinesViewClick;
  
}


// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderRoutinesView };
