let state = {};

// Deep freeze utility to prevent accidental mutations (development only)
const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object') return;
  
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  });
  
  Object.freeze(obj);
};

/**
 * Validate that an update follows immutable pattern
 * @param {*} original - Original value
 * @param {*} newValue - New value being assigned
 * @returns {boolean} - True if update is immutable
 */
function isValidImmutableUpdate(original, newValue) {
  // If types differ, it's a new reference (immutable)
  if (typeof original !== typeof newValue) return true;
  
  // For objects/arrays, check if it's a different reference
  if (typeof original === 'object' && original !== null) {
    if (Array.isArray(original) && Array.isArray(newValue)) {
      // Check if new array is truly new or just same reference
      return newValue !== original;
    }
    return newValue !== original;
  }
  
  // For primitives, any change is a new value
  return true;
}

export function getState() {
  // Return a deep copy to prevent direct mutations of global state
  return JSON.parse(JSON.stringify(state));
}

/**
 * Update state with immutable pattern enforcement
 * @param {Object} updates - State updates to apply
 * @param {boolean} enforceImmutable - Whether to enforce immutable pattern (default: true)
 */
export function updateState(updates, enforceImmutable = true) {
  const previousState = JSON.parse(JSON.stringify(state));
  
  // Merge updates immutably
  const newState = { ...state, ...updates };
  
  if (enforceImmutable && typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development-only check for nested object mutations
    Object.keys(updates).forEach(key => {
      const original = previousState[key];
      const newValue = updates[key];
      
      if (original !== undefined && typeof newValue === 'object') {
        if (!isValidImmutableUpdate(original, newValue)) {
          console.warn(
            `⚠️  State mutation detected for '${key}'. ` +
            `Expected immutable update but found potential direct mutation. ` +
            `Please use spread operator: { ${key}: { ...${key}, ...updates.${key} } }`
          );
        }
      }
    });
  }
  
  state = newState;
  localStorage.setItem('state', JSON.stringify(state));
  document.dispatchEvent(new CustomEvent('stateChange'));
}

/**
 * Helper to update nested state immutably
 * Example: updateNestedState('activeWorkout', 'progress', newProgress)
 * @param {string} path - Dot-separated path (e.g., 'activeWorkout.progress')
 * @param {*} value - New value
 */
export function updateNestedState(path, value) {
  const keys = path.split('.');
  const newState = JSON.parse(JSON.stringify(state));
  
  let current = newState;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  
  updateState(newState);
}

/**
 * Helper to update array items immutably
 * Example: updateArrayItem('history', index, newItem)
 * @param {string} path - Path to array (e.g., 'history')
 * @param {number} index - Index to update
 * @param {*} updater - Function or new value
 */
export function updateArrayItem(path, index, updater) {
  const arr = JSON.parse(JSON.stringify(state[path]) || []);
  
  if (typeof updater === 'function') {
    arr[index] = updater(arr[index]);
  } else {
    arr[index] = updater;
  }
  
  updateState({ [path]: arr });
}

/**
 * Helper to add item to array immutably
 * @param {string} path - Path to array
 * @param {*} item - Item to add
 */
export function addItemToArray(path, item) {
  const arr = JSON.parse(JSON.stringify(state[path]) || []);
  arr.push(item);
  updateState({ [path]: arr });
}

/**
 * Helper to remove item from array immutably
 * @param {string} path - Path to array
 * @param {number} index - Index to remove
 */
export function removeItemFromArray(path, index) {
  const arr = JSON.parse(JSON.stringify(state[path]) || []);
  arr.splice(index, 1);
  updateState({ [path]: arr });
}

export function initializeState() {
  const saved = localStorage.getItem('state');
  
  // Define default state structure
  const defaultState = {
    user: {
      name: 'User',
      autoAdvanceAfterRest: true,
      restTimerColorMode: 'both'
    },
    activeWorkout: null,
    history: [],
    exercises: [],
    routines: [],
    categories: [],
    equipment: [],
    muscles: [],
    difficulties: [],
    modules: []
  };
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid state structure');
      }
      
      // Merge saved state with defaults, preserving existing values
      state = { ...defaultState, ...parsed };
      
      // Ensure user object has all expected fields
      if (!state.user) {
        state.user = defaultState.user;
      } else {
        // Add missing user fields
        state.user = { ...defaultState.user, ...state.user };
        // Fix deprecated field name
        if (state.user.autoAdvance) {
          state.user.autoAdvanceAfterRest = state.user.autoAdvance;
          delete state.user.autoAdvance;
        }
      }
      
    } catch (error) {
      console.error('Failed to parse saved state:', error);
      // Reset to default state on corruption
      state = { ...defaultState };
    }
  } else {
    state = { ...defaultState };
  }
  
  // Freeze in development mode
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    deepFreeze(state);
  }
}
