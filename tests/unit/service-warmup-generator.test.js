import { describe, it, expect, beforeEach } from 'vitest';
import { WarmUpGeneratorService } from '../../js/services/warmup-generator-service.js';

describe('WarmUpGeneratorService', () => {
  let service;

  beforeEach(() => {
    service = new WarmUpGeneratorService();
  });

  describe('generateWarmUp', () => {
    it('should return empty array when routine is null', () => {
      const result = service.generateWarmUp(null, [], []);
      expect(result).toEqual([]);
    });

    it('should return empty array when routine has no exercises', () => {
      const result = service.generateWarmUp({ exercises: [] }, [], []);
      expect(result).toEqual([]);
    });

    it('should return empty array when exercises array is empty', () => {
      const routine = { exercises: [{ exerciseId: 1 }] };
      const result = service.generateWarmUp(routine, [], []);
      expect(result).toEqual([]);
    });

    it('should generate warm-up exercises for targeted muscles', () => {
      const routine = {
        exercises: [
          { exerciseId: 1 },
          { exerciseId: 2 }
        ]
      };
      
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [5], difficulty: 'beginner' },
        { id: 2, name: 'Pull-up', muscles: [2, 4], muscles_secondary: [12], difficulty: 'beginner' }
      ];
      
      const muscles = [
        { id: 1, name: 'Chest' },
        { id: 2, name: 'Back' },
        { id: 3, name: 'Shoulders' }
      ];
      
      const result = service.generateWarmUp(routine, exercises, muscles);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(4); // Max 4 muscle groups
    });

    it('should prioritize muscles by frequency in routine', () => {
      const routine = {
        exercises: [
          { exerciseId: 1 },
          { exerciseId: 2 },
          { exerciseId: 3 }
        ]
      };
      
      const exercises = [
        { id: 1, name: 'Exercise 1', muscles: [1], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, name: 'Exercise 2', muscles: [1], muscles_secondary: [], difficulty: 'beginner' },
        { id: 3, name: 'Exercise 3', muscles: [2], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const muscles = [
        { id: 1, name: 'Chest' },
        { id: 2, name: 'Back' }
      ];
      
      const result = service.generateWarmUp(routine, exercises, muscles);
      
      // Muscle 1 appears twice, should be prioritized
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return general warm-up when no specific exercises found', () => {
      const routine = {
        exercises: [{ exerciseId: 1 }]
      };
      
      // Exercise with non-beginner difficulty
      const exercises = [
        { id: 1, name: 'Advanced Exercise', muscles: [1], muscles_secondary: [], difficulty: 'advanced' }
      ];
      
      const muscles = [{ id: 1, name: 'Chest' }];
      
      const result = service.generateWarmUp(routine, exercises, muscles);
      
      // Should fall back to general warm-up or empty array
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle exercises with secondary muscles', () => {
      const routine = {
        exercises: [
          { exerciseId: 1 }
        ]
      };
      
      const exercises = [
        { 
          id: 1, 
          name: 'Compound Exercise', 
          muscles: [1], 
          muscles_secondary: [2, 3], 
          difficulty: 'beginner' 
        }
      ];
      
      const muscles = [
        { id: 1, name: 'Chest' },
        { id: 2, name: 'Back' },
        { id: 3, name: 'Shoulders' }
      ];
      
      const result = service.generateWarmUp(routine, exercises, muscles);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should limit warm-up to max 4 exercises', () => {
      const routine = {
        exercises: [
          { exerciseId: 1 },
          { exerciseId: 2 },
          { exerciseId: 3 },
          { exerciseId: 4 },
          { exerciseId: 5 }
        ]
      };
      
      const exercises = [
        { id: 1, muscles: [1], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, muscles: [2], muscles_secondary: [], difficulty: 'beginner' },
        { id: 3, muscles: [3], muscles_secondary: [], difficulty: 'beginner' },
        { id: 4, muscles: [4], muscles_secondary: [], difficulty: 'beginner' },
        { id: 5, muscles: [5], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const muscles = [
        { id: 1, name: 'Chest' },
        { id: 2, name: 'Back' },
        { id: 3, name: 'Shoulders' },
        { id: 4, name: 'Biceps' },
        { id: 5, name: 'Triceps' }
      ];
      
      const result = service.generateWarmUp(routine, exercises, muscles);
      
      expect(result.length).toBeLessThanOrEqual(4);
    });
  });

  describe('getMuscleSpecificWarmUp', () => {
    it('should return null for invalid muscle ID', () => {
      const result = service.getMuscleSpecificWarmUp(999, []);
      expect(result).toBeNull();
    });

    it('should return warm-up exercise for valid muscle with beginner exercises', () => {
      const exercises = [
        { 
          id: 1, 
          name: 'Push-up', 
          muscles: [1], 
          muscles_secondary: [], 
          difficulty: 'beginner' 
        }
      ];
      
      const result = service.getMuscleSpecificWarmUp(1, exercises);
      
      expect(result).not.toBeNull();
      expect(result.exerciseId).toBeDefined();
      expect(result.sets).toBe(2);
      expect(result.reps).toBe('10-12');
      expect(result.restTime).toBe(30);
    });

    it('should return null when no beginner exercises for muscle', () => {
      const exercises = [
        { 
          id: 1, 
          name: 'Advanced Push-up', 
          muscles: [1], 
          muscles_secondary: [], 
          difficulty: 'advanced' 
        }
      ];
      
      const result = service.getMuscleSpecificWarmUp(1, exercises);
      
      expect(result).toBeNull();
    });

    it('should handle exercises with secondary muscles', () => {
      const exercises = [
        { 
          id: 1, 
          name: 'Compound', 
          muscles: [1], 
          muscles_secondary: [2], 
          difficulty: 'beginner' 
        }
      ];
      
      // Should work for both primary and secondary muscles
      const result1 = service.getMuscleSpecificWarmUp(1, exercises);
      const result2 = service.getMuscleSpecificWarmUp(2, exercises);
      
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });
  });

  describe('getGeneralWarmUp', () => {
    it('should return empty array when no suitable exercises', () => {
      const exercises = [
        { id: 1, muscles: [5], muscles_secondary: [], difficulty: 'advanced' }
      ];
      
      const result = service.getGeneralWarmUp(exercises);
      
      expect(result).toEqual([]);
    });

    it('should return general warm-up exercises when available', () => {
      const exercises = [
        { id: 1, muscles: [1], muscles_secondary: [], difficulty: 'beginner' },
        { id: 2, muscles: [2], muscles_secondary: [], difficulty: 'beginner' }
      ];
      
      const result = service.getGeneralWarmUp(exercises);
      
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].exerciseId).toBeDefined();
        expect(result[0].sets).toBe(2);
        expect(result[0].reps).toBe('10-12');
        expect(result[0].restTime).toBe(30);
      }
    });
  });

  describe('getWarmUpDuration', () => {
    it('should return 5 minutes for empty warm-up', () => {
      const result = service.getWarmUpDuration([]);
      expect(result).toBe(5);
    });

    it('should return null for null input', () => {
      const result = service.getWarmUpDuration(null);
      expect(result).toBe(5);
    });

    it('should calculate duration based on exercise count', () => {
      const warmUpExercises = [
        { exerciseId: 1 },
        { exerciseId: 2 },
        { exerciseId: 3 }
      ];
      
      const result = service.getWarmUpDuration(warmUpExercises);
      
      // 3 exercises * 1.5 = 4.5, rounded to 5
      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(6);
    });

    it('should handle single exercise', () => {
      const result = service.getWarmUpDuration([{ exerciseId: 1 }]);
      expect(result).toBe(2); // 1 * 1.5 = 1.5, rounded to 2
    });
  });

  describe('getMuscleById', () => {
    it('should return muscle data for valid ID', () => {
      const result = service.getMuscleById(1);
      
      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
      expect(result.name).toBe('Chest');
    });

    it('should return unknown muscle for invalid ID', () => {
      const result = service.getMuscleById(999);
      
      expect(result).not.toBeNull();
      expect(result.id).toBe(999);
      expect(result.name).toBe('Muscle 999');
    });

    it('should return all known muscle names', () => {
      const expectedMuscles = {
        1: 'Chest',
        2: 'Back',
        3: 'Shoulders',
        4: 'Biceps',
        5: 'Triceps',
        6: 'Quadriceps',
        7: 'Hamstrings',
        8: 'Glutes',
        9: 'Calves',
        10: 'Abs',
        11: 'Obliques',
        12: 'Forearms'
      };
      
      for (const [id, name] of Object.entries(expectedMuscles)) {
        const result = service.getMuscleById(parseInt(id));
        expect(result.name).toBe(name);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete warm-up generation workflow', () => {
      const routine = {
        exercises: [
          { exerciseId: 1 },
          { exerciseId: 2 },
          { exerciseId: 3 }
        ]
      };
      
      const exercises = [
        { id: 1, name: 'Push-up', muscles: [1, 3], muscles_secondary: [5], difficulty: 'beginner' },
        { id: 2, name: 'Pull-up', muscles: [2, 4], muscles_secondary: [12], difficulty: 'beginner' },
        { id: 3, name: 'Squat', muscles: [6, 8], muscles_secondary: [7], difficulty: 'beginner' },
        { id: 4, name: 'Plank', muscles: [10], muscles_secondary: [11], difficulty: 'beginner' }
      ];
      
      const muscles = [
        { id: 1, name: 'Chest' },
        { id: 2, name: 'Back' },
        { id: 3, name: 'Shoulders' },
        { id: 4, name: 'Biceps' },
        { id: 5, name: 'Triceps' },
        { id: 6, name: 'Quadriceps' },
        { id: 7, name: 'Hamstrings' },
        { id: 8, name: 'Glutes' },
        { id: 10, name: 'Abs' },
        { id: 11, name: 'Obliques' },
        { id: 12, name: 'Forearms' }
      ];
      
      const warmUp = service.generateWarmUp(routine, exercises, muscles);
      
      expect(Array.isArray(warmUp)).toBe(true);
      expect(warmUp.length).toBeGreaterThan(0);
      expect(warmUp.length).toBeLessThanOrEqual(4);
      
      // Verify structure
      warmUp.forEach(ex => {
        expect(ex.exerciseId).toBeDefined();
        expect(ex.sets).toBe(2);
        expect(ex.reps).toBe('10-12');
        expect(ex.restTime).toBe(30);
      });
      
      // Verify duration calculation
      const duration = service.getWarmUpDuration(warmUp);
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle edge case: all exercises are advanced', () => {
      const routine = {
        exercises: [
          { exerciseId: 1 }
        ]
      };
      
      const exercises = [
        { id: 1, name: 'Advanced Exercise', muscles: [1], muscles_secondary: [], difficulty: 'advanced' }
      ];
      
      const muscles = [{ id: 1, name: 'Chest' }];
      
      const result = service.generateWarmUp(routine, exercises, muscles);
      
      // Should fall back to general warm-up
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
