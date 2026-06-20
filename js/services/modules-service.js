// Skill Modules Service - Handles loading and saving of skill modules
// Uses IndexedDB for persistent storage (offline-capable)
// Loads the language-appropriate JSON file on first run, then all operations
// happen in IndexedDB only. admin.html writes JSON files directly.

import { 
  storeModules, 
  modulesLoad
} from './database.js';
import { show } from './toast-service.js';
import { getState } from './state.js';

let modulesCache = null;

const LANG_MAP = { es: 'skill-modules-es.json', en: 'skill-modules.json' };

/**
 * Load all skill modules from IndexedDB or the language-appropriate JSON file.
 * Returns the modules array (en modules regardless of locale for the PWA).
 */
export async function loadModules() {
  // Try IndexedDB first
  try {
    const cached = await modulesLoad();
    if (cached && cached.en && cached.en.modules && cached.en.modules.length > 0) {
      modulesCache = cached.en.modules;
      return cached.en.modules;
    }
  } catch (error) {
    console.error('Error loading modules from IndexedDB:', error);
  }
  
  // Fall back to the language-appropriate JSON file, store in IndexedDB
  try {
    const locale = (getState().locale || 'en').toLowerCase();
    const file = LANG_MAP[locale] || 'skill-modules.json';
    const response = await fetch(`/data/${file}`);
    if (!response.ok) throw new Error('Failed to load skill modules');
    
    const data = await response.json();
    const modules = data.modules || [];
    
    // Store in IndexedDB for offline access
    await storeModules({ en: data, es: {} });
    modulesCache = modules;
    
    return modules;
  } catch (error) {
    console.error('Error loading skill modules:', error);
    show('Failed to load skill modules. Using default modules.', 'warning');
    return [];
  }
}

/**
 * Save modules to IndexedDB only (not to JSON files).
 */
export async function saveModules(modules) {
  try {
    // Load existing ES data from cache or IndexedDB to preserve it
    let esData = {};
    try {
      const cached = await modulesLoad();
      if (cached && cached.es) {
        esData = cached.es;
      }
    } catch (e) { /* ignore */ }
    
    const data = { en: { modules }, es: esData };
    await storeModules(data);
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
    
    // Generate new ID (max numeric id + 1)
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
