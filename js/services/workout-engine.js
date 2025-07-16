import { getState, setState } from './state.js';

export function logSet(reps) {
  const { activeWorkout, user, history = [] } = getState();
  if (!activeWorkout) return;
  const programExercises = activeWorkout.program.exercises;
  // For now, only one set per exercise, move to next exercise after each set
  const progress = { ...activeWorkout.progress };
  let currentIdx = 0;
  for (let i = 0; i < programExercises.length; i++) {
    if (!progress[programExercises[i]] || progress[programExercises[i]].length === 0) {
      currentIdx = i;
      break;
    }
    if (i === programExercises.length - 1) currentIdx = i;
  }
  const exerciseId = programExercises[currentIdx];
  if (!progress[exerciseId]) progress[exerciseId] = [];
  progress[exerciseId].push(Number(reps));

  // Check if all exercises have at least one set
  const finished = programExercises.every(id => progress[id] && progress[id].length > 0);
  if (finished) {
    // Save to history, clear activeWorkout, go to summary
    const completedWorkout = {
      program: activeWorkout.program,
      progress,
      date: new Date().toISOString(),
    };
    setState({
      history: [...(getState().history || []), completedWorkout],
      activeWorkout: null,
    });
    window.location.hash = '#summary';
  } else {
    setState({ activeWorkout: { ...activeWorkout, progress } });
  }
} 