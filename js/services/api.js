// PWA Offline Data Loading with i18n support - loads locale-specific data files
// No server endpoints needed - works offline as a progressive web app
// Uses data.json for English, data-es.json for Spanish
import { 
  loadAllExercises, 
  loadAllCategories, 
  loadAllEquipment, 
  loadAllMuscles, 
  loadAllDifficulties,
  loadAllRoutines
} from './data-cache.js';
import { updateRoutines as dbUpdateRoutines, deleteRoutine as dbDeleteRoutine } from './database.js';

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

// AI Config API
export async function fetchAIConfigs() {
  try {
    const aiConfigService = await import('./ai-config-service.js');
    return aiConfigService.loadAIConfigs();
  } catch (error) {
    console.error('Error fetching AI configs:', error);
    return [];
  }
}

// Re-export ModuleStore for convenience
export { ModuleStore } from './modules-service.js';

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
