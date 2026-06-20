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
export const EXERCISE_NAME_MIN_LENGTH = 2;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const NUMERIC_INPUT_MAX = 10000;

// Image/URL constants
export const IMAGE_URL_MAX_LENGTH = 500;

// UI constants
export const ROUTINE_DEFAULT_DURATION = 30;
export const ROUTINE_DESCRIPTION_MAX_LENGTH = 2000;
export const PATTERN_MAX_LENGTH = 100;

// View render delay (ms) - used for init timeouts
export const VIEW_INIT_DELAY_MS = 100;

// Cleanup initial delay (ms)
export const CLEANUP_INITIAL_DELAY_MS = 5000;

// Virtual scrolling threshold
export const VIRTUAL_SCROLL_THRESHOLD = 100;

// SVG diagram dimensions
export const SVG_DIAGRAM_SIZE = 100;
export const SVG_FONT_WEIGHT = 500;

// Skill tree constants
export const SKILL_TREE_NODE_SPACING = 100;
export const SKILL_TREE_PADDING = 50;
export const SKILL_TREE_MIN_HEIGHT = 600;

// Body fat limits
export const BODY_FAT_MIN = 0;
export const BODY_FAT_MAX = 100;

// Achievement time windows
export const ACHIEVEMENT_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Date formatting
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
