// Shared constants for the Calisthenics Mastery app

// Toast notification durations (ms)
export const TOAST_TIMEOUTS = {
  info: 5000,
  success: 3000,
  warning: 5000,
  error: 8000
};

// Undo service constants
export const UNDO_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const UNDO_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;    // 1 hour
export const UNDO_TOAST_DURATION_MS = 8000;

// Error boundary constants
export const ERROR_BOUNDARY_MAX_RETRIES = 2;

// Validation constants
export const EXERCISE_NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const NUMERIC_INPUT_MAX = 10000;

// UI constants
export const VIEW_INIT_DELAY_MS = 100;

// Cleanup initial delay (ms)
export const CLEANUP_INITIAL_DELAY_MS = 5000;

// Achievement time windows
export const ACHIEVEMENT_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
