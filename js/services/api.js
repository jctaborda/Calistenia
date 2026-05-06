// PWA Offline Data Loading - loads all data from single data.json file
// No server endpoints needed - works offline as a progressive web app

let cachedData = null;

export async function fetchAllData() {
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await fetch('./data/data.json');
    if (!response.ok) throw new Error('Failed to fetch data');
    const data = await response.json();
    cachedData = data;
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

export async function fetchExercises() {
  try {
    // Use storage.js which loads from IndexedDB or data.json
    const storage = await import('./storage.js');
    return storage.loadExercises();
  } catch (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }
}

export async function fetchPrograms() {
  try {
    const data = await fetchAllData();
    return data.programs;
  } catch (error) {
    console.error('Error fetching programs:', error);
    throw error;
  }
}

export async function fetchMuscles() {
  try {
    const data = await fetchAllData();
    return data.muscles;
  } catch (error) {
    console.error('Error fetching muscles:', error);
    throw error;
  }
}

export async function fetchCategories() {
  try {
    const data = await fetchAllData();
    return data.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

export async function fetchEquipment() {
  try {
    const data = await fetchAllData();
    return data.equipment;
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
}

export async function fetchDifficulties() {
  try {
    const data = await fetchAllData();
    return data.difficulties;
  } catch (error) {
    console.error('Error fetching difficulties:', error);
    throw error;
  }
}

// Clear cache to force reload from file
export function clearDataCache() {
  cachedData = null;
}
