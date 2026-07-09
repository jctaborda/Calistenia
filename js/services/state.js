let state = {};

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
  
  // Deep merge function with defensive copying
  function deepMerge(target, source) {
    // Always create a new object/array to avoid reference issues
    const result = Array.isArray(source) ? [...source] : { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
          // Recursively merge objects with defensive copy
          result[key] = deepMerge(targetValue || {}, sourceValue);
        } else if (Array.isArray(sourceValue)) {
          // Always create new array copy
          result[key] = [...sourceValue];
        } else {
          // Primitive value - direct assignment is safe
          result[key] = sourceValue;
        }
      }
    }
    
    return result;
  }
  
  // Merge updates immutably with deep merge for nested objects
  const newState = deepMerge(state, updates);
  
  if (enforceImmutable) {
    // Verify that updates don't contain references to existing state objects
    function detectReferences(obj, path = '', seen = new Set()) {
      if (obj === null || typeof obj !== 'object') {
        return false;
      }
      
      if (seen.has(obj)) {
        return true; // Circular reference detected
      }
      
      seen.add(obj);
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;
          
          // Check if this value is the same reference as in current state
          // Only warn for non-null objects/arrays
          if (value !== null && typeof value === 'object' && key in state) {
            if (value === state[key]) {
              console.warn(
                `WARNING  Potential state mutation at '${currentPath}'. ` +
                `The update contains a reference to an existing state object. ` +
                `Please ensure you're creating a new object: { ${key}: { ...${key}, ...updates.${key} } }`
              );
              return true;
            }
          }
          
          if (typeof value === 'object' && value !== null) {
            if (detectReferences(value, currentPath, seen)) {
              return true;
            }
          }
        }
      }
      
      return false;
    }
    
    detectReferences(updates);
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
  const currentValue = state[path];
  const arr = currentValue ? JSON.parse(JSON.stringify(currentValue)) : [];
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
    activeWorkout: null,
    history: [],
    exercises: [],
    routines: [],
    categories: [],
    equipment: [],
    muscles: [],
    difficulties: [],
    modules: [],
    settings: {
      units: 'metric', // 'metric' or 'imperial'
      notifications: {
        enabled: true,
        workoutReminders: true,
        achievements: true
      },
      appearance: {
        theme: 'light', // 'light' or 'dark'
        fontSize: 'medium' // 'small', 'medium', 'large'
      },
      voiceCues: {
        enabled: true
      }
    }
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
      
      // Ensure user object has all expected fields if it exists
      if (state.user) {
        // Add missing user fields
        state.user = { ...defaultState.user, ...state.user };
        // Fix deprecated field name
        if (state.user.autoAdvance) {
          state.user.autoAdvanceAfterRest = state.user.autoAdvance;
          delete state.user.autoAdvance;
          // Also remove from localStorage to prevent stale data
          localStorage.setItem('state', JSON.stringify(state));
        }
      }
      
    } catch (error) {
      console.error('Failed to parse saved state:', error);
      // Reset to default state on corruption
      state = { ...defaultState };
    }
  } else {
    // No saved state - user is undefined (triggers onboarding)
    state = { ...defaultState };
  }
}
