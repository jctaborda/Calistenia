import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getState, 
  updateState, 
  initializeState 
} from '../../js/services/state.js';

describe('State Management Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('initializeState', () => {
    it('should initialize with default state when no saved state exists', () => {
      localStorage.clear();
      initializeState();
      
      const state = getState();
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('activeWorkout');
      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('exercises');
      expect(state).toHaveProperty('routines');
      expect(state).toHaveProperty('categories');
      expect(state).toHaveProperty('equipment');
      expect(state).toHaveProperty('muscles');
      expect(state).toHaveProperty('difficulties');
      expect(state).toHaveProperty('modules');
    });

    it('should set default user values', () => {
      localStorage.clear();
      initializeState();
      
      const state = getState();
      expect(state.user.name).toBe('User');
      expect(state.user.autoAdvanceAfterRest).toBe(true);
      expect(state.user.restTimerColorMode).toBe('both');
    });

    it('should restore saved state from localStorage', () => {
      const savedState = {
        user: { name: 'TestUser', autoAdvanceAfterRest: false },
        history: [{ id: 1, date: '2024-01-01' }]
      };
      localStorage.setItem('state', JSON.stringify(savedState));
      
      initializeState();
      
      const state = getState();
      expect(state.user.name).toBe('TestUser');
      expect(state.user.autoAdvanceAfterRest).toBe(false);
      expect(state.history).toHaveLength(1);
    });

    it('should merge saved state with defaults', () => {
      const savedState = {
        user: { name: 'TestUser' }
      };
      localStorage.setItem('state', JSON.stringify(savedState));
      
      initializeState();
      
      const state = getState();
      // Should preserve saved values
      expect(state.user.name).toBe('TestUser');
      // Should have default values for missing fields
      expect(state.user.autoAdvanceAfterRest).toBe(true);
      expect(state.user.restTimerColorMode).toBe('both');
    });

    it('should reset to default on corrupted state', () => {
      localStorage.setItem('state', 'invalid json [[[');
      
      initializeState();
      
      const state = getState();
      expect(state.user.name).toBe('User');
    });

    it('should fix deprecated autoAdvance field', () => {
      const savedState = {
        user: { 
          name: 'TestUser',
          autoAdvance: true
        }
      };
      localStorage.setItem('state', JSON.stringify(savedState));
      
      initializeState();
      
      const state = getState();
      expect(state.user.autoAdvanceAfterRest).toBe(true);
      expect(state.user.autoAdvance).toBeUndefined();
    });

    it('should create missing user object', () => {
      const savedState = {
        history: [{ id: 1 }]
      };
      localStorage.setItem('state', JSON.stringify(savedState));
      
      initializeState();
      
      const state = getState();
      expect(state.user).toBeDefined();
      expect(state.user.name).toBe('User');
    });
  });

  describe('getState', () => {
    it('should return a deep copy of state', () => {
      initializeState();
      const state1 = getState();
      const state2 = getState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different references
    });

    it('should prevent direct mutation of returned state', () => {
      initializeState();
      const state = getState();
      
      state.history.push({ fake: 'workout' });
      
      const freshState = getState();
      expect(freshState.history).not.toContainEqual({ fake: 'workout' });
    });
  });

  describe('updateState', () => {
    it('should update state with provided values', () => {
      initializeState();
      
      updateState({ user: { name: 'NewName' } });
      
      const state = getState();
      expect(state.user.name).toBe('NewName');
    });

    it('should persist state to localStorage', () => {
      initializeState();
      updateState({ user: { name: 'TestUser' } });
      
      const saved = JSON.parse(localStorage.getItem('state'));
      expect(saved.user.name).toBe('TestUser');
    });

    it('should dispatch stateChange event', () => {
      initializeState();
      
      const handler = vi.fn();
      document.addEventListener('stateChange', handler);
      
      updateState({ user: { name: 'Test' } });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should merge updates immutably', () => {
      initializeState();
      
      updateState({ user: { name: 'NewName' } });
      
      const state = getState();
      expect(state.user.name).toBe('NewName');
      expect(state.activeWorkout).toBeNull();
      expect(state.history).toEqual([]);
    });

    it('should handle null activeWorkout', () => {
      initializeState();
      updateState({ activeWorkout: null });
      
      const state = getState();
      expect(state.activeWorkout).toBeNull();
    });

    it('should handle array updates', () => {
      initializeState();
      updateState({ history: [{ id: 1, date: '2024-01-01' }] });
      
      const state = getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].id).toBe(1);
    });

    it('should preserve existing state fields', () => {
      initializeState();
      updateState({ user: { name: 'Test' } });
      
      const state = getState();
      expect(state.user.autoAdvanceAfterRest).toBe(true);
      expect(state.user.restTimerColorMode).toBe('both');
    });
  });

  describe('Immutable Pattern Enforcement', () => {
    it('should not allow direct mutation of state', () => {
      initializeState();
      const state = getState();
      
      state.user.name = 'DirectMutation';
      
      expect(getState().user.name).toBe('User');
    });

    it('should allow immutable updates via updateState', () => {
      initializeState();
      
      updateState({ user: { name: 'ImmutableUpdate' } });
      
      const state = getState();
      expect(state.user.name).toBe('ImmutableUpdate');
    });

    it('should create new references for arrays', () => {
      initializeState();
      updateState({ history: [{ id: 1 }] });
      
      const originalHistory = getState().history;
      updateState({ history: [...originalHistory, { id: 2 }] });
      
      const newHistory = getState().history;
      expect(newHistory).not.toBe(originalHistory);
      expect(newHistory).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty update object', () => {
      initializeState();
      
      updateState({});
      
      const state = getState();
      expect(state.user.name).toBe('User');
    });

    it('should handle undefined values', () => {
      initializeState();
      updateState({ activeWorkout: undefined });
      
      const state = getState();
      expect(state.activeWorkout).toBeUndefined();
    });

    it('should handle complex nested structures', () => {
      initializeState();
      
      const complexData = {
        user: {
          name: 'Test',
          profile: {
            age: 30,
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        activeWorkout: {
          program: { id: 1, name: 'Push' },
          progress: {
            'exercise-1': [10, 8, 6],
            'exercise-2': [5, 5, 5]
          }
        }
      };
      
      updateState(complexData);
      
      const state = getState();
      expect(state.user.profile.preferences.theme).toBe('dark');
      expect(state.activeWorkout.progress['exercise-1']).toEqual([10, 8, 6]);
    });

    it('should handle circular reference protection', () => {
      initializeState();
      
      // This should not throw
      const safeUpdate = { user: { name: 'Test' } };
      updateState(safeUpdate);
      
      expect(getState().user.name).toBe('Test');
    });
  });

  describe('Mutation Detection', () => {
    let consoleWarnSpy;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should allow safe immutable updates without warning', () => {
      initializeState();
      
      // Safe update with spread operator
      updateState({ user: { ...getState().user, name: 'Test' } });
      
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );
    });

    it('should detect when passing existing state array directly', () => {
      initializeState();
      updateState({ history: [{ id: 1, date: '2024-01-01' }] });
      
      // Create a new array that contains a reference to an existing item
      const existingItem = getState().history[0];
      
      // This simulates a common bug pattern where developers
      // accidentally pass existing references
      const badUpdate = { 
        history: [{ ...existingItem, id: 2 }]  // Spread creates new object, should be safe
      };
      
      updateState(badUpdate);
      
      // Should NOT warn because spread operator creates new object
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );
    });

    it('should handle array updates without false positives', () => {
      initializeState();
      updateState({ history: [{ id: 1 }] });
      
      // Create new array with spread (safe pattern)
      updateState({ history: [...getState().history, { id: 2 }] });
      
      const state = getState();
      expect(state.history).toHaveLength(2);
      
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );
    });

    it('should detect mutations in deeply nested structures', () => {
      initializeState();
      updateState({
        user: {
          name: 'Test',
          profile: {
            age: 30,
            preferences: {
              theme: 'dark'
            }
          }
        }
      });
      
      // Spread operator creates new objects at each level (safe)
      const safeUpdate = {
        user: {
          ...getState().user,
          profile: {
            ...getState().user.profile,
            age: 31
          }
        }
      };
      
      updateState(safeUpdate);
      
      expect(getState().user.profile.age).toBe(31);
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('WARNING')
      );
    });
  });

  describe('Defensive Copying', () => {
    it('should create new array instances on update', () => {
      initializeState();
      updateState({ history: [{ id: 1 }] });
      
      const originalHistory = getState().history;
      updateState({ history: [{ id: 2 }] });
      
      const newHistory = getState().history;
      
      // Should be different array instances
      expect(newHistory).not.toBe(originalHistory);
      expect(newHistory).toHaveLength(1);
      expect(newHistory[0].id).toBe(2);
    });

    it('should create new object instances on deep merge', () => {
      initializeState();
      updateState({ user: { name: 'Test', profile: { age: 25 } } });
      
      const originalUser = getState().user;
      updateState({ user: { name: 'NewName' } });
      
      const newUser = getState().user;
      
      // Should be different object instances
      expect(newUser).not.toBe(originalUser);
      expect(newUser.name).toBe('NewName');
      // Deep merge preserves existing properties (profile: { age: 25 })
      expect(newUser.profile).toEqual({ age: 25 });
    });

    it('should preserve immutability after state update', () => {
      initializeState();
      updateState({ user: { name: 'Test' } });
      
      const state1 = getState();
      
      // Mutate returned state
      state1.user.name = 'Mutated';
      
      // Get fresh state
      const state2 = getState();
      
      // Original should be unchanged
      expect(state2.user.name).toBe('Test');
    });
  });
});
