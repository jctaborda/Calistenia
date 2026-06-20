// Shared cache utility - load from IndexedDB with fallback to in-memory cached data
// Consolidates the duplicate pattern used in storage.js and data-cache.js

/**
 * Generic cache loader: tries IndexedDB first, falls back to in-memory data
 * @param {Function} dbLoader - Async function that loads from IndexedDB (returns Promise)
 * @param {*} cachedData - In-memory cached data to fall back to
 * @param {string} cacheKey - Key name for the cached data (for logging)
 * @returns {Promise<*>} Loaded data or empty array
 */
export async function loadFromCacheOrFetch(dbLoader, cachedData, cacheKey = 'data') {
  try {
    const cached = await dbLoader();
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    if (cached && !Array.isArray(cached)) {
      return cached;
    }
  } catch (error) {
    // IndexedDB load failed, fall through to in-memory
  }

  // Return from in-memory cached data
  if (cachedData && Array.isArray(cachedData)) {
    return cachedData;
  }

  return [];
}

/**
 * Load a single value (not array) from cache or fallback
 * @param {Function} dbLoader - Async function that loads from IndexedDB
 * @param {*} cachedData - In-memory cached data fallback
 * @param {string} cacheKey - Key name for logging
 * @returns {Promise<*>} Loaded data or undefined
 */
export async function loadValueFromCacheOrFetch(dbLoader, cachedData, cacheKey = 'data') {
  try {
    const cached = await dbLoader();
    if (cached != null) {
      return cached;
    }
  } catch (error) {
    // IndexedDB load failed, fall through
  }

  return cachedData;
}
