import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  openDatabase,
  storeExercises,
  exercisesLoad,
  storeRoutines,
  routinesLoad,
  storeModules,
  modulesLoad,
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
      expect(STORES.ROUTINES).toBe('routines');
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
      expect(db.objectStoreNames).toBeDefined();
    });

    it('should reuse existing database connection', async () => {
      const db1 = await openDatabase();
      const db2 = await openDatabase();
      expect(db1).toBe(db2);
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
      await storeExercises([{ id: 'ex-1', name: 'Exercise 1' }]);
      let loaded = await exercisesLoad();
      expect(loaded).toHaveLength(1);
      
      await storeExercises([{ id: 'ex-2', name: 'Exercise 2' }]);
      loaded = await exercisesLoad();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('ex-2');
    });

    it('should handle empty exercises array', async () => {
      await storeExercises([]);
      const loaded = await exercisesLoad();
      expect(loaded).toEqual([]);
    });
  });

  describe('storeRoutines and routinesLoad', () => {
    it('should store and retrieve routines', async () => {
      const routines = [
        { id: 'push-routine', name: 'Push Routine' },
        { id: 'pull-routine', name: 'Pull Routine' }
      ];
      
      await storeRoutines(routines);
      const loaded = await routinesLoad();
      
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Push Routine');
    });

    it('should replace existing routines', async () => {
      await storeRoutines([{ id: 'routine-1', name: 'Routine 1' }]);
      let loaded = await routinesLoad();
      expect(loaded).toHaveLength(1);
      
      await storeRoutines([{ id: 'routine-2', name: 'Routine 2' }]);
      loaded = await routinesLoad();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('routine-2');
    });
  });

  describe('storeModules and modulesLoad', () => {
    it('should store and retrieve modules', async () => {
      const modulesData = {
        en: { modules: [{ id: 'pushup', name: 'Push-Up', category: 'push' }] },
        es: { modules: [{ id: 'pushup', name: 'Flexión', category: 'push' }] }
      };
      
      await storeModules(modulesData);
      const loaded = await modulesLoad();
      
      expect(loaded).toBeDefined();
      expect(loaded.modules).toBeDefined();
    });

    it('should return empty modules when nothing stored', async () => {
      const loaded = await modulesLoad();
      expect(loaded).toEqual({ modules: [], es: {} });
    });
  });

  describe('Database Transactions', () => {
    it('should handle read transactions', async () => {
      await storeExercises([{ id: 'test', name: 'Test Exercise' }]);
      const result = await exercisesLoad();
      expect(result).toHaveLength(1);
    });

    it('should handle write transactions', async () => {
      const result = await storeExercises([{ id: 'test', name: 'Test Exercise' }]);
      expect(result).toEqual({ success: true });
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

    it('should handle duplicate IDs (update behavior)', async () => {
      await storeExercises([{ id: 'dup', name: 'First' }]);
      let loaded = await exercisesLoad();
      expect(loaded[0].name).toBe('First');
      
      await storeExercises([{ id: 'dup', name: 'Updated' }]);
      loaded = await exercisesLoad();
      
      expect(loaded[0].name).toBe('Updated');
    });
  });

  describe('Store Operations', () => {
    it('should properly clear stores before bulk insert', async () => {
      await storeExercises([{ id: 'ex-1', name: 'Exercise 1' }]);
      let loaded = await exercisesLoad();
      expect(loaded).toHaveLength(1);
      
      await storeExercises([{ id: 'ex-2', name: 'Exercise 2' }]);
      loaded = await exercisesLoad();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('ex-2');
    });
  });
});
