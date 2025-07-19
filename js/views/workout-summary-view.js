import { renderHeader } from '../components/header.js';

export function renderWorkoutSummaryView() {
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + '<div class="card"><h1>Workout Complete!</h1></div>';
} 