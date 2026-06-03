import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  exportUserData,
  importUserData,
  downloadExport,
  readImportFile,
  importFromFile,
  getExportMetadata,
  clearUserData
} from '../../js/services/export-import.js';

// Mock database functions
vi.mock('../../js/services/database.js', () => ({
  loadWorkouts: vi.fn(),
  storeWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
  clearDatabase: vi.fn(),
  programsLoad: vi.fn(),
  storePrograms: vi.fn(),
  modulesLoad: vi.fn(),
  storeModules: vi.fn(),
  getDatabaseSize: vi.fn()
}));

const {
  loadWorkouts,
  storeWorkout,
  deleteWorkout,
  clearDatabase,
  programsLoad,
  storePrograms,
  modulesLoad,
  storeModules,
  getDatabaseSize
} = await vi.importActual('../../js/services/database.js');

describe('Export/Import Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('exportUserData', () => {
    it('should export workouts, programs, and modules', async () => {
      const mockWorkouts = [
        { id: 'workout-1', date: '2024-01-01', program: {}, exercises: [] }
      ];
      const mockPrograms = [
        { id: 'prog-1', name: 'Test Program', exercises: [] }
      ];
      const mockModules = [
        { id: 'mod-1', name: 'Test Module', category: 'push' }
      ];

      vi.mocked(loadWorkouts).mockResolvedValue(mockWorkouts);
      vi.mocked(programsLoad).mockResolvedValue(mockPrograms);
      vi.mocked(modulesLoad).mockResolvedValue(mockModules);

      const result = await exportUserData();
      const data = JSON.parse(result);

      expect(data.version).toBe('1.0');
      expect(data.exportedAt).toBeDefined();
      expect(data.appVersion).toBe('Calisthenics Mastery v1.0');
      expect(data.workouts).toEqual(mockWorkouts);
      expect(data.programs).toEqual(mockPrograms);
      expect(data.skillModules).toEqual(mockModules);
    });

    it('should handle empty data', async () => {
      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);

      const result = await exportUserData();
      const data = JSON.parse(result);

      expect(data.workouts).toEqual([]);
      expect(data.programs).toEqual([]);
      expect(data.skillModules).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      vi.mocked(loadWorkouts).mockRejectedValue(new Error('DB Error'));

      await expect(exportUserData()).rejects.toThrow('Failed to export data');
    });
  });

  describe('importUserData', () => {
    it('should import valid JSON data', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [
          { id: 'workout-1', date: '2024-01-01', program: {}, exercises: [] }
        ],
        programs: [
          { id: 'prog-1', name: 'Imported Program', exercises: [] }
        ],
        skillModules: [
          { id: 'mod-1', name: 'Imported Module', category: 'push' }
        ]
      };

      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(storeWorkout).mockResolvedValue({ success: true });
      vi.mocked(storePrograms).mockResolvedValue({ success: true });
      vi.mocked(storeModules).mockResolvedValue({ success: true });
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1 });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
      expect(result.stats.workouts.imported).toBe(1);
      expect(result.stats.programs.imported).toBe(1);
      expect(result.stats.skillModules.imported).toBe(1);
    });

    it('should reject invalid JSON schema', async () => {
      const invalidData = {
        version: '2.0', // Wrong version
        exportedAt: 'invalid-date',
        workouts: 'not-an-array' // Should be array
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid import file');
      expect(result.validationErrors).toHaveLengthGreaterThan(0);
    });

    it('should reject wrong version', async () => {
      const importData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        workouts: []
      };

      const result = await importUserData(importData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Version mismatch');
    });

    it('should skip duplicate workout IDs', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [
          { id: 'existing-workout', date: '2024-01-01', program: {}, exercises: [] }
        ],
        programs: [],
        skillModules: []
      };

      vi.mocked(loadWorkouts).mockResolvedValue([
        { id: 'existing-workout', date: '2024-01-01', program: {}, exercises: [] }
      ]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1 });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
      expect(result.stats.workouts.imported).toBe(0);
      expect(result.stats.workouts.skipped).toBe(1);
    });

    it('should handle JSON string input', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [],
        programs: [],
        skillModules: []
      };

      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1 });

      const result = await importUserData(JSON.stringify(importData));

      expect(result.success).toBe(true);
    });

    it('should handle invalid JSON string', async () => {
      const result = await importUserData('not valid json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });

    it('should track import errors', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [
          { id: 'workout-1', date: '2024-01-01', program: {}, exercises: [] },
          { id: 'workout-2', date: '2024-01-02', program: {}, exercises: [] }
        ],
        programs: [],
        skillModules: []
      };

      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(storeWorkout)
        .mockResolvedValue({ success: true })
        .mockRejectedValueOnce(new Error('Import failed'));
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1 });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
      expect(result.stats.workouts.imported).toBe(1);
      expect(result.stats.errors).toHaveLength(1);
    });

    it('should handle large database warning', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [],
        programs: [],
        skillModules: []
      };

      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1500 });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
      expect(result.stats.warning).toBe('Large database: Consider clearing old workouts');
    });

    it('should handle missing optional fields', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: []
        // No programs or skillModules
      };

      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1 });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
      expect(result.stats.programs.imported).toBe(0);
      expect(result.stats.skillModules.imported).toBe(0);
    });
  });

  describe('downloadExport', () => {
    it('should create and download JSON file', async () => {
      const mockJson = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [],
        programs: [],
        skillModules: []
      });

      vi.mocked(exportUserData).mockResolvedValue(mockJson);

      // Mock DOM elements
      global.document.createElement = vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      }));
      global.document.body = {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      };
      global.URL = {
        createObjectURL: vi.fn(() => 'mock-url'),
        revokeObjectURL: vi.fn()
      };

      const result = await downloadExport('test-backup.json');

      expect(result.success).toBe(true);
    });

    it('should handle download errors', async () => {
      vi.mocked(exportUserData).mockRejectedValue(new Error('Export failed'));

      await expect(downloadExport())
        .rejects
        .toThrow('Failed to download backup file');
    });
  });

  describe('readImportFile', () => {
    it('should parse valid JSON file', async () => {
      const mockFile = {
        text: () => Promise.resolve(JSON.stringify({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          workouts: []
        }))
      };

      const result = await readImportFile(mockFile);

      expect(result.version).toBe('1.0');
      expect(result.workouts).toEqual([]);
    });

    it('should reject invalid JSON file', async () => {
      const mockFile = {
        text: () => Promise.resolve('not valid json')
      };

      await expect(readImportFile(mockFile))
        .rejects
        .toThrow('Invalid JSON file');
    });
  });

  describe('importFromFile', () => {
    it('should import from valid file', async () => {
      const mockFile = {
        text: () => Promise.resolve(JSON.stringify({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          workouts: [],
          programs: [],
          skillModules: []
        }))
      };

      vi.mocked(importUserData).mockResolvedValue({
        success: true,
        stats: {
          workouts: { imported: 0, skipped: 0 },
          programs: { imported: 0, skipped: 0 },
          skillModules: { imported: 0, skipped: 0 },
          errors: []
        }
      });

      const result = await importFromFile(mockFile);

      expect(result.success).toBe(true);
    });

    it('should handle file read errors', async () => {
      const mockFile = {
        text: () => Promise.reject(new Error('Read failed'))
      };

      await expect(importFromFile(mockFile))
        .rejects
        .toThrow('Failed to read backup file');
    });
  });

  describe('getExportMetadata', () => {
    it('should return export metadata', async () => {
      const mockJson = JSON.stringify({
        version: '1.0',
        exportedAt: '2024-01-01T00:00:00.000Z',
        workouts: [
          { id: '1', date: '2024-01-01', program: {}, exercises: [] },
          { id: '2', date: '2024-01-02', program: {}, exercises: [] }
        ],
        programs: [
          { id: 'prog-1', name: 'Program 1', exercises: [] },
          { id: 'prog-2', name: 'Program 2', exercises: [] }
        ],
        skillModules: [
          { id: 'mod-1', name: 'Module 1', category: 'push' }
        ]
      });

      vi.mocked(exportUserData).mockResolvedValue(mockJson);

      const metadata = await getExportMetadata();

      expect(metadata.version).toBe('1.0');
      expect(metadata.exportedAt).toBe('2024-01-01T00:00:00.000Z');
      expect(metadata.workoutCount).toBe(2);
      expect(metadata.programCount).toBe(2);
      expect(metadata.moduleCount).toBe(1);
      expect(metadata.fileSize).toBeGreaterThan(0);
    });

    it('should handle export errors', async () => {
      vi.mocked(exportUserData).mockRejectedValue(new Error('Export failed'));

      await expect(getExportMetadata())
        .rejects
        .toThrow('Failed to get export information');
    });
  });

  describe('clearUserData', () => {
    it('should delete all workouts, programs, and modules', async () => {
      const mockWorkouts = [
        { id: 'workout-1' },
        { id: 'workout-2' }
      ];
      const mockPrograms = [
        { id: 'prog-1' },
        { id: 'prog-2' }
      ];
      const mockModules = [
        { id: 'mod-1' }
      ];

      vi.mocked(loadWorkouts).mockResolvedValue(mockWorkouts);
      vi.mocked(programsLoad).mockResolvedValue(mockPrograms);
      vi.mocked(modulesLoad).mockResolvedValue(mockModules);
      vi.mocked(deleteWorkout).mockResolvedValue({ success: true });
      vi.mocked(storePrograms).mockResolvedValue({ success: true });
      vi.mocked(storeModules).mockResolvedValue({ success: true });

      const result = await clearUserData();

      expect(result.success).toBe(true);
      expect(result.deleted.workouts).toBe(2);
      expect(result.deleted.programs).toBe(2);
      expect(result.deleted.modules).toBe(1);
    });

    it('should handle empty data', async () => {
      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(storePrograms).mockResolvedValue({ success: true });
      vi.mocked(storeModules).mockResolvedValue({ success: true });

      const result = await clearUserData();

      expect(result.success).toBe(true);
      expect(result.deleted.workouts).toBe(0);
      expect(result.deleted.programs).toBe(0);
      expect(result.deleted.modules).toBe(0);
    });

    it('should throw error on failure', async () => {
      vi.mocked(loadWorkouts).mockRejectedValue(new Error('DB Error'));

      await expect(clearUserData())
        .rejects
        .toThrow('Failed to clear user data');
    });
  });

  describe('Schema Validation', () => {
    it('should validate required version field', async () => {
      const invalidData = {
        exportedAt: new Date().toISOString(),
        workouts: []
        // Missing version
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Required field is missing');
    });

    it('should validate required exportedAt field', async () => {
      const invalidData = {
        version: '1.0',
        workouts: []
        // Missing exportedAt
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
    });

    it('should validate workouts is array', async () => {
      const invalidData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: 'not-an-array'
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
    });

    it('should validate workout exercise structure', async () => {
      const invalidData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [
          {
            id: 'workout-1',
            date: '2024-01-01',
            program: {},
            exercises: [
              {
                exerciseId: '1',
                // Missing required exerciseName
                targetSets: 3,
                targetReps: 10
              }
            ]
          }
        ],
        programs: [],
        skillModules: []
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
    });

    it('should validate date format', async () => {
      const invalidData = {
        version: '1.0',
        exportedAt: 'not-a-date',
        workouts: []
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ISO date format');
    });

    it('should validate number min values', async () => {
      const invalidData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [
          {
            id: 'workout-1',
            date: '2024-01-01',
            program: {},
            exercises: [
              {
                exerciseId: '1',
                exerciseName: 'Push-Up',
                targetSets: 3,
                targetReps: -1 // Negative reps
              }
            ]
          }
        ],
        programs: [],
        skillModules: []
      };

      const result = await importUserData(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large export data', async () => {
      const largeWorkouts = Array.from({ length: 1000 }, (_, i) => ({
        id: `workout-${i}`,
        date: '2024-01-01',
        program: {},
        exercises: []
      }));

      vi.mocked(loadWorkouts).mockResolvedValue(largeWorkouts);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);

      const result = await exportUserData();
      const data = JSON.parse(result);

      expect(data.workouts).toHaveLength(1000);
    });

    it('should handle special characters in data', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workouts: [
          {
            id: 'workout-ñ',
            date: '2024-01-01',
            program: { name: 'Programo de Empuje' },
            exercises: [
              {
                exerciseId: '1',
                exerciseName: 'Push-Up (Flexiones)',
                targetSets: 3,
                targetReps: 10
              }
            ]
          }
        ],
        programs: [],
        skillModules: []
      };

      vi.mocked(loadWorkouts).mockResolvedValue([]);
      vi.mocked(programsLoad).mockResolvedValue([]);
      vi.mocked(modulesLoad).mockResolvedValue([]);
      vi.mocked(storeWorkout).mockResolvedValue({ success: true });
      vi.mocked(getDatabaseSize).mockResolvedValue({ workoutCount: 1 });

      const result = await importUserData(importData);

      expect(result.success).toBe(true);
    });

    it('should handle null/undefined values gracefully', async () => {
      const importData = {
        version: '1.0',
        exportedAt: null,
        workouts: undefined
      };

      const result = await importUserData(importData);

      expect(result.success).toBe(false);
    });
  });
});
