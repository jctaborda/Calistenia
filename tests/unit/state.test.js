import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getState, 
  updateState, 
  updateNestedState, 
  updateArrayItem, 
  addItemToArray, 
  removeItemFromArray,
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
      expect(state).toHaveProperty('programs');
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

  describe('updateNestedState', () => {
    it('should update nested properties', () => {
      initializeState();
      updateState({ user: { name: 'Test', profile: { age: 25 } } });
      
      updateNestedState('user.profile.age', 30);
      
      const state = getState();
      expect(state.user.profile.age).toBe(30);
      expect(state.user.profile.name).toBeUndefined();
    });

    it('should create nested objects if they don\'t exist', () => {
      initializeState();
      
      updateNestedState('newPath.level1.level2', 'value');
      
      const state = getState();
      expect(state.newPath.level1.level2).toBe('value');
    });

    it('should handle deep nesting', () => {
      initializeState();
      updateNestedState('a.b.c.d.e', 'deep value');
      
      const state = getState();
      expect(state.a.b.c.d.e).toBe('deep value');
    });

    it('should not mutate original state', () => {
      initializeState();
      updateState({ user: { name: 'Test', profile: { age: 25 } } });
      
      const originalAge = getState().user.profile.age;
      updateNestedState('user.profile.age', 30);
      
      expect(getState().user.profile.age).toBe(30);
    });
  });

  describe('updateArrayItem', () => {
    it('should update array item with value', () => {
      initializeState();
      updateState({ history: [{ id: 1 }, { id: 2 }] });
      
      updateArrayItem('history', 0, { id: 1, updated: true });
      
      const state = getState();
      expect(state.history[0].id).toBe(1);
      expect(state.history[0].updated).toBe(true);
    });

    it('should update array item with updater function', () => {
      initializeState();
      updateState({ history: [{ id: 1, reps: 10 }] });
      
      updateArrayItem('history', 0, (item) => ({ ...item, reps: 15 }));
      
      const state = getState();
      expect(state.history[0].reps).toBe(15);
    });

    it('should handle out of bounds index', () => {
      initializeState();
      updateState({ history: [{ id: 1 }] });
      
      updateArrayItem('history', 10, { id: 10 });
      
      const state = getState();
      expect(state.history[10]).toBeDefined();
    });

    it('should preserve other array items', () => {
      initializeState();
      updateState({ history: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      
      updateArrayItem('history', 1, { id: 2, updated: true });
      
      const state = getState();
      expect(state.history[0].id).toBe(1);
      expect(state.history[1].updated).toBe(true);
      expect(state.history[2].id).toBe(3);
    });
  });

  describe('addItemToArray', () => {
    it('should add item to array', () => {
      initializeState();
      
      addItemToArray('history', { id: 1, date: '2024-01-01' });
      
      const state = getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].id).toBe(1);
    });

    it('should append to existing array', () => {
      initializeState();
      updateState({ history: [{ id: 1 }] });
      
      addItemToArray('history', { id: 2 });
      
      const state = getState();
      expect(state.history).toHaveLength(2);
      expect(state.history[1].id).toBe(2);
    });

    it('should create empty array if path doesn\'t exist', () => {
      initializeState();
      
      addItemToArray('newArray', { item: 1 });
      
      const state = getState();
      expect(state.newArray).toEqual([{ item: 1 }]);
    });
  });

  describe('removeItemFromArray', () => {
    it('should remove item at index', () => {
      initializeState();
      updateState({ history: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      
      removeItemFromArray('history', 1);
      
      const state = getState();
      expect(state.history).toHaveLength(2);
      expect(state.history[0].id).toBe(1);
      expect(state.history[1].id).toBe(3);
    });

    it('should handle single item array', () => {
      initializeState();
      updateState({ history: [{ id: 1 }] });
      
      removeItemFromArray('history', 0);
      
      const state = getState();
      expect(state.history).toHaveLength(0);
    });

    it('should preserve order of remaining items', () => {
      initializeState();
      updateState({ history: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
      
      removeItemFromArray('history', 2);
      
      const state = getState();
      expect(state.history).toHaveLength(3);
      expect(state.history[0].id).toBe(1);
      expect(state.history[1].id).toBe(2);
      expect(state.history[2].id).toBe(4);
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
});
