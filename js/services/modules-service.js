// Skill Modules Service - Handles loading and saving of skill modules
// Uses IndexedDB for persistent storage (offline-capable)
// Falls back to data/skill-modules.json for initial load

import { 
  storeModules, 
  modulesLoad, 
  deleteModule as deleteModuleFromDb
} from './database.js';

let modulesCache = null;

const MODULES_DB_NAME = 'skill_modules';

/**
 * Load all skill modules from IndexedDB or data.json file
 */
export async function loadModules() {
  // Try IndexedDB first
  try {
    const cached = await modulesLoad();
    if (cached && cached.length > 0) {
      modulesCache = cached;
      return cached;
    }
  } catch (error) {
    console.error('Error loading modules from IndexedDB:', error);
  }
  
  // Fall back to data.json file
  try {
    const response = await fetch('./data/skill-modules.json');
    if (!response.ok) throw new Error('Failed to load skill modules');
    
    const data = await response.json();
    const modules = data.modules || [];
    
    // Store in IndexedDB for offline access
    await storeModules(modules);
    modulesCache = modules;
    
    return modules;
  } catch (error) {
    console.error('Error loading skill modules:', error);
    return [];
  }
}

/**
 * Save modules to IndexedDB
 */
export async function saveModules(modules) {
  try {
    await storeModules(modules);
    modulesCache = modules;
    return { success: true, message: 'Saved to IndexedDB' };
  } catch (error) {
    console.error('Error saving skill modules:', error);
    throw error;
  }
}

/**
 * Get a single module by ID
 */
export async function getModuleById(id) {
  const modules = await loadModules();
  return modules.find(m => String(m.id) === String(id));
}

/**
 * Add a new skill module
 */
export async function addModule(module) {
  try {
    const modules = await loadModules();
    
    // Generate new ID (max id + 1, or use string IDs for custom modules)
    const numericIds = modules.filter(m => typeof m.id === 'number');
    let newId;
    
    if (numericIds.length > 0) {
      newId = Math.max(...numericIds.map(m => m.id)) + 1;
    } else {
      newId = modules.length > 0 
        ? Math.max(...modules.map(m => parseInt(m.id) || 0)) + 1
        : 1;
    }
    
    module.id = newId;
    modules.push(module);
    await saveModules(modules);
    
    return { success: true, module };
  } catch (error) {
    console.error('Error adding module:', error);
    throw error;
  }
}

/**
 * Update an existing skill module
 */
export async function updateModule(module) {
  try {
    const modules = await loadModules();
    const index = modules.findIndex(m => String(m.id) === String(module.id));
    
    if (index === -1) {
      throw new Error('Module not found');
    }
    
    modules[index] = module;
    await saveModules(modules);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating module:', error);
    throw error;
  }
}

/**
 * Delete a skill module
 */
export async function deleteModule(id) {
  try {
    const modules = await loadModules();
    const filtered = modules.filter(m => String(m.id) !== String(id));
    
    if (filtered.length === modules.length) {
      throw new Error('Module not found');
    }
    
    await saveModules(filtered);
    return { success: true };
  } catch (error) {
    console.error('Error deleting module:', error);
    throw error;
  }
}

// Export as CRUD store for consistency with other services
export const ModuleStore = {
  async getAll() {
    return loadModules();
  },
  
  async getById(id) {
    return getModuleById(id);
  },
  
  async add(module) {
    return addModule(module);
  },
  
  async update(module) {
    return updateModule(module);
  },
  
  async delete(id) {
    return deleteModule(id);
  }
};

// Get database stats
export async function getModulesStorageStats() {
  return getDatabaseSize();
}
