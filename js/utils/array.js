// js/utils/array.js - Shared array utilities

/**
 * Normalize a value to an array.
 * - Arrays pass through unchanged
 * - null, undefined, or '' become []
 * - Any other value becomes [value]
 * @param {*} value - Value to normalize
 * @returns {Array} Normalized array
 */
export function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}
