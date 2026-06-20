// Logger utility with configurable log levels
// Strips debug-level messages in production (when minified or production flag set)

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLevel = LOG_LEVELS.DEBUG;

// Auto-detect production mode
function detectProduction() {
  if (typeof window !== 'undefined' && window.__CALISTHENICS_PROD__) {
    return true;
  }
  // If the script is loaded from a minified bundle or production build
  try {
    const scripts = document.querySelectorAll('script[src]');
    for (const src of scripts) {
      if (src.src.includes('.min.') || src.src.includes('dist/')) {
        return true;
      }
    }
  } catch (_) {
    // Ignore errors
  }
  return false;
}

if (detectProduction()) {
  currentLevel = LOG_LEVELS.WARN;
}

/**
 * Set the minimum log level
 * @param {string} level - 'DEBUG', 'INFO', 'WARN', or 'ERROR'
 */
export function setLogLevel(level) {
  currentLevel = LOG_LEVELS[level?.toUpperCase()] ?? LOG_LEVELS.DEBUG;
}

/**
 * Log a debug message (stripped in production)
 */
export function debug(...args) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Log an info message (stripped in production)
 */
export function info(...args) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log('[INFO]', ...args);
  }
}

/**
 * Log a warning message (always shown)
 */
export function warn(...args) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn('[WARN]', ...args);
  }
}

/**
 * Log an error message (always shown)
 */
export function error(...args) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error('[ERROR]', ...args);
  }
}
