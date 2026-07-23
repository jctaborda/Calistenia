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
  // Deep merge function with defensive copying
  function deepMerge(target, source) {
    // Always create a new object/array to avoid reference issues
    const result = Array.isArray(source) ? [...source] : { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (
          typeof sourceValue === 'object' &&
          sourceValue !== null &&
          !Array.isArray(sourceValue)
        ) {
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
    // Quick check: verify updates don't contain direct references to existing state
    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        const value = updates[key];
        if (value !== null && typeof value === 'object' && key in state && value === state[key]) {
          console.warn(
            `WARNING  Potential state mutation at '${key}'. ` +
              `The update contains a reference to an existing state object. ` +
              `Please ensure you're creating a new object: { ${key}: { ...${key}, ...updates.${key} } }`
          );
          break;
        }
      }
    }
  }

  state = newState;
  localStorage.setItem('state', JSON.stringify(state));
  document.dispatchEvent(new CustomEvent('stateChange'));
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
        achievements: true,
      },
      appearance: {
        theme: 'light', // 'light' or 'dark'
        fontSize: 'medium', // 'small', 'medium', 'large'
      },
      voiceCues: {
        enabled: true,
      },
      timerFeedback: {
        sound: true,
        vibration: true,
      },
    },
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
