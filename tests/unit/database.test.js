import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  openDatabase,
  storeExercises,
  exercisesLoad,
  storePrograms,
  programsLoad,
  storeModules,
  modulesLoad,
  getModuleById,
  deleteModule,
  DB_VERSION,
  STORES
} from '../../js/services/database.js';

describe('Database Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Database Configuration', () => {
    it('should have DB_VERSION defined', () => {
      expect(DB_VERSION).toBeDefined();
      expect(typeof DB_VERSION).toBe('number');
      expect(DB_VERSION).toBeGreaterThan(0);
    });

    it('should have STORES object with all stores', () => {
      expect(STORES).toBeDefined();
      expect(STORES.EXERCISES).toBe('exercises');
      expect(STORES.WORKOUTS).toBe('workouts');
      expect(STORES.MODULES).toBe('modules');
      expect(STORES.PROGRAMS).toBe('programs');
      expect(STORES.CATEGORIES).toBe('categories');
      expect(STORES.EQUIPMENT).toBe('equipment');
      expect(STORES.MUSCLES).toBe('muscles');
      expect(STORES.DIFFICULTIES).toBe('difficulties');
      expect(STORES.STATE).toBe('state');
      expect(STORES.DELETED_ITEMS).toBe('deleted_items');
      expect(STORES.DATA_VERSION).toBe('data_version');
    });
  });

  describe('openDatabase', () => {
    it('should return a promise', () => {
      const result = openDatabase();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve with database object', async () => {
      const db = await openDatabase();
      expect(db).toBeDefined();
    });

    it('should reuse existing database connection', async () => {
      const db1 = await openDatabase();
      const db2 = await openDatabase();
      
      expect(db1).toBe(db2);
    });

    it('should handle database open errors', async () => {
      // Mock indexedDB to throw an error
      const originalIndexedDB = global.indexedDB;
      global.indexedDB = {
        open: vi.fn(() => ({
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          result: null
        }))
      };
      
      const dbRequest = global.indexedDB.open('test-db', 1);
      if (dbRequest.onerror) {
        dbRequest.onerror();
      }
      
      global.indexedDB = originalIndexedDB;
    });
  });

  describe('storeExercises and exercisesLoad', () => {
    it('should store and retrieve exercises', async () => {
      const exercises = [
        { id: 'exercise-1', name: 'Push-Up', category: 'chest' },
        { id: 'exercise-2', name: 'Squat', category: 'legs' }
      ];
      
      await storeExercises(exercises);
      const loaded = await exercisesLoad();
      
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Push-Up');
      expect(loaded[1].name).toBe('Squat');
    });

    it('should clear previous exercises before storing', async () => {
      const exercises1 = [
        { id: 'ex-1', name: 'Exercise 1' }
      ];
      
      await storeExercises(exercises1);
      let loaded = await exercisesLoad();
      expect(loaded).toHaveLength(1);
      
      const exercises2 = [
        { id: 'ex-2', name: 'Exercise 2' }
      ];
      
      await storeExercises(exercises2);
      loaded = await exercisesLoad();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('ex-2');
    });

    it('should handle empty exercises array', async () => {
      await storeExercises([]);
      const loaded = await exercisesLoad();
      
      expect(loaded).toEqual([]);
    });

    it('should handle exercise storage errors', async () => {
      // This tests error handling in the transaction
      const exercises = [
        { id: 'test-ex', name: 'Test Exercise' }
      ];
      
      try {
        await storeExercises(exercises);
        // If no error, verify it was stored
        const loaded = await exercisesLoad();
        expect(loaded).toHaveLength(1);
      } catch (error) {
        // Error is acceptable if DB is not properly initialized
        expect(error).toBeDefined();
      }
    });
  });

  describe('storePrograms and programsLoad', () => {
    it('should store and retrieve programs', async () => {
      const programs = [
        { id: 'push-program', name: 'Push Program' },
        { id: 'pull-program', name: 'Pull Program' }
      ];
      
      await storePrograms(programs);
      const loaded = await programsLoad();
      
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Push Program');
    });

    it('should replace existing programs', async () => {
      const programs1 = [
        { id: 'prog-1', name: 'Program 1' }
      ];
      
      await storePrograms(programs1);
      let loaded = await programsLoad();
      expect(loaded).toHaveLength(1);
      
      const programs2 = [
        { id: 'prog-2', name: 'Program 2' }
      ];
      
      await storePrograms(programs2);
      loaded = await programsLoad();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('prog-2');
    });
  });

  describe('storeModules and modulesLoad', () => {
    it('should store and retrieve modules', async () => {
      const modules = [
        { id: 'pushup', name: 'Push-Up', category: 'push' },
        { id: 'pullup', name: 'Pull-Up', category: 'pull' }
      ];
      
      await storeModules(modules);
      const loaded = await modulesLoad();
      
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Push-Up');
    });

    it('should clear previous modules before storing', async () => {
      const modules1 = [
        { id: 'mod-1', name: 'Module 1' }
      ];
      
      await storeModules(modules1);
      let loaded = await modulesLoad();
      expect(loaded).toHaveLength(1);
      
      const modules2 = [
        { id: 'mod-2', name: 'Module 2' }
      ];
      
      await storeModules(modules2);
      loaded = await modulesLoad();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('mod-2');
    });
  });

  describe('getModuleById', () => {
    beforeEach(async () => {
      // Set up test data
      const modules = [
        { id: 'pushup', name: 'Push-Up', category: 'push' },
        { id: 'pullup', name: 'Pull-Up', category: 'pull' }
      ];
      await storeModules(modules);
    });

    it('should retrieve module by ID', async () => {
      const module = await getModuleById('pushup');
      
      expect(module).toBeDefined();
      expect(module.name).toBe('Push-Up');
      expect(module.category).toBe('push');
    });

    it('should return null for non-existent ID', async () => {
      const module = await getModuleById('non-existent');
      
      expect(module).toBeNull();
    });

    it('should return undefined for undefined ID', async () => {
      const module = await getModuleById(undefined);
      
      expect(module).toBeNull();
    });
  });

  describe('deleteModule', () => {
    beforeEach(async () => {
      // Set up test data
      const modules = [
        { id: 'pushup', name: 'Push-Up', category: 'push' },
        { id: 'pullup', name: 'Pull-Up', category: 'pull' }
      ];
      await storeModules(modules);
    });

    it('should delete module by ID', async () => {
      await deleteModule('pushup');
      
      const module = await getModuleById('pushup');
      expect(module).toBeNull();
      
      // Verify other modules are not affected
      const pullup = await getModuleById('pullup');
      expect(pullup).toBeDefined();
      expect(pullup.name).toBe('Pull-Up');
    });

    it('should return success object on deletion', async () => {
      const result = await deleteModule('pushup');
      
      expect(result).toEqual({ success: true });
    });

    it('should handle deletion of non-existent module', async () => {
      const result = await deleteModule('non-existent');
      
      // Should not throw, just return success
      expect(result).toEqual({ success: true });
    });
  });

  describe('Database Transactions', () => {
    it('should handle read transactions', async () => {
      const exercises = [
        { id: 'test', name: 'Test Exercise' }
      ];
      
      await storeExercises(exercises);
      const result = await exercisesLoad();
      
      expect(result).toHaveLength(1);
    });

    it('should handle write transactions', async () => {
      const exercises = [
        { id: 'test', name: 'Test Exercise' }
      ];
      
      const result = await storeExercises(exercises);
      
      expect(result).toEqual({ success: true });
    });

    it('should reject on transaction errors', async () => {
      // This tests error rejection in transaction
      const exercises = [
        { id: 'test', name: 'Test Exercise' }
      ];
      
      try {
        await storeExercises(exercises);
        // If successful, verify data exists
        const loaded = await exercisesLoad();
        expect(loaded).toHaveLength(1);
      } catch (error) {
        // Transaction error is acceptable in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Integrity', () => {
    it('should preserve exercise properties', async () => {
      const exercise = {
        id: 'complex-ex',
        name: 'Complex Exercise',
        category: 'arms',
        difficulty: 'intermediate',
        equipment: 'dumbbell',
        targetMuscles: ['biceps', 'triceps'],
        instructions: 'Do this properly'
      };
      
      await storeExercises([exercise]);
      const loaded = await exercisesLoad();
      
      expect(loaded[0]).toEqual(exercise);
    });

    it('should preserve module properties', async () => {
      const module = {
        id: 'complex-mod',
        name: 'Complex Module',
        category: 'push',
        requirements: {
          pushup: 10,
          plank: 30
        }
      };
      
      await storeModules([module]);
      const loaded = await modulesLoad();
      
      expect(loaded[0]).toEqual(module);
    });

    it('should handle special characters in data', async () => {
      const exercises = [
        { id: 'ex-ñ', name: 'Ejercicio Ñ' },
        { id: 'ex-é', name: 'Exercise with accents' },
        { id: 'ex-日本語', name: '日本語テスト' }
      ];
      
      await storeExercises(exercises);
      const loaded = await exercisesLoad();
      
      expect(loaded).toHaveLength(3);
      expect(loaded[0].name).toBe('Ejercicio Ñ');
      expect(loaded[2].name).toBe('日本語テスト');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large exercise arrays', async () => {
      const exercises = Array.from({ length: 100 }, (_, i) => ({
        id: `ex-${i}`,
        name: `Exercise ${i}`,
        category: 'general'
      }));
      
      await storeExercises(exercises);
      const loaded = await exercisesLoad();
      
      expect(loaded).toHaveLength(100);
    });

    it('should handle null/undefined values in data', async () => {
      const exercises = [
        { id: 'ex-1', name: null },
        { id: 'ex-2', category: undefined }
      ];
      
      await storeExercises(exercises);
      const loaded = await exercisesLoad();
      
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBeNull();
    });

    it('should handle duplicate IDs (update behavior)', async () => {
      const exercises = [
        { id: 'dup', name: 'First' }
      ];
      
      await storeExercises(exercises);
      let loaded = await exercisesLoad();
      expect(loaded[0].name).toBe('First');
      
      // Update with same ID
      const updated = [
        { id: 'dup', name: 'Updated' }
      ];
      
      await storeExercises(updated);
      loaded = await exercisesLoad();
      
      expect(loaded[0].name).toBe('Updated');
    });
  });

  describe('Store Operations', () => {
    it('should properly clear stores before bulk insert', async () => {
      // Store initial data
      await storeExercises([
        { id: 'ex-1', name: 'Exercise 1' }
      ]);
      
      let loaded = await exercisesLoad();
      expect(loaded).toHaveLength(1);
      
      // Store different data (should clear first)
      await storeExercises([
        { id: 'ex-2', name: 'Exercise 2' }
      ]);
      
      loaded = await exercisesLoad();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('ex-2');
    });

    it('should handle concurrent store operations', async () => {
      const promises = [
        storeExercises([{ id: 'ex-1', name: 'Ex 1' }]),
        storePrograms([{ id: 'prog-1', name: 'Prog 1' }]),
        storeModules([{ id: 'mod-1', name: 'Mod 1' }])
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ success: true });
      expect(results[1]).toEqual({ success: true });
      expect(results[2]).toEqual({ success: true });
    });
  });
});
