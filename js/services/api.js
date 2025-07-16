export async function fetchExercises() {
  const response = await fetch('/data/exercises.json');
  if (!response.ok) throw new Error('Failed to fetch exercises');
  return await response.json();
}

export async function fetchPrograms() {
  const response = await fetch('/data/programs.json');
  if (!response.ok) throw new Error('Failed to fetch programs');
  return await response.json();
} 