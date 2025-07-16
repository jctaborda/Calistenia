export function getExerciseProgressData(exerciseId, history) {
  return (history || [])
    .filter(w => w.progress && w.progress[exerciseId])
    .map(w => ({
      date: w.date,
      totalReps: w.progress[exerciseId].reduce((sum, reps) => sum + reps, 0)
    }));
} 