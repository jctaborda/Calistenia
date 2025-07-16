let state = {};

export function getState() {
  return state;
}

export function setState(newState) {
  Object.assign(state, newState);
  localStorage.setItem('state', JSON.stringify(state));
  document.dispatchEvent(new CustomEvent('stateChange'));
}

export function initializeState() {
  const saved = localStorage.getItem('state');
  if (saved) {
    Object.assign(state, JSON.parse(saved));
  } else {
    Object.assign(state, { user: null, activeWorkout: null });
  }
} 