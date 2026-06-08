import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';
import { formatWorkoutDate, formatDate } from '../utils/date-formatter.js';
import { show } from '../services/toast-service.js';

export async function renderSharedWorkoutView(workoutId) {
  const main = document.getElementById('app');
  
  // Get shared workouts from localStorage
  const sharedWorkouts = JSON.parse(localStorage.getItem('sharedWorkouts') || '[]');
  const workout = sharedWorkouts.find(sw => sw.id === workoutId);

  if (!workout) {
    main.innerHTML = renderHeader() + `
      <div class="card">
        <h1>Workout Not Found</h1>
        <p>The shared workout you're looking for doesn't exist or has been removed.</p>
        <button class="btn" data-nav="#home">Go Home</button>
      </div>
    `;
    return;
  }

  const state = await getState();
  const exercises = state.exercises || [];
  const sharedComments = JSON.parse(localStorage.getItem(`sharedComments_${workoutId}`) || '[]');

  // Format date
  const formattedDate = formatWorkoutDate(workout.date, true);

  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Shared Workout</h1>
      <p>Shared on ${formattedDate}</p>
      
      <h2>${workout.routine.name}</h2>
      
      <div class="workout-details">
        ${workout.exercises.map((ex, index) => `
          <div class="card shared-workout-card">
            <h3>${index + 1}. ${ex.exerciseName}</h3>
            <p><strong>Target:</strong> ${ex.targetSets} sets × ${ex.targetReps} reps</p>
            <p><strong>Completed:</strong> ${ex.actualReps ? ex.actualReps.join(', ') + ' reps per set' : 'Not logged'}</p>
          </div>
        `).join('')}
      </div>
      
      <!-- Comment Section -->
      <div class="comments-section">
        <h3>Comments</h3>
        
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
        ` : '<p class="comments-empty">No comments yet. Be the first to comment!</p>'}
        
        <form id="comment-form" class="comment-form">
          <input type="text" id="comment-name" placeholder="Your name" required 
                 class="comment-input">
          <textarea id="comment-text" placeholder="Write a comment..." required 
                    rows="3" class="comment-input"></textarea>
          <button type="submit" class="btn">Post Comment</button>
        </form>
      </div>
      
      <div style="margin-top: 2rem;">
        <button class="btn btn-secondary" data-nav="#home">Back to Home</button>
      </div>
    </div>
  `;

  // Handle comment form submission
  const commentForm = main.querySelector('#comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', e => {
      e.preventDefault();
      
      const nameInput = main.querySelector('#comment-name');
      const textInput = main.querySelector('#comment-text');
      const name = nameInput.value.trim();
      const text = textInput.value.trim();
      
      if (!name || !text) {
        show('Please enter both a name and comment.', 'error');
        return;
      }
      
      // Get existing comments or create new array
      const comments = JSON.parse(localStorage.getItem(`sharedComments_${workoutId}`) || '[]');
      comments.push({
        name,
        text,
        date: new Date().toISOString()
      });
      
      // Save back to localStorage
      localStorage.setItem(`sharedComments_${workoutId}`, JSON.stringify(comments));
      
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