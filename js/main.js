import { initializeState, setState, getState } from './services/state.js';
import { renderHomeView } from './views/home-view.js';
import { renderExerciseView } from './views/exercise-view.js';
import { renderProgramsView } from './views/programs-view.js';
import { renderActiveWorkoutView } from './views/active-workout-view.js';
import { renderWorkoutSummaryView } from './views/workout-summary-view.js';
import { renderOnboardingView } from './views/onboarding-view.js';
import { renderProfileView } from './views/profile-view.js';
import { renderBuilderView } from './views/builder-view.js';
import { renderExercisesView } from './views/exercises-view.js';
import { fetchExercises } from './services/api.js';
import { getExerciseProgressData } from './utils/chart-helpers.js';

initializeState();

async function ensureExercisesLoaded() {
  if (!getState().exercises) {
    const exercises = await fetchExercises();
    setState({ exercises });
  }
}

async function router() {
  await ensureExercisesLoaded();
  const state = getState();
  const hash = window.location.hash;
  if (!state.user && hash !== '#onboarding') {
    window.location.hash = '#onboarding';
    return;
  }
  if (hash === '#onboarding') {
    renderOnboardingView();
  } else if (hash === '' || hash === '#home') {
    renderHomeView();
  } else if (hash.startsWith('#exercise/')) {
    const id = hash.split('/')[1];
    renderExerciseView(id);
  } else if (hash === '#programs') {
    renderProgramsView();
  } else if (hash === '#active-workout') {
    renderActiveWorkoutView();
  } else if (hash === '#summary') {
    renderWorkoutSummaryView();
  } else if (hash === '#exercises') {
    renderExercisesView();
  } else if (hash === '#profile') {
    renderProfileView();
  } else if (hash === '#builder') {
    renderBuilderView();
  }
  // else: do nothing for now
}

window.addEventListener('hashchange', router);
router();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(() => {
      // Registered
    }).catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
} 