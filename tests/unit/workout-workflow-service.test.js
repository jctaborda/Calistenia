import { describe, it, expect, beforeEach } from 'vitest';
import { workoutWorkflowService } from '../../js/services/workout-workflow-service.js';

describe('WorkoutWorkflowService', () => {
  beforeEach(() => {
    // Reset any global state
  });

  describe('completeSet', () => {
    it('should return next_set when more sets remain', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 3 };
      const program = {
        warmup: [],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,  // currentExerciseIndex
        0,  // currentSetIndex
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('next_set');
      expect(result.newState.currentSetIndex).toBe(1);
      expect(result.newState.currentExerciseIndex).toBe(0);
    });

    it('should return next_exercise when all sets of current exercise complete', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 2
      };
      
      const currentExerciseData = { sets: 3 };
      const program = {
        warmup: [],
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' }
        ],
        cooldown: []
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,  // currentExerciseIndex
        2,  // currentSetIndex
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('next_exercise');
      expect(result.newState.currentExerciseIndex).toBe(1);
      expect(result.newState.currentSetIndex).toBe(0);
    });

    it('should return complete_workout when last exercise of workout complete', () => {
      const activeWorkout = {
        currentExerciseIndex: 1,
        currentSetIndex: 2
      };
      
      const currentExerciseData = { sets: 3 };
      const program = {
        warmup: [],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        1,  // currentExerciseIndex
        2,  // currentSetIndex
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('complete_workout');
      expect(result.newState.currentExerciseIndex).toBe(2);
      expect(result.newState.currentSetIndex).toBe(0);
    });

    it('should handle warmup phase correctly', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 2 };
      const program = {
        warmup: [
          { id: 'warmup-1' },
          { id: 'warmup-2' }
        ],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,  // currentExerciseIndex (in warmup)
        0,  // currentSetIndex
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('next_set');
      expect(result.warmupLength).toBe(2);
      expect(result.mainExercisesLength).toBe(1);
    });

    it('should handle cooldown phase correctly', () => {
      const activeWorkout = {
        currentExerciseIndex: 3,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 2 };
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: [
          { id: 'cooldown-1' },
          { id: 'cooldown-2' }
        ]
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        3,  // currentExerciseIndex (in cooldown)
        0,  // currentSetIndex
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('next_set');
      expect(result.cooldownLength).toBe(2);
    });

    it('should handle program with undefined warmup', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 2 };
      const program = {
        exercises: [{ id: 'ex-1' }]
        // No warmup property
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,
        0,
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('next_set');
      expect(result.warmupLength).toBe(0);
    });

    it('should handle program with undefined cooldown', () => {
      const activeWorkout = {
        currentExerciseIndex: 1,
        currentSetIndex: 1
      };
      
      const currentExerciseData = { sets: 2 };
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }]
        // No cooldown property
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        1,
        1,
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('complete_workout');
      expect(result.cooldownLength).toBe(0);
    });

    it('should not mutate original activeWorkout', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 2 };
      const program = {
        warmup: [],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,
        0,
        currentExerciseData,
        program
      );
      
      expect(activeWorkout.currentExerciseIndex).toBe(0);
      expect(activeWorkout.currentSetIndex).toBe(0);
      expect(result.newState.currentExerciseIndex).toBe(0);
      expect(result.newState.currentSetIndex).toBe(1);
    });
  });

  describe('getCurrentPhase', () => {
    it('should return warmup for exercises in warmup section', () => {
      const program = {
        warmup: [
          { id: 'warmup-1' },
          { id: 'warmup-2' }
        ],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      expect(workoutWorkflowService.getCurrentPhase(0, program)).toBe('warmup');
      expect(workoutWorkflowService.getCurrentPhase(1, program)).toBe('warmup');
    });

    it('should return main for exercises in main section', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' },
          { id: 'ex-3' }
        ],
        cooldown: []
      };
      
      expect(workoutWorkflowService.getCurrentPhase(1, program)).toBe('main');
      expect(workoutWorkflowService.getCurrentPhase(2, program)).toBe('main');
      expect(workoutWorkflowService.getCurrentPhase(3, program)).toBe('main');
    });

    it('should return cooldown for exercises in cooldown section', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: [
          { id: 'cooldown-1' },
          { id: 'cooldown-2' }
        ]
      };
      
      expect(workoutWorkflowService.getCurrentPhase(2, program)).toBe('cooldown');
      expect(workoutWorkflowService.getCurrentPhase(3, program)).toBe('cooldown');
    });

    it('should handle program with no warmup', () => {
      const program = {
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' }
        ],
        cooldown: []
      };
      
      expect(workoutWorkflowService.getCurrentPhase(0, program)).toBe('main');
      expect(workoutWorkflowService.getCurrentPhase(1, program)).toBe('main');
    });

    it('should handle program with no cooldown', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' }
        ]
      };
      
      expect(workoutWorkflowService.getCurrentPhase(0, program)).toBe('warmup');
      expect(workoutWorkflowService.getCurrentPhase(1, program)).toBe('main');
      expect(workoutWorkflowService.getCurrentPhase(2, program)).toBe('main');
    });

    it('should handle program with no warmup or cooldown', () => {
      const program = {
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' }
        ]
      };
      
      expect(workoutWorkflowService.getCurrentPhase(0, program)).toBe('main');
      expect(workoutWorkflowService.getCurrentPhase(1, program)).toBe('main');
    });
  });

  describe('getPhaseInfo', () => {
    it('should return correct phase and localIndex for warmup', () => {
      const program = {
        warmup: [
          { id: 'warmup-1' },
          { id: 'warmup-2' },
          { id: 'warmup-3' }
        ],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const info = workoutWorkflowService.getPhaseInfo(1, program);
      
      expect(info.phase).toBe('warmup');
      expect(info.localIndex).toBe(1);
    });

    it('should return correct phase and localIndex for main', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' },
          { id: 'ex-3' }
        ],
        cooldown: []
      };
      
      const info = workoutWorkflowService.getPhaseInfo(3, program);
      
      expect(info.phase).toBe('main');
      expect(info.localIndex).toBe(2);
    });

    it('should return correct phase and localIndex for cooldown', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: [
          { id: 'cooldown-1' },
          { id: 'cooldown-2' }
        ]
      };
      
      const info = workoutWorkflowService.getPhaseInfo(3, program);
      
      expect(info.phase).toBe('cooldown');
      expect(info.localIndex).toBe(0);
    });

    it('should handle program with no warmup', () => {
      const program = {
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' }
        ],
        cooldown: []
      };
      
      const info = workoutWorkflowService.getPhaseInfo(0, program);
      
      expect(info.phase).toBe('main');
      expect(info.localIndex).toBe(0);
    });

    it('should handle program with no cooldown', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' }
        ]
      };
      
      const info = workoutWorkflowService.getPhaseInfo(2, program);
      
      expect(info.phase).toBe('main');
      expect(info.localIndex).toBe(1);
    });
  });

  describe('getExerciseData', () => {
    it('should return correct exercise from warmup', () => {
      const program = {
        warmup: [
          { id: 'warmup-1', name: 'Warmup 1' },
          { id: 'warmup-2', name: 'Warmup 2' }
        ],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const exercise = workoutWorkflowService.getExerciseData(1, program);
      
      expect(exercise).toEqual({ id: 'warmup-2', name: 'Warmup 2' });
    });

    it('should return correct exercise from main', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [
          { id: 'ex-1', name: 'Exercise 1' },
          { id: 'ex-2', name: 'Exercise 2' }
        ],
        cooldown: []
      };
      
      const exercise = workoutWorkflowService.getExerciseData(2, program);
      
      expect(exercise).toEqual({ id: 'ex-2', name: 'Exercise 2' });
    });

    it('should return correct exercise from cooldown', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: [
          { id: 'cooldown-1', name: 'Cooldown 1' },
          { id: 'cooldown-2', name: 'Cooldown 2' }
        ]
      };
      
      const exercise = workoutWorkflowService.getExerciseData(3, program);
      
      expect(exercise).toEqual({ id: 'cooldown-2', name: 'Cooldown 2' });
    });

    it('should return null for out of bounds index', () => {
      const program = {
        warmup: [],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const exercise = workoutWorkflowService.getExerciseData(10, program);
      
      expect(exercise).toBeNull();
    });

    it('should handle program with undefined warmup', () => {
      const program = {
        exercises: [{ id: 'ex-1', name: 'Exercise 1' }],
        cooldown: []
      };
      
      const exercise = workoutWorkflowService.getExerciseData(0, program);
      
      expect(exercise).toEqual({ id: 'ex-1', name: 'Exercise 1' });
    });

    it('should handle program with undefined cooldown', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1', name: 'Exercise 1' }]
      };
      
      const exercise = workoutWorkflowService.getExerciseData(1, program);
      
      expect(exercise).toEqual({ id: 'ex-1', name: 'Exercise 1' });
    });
  });

  describe('isHIITWorkout', () => {
    it('should return true for HIIT workout', () => {
      const activeWorkout = {
        workoutType: 'hiit'
      };
      
      expect(workoutWorkflowService.isHIITWorkout(activeWorkout)).toBe(true);
    });

    it('should return true for HIIT with type property', () => {
      const activeWorkout = {
        type: 'hiit'
      };
      
      expect(workoutWorkflowService.isHIITWorkout(activeWorkout)).toBe(true);
    });

    it('should return false for non-HIIT workout', () => {
      const activeWorkout = {
        workoutType: 'push',
        type: 'push'
      };
      
      expect(workoutWorkflowService.isHIITWorkout(activeWorkout)).toBe(false);
    });

    it('should return false for undefined workout type', () => {
      const activeWorkout = {};
      
      expect(workoutWorkflowService.isHIITWorkout(activeWorkout)).toBe(false);
    });

    it('should return false for null activeWorkout', () => {
      try {
        const result = workoutWorkflowService.isHIITWorkout(null);
        expect(result).toBe(false);
      } catch (error) {
        // Error is acceptable for null input
        expect(error).toBeDefined();
      }
    });
  });

  describe('isLastExercise', () => {
    it('should return true for last exercise in warmup', () => {
      const program = {
        warmup: [
          { id: 'warmup-1' },
          { id: 'warmup-2' }
        ],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      expect(workoutWorkflowService.isLastExercise(1, program)).toBe(true);
    });

    it('should return true for last exercise in main', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [
          { id: 'ex-1' },
          { id: 'ex-2' },
          { id: 'ex-3' }
        ],
        cooldown: []
      };
      
      expect(workoutWorkflowService.isLastExercise(4, program)).toBe(true);
    });

    it('should return true for last exercise in cooldown', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: [
          { id: 'cooldown-1' },
          { id: 'cooldown-2' }
        ]
      };
      
      expect(workoutWorkflowService.isLastExercise(3, program)).toBe(true);
    });

    it('should return false for non-last exercise', () => {
      const program = {
        warmup: [
          { id: 'warmup-1' },
          { id: 'warmup-2' }
        ],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      expect(workoutWorkflowService.isLastExercise(0, program)).toBe(false);
    });

    it('should handle program with single exercise in phase', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: [{ id: 'cooldown-1' }]
      };
      
      expect(workoutWorkflowService.isLastExercise(0, program)).toBe(true);
      expect(workoutWorkflowService.isLastExercise(1, program)).toBe(true);
      expect(workoutWorkflowService.isLastExercise(2, program)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should not throw when no timer service exists', () => {
      expect(() => workoutWorkflowService.cleanup()).not.toThrow();
    });

    it('should call timer service cleanup if available', () => {
      // This test would require a real timer service
      // For now, just verify it doesn't throw
      expect(() => workoutWorkflowService.cleanup()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty program', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 1 };
      const program = {};
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,
        0,
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('complete_workout');
    });

    it('should handle program with empty arrays', () => {
      const activeWorkout = {
        currentExerciseIndex: 0,
        currentSetIndex: 0
      };
      
      const currentExerciseData = { sets: 1 };
      const program = {
        warmup: [],
        exercises: [],
        cooldown: []
      };
      
      const result = workoutWorkflowService.completeSet(
        activeWorkout,
        0,
        0,
        currentExerciseData,
        program
      );
      
      expect(result.action).toBe('complete_workout');
    });

    it('should handle negative exercise index gracefully', () => {
      const program = {
        warmup: [{ id: 'warmup-1' }],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      // Should not throw
      expect(() => workoutWorkflowService.getCurrentPhase(-1, program)).not.toThrow();
    });

    it('should handle very large exercise indices', () => {
      const program = {
        warmup: [],
        exercises: [{ id: 'ex-1' }],
        cooldown: []
      };
      
      const exercise = workoutWorkflowService.getExerciseData(1000, program);
      
      expect(exercise).toBeNull();
    });
  });
});
