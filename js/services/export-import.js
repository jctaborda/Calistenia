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

    // Validate import format
    if (!importData.version || !importData.workouts || !Array.isArray(importData.workouts)) {
      throw new Error('Invalid import file format');
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
          stats.errors.push(`Failed to import workout ${workout.id}: ${error.message}`);
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
            stats.errors.push(`Failed to import program ${program.id}: ${error.message}`);
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
            stats.errors.push(`Failed to import module ${module.id}: ${error.message}`);
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
    return {
      success: false,
      error: error.message || 'Failed to import data',
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
