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

/**
 * Generate the next ID by finding the maximum numeric ID and adding 1.
 * Filters out non-numeric IDs to ensure valid ID generation.
 * @param {Array} items - Array of items with ID properties
 * @param {string} idKey - Property name to use as ID (default: 'id')
 * @returns {number} Next available ID
 */
export function generateNextId(items, idKey = 'id') {
  const numericIds = items
    .filter(item => typeof item[idKey] === 'number' && !isNaN(item[idKey]))
    .map(item => item[idKey]);
  
  return numericIds.length > 0 
    ? Math.max(...numericIds) + 1
    : 1;
}
