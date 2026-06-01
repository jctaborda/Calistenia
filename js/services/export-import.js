// Export/Import Service - JSON backup and restore functionality
import { 
  loadWorkouts, 
  storeWorkout, 
  deleteWorkout,
  clearDatabase,
  programsLoad,
  storePrograms,
  modulesLoad,
  storeModules,
  getDatabaseSize
} from './database.js';

const EXPORT_VERSION = '1.0';
const EXPORT_TIMESTAMP = new Date().toISOString();

/**
 * JSON Schema definition for data export/import validation
 */
const DATA_SCHEMA = {
  version: {
    type: 'string',
    required: true,
    allowedValues: ['1.0']
  },
  exportedAt: {
    type: 'string',
    required: true,
    format: 'iso-date'
  },
  appVersion: {
    type: 'string',
    required: false
  },
  workouts: {
    type: 'array',
    required: true,
    itemSchema: {
      id: { type: 'string|number', required: true },
      program: { type: 'object', required: true },
      date: { type: 'string', required: true, format: 'iso-date' },
      exercises: { 
        type: 'array', 
        required: true,
        itemSchema: {
          exerciseId: { type: 'string|number', required: true },
          exerciseName: { type: 'string', required: true },
          targetSets: { type: 'number', required: true, min: 1 },
          targetReps: { type: 'number', required: true, min: 0 },
          actualReps: { type: 'array', required: false, itemSchema: { type: 'number' } }
        }
      },
      setHistory: { type: 'array', required: false }
    }
  },
  programs: {
    type: 'array',
    required: false,
    itemSchema: {
      id: { type: 'string|number', required: true },
      name: { type: 'string', required: true },
      exercises: { type: 'array', required: true },
      warmup: { type: 'object', required: false },
      cooldown: { type: 'object', required: false }
    }
  },
  skillModules: {
    type: 'array',
    required: false,
    itemSchema: {
      id: { type: 'string|number', required: true },
      name: { type: 'string', required: true },
      category: { type: 'string', required: true },
      description: { type: 'string', required: true },
      requirements: { type: 'array', required: true },
      unlocked: { type: 'boolean', required: false }
    }
  }
};

/**
 * Validate data against JSON schema
 * @param {object} data - Data to validate
 * @param {object} schema - Schema definition
 * @param {string} path - Current path in data structure (for error messages)
 * @returns {object} Validation result with success flag and errors array
 */
function validateSchema(data, schema, path = 'root') {
  const errors = [];
  
  // Check required fields
  if (schema.required) {
    if (data === undefined || data === null) {
      errors.push(`${path}: Required field is missing`);
      return { success: false, errors };
    }
  }
  
  // Type checking
  if (data !== undefined && data !== null && schema.type) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    
    if (schema.type.includes('|')) {
      // Multiple allowed types (e.g., 'string|number')
      const allowedTypes = schema.type.split('|');
      if (!allowedTypes.includes(actualType)) {
        errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
        return { success: false, errors };
      }
    } else {
      if (schema.type !== actualType) {
        errors.push(`${path}: Expected ${schema.type}, got ${actualType}`);
        return { success: false, errors };
      }
    }
  }
  
  // Format validation (e.g., ISO date)
  if (schema.format === 'iso-date') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (!dateRegex.test(data)) {
      errors.push(`${path}: Invalid ISO date format`);
      return { success: false, errors };
    }
  }
  
  // Allowed values check
  if (schema.allowedValues && !schema.allowedValues.includes(data)) {
    errors.push(`${path}: Value '${data}' not in allowed list: [${schema.allowedValues.join(', ')}]`);
    return { success: false, errors };
  }
  
  // Min value check for numbers
  if (schema.type === 'number' && schema.min !== undefined && data < schema.min) {
    errors.push(`${path}: Value ${data} is less than minimum ${schema.min}`);
    return { success: false, errors };
  }
  
  // Array item validation
  if (schema.type === 'array' && schema.itemSchema && Array.isArray(data)) {
    data.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      const itemValidation = validateSchema(item, schema.itemSchema, itemPath);
      if (!itemValidation.success) {
        errors.push(...itemValidation.errors);
      }
    });
  }
  
  // Object field validation
  if (schema.type === 'object' && schema.fieldSchema && typeof data === 'object') {
    for (const [field, fieldSchema] of Object.entries(schema.fieldSchema)) {
      const fieldPath = `${path}.${field}`;
      const fieldValue = data[field];
      const fieldValidation = validateSchema(fieldValue, fieldSchema, fieldPath);
      if (!fieldValidation.success) {
        errors.push(...fieldValidation.errors);
      }
    }
  }
  
  return { success: errors.length === 0, errors };
}

/**
 * Validate import data against the schema
 * @param {object} importData - Data to validate
 * @returns {object} Validation result with success flag and detailed errors
 */
function validateImportData(importData) {
  const validation = validateSchema(importData, DATA_SCHEMA);
  
  // Additional custom validations
  if (validation.success) {
    // Check version compatibility
    if (importData.version !== EXPORT_VERSION) {
      validation.errors.push(
        `Version mismatch: File version '${importData.version}' not compatible with app version '${EXPORT_VERSION}'`
      );
      validation.success = false;
    }
    
    // Validate workouts array is not empty if required
    if (importData.workouts && !Array.isArray(importData.workouts)) {
      validation.errors.push('workouts must be an array');
      validation.success = false;
    }
    
    // Validate programs array if present
    if (importData.programs !== undefined && !Array.isArray(importData.programs)) {
      validation.errors.push('programs must be an array');
      validation.success = false;
    }
    
    // Validate skillModules array if present
    if (importData.skillModules !== undefined && !Array.isArray(importData.skillModules)) {
      validation.errors.push('skillModules must be an array');
      validation.success = false;
    }
  }
  
  return validation;
}

