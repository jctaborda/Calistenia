import { renderHeader } from '../components/header.js';

export function renderWorkoutSummaryView() {
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + '<h1>Workout Complete!</h1>';
} 