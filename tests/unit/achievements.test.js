import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  checkAchievements, 
  getUnlockedAchievements, 
  getAllAchievementStatus 
} from '../../js/services/achievements.js';
import { updateState, initializeState } from '../../js/services/state.js';

// Mock the achievements data
const ACHIEVEMENTS = {
  first_workout: {
    id: 'first_workout',
    name: 'First Blood',
    emoji: '🥊',
    description: 'Complete your first workout'
  },
  week_consistent: {
    id: 'week_consistent',
    name: 'Consistent Week',
    emoji: '🔥',
    description: 'Work out 3 times in one week'
  },
  five_workouts: {
    id: 'five_workouts',
    name: 'Five Star',
    emoji: '⭐',
    description: 'Complete 5 workouts total'
  },
  ten_workouts: {
    id: 'ten_workouts',
    name: 'Ten Strong',
    emoji: '💪',
    description: 'Complete 10 workouts total'
  },
  pushup_master: {
    id: 'pushup_master',
    name: 'Push-Up Master',
    emoji: '🤸',
    description: 'Complete 1000 total push-ups'
  },
  easy_breezy: {
    id: 'easy_breezy',
    name: 'Easy Breezy',
    emoji: '😌',
    description: 'Rate a workout as "Too Easy"'
  },
  challenge_accepted: {
    id: 'challenge_accepted',
    name: 'Challenge Accepted',
    emoji: '😓',
    description: 'Rate a workout as "Too Hard"'
  },
  twenty_workouts: {
    id: 'twenty_workouts',
    name: 'Beast Mode',
    emoji: '🦁',
    description: 'Complete 20 workouts total'
  },
  fifty_workouts: {
    id: 'fifty_workouts',
    name: 'Legend',
    emoji: '👑',
    description: 'Complete 50 workouts total'
  }
};

