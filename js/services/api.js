// PWA Offline Data Loading - loads all data from single data.json file
// No server endpoints needed - works offline as a progressive web app
import { 
  loadAllExercises, 
  loadAllCategories, 
  loadAllEquipment, 
  loadAllMuscles, 
  loadAllDifficulties,
  loadAllRoutines
} from './data-cache.js';
import { updateRoutines as dbUpdateRoutines, deleteRoutine as dbDeleteRoutine } from './database.js';

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
    // Use data-cache.js which loads from IndexedDB or data.json
    return await loadAllExercises();
  } catch (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }
}

export async function fetchRoutines() {
  try {
    // Use data-cache.js which loads from IndexedDB or data.json
    return await loadAllRoutines();
  } catch (error) {
    console.error('Error fetching routines:', error);
    throw error;
  }
}

export async function fetchMuscles() {
  try {
    // Use data-cache.js which loads from IndexedDB or data.json
    return await loadAllMuscles();
  } catch (error) {
    console.error('Error fetching muscles:', error);
    throw error;
  }
}

export async function fetchCategories() {
  try {
    // Use data-cache.js which loads from IndexedDB or data.json
    return await loadAllCategories();
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

export async function fetchEquipment() {
  try {
    // Use data-cache.js which loads from IndexedDB or data.json
    return await loadAllEquipment();
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
}

export async function fetchDifficulties() {
  try {
    // Use data-cache.js which loads from IndexedDB or data.json
    return await loadAllDifficulties();
  } catch (error) {
    console.error('Error fetching difficulties:', error);
    throw error;
  }
}

// Skill Modules API
export async function fetchSkillModules() {
  try {
    const modulesService = await import('./modules-service.js');
    return modulesService.loadModules();
  } catch (error) {
    console.error('Error fetching skill modules:', error);
    throw error;
  }
}

export async function saveSkillModules(modules) {
  try {
    const modulesService = await import('./modules-service.js');
    return modulesService.saveModules(modules);
  } catch (error) {
    console.error('Error saving skill modules:', error);
    throw error;
  }
}

export async function addSkillModule(module) {
  try {
    const modulesService = await import('./modules-service.js');
    return modulesService.addModule(module);
  } catch (error) {
    console.error('Error adding skill module:', error);
    throw error;
  }
}

export async function updateSkillModule(module) {
  try {
    const modulesService = await import('./modules-service.js');
    return modulesService.updateModule(module);
  } catch (error) {
    console.error('Error updating skill module:', error);
    throw error;
  }
}

export async function deleteSkillModule(id) {
  try {
    const modulesService = await import('./modules-service.js');
    return modulesService.deleteModule(id);
  } catch (error) {
    console.error('Error deleting skill module:', error);
    throw error;
  }
}

// Re-export ModuleStore for convenience
export { ModuleStore } from './modules-service.js';

// Clear cache to force reload from file
export function clearDataCache() {
  cachedData = null;
}

// Routine CRUD operations
export async function updateRoutineInDatabase(routine) {
  try {
    return await dbUpdateRoutines(routine);
  } catch (error) {
    console.error('Error updating routine:', error);
    throw error;
  }
}

export async function deleteRoutineFromDatabase(routineId) {
  try {
    return await dbDeleteRoutine(routineId);
  } catch (error) {
    console.error('Error deleting routine:', error);
    throw error;
  }
}
