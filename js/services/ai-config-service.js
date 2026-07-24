// AI Config Service - Loads AI exercise form tracking configurations
// Uses IndexedDB for persistent offline storage (bilingual: en + es)
// Follows the same pattern as modules-service.js

import { storeAIConfigs, aiConfigsLoad } from './database.js';
import { show } from './toast-service.js';

const LANG_MAP = { es: 'ai-exercise-config-es.json', en: 'ai-exercise-config.json' };

let aiConfigsCache = null;

/**
 * Get locale from localStorage (avoids circular dependency with i18n.js)
 */
function getLocale() {
  return localStorage.getItem('locale') || 'en';
}

/**
 * Load all AI exercise configs from IndexedDB or the language-appropriate JSON file.
 * Returns an array of config objects, each keyed by exerciseId.
 */
export async function loadAIConfigs() {
  // Try IndexedDB first
  try {
    const cached = await aiConfigsLoad();
    if (cached?.configs && cached.configs.length > 0) {
      aiConfigsCache = cached.configs;
      return cached.configs;
    }
  } catch (error) {
    console.error('[AIConfigService] Error loading from IndexedDB:', error);
  }

  // Fall back to the language-appropriate JSON file, store in IndexedDB
  try {
    const locale = getLocale().toLowerCase();
    const file = LANG_MAP[locale] || 'ai-exercise-config.json';
    const response = await fetch(`data/${file}`);
    if (!response.ok) throw new Error(`Failed to load ${file}`);

    const data = await response.json();
    const configs = data.configs || [];

    // Store in IndexedDB with bilingual support
    // Preserve existing data for the other locale
    const existingData = await aiConfigsLoad();
    const existingConfigs = existingData?.configs || [];
    const enData = locale === 'es' ? existingConfigs : configs;
    const esData = locale === 'es' ? configs : existingConfigs;

    await storeAIConfigs({ lang: 'en', configs: enData });
    await storeAIConfigs({ lang: 'es', configs: esData });

    aiConfigsCache = configs;
    return configs;
  } catch (error) {
    console.error('[AIConfigService] Error loading from network:', error);
    show('Failed to load AI exercise configurations.', 'warning');
    return [];
  }
}

/**
 * Get AI config for a specific exercise ID
 * @param {number|string} exerciseId
 * @returns {Object|null} The config object or null if not found
 */
export function getAIConfig(exerciseId) {
  if (!aiConfigsCache) return null;
  return aiConfigsCache.find(
    (c) => String(c.exerciseId) === String(exerciseId)
  ) || null;
}

/**
 * Check if an exercise has AI form tracking support
 * @param {number|string} exerciseId
 * @returns {boolean}
 */
export function hasAIConfig(exerciseId) {
  return getAIConfig(exerciseId) !== null;
}

/**
 * Get all exercise IDs that have AI configs
 * @returns {number[]}
 */
export function getSupportedExerciseIds() {
  if (!aiConfigsCache) return [];
  return aiConfigsCache.map((c) => c.exerciseId);
}

/**
 * Check if any exercise in a routine has AI support
 * @param {Object} routine - The routine object with warmup/exercises/cooldown arrays
 * @param {Object[]} exercises - Full exercise list from state
 * @returns {boolean}
 */
export function routineHasAIExercises(routine, exercises) {
  const allExerciseData = [
    ...(routine.warmup || []),
    ...routine.exercises,
    ...(routine.cooldown || []),
  ];
  return allExerciseData.some((ex) => {
    const full = exercises.find((e) => String(e.id) === String(ex.exerciseId));
    return full && hasAIConfig(full.id);
  });
}
