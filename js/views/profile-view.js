import { getState } from '../services/state.js';
import { renderHeader } from '../components/header.js';

export function renderProfileView() {
  const main = document.getElementById('app');
  const { user, history = [] } = getState();
  main.innerHTML = renderHeader() + `
    <div class="card">
      <h1>Profile</h1>
      <p><strong>Name:</strong> ${user?.name || ''}</p>
      <p><strong>Level:</strong> ${user?.level || ''}</p>
      <h2>Workout History</h2>
      <ul>
        ${history.length === 0 ? '<li>No workouts completed yet.</li>' : history.map(w => `<li>${w.program.name} - ${new Date(w.date).toLocaleString()}</li>`).join('')}
      </ul>
    </div>
  `;
} 