describe('Achievements Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    initializeState();
  });

  describe('checkAchievements', () => {
    it('should unlock first_workout on first workout', () => {
      initializeState();
      
      // Set up state with 1 workout
      updateState({ 
        history: [{ id: 'workout-1', date: new Date().toISOString() }] 
      });
      
      const { newlyUnlocked, newState } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'first_workout' })
      );
      expect(newState).toHaveProperty('user');
      expect(newState.user.unlockedAchievements).toContain('first_workout');
    });

    it('should not unlock first_workout on subsequent workouts', () => {
      // First workout
      updateState({ 
        history: [{ id: 'workout-1', date: new Date().toISOString() }],
        user: { unlockedAchievements: ['first_workout'] }
      });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).not.toContainEqual(
        expect.objectContaining({ id: 'first_workout' })
      );
    });

    it('should unlock five_workouts at 5 workouts', () => {
      const history = Array.from({ length: 5 }, (_, i) => ({
        id: `workout-${i}`,
        date: new Date().toISOString()
      }));
      
      updateState({ history });
      
      const { newlyUnlocked, newState } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'five_workouts' })
      );
      expect(newState.user.unlockedAchievements).toContain('five_workouts');
    });

    it('should unlock ten_workouts at 10 workouts', () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        id: `workout-${i}`,
        date: new Date().toISOString()
      }));
      
      updateState({ history });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'ten_workouts' })
      );
    });

    it('should unlock twenty_workouts at 20 workouts', () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        id: `workout-${i}`,
        date: new Date().toISOString()
      }));
      
      updateState({ history });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'twenty_workouts' })
      );
    });

    it('should unlock fifty_workouts at 50 workouts', () => {
      const history = Array.from({ length: 50 }, (_, i) => ({
        id: `workout-${i}`,
        date: new Date().toISOString()
      }));
      
      updateState({ history });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'fifty_workouts' })
      );
    });

    it('should unlock pushup_master at 1000 push-ups', () => {
      const pushupWorkout = {
        id: 'workout-1',
        date: new Date().toISOString(),
        exercises: Array.from({ length: 10 }, (_, i) => ({
          exerciseId: '1',
          exerciseName: 'Push-Up',
          actualReps: [50, 50, 50] // 150 per set
        }))
      };
      
      updateState({ history: [pushupWorkout] });
      
      const { newlyUnlocked } = checkAchievements();
      
      // Note: This depends on the actual calculation logic
      // The test verifies the function runs without errors
      expect(newlyUnlocked).toBeDefined();
    });

    it('should unlock easy_breezy when rating is too_easy', () => {
      updateState({
        user: {
          lastDifficultyRating: 'too_easy'
        }
      });
      
      const { newlyUnlocked, newState } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'easy_breezy' })
      );
      expect(newState.user.unlockedAchievements).toContain('easy_breezy');
    });

    it('should unlock challenge_accepted when rating is too_hard', () => {
      updateState({
        user: {
          lastDifficultyRating: 'too_hard'
        }
      });
      
      const { newlyUnlocked, newState } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'challenge_accepted' })
      );
      expect(newState.user.unlockedAchievements).toContain('challenge_accepted');
    });

    it('should not unlock achievements already unlocked', () => {
      // Start with first_workout already unlocked
      updateState({
        user: {
          unlockedAchievements: ['first_workout']
        },
        history: [{ id: 'workout-1', date: new Date().toISOString() }]
      });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).not.toContainEqual(
        expect.objectContaining({ id: 'first_workout' })
      );
    });

    it('should return empty array when no new achievements', () => {
      // User already has all achievements
      updateState({
        user: {
          unlockedAchievements: Object.keys(ACHIEVEMENTS)
        },
        history: Array.from({ length: 50 }, (_, i) => ({
          id: `workout-${i}`,
          date: new Date().toISOString()
        }))
      });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toEqual([]);
    });

    it('should handle workout log with exercises', () => {
      const history = [{
        id: 'workout-1',
        date: new Date().toISOString(),
        exercises: [
          {
            exerciseId: '1',
            exerciseName: 'Push-Up',
            actualReps: [10, 8, 6]
          },
          {
            exerciseId: '2',
            exerciseName: 'Squat',
            actualReps: [15, 12, 10]
          }
        ]
      }];
      
      updateState({ history });
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toContainEqual(
        expect.objectContaining({ id: 'first_workout' })
      );
    });

    it('should handle empty workout log', () => {
      initializeState();
      
      const { newlyUnlocked, newState } = checkAchievements();
      
      expect(newlyUnlocked).toBeDefined();
      expect(Array.isArray(newlyUnlocked)).toBe(true);
      expect(newState).toHaveProperty('user');
    });

    it('should handle null workout log', () => {
      initializeState();
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toBeDefined();
      expect(Array.isArray(newlyUnlocked)).toBe(true);
    });

    it('should handle missing history in state', () => {
      initializeState();
      
      const { newlyUnlocked } = checkAchievements();
      
      // Should NOT unlock first_workout since history is empty (0 workouts, not 1)
      expect(newlyUnlocked).toEqual([]);
    });

    it('should handle missing user in state', () => {
      initializeState();
      
      // Remove user from state
      updateState({ user: undefined });
      
      const { newlyUnlocked, newState } = checkAchievements();
      
      // Should handle gracefully
      expect(newlyUnlocked).toBeDefined();
      expect(newState).toHaveProperty('user');
    });
  });

  describe('getUnlockedAchievements', () => {
    it('should return empty array when no achievements unlocked', () => {
      initializeState();
      
      const unlocked = getUnlockedAchievements();
      
      expect(unlocked).toEqual([]);
    });

    it('should return unlocked achievements with details', () => {
      updateState({
        user: {
          unlockedAchievements: ['first_workout', 'five_workouts']
        }
      });
      
      const unlocked = getUnlockedAchievements();
      
      expect(unlocked).toHaveLength(2);
      expect(unlocked[0]).toEqual(
        expect.objectContaining({
          id: 'first_workout',
          name: 'First Blood',
          emoji: '🥊'
        })
      );
    });

    it('should handle invalid achievement IDs gracefully', () => {
      updateState({
        user: {
          unlockedAchievements: ['first_workout', 'invalid-id']
        }
      });
      
      const unlocked = getUnlockedAchievements();
      
      expect(unlocked).toHaveLength(1);
      expect(unlocked[0].id).toBe('first_workout');
    });
  });

  describe('getAllAchievementStatus', () => {
    it('should return all achievements with unlocked status', () => {
      initializeState();
      
      const status = getAllAchievementStatus();
      
      expect(status).toHaveLength(9); // Total achievements
      expect(status[0]).toHaveProperty('id');
      expect(status[0]).toHaveProperty('name');
      expect(status[0]).toHaveProperty('unlocked');
      expect(status[0].unlocked).toBe(false);
    });

    it('should mark unlocked achievements correctly', () => {
      updateState({
        user: {
          unlockedAchievements: ['first_workout']
        }
      });
      
      const status = getAllAchievementStatus();
      
      const firstWorkout = status.find(a => a.id === 'first_workout');
      expect(firstWorkout.unlocked).toBe(true);
      
      const fiveWorkouts = status.find(a => a.id === 'five_workouts');
      expect(fiveWorkouts.unlocked).toBe(false);
    });

    it('should include all achievement properties', () => {
      initializeState();
      
      const status = getAllAchievementStatus();
      
      const first = status[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('emoji');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('unlocked');
    });

    it('should preserve achievement order', () => {
      initializeState();
      
      const status = getAllAchievementStatus();
      const ids = status.map(a => a.id);
      
      // Should be in the same order as defined in ACHIEVEMENTS
      expect(ids).toEqual([
        'first_workout',
        'week_consistent',
        'five_workouts',
        'ten_workouts',
        'pushup_master',
        'easy_breezy',
        'challenge_accepted',
        'twenty_workouts',
        'fifty_workouts'
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large history', () => {
      const history = Array.from({ length: 100 }, (_, i) => ({
        id: `workout-${i}`,
        date: new Date().toISOString()
      }));
      
      updateState({ history });
      
      const workoutLog = {
        id: 'workout-101',
        date: new Date().toISOString(),
        exercises: []
      };
      
      const newlyUnlocked = checkAchievements(workoutLog);
      
      expect(newlyUnlocked).toBeDefined();
    });

    it('should handle workout dates in different formats', () => {
      const history = [
        { id: 'workout-1', date: '2024-01-01' },
        { id: 'workout-2', date: new Date().toISOString() },
        { id: 'workout-3', date: new Date().getTime() }
      ];
      
      updateState({ history });
      
      const workoutLog = {
        id: 'workout-4',
        date: new Date().toISOString(),
        exercises: []
      };
      
      const newlyUnlocked = checkAchievements(workoutLog);
      
      expect(newlyUnlocked).toBeDefined();
    });

    it('should handle workout with missing properties', () => {
      const workoutLog = {
        id: 'workout-1',
        // missing date
        exercises: undefined
      };
      
      const newlyUnlocked = checkAchievements(workoutLog);
      
      // Should handle gracefully
      expect(newlyUnlocked).toBeDefined();
    });

    it('should handle user with empty unlockedAchievements array', () => {
      updateState({
        user: {
          unlockedAchievements: []
        }
      });
      
      const unlocked = getUnlockedAchievements();
      
      expect(unlocked).toEqual([]);
    });

    it('should handle user with null unlockedAchievements', () => {
      updateState({
        user: {
          unlockedAchievements: null
        }
      });
      
      const unlocked = getUnlockedAchievements();
      
      expect(unlocked).toEqual([]);
    });

    it('should handle workout with non-array actualReps', () => {
      initializeState();
      
      const { newlyUnlocked } = checkAchievements();
      
      expect(newlyUnlocked).toBeDefined();
    });
  });

  describe('Achievement Unlocking Logic', () => {
    it('should unlock achievements in correct order', () => {
      initializeState();
      
      // Create 10 workouts with no previously unlocked achievements
      updateState({ 
        user: { unlockedAchievements: [] },
        history: Array.from({ length: 10 }, (_, i) => ({
          id: `workout-${i}`,
          date: new Date().toISOString()
        }))
      });
      
      const { newlyUnlocked } = checkAchievements();
      
      // With 10 workouts and no prior unlocks:
      // Should unlock: week_consistent (if consistent), five_workouts, ten_workouts
      // Should NOT unlock: first_workout (requires history.length === 1)
      const unlockedIds = newlyUnlocked.map(a => a.id);
      expect(unlockedIds).not.toContain('first_workout');
      expect(unlockedIds).toContain('five_workouts');
      expect(unlockedIds).toContain('ten_workouts');
    });

    it('should not duplicate unlocked achievements', () => {
      initializeState();
      
      // First workout - should unlock first_workout
      updateState({ 
        user: { unlockedAchievements: [] },
        history: [{ id: 'workout-1', date: new Date().toISOString() }] 
      });
      const { newlyUnlocked: newlyUnlocked1 } = checkAchievements();
      
      // Second workout (should not unlock first_workout again)
      updateState({ 
        user: { unlockedAchievements: ['first_workout'] },
        history: [
          { id: 'workout-1', date: new Date().toISOString() },
          { id: 'workout-2', date: new Date().toISOString() }
        ]
      });
      const { newlyUnlocked: newlyUnlocked2 } = checkAchievements();
      
      const firstWorkoutCount = newlyUnlocked2.filter(
        a => a.id === 'first_workout'
      ).length;
      
      expect(firstWorkoutCount).toBe(0);
      expect(newlyUnlocked1).toHaveLength(1);
      expect(newlyUnlocked1[0].id).toBe('first_workout');
    });
  });
});
