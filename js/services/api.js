export async function fetchExercises() {
  const response = await fetch('./data/exercises.json');
  //const response = await fetch('https://jctaborda.github.io/Calistenia/data/exercises.json');
  if (!response.ok) throw new Error('Failed to fetch exercises');
  return await response.json();
}

export async function fetchPrograms() {
  const response = await fetch('./data/programs.json');
  //const response = await fetch('https://jctaborda.github.io/Calistenia/data/programs.json');
  if (!response.ok) throw new Error('Failed to fetch programs');
  return await response.json();
} 

export async function fetchMuscles() {
  const response = await fetch('./data/muscles.json');
  //const response = await fetch('https://jctaborda.github.io/Calistenia/data/muscles.json');
  if (!response.ok) throw new Error('Failed to fetch muscles');
  return await response.json();
} 

export async function fetchCategories() {
  const response = await fetch('./data/categories.json');
  //const response = await fetch('https://jctaborda.github.io/Calistenia/data/categories.json');
  if (!response.ok) throw new Error('Failed to fetch categories');
  return await response.json();
} 

export async function fetchEquipment() {
  const response = await fetch('./data/equipment.json');
  //const response = await fetch('https://jctaborda.github.io/Calistenia/data/equipment.json');
  if (!response.ok) throw new Error('Failed to fetch equipment');
  return await response.json();
} 