/**
 * Export all user data to JSON format
 * Includes: workouts, programs (custom routines), skill modules
 */
export async function exportUserData() {
  try {
    const [workouts, programs, modules] = await Promise.all([
      loadWorkouts(),
      programsLoad(),
      modulesLoad()
    ]);

    const exportData = {
      version: EXPORT_VERSION,
      exportedAt: EXPORT_TIMESTAMP,
      appVersion: 'Calisthenics Mastery v1.0',
      workouts: workouts,
      programs: programs,
      skillModules: modules
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
}

/**
 * Import user data from JSON backup file
 * Returns object with import statistics and potential conflicts
 */
export async function importUserData(jsonData) {
  try {
    const importData = typeof jsonData === 'string' 
      ? JSON.parse(jsonData) 
      : jsonData;

    // Validate import data against schema
    const validation = validateImportData(importData);
    
    if (!validation.success) {
      const errorMsg = validation.errors.join('\n');
      console.error('Import validation failed:', validation.errors);
      return {
        success: false,
        error: 'Invalid import file: ' + errorMsg,
        validationErrors: validation.errors,
        stats: null
      };
    }

    const stats = {
      workouts: { imported: 0, skipped: 0 },
      programs: { imported: 0, skipped: 0 },
      skillModules: { imported: 0, skipped: 0 },
      errors: []
    };

    // Import workouts (avoid duplicate IDs)
    const existingWorkouts = await loadWorkouts();
    const existingWorkoutIds = new Set(existingWorkouts.map(w => w.id));

    for (const workout of importData.workouts) {
      if (existingWorkoutIds.has(workout.id)) {
        stats.workouts.skipped++;
      } else {
        try {
          await storeWorkout(workout);
          stats.workouts.imported++;
        } catch (error) {
          const errorMsg = `Failed to import workout ${workout.id}: ${error.message}`;
          stats.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
    }

    // Import programs (custom routines)
    if (importData.programs && Array.isArray(importData.programs)) {
      const existingPrograms = await programsLoad();
      const existingProgramIds = new Set(existingPrograms.map(p => String(p.id)));

      for (const program of importData.programs) {
        if (existingProgramIds.has(String(program.id))) {
          stats.programs.skipped++;
        } else {
          try {
            await storePrograms([...existingPrograms, program]);
            stats.programs.imported++;
          } catch (error) {
            const errorMsg = `Failed to import program ${program.id}: ${error.message}`;
            stats.errors.push(errorMsg);
            console.error(errorMsg, error);
          }
        }
      }
    }

    // Import skill modules
    if (importData.skillModules && Array.isArray(importData.skillModules)) {
      const existingModules = await modulesLoad();
      const existingModuleIds = new Set(existingModules.map(m => String(m.id)));

      for (const module of importData.skillModules) {
        if (existingModuleIds.has(String(module.id))) {
          stats.skillModules.skipped++;
        } else {
          try {
            await storeModules([...existingModules, module]);
            stats.skillModules.imported++;
          } catch (error) {
            const errorMsg = `Failed to import module ${module.id}: ${error.message}`;
            stats.errors.push(errorMsg);
            console.error(errorMsg, error);
          }
        }
      }
    }

    // Check for data size warning
    const dbSize = await getDatabaseSize();
    if (dbSize.workoutCount > 1000) {
      stats.warning = 'Large database: Consider clearing old workouts';
    }

    return {
      success: true,
      stats: stats
    };
  } catch (error) {
    console.error('Error importing data:', error);
    
    // Check if it's a JSON parse error
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Invalid JSON format: ' + error.message,
        validationErrors: [`JSON parse error: ${error.message}`],
        stats: null
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to import data',
      validationErrors: [],
      stats: null
    };
  }
}

/**
 * Create and download export file
 */
export async function downloadExport(filename = 'calisthenics-backup.json') {
  try {
    const jsonData = await exportUserData();
    
    // Create blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading export:', error);
    throw new Error('Failed to download backup file');
  }
}

/**
 * Read and parse uploaded file
 */
export async function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Import from uploaded file
 */
export async function importFromFile(file) {
  try {
    const jsonData = await readImportFile(file);
    return await importUserData(jsonData);
  } catch (error) {
    console.error('Error reading import file:', error);
    throw new Error('Failed to read backup file');
  }
}

/**
 * Get export metadata without downloading
 */
export async function getExportMetadata() {
  try {
    const jsonData = await exportUserData();
    const data = JSON.parse(jsonData);
    
    return {
      version: data.version,
      exportedAt: data.exportedAt,
      workoutCount: data.workouts.length,
      programCount: data.programs.length,
      moduleCount: data.skillModules.length,
      fileSize: new Blob([jsonData]).size
    };
  } catch (error) {
    console.error('Error getting export metadata:', error);
    throw new Error('Failed to get export information');
  }
}

/**
 * Delete all user data (workouts, custom programs, modules)
 * Keeps app settings and reference data intact
 */
export async function clearUserData() {
  try {
    const workouts = await loadWorkouts();
    const programs = await programsLoad();
    const modules = await modulesLoad();

    // Delete all workouts
    for (const workout of workouts) {
      await deleteWorkout(workout.id);
    }

    // Clear programs and modules (keep reference data in database.js)
    await storePrograms([]);
    await storeModules([]);

    return {
      success: true,
      deleted: {
        workouts: workouts.length,
        programs: programs.length,
        modules: modules.length
      }
    };
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw new Error('Failed to clear user data');
  }
}
