import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState } from '../services/state.js';
import { formatWorkoutDate, formatDate } from '../utils/date-formatter.js';
import { show } from '../services/toast-service.js';
import { loadSharedComments } from '../services/database.js';

export async function renderSharedWorkoutView(workoutId) {
  const main = document.getElementById('app');
  
  // Get shared workouts from localStorage
  const sharedWorkouts = JSON.parse(localStorage.getItem('sharedWorkouts') || '[]');
  const workout = sharedWorkouts.find(sw => sw.id === workoutId);

  if (!workout) {
    main.innerHTML = renderHeader() + `
       <div class="card">
         <h1>${t('shared_workout.not_found')}</h1>
         <p>${t('shared_workout.not_found_desc')}</p>
         <button class="btn" data-nav="#home">${t('shared_workout.back')}</button>
       </div>
     `;
    return;
  }

  const state = await getState();
  const exercises = state.exercises || [];
  const sharedComments = await loadSharedComments(workoutId);

  // Format date
  const formattedDate = formatWorkoutDate(workout.date, true);

  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>${t('shared_workout.title')}</h1>
      <p>${t('shared_workout.shared_on')} ${formattedDate}</p>
      
      <h2>${workout.routine.name}</h2>
      
      <div class="workout-details">
        ${workout.exercises.map((ex, index) => `
          <div class="card shared-workout-card">
            <h3>${index + 1}. ${ex.exerciseName}</h3>
            <p><strong>Target:</strong> ${ex.targetSets} sets ✕ ${ex.targetReps} reps</p>
            <p><strong>Completed:</strong> ${ex.actualReps ? ex.actualReps.join(', ') + ' reps per set' : t('shared_workout.not_logged')}</p>
          </div>
        `).join('')}
      </div>
      
      <!-- Comment Section -->
      <div class="comments-section">
        <h3>${t('shared_workout.comments')}</h3>
        
        ${sharedComments.length > 0 ? `
          <div class="comments-list">
            ${sharedComments.map(comment => `
              <div class="comment">
                <strong>${comment.name}</strong>
                <p>${comment.text}</p>
                <small>${formatDate(comment.date)}</small>
              </div>
            `).join('')}
          </div>
        ` : `<p class="comments-empty">${t('shared_workout.no_comments')}</p>`}
        
        <form id="comment-form" class="comment-form">
          <input type="text" id="comment-name" placeholder="${t('shared_workout.your_name')}" required 
                 class="comment-input">
          <textarea id="comment-text" placeholder="${t('shared_workout.write_comment')}" required 
                    rows="3" class="comment-input"></textarea>
          <button type="submit" class="btn">${t('shared_workout.post_comment')}</button>
        </form>
      </div>
      
      <div class="mt-2rem">
        <button class="btn btn-secondary" data-nav="#home">${t('shared_workout.back')}</button>
      </div>
    </div>
  `;

  // Handle comment form submission
  const commentForm = main.querySelector('#comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', async e => {
      e.preventDefault();
      
      const nameInput = main.querySelector('#comment-name');
      const textInput = main.querySelector('#comment-text');
      const name = nameInput.value.trim();
      const text = textInput.value.trim();
      
      if (!name || !text) {
        show(t('shared_workout.enter_name_comment'), 'error');
        return;
      }
      
      // Load existing comments from IndexedDB
      let comments;
      try {
        comments = await loadSharedComments(workoutId);
      } catch (error) {
        console.error('Error loading comments from IndexedDB:', error);
        comments = [];
      }
      
      comments.push({
        name,
        text,
        date: new Date().toISOString()
      });
      
      // Save back to IndexedDB
      try {
        const { storeSharedComments } = await import('../services/database.js');
        await storeSharedComments(workoutId, comments);
      } catch (error) {
        console.error('Error saving comments to IndexedDB:', error);
        show(t('shared_workout.comment_save_error') || 'Failed to save comment.', 'error');
        return;
      }
      
      // Clear form and re-render
      nameInput.value = '';
      textInput.value = '';
      renderSharedWorkoutView(workoutId);
    });
  }
}

// Export for router usage
window.renderSharedWorkoutView = renderSharedWorkoutView;


// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderSharedWorkoutView };